import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { LEASE_MS } from "./largeDocuments";

// ~500 pages/shard: per the ingestion plan's blast-radius/parallelism/
// partial-availability reasoning, not a performance requirement — measured
// extraction throughput (20,000 pages in ~55s inside a Convex action) means
// a shard this size finishes in low single-digit seconds either way.
export const PAGES_PER_SHARD = 500;

// Attempts after the first before a shard (and its document) is dead-lettered.
export const MAX_SHARD_RETRIES = 3;

// Creates all shard rows for a document up front (pending), given its page
// count, and moves the document to "processing". Plain mutation — the
// actual page-count lookup (which needs pdfium) happens in the calling "use
// node" action in largeDocumentIngestion.ts. Idempotent: a sharding attempt
// that died after this committed is re-run by the watchdog, and must not
// create a second set of shards.
export const createShards = internalMutation({
  args: { parentDocId: v.id("largeDocuments"), totalPages: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.parentDocId);
    if (!doc || doc.status !== "queued") return null;

    const existing = await ctx.db
      .query("documentShards")
      .withIndex("by_parentDoc", (q) => q.eq("parentDocId", args.parentDocId))
      .first();
    let totalShards = 0;
    if (existing) {
      totalShards = Math.ceil(args.totalPages / PAGES_PER_SHARD);
    } else {
      for (let pageStart = 1; pageStart <= args.totalPages; pageStart += PAGES_PER_SHARD) {
        await ctx.db.insert("documentShards", {
          parentDocId: args.parentDocId,
          shardIndex: totalShards,
          pageStart,
          pageEnd: Math.min(pageStart + PAGES_PER_SHARD - 1, args.totalPages),
          status: "pending",
          chunksInserted: 0,
          retryCount: 0,
        });
        totalShards++;
      }
    }

    await ctx.db.patch(args.parentDocId, {
      status: "processing",
      totalPages: args.totalPages,
      totalShards,
      leaseUntil: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Atomically takes ownership of a document's next unfinished shard, in
// shardIndex order. Strictly one shard in flight per document (the lease on
// the parent row), which keeps chunkIndex assignment sequential.
//
// "Next unfinished" deliberately includes shards stuck in extracting/
// chunking: those were abandoned by an action that died before reaching its
// catch block (out of memory, timeout). The previous version only looked
// for "pending" shards, so an abandoned shard was silently skipped — the
// 20,000-page test document lost pages 11,501-12,000 that way.
export const claimNextShard = internalMutation({
  args: { docId: v.id("largeDocuments") },
  returns: v.union(
    v.object({
      kind: v.literal("shard"),
      shardId: v.id("documentShards"),
      shardIndex: v.number(),
      pageStart: v.number(),
      pageEnd: v.number(),
      storageId: v.id("_storage"),
      chunkIndexStart: v.number(),
    }),
    v.object({ kind: v.literal("busy") }),
    v.object({ kind: v.literal("finished") }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.status !== "processing") return { kind: "finished" as const };
    const now = Date.now();
    // Always set by the time shards exist (startSharding assembles a
    // multi-part upload before creating them).
    const storageId = doc.storageId;
    if (!storageId) {
      await ctx.db.patch(args.docId, { status: "error", errorMessage: "Uploaded file is missing", updatedAt: now });
      return { kind: "finished" as const };
    }
    if (doc.leaseUntil !== undefined && doc.leaseUntil > now) return { kind: "busy" as const };

    // Bounded by the document's shard count (40 for 20,000 pages).
    let next = null;
    for await (const shard of ctx.db
      .query("documentShards")
      .withIndex("by_parentDoc_shardIndex", (q) => q.eq("parentDocId", args.docId))) {
      if (shard.status !== "done") {
        next = shard;
        break;
      }
    }

    if (!next) {
      await ctx.db.patch(args.docId, { status: "ready", leaseUntil: undefined, updatedAt: now });
      return { kind: "finished" as const };
    }

    // failShard already counted a caught failure and reset the shard to
    // pending; a shard found mid-flight here is an uncaught one.
    const retryCount = next.status === "pending" ? next.retryCount : next.retryCount + 1;
    if (retryCount > MAX_SHARD_RETRIES) {
      const errorMessage = next.errorMessage ?? "processing was interrupted repeatedly";
      await ctx.db.patch(next._id, { status: "error", retryCount, errorMessage });
      await ctx.db.patch(args.docId, {
        status: "error",
        errorMessage: `Pages ${next.pageStart}-${next.pageEnd} failed after ${MAX_SHARD_RETRIES} retries: ${errorMessage}`,
        leaseUntil: undefined,
        updatedAt: now,
      });
      return { kind: "finished" as const };
    }

    await ctx.db.patch(next._id, { status: "extracting", retryCount });
    await ctx.db.patch(args.docId, { leaseUntil: now + LEASE_MS, updatedAt: now });
    return {
      kind: "shard" as const,
      shardId: next._id,
      shardIndex: next.shardIndex,
      pageStart: next.pageStart,
      pageEnd: next.pageEnd,
      storageId,
      chunkIndexStart: doc.totalChunks,
    };
  },
});

export const markShardChunking = internalMutation({
  args: { shardId: v.id("documentShards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.shardId, { status: "chunking" });
    return null;
  },
});

// Marks a shard done and rolls its counts into the parent in one
// transaction, so progress can never be double-counted or half-recorded.
export const completeShard = internalMutation({
  args: { shardId: v.id("documentShards"), chunksInserted: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const shard = await ctx.db.get(args.shardId);
    if (!shard || shard.status === "done") return null;
    const doc = await ctx.db.get(shard.parentDocId);
    if (!doc) return null;
    await ctx.db.patch(args.shardId, { status: "done", chunksInserted: args.chunksInserted, errorMessage: undefined });
    await ctx.db.patch(doc._id, {
      shardsCompleted: doc.shardsCompleted + 1,
      pagesProcessed: doc.pagesProcessed + (shard.pageEnd - shard.pageStart + 1),
      totalChunks: doc.totalChunks + args.chunksInserted,
      leaseUntil: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Records a caught failure: back to pending for another attempt (returns
// true), or dead-letters the shard and document once retries are used up.
export const failShard = internalMutation({
  args: { shardId: v.id("documentShards"), errorMessage: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const shard = await ctx.db.get(args.shardId);
    if (!shard) return false;
    const now = Date.now();
    const retryCount = shard.retryCount + 1;
    const docId: Id<"largeDocuments"> = shard.parentDocId;
    if (retryCount > MAX_SHARD_RETRIES) {
      await ctx.db.patch(args.shardId, { status: "error", retryCount, errorMessage: args.errorMessage });
      await ctx.db.patch(docId, {
        status: "error",
        errorMessage: `Pages ${shard.pageStart}-${shard.pageEnd} failed after ${MAX_SHARD_RETRIES} retries: ${args.errorMessage}`,
        leaseUntil: undefined,
        updatedAt: now,
      });
      return false;
    }
    await ctx.db.patch(args.shardId, { status: "pending", retryCount, errorMessage: args.errorMessage });
    await ctx.db.patch(docId, { leaseUntil: undefined, updatedAt: now });
    return true;
  },
});
