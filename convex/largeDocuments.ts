import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireIngestSecret } from "./lib/ingestAuth";

// 8MB parts (see Documents.tsx) — comfortably above the client's file-size cap.
export const MAX_UPLOAD_PARTS = 256;

export const largeDocumentValidator = v.object({
  _id: v.id("largeDocuments"),
  _creationTime: v.number(),
  ownerId: v.string(),
  name: v.string(),
  status: v.union(
    v.literal("queued"),
    v.literal("sharding"),
    v.literal("processing"),
    v.literal("ready"),
    v.literal("error"),
  ),
  storageId: v.optional(v.id("_storage")),
  uploadParts: v.optional(v.array(v.id("_storage"))),
  totalPages: v.optional(v.number()),
  totalShards: v.optional(v.number()),
  shardsCompleted: v.number(),
  pagesProcessed: v.number(),
  totalChunks: v.number(),
  errorMessage: v.optional(v.string()),
  retryCount: v.number(),
  leaseUntil: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Created via the Supabase bridge (create-large-document edge function,
// which verifies Supabase auth first) — never called directly from the
// browser, so `ownerId` here is always a value Supabase already verified,
// same trust model as requireIngestSecret elsewhere in this file.
//
// `storageIds` is the uploaded file as one or more parts, in order (see
// uploadParts in schema.ts); a single part is used as the file directly.
export const create = mutation({
  args: {
    secret: v.string(),
    ownerId: v.string(),
    name: v.string(),
    storageIds: v.array(v.id("_storage")),
  },
  returns: v.id("largeDocuments"),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    if (args.storageIds.length === 0 || args.storageIds.length > MAX_UPLOAD_PARTS) {
      throw new Error(`Expected 1-${MAX_UPLOAD_PARTS} uploaded parts`);
    }
    for (const id of args.storageIds) {
      if (!(await ctx.db.system.get("_storage", id))) throw new Error("Uploaded file not found");
    }
    const now = Date.now();
    return await ctx.db.insert("largeDocuments", {
      ownerId: args.ownerId,
      name: args.name,
      status: "queued",
      ...(args.storageIds.length === 1 ? { storageId: args.storageIds[0] } : { uploadParts: args.storageIds }),
      shardsCompleted: 0,
      pagesProcessed: 0,
      totalChunks: 0,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Progress/status read — deliberately allowed by bare docId with no
// ownerId check, matching /searchLibrary's "unguessable Convex ID is enough
// for this sensitivity level" reasoning: this returns only status/progress
// counters, never document content (content stays behind the secret-gated
// Supabase bridge — see documentChunks.ts). Used by the client's live
// progress UI via useQuery.
export const get = query({
  args: { docId: v.id("largeDocuments") },
  returns: v.union(largeDocumentValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.docId),
});

// The caller's own large documents, newest first. Owner comes from the
// verified Supabase session (see auth.config.ts), never from an argument.
export const listMine = query({
  args: {},
  returns: v.array(largeDocumentValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("largeDocuments")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .take(50);
  },
});

// @-mention search over the caller's own large documents (see
// src/lib/authoritySearch.ts).
export const searchMine = query({
  args: { searchQuery: v.string(), matchCount: v.optional(v.number()) },
  returns: v.array(largeDocumentValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !args.searchQuery.trim()) return [];
    return await ctx.db
      .query("largeDocuments")
      .withSearchIndex("search_name", (q) => q.search("name", args.searchQuery).eq("ownerId", identity.subject))
      .take(Math.min(args.matchCount ?? 10, 25));
  },
});

// Deletes one of the caller's large documents. The row goes immediately (so
// it vanishes from lists, @-mention search and retrieval, and any in-flight
// ingestion step stops at its next claim/insert); its chunks — up to
// ~180,000 for a 20,000-page document, far more than one transaction may
// delete — and files are removed in the background by purgeDeleted.
export const removeMine = mutation({
  args: { docId: v.id("largeDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You need to be signed in to delete documents");
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.ownerId !== identity.subject) throw new Error("Document not found");
    await ctx.db.delete(args.docId);
    const storageIds = [...(doc.storageId ? [doc.storageId] : []), ...(doc.uploadParts ?? [])];
    await ctx.scheduler.runAfter(0, internal.largeDocuments.purgeDeleted, { docId: args.docId, storageIds });
    return null;
  },
});

// Under Convex's per-transaction write/read limits even for the largest
// chunks (~800 chars each).
const PURGE_BATCH = 2000;

// Background cleanup for removeMine: chunks in batches (rescheduling itself
// until none remain), then shards, then the stored files.
export const purgeDeleted = internalMutation({
  args: { docId: v.id("largeDocuments"), storageIds: v.array(v.id("_storage")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_docId", (q) => q.eq("docId", args.docId))
      .take(PURGE_BATCH);
    for (const c of chunks) await ctx.db.delete(c._id);
    if (chunks.length === PURGE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.largeDocuments.purgeDeleted, args);
      return null;
    }

    const shards = await ctx.db
      .query("documentShards")
      .withIndex("by_parentDoc", (q) => q.eq("parentDocId", args.docId))
      .take(PURGE_BATCH);
    for (const s of shards) await ctx.db.delete(s._id);
    if (shards.length === PURGE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.largeDocuments.purgeDeleted, args);
      return null;
    }

    for (const id of args.storageIds) {
      if (await ctx.db.system.get("_storage", id)) await ctx.storage.delete(id);
    }
    return null;
  },
});

// ─── Internal — ingestion orchestration (largeDocumentIngestion.ts) and the
// stall watchdog (crons.ts). Never called by a client or the HTTP bridge.

// Longer than Convex's 10-minute action limit, so a lease can only expire
// once the action holding it is definitely gone.
export const LEASE_MS = 11 * 60 * 1000;
const MAX_SHARDING_ATTEMPTS = 3;
// No step legitimately leaves a document idle and unleased for this long —
// shards chain to each other immediately.
const STALL_MS = 2 * 60 * 1000;

// Claims a queued document for page-counting/sharding. Returns its file —
// the assembled storage id, or the parts still to be joined — or null when
// someone else holds it, it has moved on, or it has used up its attempts
// (then it's marked as errored). Each claim counts as an attempt, so a
// sharding action that keeps dying can't loop forever.
export const claimSharding = internalMutation({
  args: { docId: v.id("largeDocuments") },
  returns: v.union(
    v.object({ storageId: v.id("_storage") }),
    v.object({ uploadParts: v.array(v.id("_storage")) }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.status !== "queued") return null;
    const now = Date.now();
    if (doc.leaseUntil !== undefined && doc.leaseUntil > now) return null;
    if (doc.retryCount >= MAX_SHARDING_ATTEMPTS) {
      await ctx.db.patch(args.docId, {
        status: "error",
        errorMessage: `Could not read the document's page count after ${MAX_SHARDING_ATTEMPTS} attempts`,
        leaseUntil: undefined,
        updatedAt: now,
      });
      return null;
    }
    await ctx.db.patch(args.docId, { retryCount: doc.retryCount + 1, leaseUntil: now + LEASE_MS, updatedAt: now });
    if (doc.storageId) return { storageId: doc.storageId };
    if (doc.uploadParts && doc.uploadParts.length > 0) return { uploadParts: doc.uploadParts };
    await ctx.db.patch(args.docId, { status: "error", errorMessage: "No uploaded file", leaseUntil: undefined });
    return null;
  },
});

// Records the file a multi-part upload was reassembled into, and drops the
// parts. If the document was deleted mid-assembly, the new file is
// discarded instead, so nothing is orphaned in storage.
export const attachAssembledFile = internalMutation({
  args: { docId: v.id("largeDocuments"), storageId: v.id("_storage") },
  // The file to process from here on, or null if the document is gone.
  returns: v.union(v.id("_storage"), v.null()),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.storageId) {
      await ctx.storage.delete(args.storageId);
      return doc?.storageId ?? null;
    }
    for (const partId of doc.uploadParts ?? []) {
      if (await ctx.db.system.get("_storage", partId)) await ctx.storage.delete(partId);
    }
    // Assembly was its own step: release the lease and reset the attempt
    // count so page-counting starts fresh (startSharding reschedules itself).
    await ctx.db.patch(args.docId, {
      storageId: args.storageId,
      uploadParts: undefined,
      retryCount: 0,
      leaseUntil: undefined,
      updatedAt: Date.now(),
    });
    return args.storageId;
  },
});

export const markError = internalMutation({
  args: { docId: v.id("largeDocuments"), errorMessage: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, {
      status: "error",
      errorMessage: args.errorMessage,
      leaseUntil: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Cron watchdog (crons.ts). Self-chaining via ctx.scheduler means a single
// lost link — an action killed before it schedules the next step — strands
// the document forever; that is what stopped the 20,000-page test document
// at 24/40 shards. Any queued/processing document with no live lease and no
// recent progress gets its next step rescheduled. Claims are transactional
// (claimSharding/claimNextShard), so a duplicate restart is harmless.
export const resumeStalled = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    let resumed = 0;
    for (const status of ["queued", "processing"] as const) {
      const docs = await ctx.db
        .query("largeDocuments")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(100);
      for (const doc of docs) {
        if (doc.leaseUntil !== undefined && doc.leaseUntil > now) continue;
        if (now - doc.updatedAt < STALL_MS) continue;
        // Bump updatedAt so the next tick doesn't reschedule it again before
        // the restarted step has had a chance to claim it.
        await ctx.db.patch(doc._id, { updatedAt: now });
        await ctx.scheduler.runAfter(
          0,
          status === "queued"
            ? internal.largeDocumentIngestion.startSharding
            : internal.largeDocumentIngestion.processNextShard,
          { docId: doc._id },
        );
        resumed++;
      }
    }
    if (resumed > 0) console.log(`resumeStalled: restarted ${resumed} stalled large document(s)`);
    return resumed;
  },
});
