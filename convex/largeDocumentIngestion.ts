"use node";

// Resumable, checkpointed large-document ingestion. Runs entirely as
// self-chaining Convex actions (ctx.scheduler.runAfter inside each step),
// so no single invocation owns the whole job — a crash or timeout mid-shard
// loses at most that shard's in-flight work, not the whole document, and
// the next run resumes from the first unfinished shard rather than
// restarting. See the large-document ingestion plan for the full design and
// the Phase 0 validation (20,000 pages extracted in ~57s inside a Convex
// Node action via @hyzyla/pdfium — see convex/lib/pdfExtraction.ts).
//
// Every step first claims the document (claimSharding/claimNextShard),
// which takes a lease on it. An action that dies without scheduling its
// successor leaves an expiring lease behind, and the resumeStalled cron
// (largeDocuments.ts, crons.ts) restarts the chain once it lapses.

import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { extractPageRange, getPageCount, type PdfSource } from "./lib/pdfExtraction";
import { chunkBySentenceBoundary } from "./lib/textChunking";

// Convex mutation transaction limits (16,000 writes / 32,000 scanned) — keep
// insert batches well under that regardless of how many chunks a shard
// produces.
const CHUNK_INSERT_BATCH = 500;
const CHUNK_DELETE_BATCH = 1000;
// Small backoff so a persistent failure doesn't hot-loop.
const RETRY_DELAY_MS = 5000;

// Opens the stored PDF as a stream (see openDocument in
// lib/pdfExtraction.ts for why it's never buffered whole in JS).
function pdfSource(ctx: ActionCtx, storageId: Id<"_storage">) {
  return async (): Promise<PdfSource> => {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Uploaded file not found in storage");
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`Could not read the uploaded file (${res.status})`);
    const size = Number(res.headers.get("content-length"));
    if (!Number.isFinite(size) || size <= 0) {
      // No length to size PDFium's buffer up front: fall back to buffering.
      const bytes = new Uint8Array(await res.arrayBuffer());
      return { size: bytes.length, chunks: [bytes] as unknown as AsyncIterable<Uint8Array> };
    }
    return { size, chunks: res.body as unknown as AsyncIterable<Uint8Array> };
  };
}

// Kicks off ingestion for a freshly-created (status: "queued") document:
// determine page count, create shard rows, start processing the first one.
export const startSharding = internalAction({
  args: { docId: v.id("largeDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(internal.largeDocuments.claimSharding, { docId: args.docId });
    if (!claim) return null;

    let storageId: Id<"_storage">;
    if (!("uploadParts" in claim)) {
      storageId = claim.storageId;
    } else {
      // Multi-part upload: join the parts, in order, into one stored file.
      // A failure here (e.g. out of memory) leaves the document queued with
      // its lease; the watchdog retries it, bounded by claimSharding's
      // attempt limit.
      const parts: Blob[] = [];
      for (const partId of claim.uploadParts ?? []) {
        const part = await ctx.storage.get(partId);
        if (!part) {
          await ctx.runMutation(internal.largeDocuments.markError, {
            docId: args.docId,
            errorMessage: "Part of the upload is missing — please upload the file again",
          });
          return null;
        }
        parts.push(part);
      }
      const assembled = await ctx.storage.store(new Blob(parts, { type: "application/pdf" }));
      parts.length = 0;
      const attached = await ctx.runMutation(internal.largeDocuments.attachAssembledFile, {
        docId: args.docId,
        storageId: assembled,
      });
      // Page-counting needs the whole file in memory again (plus PDFium's
      // copy), so it runs as a fresh step instead of on top of the parts
      // still awaiting garbage collection here — together they exceeded
      // the 512MB action limit for a 146MB, 20,000-page PDF.
      if (attached) {
        await ctx.scheduler.runAfter(0, internal.largeDocumentIngestion.startSharding, { docId: args.docId });
      }
      return null;
    }

    try {
      const totalPages = await getPageCount(pdfSource(ctx, storageId));
      if (totalPages <= 0) throw new Error("The PDF has no pages");
      await ctx.runMutation(internal.documentShards.createShards, { parentDocId: args.docId, totalPages });
    } catch (err) {
      // An unreadable/corrupt PDF fails the same way every time — no retry.
      await ctx.runMutation(internal.largeDocuments.markError, {
        docId: args.docId,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return null;
    }

    await ctx.scheduler.runAfter(0, internal.largeDocumentIngestion.processNextShard, { docId: args.docId });
    return null;
  },
});

// Claims and processes the next unfinished shard for a document, or marks
// the document ready once none remain. This is the self-chaining entry
// point — each shard's processing ends by scheduling another call to this
// same function, not by looping internally, so each step is a fresh,
// bounded action invocation.
export const processNextShard = internalAction({
  args: { docId: v.id("largeDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(internal.documentShards.claimNextShard, { docId: args.docId });
    // "busy": another invocation holds the lease (e.g. a watchdog restart
    // racing a late scheduled run) — it will chain onward itself.
    if (claim.kind !== "shard") return null;
    const { shardId } = claim;

    try {
      // A previous attempt at this shard may have died after inserting some
      // chunks; clear them so this attempt doesn't duplicate them.
      while ((await ctx.runMutation(internal.documentChunks.deleteShardChunks, { shardId, limit: CHUNK_DELETE_BATCH })) > 0);

      const { pages } = await extractPageRange(pdfSource(ctx, claim.storageId), claim.pageStart, claim.pageEnd);

      await ctx.runMutation(internal.documentShards.markShardChunking, { shardId });

      // Chunk per page (not across the whole shard) so every chunk maps to
      // exactly one page — a legal citation to "p. 8,142" must be
      // unambiguous, which chunking across a page boundary would break.
      let nextChunkIndex = claim.chunkIndexStart;
      let pending: { chunkIndex: number; pageStart: number; pageEnd: number; content: string }[] = [];
      let totalInserted = 0;

      const flush = async () => {
        if (pending.length === 0) return;
        await ctx.runMutation(internal.documentChunks.insertBatch, { docId: args.docId, shardId, chunks: pending });
        totalInserted += pending.length;
        pending = [];
      };

      for (const { page, text } of pages) {
        for (const content of chunkBySentenceBoundary(text)) {
          pending.push({ chunkIndex: nextChunkIndex, pageStart: page, pageEnd: page, content });
          nextChunkIndex++;
          if (pending.length >= CHUNK_INSERT_BATCH) await flush();
        }
      }
      await flush();

      await ctx.runMutation(internal.documentShards.completeShard, { shardId, chunksInserted: totalInserted });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Shard ${claim.shardIndex} (pages ${claim.pageStart}-${claim.pageEnd}) of ${args.docId} failed: ${message}`);
      const willRetry = await ctx.runMutation(internal.documentShards.failShard, { shardId, errorMessage: message });
      if (willRetry) {
        await ctx.scheduler.runAfter(RETRY_DELAY_MS, internal.largeDocumentIngestion.processNextShard, {
          docId: args.docId,
        });
      }
      return null;
    }

    // Continue with the next shard (or finish, if none remain).
    await ctx.scheduler.runAfter(0, internal.largeDocumentIngestion.processNextShard, { docId: args.docId });
    return null;
  },
});
