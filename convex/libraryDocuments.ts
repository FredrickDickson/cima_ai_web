import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireIngestSecret } from "./lib/ingestAuth";

export const libraryDocumentValidator = v.object({
  _id: v.id("libraryDocuments"),
  _creationTime: v.number(),
  title: v.string(),
  sourceType: v.union(v.literal("case"), v.literal("statute")),
  jurisdiction: v.string(),
  citation: v.optional(v.string()),
  court: v.optional(v.string()),
  decidedYear: v.optional(v.number()),
  parties: v.array(v.object({ role: v.string(), name: v.string() })),
  legislationNumber: v.optional(v.string()),
  storageId: v.optional(v.id("_storage")),
  originalFormat: v.union(v.literal("docx"), v.literal("pdf"), v.literal("htm-text")),
  sourceCollection: v.optional(v.string()),
  extractedCharCount: v.number(),
  ingestionStatus: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  errorMessage: v.optional(v.string()),
  sourceKey: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Paginated browse/filter list — mirrors Library.tsx's fetchPage() against
// Supabase's legal_library_documents (source_type/court/decided_year/jurisdiction
// filters, ingestion_status = 'completed').
export const list = query({
  args: {
    jurisdiction: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    court: v.optional(v.string()),
    decidedYear: v.optional(v.number()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(libraryDocumentValidator),
  handler: async (ctx, args) => {
    const base = args.jurisdiction
      ? ctx.db
          .query("libraryDocuments")
          .withIndex("by_jurisdiction", (q) => q.eq("jurisdiction", args.jurisdiction!))
      : ctx.db
          .query("libraryDocuments")
          .withIndex("by_ingestionStatus", (q) => q.eq("ingestionStatus", "completed"));

    const page = await base.order("desc").paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.filter(
        (d) =>
          d.ingestionStatus === "completed" &&
          (!args.sourceType || d.sourceType === args.sourceType) &&
          (!args.court || d.court === args.court) &&
          (!args.decidedYear || d.decidedYear === args.decidedYear),
      ),
    };
  },
});

// Sidebar jurisdiction counts — mirrors get_library_jurisdiction_counts.
// v1 scope note: reads the completed-docs index and groups in JS. Fine while
// the Convex-hosted corpus (only "remaining" docs, per the migration plan) is
// modest; if it grows large, replace with @convex-dev/aggregate rather than
// widening this collect().
export const jurisdictionCounts = query({
  args: {
    sourceType: v.optional(v.string()),
    court: v.optional(v.string()),
    decidedYear: v.optional(v.number()),
  },
  returns: v.array(v.object({ jurisdiction: v.string(), count: v.number() })),
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("libraryDocuments")
      .withIndex("by_ingestionStatus", (q) => q.eq("ingestionStatus", "completed"))
      .collect();

    const counts = new Map<string, number>();
    for (const d of docs) {
      if (args.sourceType && d.sourceType !== args.sourceType) continue;
      if (args.court && d.court !== args.court) continue;
      if (args.decidedYear && d.decidedYear !== args.decidedYear) continue;
      counts.set(d.jurisdiction, (counts.get(d.jurisdiction) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([jurisdiction, count]) => ({ jurisdiction, count }));
  },
});

// Title/citation/court keyword search — mirrors search_legal_library_documents.
export const searchByTitle = query({
  args: {
    searchQuery: v.string(),
    sourceType: v.optional(v.union(v.literal("case"), v.literal("statute"))),
    court: v.optional(v.string()),
    matchCount: v.optional(v.number()),
  },
  returns: v.array(libraryDocumentValidator),
  handler: async (ctx, args) => {
    const sourceType = args.sourceType;
    const q = ctx.db
      .query("libraryDocuments")
      .withSearchIndex("search_title", (sq) => {
        const base = sq.search("title", args.searchQuery);
        return sourceType ? base.eq("sourceType", sourceType) : base;
      });
    const results = await q.take(args.matchCount ?? 10);
    return args.court ? results.filter((d) => d.court === args.court) : results;
  },
});

// Hydrates a set of doc IDs into full metadata rows, preserving input order —
// used to turn legal-search's chunk-level semantic-search hits (which only
// carry title/citation/content, not court/decidedYear/parties) into full
// cards, the same way Supabase hits get re-hydrated from legal_library_documents.
export const getManyByIds = query({
  args: { ids: v.array(v.id("libraryDocuments")) },
  returns: v.array(libraryDocumentValidator),
  handler: async (ctx, args) => {
    const out = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc) out.push(doc);
    }
    return out;
  },
});

// Doc + all its ordered chunks in one call — mirrors get_legal_library_document.
export const getWithChunks = query({
  args: { docId: v.id("libraryDocuments") },
  returns: v.union(
    v.object({
      document: libraryDocumentValidator,
      chunks: v.array(
        v.object({
          _id: v.id("libraryChunks"),
          chunkIndex: v.number(),
          title: v.string(),
          citation: v.optional(v.string()),
          content: v.string(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.docId);
    if (!document) return null;
    const chunks = await ctx.db
      .query("libraryChunks")
      .withIndex("by_docId", (q) => q.eq("docId", args.docId))
      .collect();
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    return {
      document,
      chunks: chunks.map((c) => ({
        _id: c._id,
        chunkIndex: c.chunkIndex,
        title: c.title,
        citation: c.citation,
        content: c.content,
      })),
    };
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ─── Ingestion-only (public, secret-gated — see convex/lib/ingestAuth.ts) ──

export const listSourceKeys = query({
  args: { secret: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    const docs = await ctx.db.query("libraryDocuments").collect();
    return docs.map((d) => d.sourceKey);
  },
});

export const upsertDocument = mutation({
  args: {
    secret: v.string(),
    title: v.string(),
    sourceType: v.union(v.literal("case"), v.literal("statute")),
    jurisdiction: v.string(),
    citation: v.optional(v.string()),
    court: v.optional(v.string()),
    decidedYear: v.optional(v.number()),
    parties: v.array(v.object({ role: v.string(), name: v.string() })),
    legislationNumber: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    originalFormat: v.union(v.literal("docx"), v.literal("pdf"), v.literal("htm-text")),
    sourceCollection: v.optional(v.string()),
    extractedCharCount: v.number(),
    ingestionStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    errorMessage: v.optional(v.string()),
    sourceKey: v.string(),
  },
  returns: v.id("libraryDocuments"),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    const { secret: _secret, ...fields } = args;
    const now = Date.now();

    const existing = await ctx.db
      .query("libraryDocuments")
      .withIndex("by_sourceKey", (q) => q.eq("sourceKey", args.sourceKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("libraryDocuments", { ...fields, createdAt: now, updatedAt: now });
  },
});
