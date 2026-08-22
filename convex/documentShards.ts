import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const shardValidator = v.object({
  _id: v.id("documentShards"),
  _creationTime: v.number(),
  parentDocId: v.id("largeDocuments"),
  shardIndex: v.number(),
  pageStart: v.number(),
  pageEnd: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("extracting"),
    v.literal("chunking"),
    v.literal("done"),
    v.literal("error"),
  ),
  chunksInserted: v.number(),
  errorMessage: v.optional(v.string()),
  retryCount: v.number(),
});

// ~500 pages/shard: per the ingestion plan's blast-radius/parallelism/
// partial-availability reasoning, not a performance requirement — measured
// extraction throughput (20,000 pages in ~55s inside a Convex action) means
// a shard this size finishes in low single-digit seconds either way.
export const PAGES_PER_SHARD = 500;

// Creates all shard rows for a document up front (pending), given its page
// count. Plain mutation — the actual page-count lookup (which needs pdfium)
// happens in the calling "use node" action in largeDocumentIngestion.ts.
export const createShards = internalMutation({
  args: { parentDocId: v.id("largeDocuments"), totalPages: v.number() },
  returns: v.array(v.id("documentShards")),
  handler: async (ctx, args) => {
    const shardIds: import("./_generated/dataModel").Id<"documentShards">[] = [];
    let shardIndex = 0;
    for (let pageStart = 1; pageStart <= args.totalPages; pageStart += PAGES_PER_SHARD) {
      const pageEnd = Math.min(pageStart + PAGES_PER_SHARD - 1, args.totalPages);
      const id = await ctx.db.insert("documentShards", {
        parentDocId: args.parentDocId,
        shardIndex,
        pageStart,
        pageEnd,
        status: "pending",
        chunksInserted: 0,
        retryCount: 0,
      });
      shardIds.push(id);
      shardIndex++;
    }
    return shardIds;
  },
});

export const getShard = internalQuery({
  args: { shardId: v.id("documentShards") },
  returns: v.union(shardValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.shardId),
});

// Next not-yet-done shard for a document, ordered by shardIndex — drives
// the self-chaining sequential processing loop.
export const getNextPendingShard = internalQuery({
  args: { parentDocId: v.id("largeDocuments") },
  returns: v.union(shardValidator, v.null()),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("documentShards")
      .withIndex("by_parentDoc_status", (q) => q.eq("parentDocId", args.parentDocId).eq("status", "pending"))
      .order("asc")
      .first();
    return pending;
  },
});

export const setShardStatus = internalMutation({
  args: {
    shardId: v.id("documentShards"),
    status: v.union(v.literal("extracting"), v.literal("chunking"), v.literal("done"), v.literal("error")),
    chunksInserted: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.chunksInserted !== undefined) patch.chunksInserted = args.chunksInserted;
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;
    await ctx.db.patch(args.shardId, patch);
    return null;
  },
});

export const incrementShardRetry = internalMutation({
  args: { shardId: v.id("documentShards") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const shard = await ctx.db.get(args.shardId);
    if (!shard) return 0;
    const retryCount = shard.retryCount + 1;
    await ctx.db.patch(args.shardId, { retryCount });
    return retryCount;
  },
});
