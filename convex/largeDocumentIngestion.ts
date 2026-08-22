"use node";

// Resumable, checkpointed large-document ingestion. Runs entirely as
// self-chaining Convex actions (ctx.scheduler.runAfter inside each step),
// so no single invocation owns the whole job — a crash or timeout mid-shard
// loses at most that shard's in-flight work, not the whole document, and
// the next scheduled run resumes from the last completed shard rather than
// restarting. See the large-document ingestion plan for the full design and
// the Phase 0 validation (20,000 pages extracted in ~57s inside a Convex
// Node action via @hyzyla/pdfium — see convex/lib/pdfExtraction.ts).

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { extractPageRange, getPageCount } from "./lib/pdfExtraction";
import { chunkBySentenceBoundary } from "./lib/textChunking";
import { PAGES_PER_SHARD } from "./documentShards";

const MAX_SHARD_RETRIES = 3;
// Convex mutation transaction limits (16,000 writes / 32,000 scanned) — keep
// insert batches well under that regardless of how many chunks a shard
// produces.
const CHUNK_INSERT_BATCH = 500;

// Kicks off ingestion for a freshly-created (status: "queued") document:
// determine page count, create shard rows, start processing the first one.
export const startSharding = internalAction({
  args: { docId: v.id("largeDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(api.largeDocuments.get, { docId: args.docId });
    if (!doc) return null;

    try {
      const blob = await ctx.storage.get(doc.storageId);
      if (!blob) throw new Error("Uploaded file not found in storage");
      const bytes = new Uint8Array(await blob.arrayBuffer());

      const totalPages = await getPageCount(bytes);
      const totalShards = Math.ceil(totalPages / PAGES_PER_SHARD);

      await ctx.runMutation(internal.documentShards.createShards, {
        parentDocId: args.docId,
        totalPages,
      });
      await ctx.runMutation(internal.largeDocuments.markSharding, {
        docId: args.docId,
        totalPages,
        totalShards,
      });

      await ctx.scheduler.runAfter(0, internal.largeDocumentIngestion.processNextShard, {
        docId: args.docId,
      });
    } catch (err) {
      await ctx.runMutation(internal.largeDocuments.markError, {
        docId: args.docId,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
    return null;
  },
});

// Finds and processes the next pending shard for a document, or marks the
// document ready once none remain. This is the self-chaining entry point —
// each shard's processing ends by scheduling another call to this same
// function, not by looping internally, so each step is a fresh, bounded
// action invocation.
export const processNextShard = internalAction({
  args: { docId: v.id("largeDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const shard = await ctx.runQuery(internal.documentShards.getNextPendingShard, {
      parentDocId: args.docId,
    });

    if (!shard) {
      await ctx.runMutation(internal.largeDocuments.markReady, { docId: args.docId });
      return null;
    }
    // Captured separately so the nested `flush` closure below doesn't rely
    // on TS narrowing `shard` as non-null across a function boundary.
    const shardId = shard._id;

    const doc = await ctx.runQuery(api.largeDocuments.get, { docId: args.docId });
    if (!doc) return null;

    try {
      await ctx.runMutation(internal.documentShards.setShardStatus, {
        shardId,
        status: "extracting",
      });

      const blob = await ctx.storage.get(doc.storageId);
      if (!blob) throw new Error("Uploaded file not found in storage");
      const bytes = new Uint8Array(await blob.arrayBuffer());

      const { pages } = await extractPageRange(bytes, shard.pageStart, shard.pageEnd);

      await ctx.runMutation(internal.documentShards.setShardStatus, {
        shardId: shard._id,
        status: "chunking",
      });

      // Chunk per page (not across the whole shard) so every chunk maps to
      // exactly one page — a legal citation to "p. 8,142" must be
      // unambiguous, which chunking across a page boundary would break.
      let nextChunkIndex = doc.totalChunks;
      let pending: { chunkIndex: number; pageStart: number; pageEnd: number; content: string }[] = [];
      let totalInserted = 0;

      async function flush() {
        if (pending.length === 0) return;
        await ctx.runMutation(internal.documentChunks.insertBatch, {
          docId: args.docId,
          shardId,
          chunks: pending,
        });
        totalInserted += pending.length;
        pending = [];
      }

      for (const { page, text } of pages) {
        for (const content of chunkBySentenceBoundary(text)) {
          pending.push({ chunkIndex: nextChunkIndex, pageStart: page, pageEnd: page, content });
          nextChunkIndex++;
          if (pending.length >= CHUNK_INSERT_BATCH) await flush();
        }
      }
      await flush();

      await ctx.runMutation(internal.documentShards.setShardStatus, {
        shardId: shard._id,
        status: "done",
        chunksInserted: totalInserted,
      });
      await ctx.runMutation(internal.largeDocuments.recordShardProgress, {
        docId: args.docId,
        pagesInShard: shard.pageEnd - shard.pageStart + 1,
        chunksInShard: totalInserted,
      });

      // Continue with the next shard (or finish, if none remain).
      await ctx.scheduler.runAfter(0, internal.largeDocumentIngestion.processNextShard, {
        docId: args.docId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const retryCount = await ctx.runMutation(internal.documentShards.incrementShardRetry, {
        shardId: shard._id,
      });

      if (retryCount <= MAX_SHARD_RETRIES) {
        // Transient-failure retry: re-run this same shard, not the whole
        // document. Small backoff so a persistent failure doesn't hot-loop.
        await ctx.scheduler.runAfter(2000, internal.largeDocumentIngestion.processNextShard, {
          docId: args.docId,
        });
      } else {
        // Dead letter — stop retrying, surface the failure instead of
        // looping forever.
        await ctx.runMutation(internal.documentShards.setShardStatus, {
          shardId: shard._id,
          status: "error",
          errorMessage: message,
        });
        await ctx.runMutation(internal.largeDocuments.markError, {
          docId: args.docId,
          errorMessage: `Shard ${shard.shardIndex} (pages ${shard.pageStart}-${shard.pageEnd}) failed after ${MAX_SHARD_RETRIES} retries: ${message}`,
        });
      }
    }
    return null;
  },
});
