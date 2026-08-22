import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireIngestSecret } from "./lib/ingestAuth";

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
  storageId: v.id("_storage"),
  totalPages: v.optional(v.number()),
  totalShards: v.optional(v.number()),
  shardsCompleted: v.number(),
  pagesProcessed: v.number(),
  totalChunks: v.number(),
  errorMessage: v.optional(v.string()),
  retryCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Created via the Supabase bridge (create-large-document edge function,
// which verifies Supabase auth first) — never called directly from the
// browser, so `ownerId` here is always a value Supabase already verified,
// same trust model as requireIngestSecret elsewhere in this file.
export const create = mutation({
  args: { secret: v.string(), ownerId: v.string(), name: v.string(), storageId: v.id("_storage") },
  returns: v.id("largeDocuments"),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    const now = Date.now();
    return await ctx.db.insert("largeDocuments", {
      ownerId: args.ownerId,
      name: args.name,
      status: "queued",
      storageId: args.storageId,
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

export const listByOwner = query({
  args: { ownerId: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(largeDocumentValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("largeDocuments")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const searchByName = query({
  args: { ownerId: v.string(), searchQuery: v.string(), matchCount: v.optional(v.number()) },
  returns: v.array(largeDocumentValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("largeDocuments")
      .withSearchIndex("search_name", (q) => q.search("name", args.searchQuery).eq("ownerId", args.ownerId))
      .take(args.matchCount ?? 10);
  },
});

// ─── Internal — called only from the "use node" orchestration actions in
// largeDocumentIngestion.ts, never directly by a client or the HTTP bridge.

export const markSharding = internalMutation({
  args: { docId: v.id("largeDocuments"), totalPages: v.number(), totalShards: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, {
      status: "processing",
      totalPages: args.totalPages,
      totalShards: args.totalShards,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordShardProgress = internalMutation({
  args: { docId: v.id("largeDocuments"), pagesInShard: v.number(), chunksInShard: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc) return null;
    await ctx.db.patch(args.docId, {
      shardsCompleted: doc.shardsCompleted + 1,
      pagesProcessed: doc.pagesProcessed + args.pagesInShard,
      totalChunks: doc.totalChunks + args.chunksInShard,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markReady = internalMutation({
  args: { docId: v.id("largeDocuments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, { status: "ready", updatedAt: Date.now() });
    return null;
  },
});

export const markError = internalMutation({
  args: { docId: v.id("largeDocuments"), errorMessage: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, { status: "error", errorMessage: args.errorMessage, updatedAt: Date.now() });
    return null;
  },
});
