import { v, Infer } from "convex/values";
import { internalQuery, internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireIngestSecret } from "./lib/ingestAuth";
import { stripWatermarks, containsWatermark } from "./lib/sanitizeText";

const chunkResultValidator = v.object({
  _id: v.id("libraryChunks"),
  docId: v.id("libraryDocuments"),
  chunkIndex: v.number(),
  title: v.string(),
  citation: v.optional(v.string()),
  content: v.string(),
  sourceType: v.string(),
  jurisdiction: v.string(),
  similarity: v.optional(v.number()),
});

// Full-text fallback over chunk content — mirrors search_legal_library_fts.
// Internal: only ever called from convex/http.ts's /searchLibrary action
// (server-to-server from the Supabase legal-search edge function), never
// directly by the browser client.
export const fullTextSearch = internalQuery({
  args: {
    searchQuery: v.string(),
    jurisdiction: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    matchCount: v.optional(v.number()),
  },
  returns: v.array(chunkResultValidator),
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("libraryChunks")
      .withSearchIndex("search_content", (q) => {
        let base = q.search("content", args.searchQuery);
        if (args.jurisdiction) base = base.eq("jurisdiction", args.jurisdiction);
        if (args.sourceType) base = base.eq("sourceType", args.sourceType);
        return base;
      })
      .take(args.matchCount ?? 6);
    return results.map((r) => ({
      _id: r._id,
      docId: r.docId,
      chunkIndex: r.chunkIndex,
      title: r.title,
      citation: r.citation,
      content: r.content,
      sourceType: r.sourceType,
      jurisdiction: r.jurisdiction,
    }));
  },
});

// Hydrates vectorSearch's {_id, _score} hits into full rows, preserving order.
export const hydrateByIds = internalQuery({
  args: { ids: v.array(v.id("libraryChunks")), scores: v.record(v.id("libraryChunks"), v.number()) },
  returns: v.array(chunkResultValidator),
  handler: async (ctx, args) => {
    const out: Infer<typeof chunkResultValidator>[] = [];
    for (const id of args.ids) {
      const c = await ctx.db.get(id);
      if (!c) continue;
      out.push({
        _id: c._id,
        docId: c.docId,
        chunkIndex: c.chunkIndex,
        title: c.title,
        citation: c.citation,
        content: c.content,
        sourceType: c.sourceType,
        jurisdiction: c.jurisdiction,
        similarity: args.scores[id],
      });
    }
    return out;
  },
});

// Vector search — mirrors match_legal_library. Must be an action: Convex's
// ctx.vectorSearch is only available outside the transactional query/mutation
// context. Internal for the same reason as fullTextSearch above.
export const vectorSearch = internalAction({
  args: {
    embedding: v.array(v.float64()),
    matchCount: v.number(),
    jurisdiction: v.optional(v.string()),
    sourceType: v.optional(v.string()),
  },
  returns: v.array(chunkResultValidator),
  handler: async (ctx, args) => {
    // The vector index's filter only supports equality (and OR across values
    // of the *same* field) — no AND across different fields. When both
    // jurisdiction and sourceType are given, push the more selective one
    // (jurisdiction) into the vector filter and apply sourceType as a
    // post-filter after hydration instead.
    const hits = await ctx.vectorSearch("libraryChunks", "by_embedding", {
      vector: args.embedding,
      limit: args.matchCount,
      ...(args.jurisdiction
        ? { filter: (q) => q.eq("jurisdiction", args.jurisdiction!) }
        : args.sourceType
          ? { filter: (q) => q.eq("sourceType", args.sourceType!) }
          : {}),
    });

    const scores = Object.fromEntries(hits.map((h) => [h._id, h._score]));
    const ids = hits.map((h) => h._id);
    // Explicit type annotation works around TS circularity when calling a
    // function in the same file via ctx.runQuery.
    const hydrated: Infer<typeof chunkResultValidator>[] = await ctx.runQuery(
      internal.libraryChunks.hydrateByIds,
      { ids, scores },
    );
    return args.jurisdiction && args.sourceType
      ? hydrated.filter((c) => c.sourceType === args.sourceType)
      : hydrated;
  },
});

// ─── Ingestion-only (public, secret-gated) ─────────────────────────────────

// Replaces all chunks for one document — mirrors the delete-then-insert
// pattern in ingest-law-reports.mjs (`legal_library.delete().eq('doc_id', ...)`
// followed by a fresh batch insert).
export const insertBatch = mutation({
  args: {
    secret: v.string(),
    docId: v.id("libraryDocuments"),
    chunks: v.array(
      v.object({
        chunkIndex: v.number(),
        title: v.string(),
        citation: v.optional(v.string()),
        content: v.string(),
        embedding: v.array(v.float64()),
        sourceType: v.string(),
        jurisdiction: v.string(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);

    const existing = await ctx.db
      .query("libraryChunks")
      .withIndex("by_docId", (q) => q.eq("docId", args.docId))
      .collect();
    for (const c of existing) await ctx.db.delete(c._id);

    for (const chunk of args.chunks) {
      await ctx.db.insert("libraryChunks", { docId: args.docId, ...chunk });
    }
    return args.chunks.length;
  },
});

// One-off backfill: strips watermarks (see convex/lib/sanitizeText.ts) that
// were already ingested before ingest-law-reports.mjs/ingest-legal-documents.mjs
// started sanitizing extracted text at ingest time. Paginated so a full-table
// clean can be driven from a Node script one page at a time — see
// scripts/clean-dennislawgh-watermark-convex.mjs. `dryRun` reports matches
// without patching, mirroring the existing Supabase backfill script's flag.
export const stripWatermarksBatch = mutation({
  args: {
    secret: v.string(),
    cursor: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    scanned: v.number(),
    cleaned: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);

    const page = await ctx.db
      .query("libraryChunks")
      .paginate({ cursor: args.cursor ?? null, numItems: 200 });

    let cleaned = 0;
    for (const chunk of page.page) {
      if (containsWatermark(chunk.content)) {
        cleaned++;
        if (!args.dryRun) {
          await ctx.db.patch(chunk._id, { content: stripWatermarks(chunk.content) });
        }
      }
    }

    return {
      scanned: page.page.length,
      cleaned,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});
