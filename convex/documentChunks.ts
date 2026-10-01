import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { internalMutation, internalQuery, query } from "./_generated/server";

const chunkResultValidator = v.object({
  _id: v.id("documentChunks"),
  docId: v.id("largeDocuments"),
  chunkIndex: v.number(),
  pageStart: v.number(),
  pageEnd: v.number(),
  content: v.string(),
});

// Called only from largeDocumentIngestion.ts's shard-processing action.
// `chunkIndex` is assigned by the caller (a running offset read from the
// parent doc's totalChunks at the start of each shard — safe because
// shards process strictly sequentially, never in parallel, via self-chaining).
export const insertBatch = internalMutation({
  args: {
    docId: v.id("largeDocuments"),
    shardId: v.id("documentShards"),
    chunks: v.array(
      v.object({
        chunkIndex: v.number(),
        pageStart: v.number(),
        pageEnd: v.number(),
        content: v.string(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Deleted mid-ingestion (largeDocuments.removeMine): fail the shard
    // rather than leave chunks behind that purgeDeleted has already passed.
    if (!(await ctx.db.get(args.docId))) throw new Error("Document was deleted");
    for (const c of args.chunks) {
      await ctx.db.insert("documentChunks", {
        docId: args.docId,
        shardId: args.shardId,
        chunkIndex: c.chunkIndex,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        content: c.content,
        needsEmbedding: true,
      });
    }
    return args.chunks.length;
  },
});

// Removes up to `limit` chunks a shard already inserted — run (until it
// returns 0) before a shard is retried, since an attempt that died mid-way
// leaves a partial set behind and the retry re-inserts from the same
// chunkIndex. A first attempt finds nothing and costs one index read.
export const deleteShardChunks = internalMutation({
  args: { shardId: v.id("documentShards"), limit: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_shardId", (q) => q.eq("shardId", args.shardId))
      .take(args.limit);
    for (const c of chunks) await ctx.db.delete(c._id);
    return chunks.length;
  },
});

// The opening chunks of a document, in order — retrieval's fallback when a
// tagged large document has no full-text match for the question (or no
// question at all), mirroring the small-document path's from-the-start
// fallback in tagged-authorities.ts.
export const firstChunks = internalQuery({
  args: { docId: v.id("largeDocuments"), count: v.number() },
  returns: v.array(chunkResultValidator),
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_docId_chunkIndex", (q) => q.eq("docId", args.docId))
      .take(Math.min(args.count, 20));
    return chunks.map((c) => ({
      _id: c._id,
      docId: c.docId,
      chunkIndex: c.chunkIndex,
      pageStart: c.pageStart,
      pageEnd: c.pageEnd,
      content: c.content,
    }));
  },
});

// Full-text search scoped to one document — mirrors search_document_chunks_fts
// on the Supabase side. Internal: reached only via the Supabase bridge HTTP
// route (supabase/functions/_shared/tagged-authorities.ts calling into
// Convex), matching how legal-library search is bridged today.
export const fullTextSearch = internalQuery({
  args: { docId: v.id("largeDocuments"), searchQuery: v.string(), matchCount: v.optional(v.number()) },
  returns: v.array(chunkResultValidator),
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("documentChunks")
      .withSearchIndex("search_content", (q) => q.search("content", args.searchQuery).eq("docId", args.docId))
      .take(args.matchCount ?? 6);
    return results.map((r) => ({
      _id: r._id,
      docId: r.docId,
      chunkIndex: r.chunkIndex,
      pageStart: r.pageStart,
      pageEnd: r.pageEnd,
      content: r.content,
    }));
  },
});

// Paginated read of every chunk for a document, in order — used by a future
// full-document viewer. Never used for retrieval (that's fullTextSearch);
// this is for display.
export const getChunksPage = query({
  args: { docId: v.id("largeDocuments"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(chunkResultValidator),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("documentChunks")
      .withIndex("by_docId_chunkIndex", (q) => q.eq("docId", args.docId))
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((c) => ({
        _id: c._id,
        docId: c.docId,
        chunkIndex: c.chunkIndex,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        content: c.content,
      })),
    };
  },
});
