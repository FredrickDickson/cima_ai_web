import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { query, mutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireIngestSecret } from "./lib/ingestAuth";

// Upper bound on libraryCounts rows read per query (jurisdictions × types ×
// courts × years is a few hundred today).
const MAX_COUNT_ROWS = 5000;

type CountKey = Pick<Doc<"libraryDocuments">, "jurisdiction" | "sourceType" | "court" | "decidedYear">;

// Adds `delta` to the libraryCounts row for this doc's filter combination.
// Only completed docs are counted — that's all the Library shows.
async function adjustCount(
  ctx: MutationCtx,
  doc: CountKey & { ingestionStatus: Doc<"libraryDocuments">["ingestionStatus"] },
  delta: number,
) {
  if (doc.ingestionStatus !== "completed" || delta === 0) return;
  const court = doc.court ?? "";
  const row = await ctx.db
    .query("libraryCounts")
    .withIndex("by_jurisdiction_and_sourceType_and_court_and_decidedYear", (q) =>
      q
        .eq("jurisdiction", doc.jurisdiction)
        .eq("sourceType", doc.sourceType)
        .eq("court", court)
        .eq("decidedYear", doc.decidedYear),
    )
    .unique();
  if (row) {
    await ctx.db.patch(row._id, { count: row.count + delta });
  } else {
    await ctx.db.insert("libraryCounts", {
      jurisdiction: doc.jurisdiction,
      sourceType: doc.sourceType,
      court,
      ...(doc.decidedYear !== undefined ? { decidedYear: doc.decidedYear } : {}),
      count: delta,
    });
  }
}

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
  legacyId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Paginated browse/filter list — mirrors the old Supabase browse query
// (ingestion_status = 'completed', newest decided_year first, optional
// source_type/court/decided_year/jurisdiction filters). Filters run *before*
// paginate() so each page is full rather than a filtered-down page of 30.
// With no jurisdiction, the index keeps same-jurisdiction docs contiguous so
// Library.tsx's per-jurisdiction section headers still work.
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
    const { jurisdiction, sourceType, court, decidedYear } = args;
    const ordered = ctx.db
      .query("libraryDocuments")
      .withIndex("by_ingestionStatus_and_jurisdiction_and_decidedYear", (q) => {
        const completed = q.eq("ingestionStatus", "completed");
        if (!jurisdiction) return completed;
        const inJurisdiction = completed.eq("jurisdiction", jurisdiction);
        return decidedYear !== undefined ? inJurisdiction.eq("decidedYear", decidedYear) : inJurisdiction;
      })
      .order("desc");

    const filtered =
      sourceType || court || (decidedYear !== undefined && !jurisdiction)
        ? ordered.filter((q) =>
            q.and(
              sourceType ? q.eq(q.field("sourceType"), sourceType) : true,
              court ? q.eq(q.field("court"), court) : true,
              decidedYear !== undefined && !jurisdiction ? q.eq(q.field("decidedYear"), decidedYear) : true,
            ),
          )
        : ordered;

    return await filtered.paginate(args.paginationOpts);
  },
});

// Sidebar jurisdiction counts — mirrors get_library_jurisdiction_counts.
// Reads the small libraryCounts table (one row per jurisdiction/type/court/
// year combination) rather than every document.
export const jurisdictionCounts = query({
  args: {
    sourceType: v.optional(v.string()),
    court: v.optional(v.string()),
    decidedYear: v.optional(v.number()),
  },
  returns: v.array(v.object({ jurisdiction: v.string(), count: v.number() })),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("libraryCounts").take(MAX_COUNT_ROWS);
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (args.sourceType && r.sourceType !== args.sourceType) continue;
      if (args.court && r.court !== args.court) continue;
      if (args.decidedYear !== undefined && r.decidedYear !== args.decidedYear) continue;
      counts.set(r.jurisdiction, (counts.get(r.jurisdiction) ?? 0) + r.count);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([jurisdiction, count]) => ({ jurisdiction, count }));
  },
});

// Title/citation/court keyword search — mirrors search_legal_library_documents.
// court/jurisdiction/decidedYear are search-index filter fields, so they narrow
// the search itself instead of trimming an already-capped result list.
export const searchByTitle = query({
  args: {
    searchQuery: v.string(),
    sourceType: v.optional(v.union(v.literal("case"), v.literal("statute"))),
    court: v.optional(v.string()),
    jurisdiction: v.optional(v.string()),
    decidedYear: v.optional(v.number()),
    matchCount: v.optional(v.number()),
  },
  returns: v.array(libraryDocumentValidator),
  handler: async (ctx, args) => {
    const { sourceType, court, jurisdiction, decidedYear } = args;
    const results = await ctx.db
      .query("libraryDocuments")
      .withSearchIndex("search_title", (sq) => {
        let base = sq.search("title", args.searchQuery);
        if (sourceType) base = base.eq("sourceType", sourceType);
        if (court) base = base.eq("court", court);
        if (jurisdiction) base = base.eq("jurisdiction", jurisdiction);
        if (decidedYear !== undefined) base = base.eq("decidedYear", decidedYear);
        return base;
      })
      .take(args.matchCount ?? 10);
    return results.filter((d) => d.ingestionStatus === "completed");
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

// Cap on getWithChunks's collect() — an unbounded collect() blows Convex's
// per-query transaction limits (32,000 documents scanned) once a document
// has more chunks than that, which a large document easily can. This is a
// stopgap for the existing single-document viewer (LibraryDocument.tsx),
// which reads and renders every chunk at once; a genuinely paginated viewer
// (getChunksPage below) is what large documents need, not a bigger cap.
const GET_WITH_CHUNKS_MAX = 2000;

// Doc + its ordered chunks (up to GET_WITH_CHUNKS_MAX) in one call — mirrors
// get_legal_library_document. `truncated` is true when the document has more
// chunks than that; callers wanting the rest should page through
// getChunksPage instead of raising this cap.
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
      truncated: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.docId);
    if (!document) return null;
    const page = await ctx.db
      .query("libraryChunks")
      .withIndex("by_docId", (q) => q.eq("docId", args.docId))
      .paginate({ cursor: null, numItems: GET_WITH_CHUNKS_MAX });
    const chunks = [...page.page].sort((a, b) => a.chunkIndex - b.chunkIndex);
    return {
      document,
      chunks: chunks.map((c) => ({
        _id: c._id,
        chunkIndex: c.chunkIndex,
        title: c.title,
        citation: c.citation,
        content: c.content,
      })),
      truncated: !page.isDone,
    };
  },
});

// Genuinely paginated chunk read for large documents — getWithChunks caps at
// GET_WITH_CHUNKS_MAX; use this to page through the rest.
export const getChunksPage = query({
  args: { docId: v.id("libraryDocuments"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      _id: v.id("libraryChunks"),
      chunkIndex: v.number(),
      title: v.string(),
      citation: v.optional(v.string()),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("libraryChunks")
      .withIndex("by_docId", (q) => q.eq("docId", args.docId))
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((c) => ({
        _id: c._id,
        chunkIndex: c.chunkIndex,
        title: c.title,
        citation: c.citation,
        content: c.content,
      })),
    };
  },
});

// Resolves a Supabase legal_library_documents UUID (old /library/:uuid links,
// stored citations) to the migrated Convex doc.
export const getByLegacyId = query({
  args: { legacyId: v.string() },
  returns: v.union(libraryDocumentValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("libraryDocuments")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", args.legacyId))
      .unique();
  },
});

// For convex/http.ts's edge-function routes: resolves each id — a Convex id or
// an old Supabase UUID — to its doc, preserving input order and dropping
// unknown ids. Edge functions only ever hold string ids from the browser.
export const resolveMany = internalQuery({
  args: { ids: v.array(v.string()) },
  returns: v.array(libraryDocumentValidator),
  handler: async (ctx, args) => {
    const out = [];
    for (const raw of args.ids.slice(0, 100)) {
      const id = ctx.db.normalizeId("libraryDocuments", raw);
      const doc = id
        ? await ctx.db.get(id)
        : await ctx.db
            .query("libraryDocuments")
            .withIndex("by_legacyId", (q) => q.eq("legacyId", raw))
            .unique();
      if (doc) out.push(doc);
    }
    return out;
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

// Paginated alternative to listSourceKeys — that one collect()s the whole
// table, which stops fitting in one query's read limits once the full
// Supabase corpus (~18k docs) has been migrated.
export const listSourceKeysPage = query({
  args: { secret: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(
    v.object({
      _id: v.id("libraryDocuments"),
      sourceKey: v.string(),
      ingestionStatus: libraryDocumentValidator.fields.ingestionStatus,
      hasLegacyId: v.boolean(),
      hasStorageId: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    const page = await ctx.db.query("libraryDocuments").paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((d) => ({
        _id: d._id,
        sourceKey: d.sourceKey,
        ingestionStatus: d.ingestionStatus,
        hasLegacyId: d.legacyId !== undefined,
        hasStorageId: d.storageId !== undefined,
      })),
    };
  },
});

// Back-links a doc that was already in Convex before the migration (ingested
// straight into Convex) to its Supabase twin's UUID, so old links resolve.
export const setLegacyId = mutation({
  args: { secret: v.string(), docId: v.id("libraryDocuments"), legacyId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    await ctx.db.patch(args.docId, { legacyId: args.legacyId, updatedAt: Date.now() });
    return null;
  },
});

// Attaches an original file (uploaded via files.generateUploadUrl) to an
// already-migrated doc — used by the storage backfill, which runs after the
// text/chunks have been copied.
export const setStorageId = mutation({
  args: { secret: v.string(), docId: v.id("libraryDocuments"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    await ctx.db.patch(args.docId, { storageId: args.storageId, updatedAt: Date.now() });
    return null;
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
    legacyId: v.optional(v.string()),
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
      await adjustCount(ctx, existing, -1);
      await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
      await adjustCount(ctx, { ...existing, ...fields }, 1);
      return existing._id;
    }
    const docId = await ctx.db.insert("libraryDocuments", { ...fields, createdAt: now, updatedAt: now });
    await adjustCount(ctx, fields, 1);
    return docId;
  },
});

// ─── libraryCounts rebuild (see scripts/rebuild-library-counts.mjs) ────────
// Two steps, driven one transaction at a time by the script: clear the table,
// then fold in the documents page by page.

export const clearCountsBatch = mutation({
  args: { secret: v.string() },
  returns: v.object({ deleted: v.number(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    const rows = await ctx.db.query("libraryCounts").take(1000);
    for (const r of rows) await ctx.db.delete(r._id);
    return { deleted: rows.length, isDone: rows.length < 1000 };
  },
});

export const accumulateCountsPage = mutation({
  args: { secret: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ counted: v.number(), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    requireIngestSecret(args.secret);
    const page = await ctx.db
      .query("libraryDocuments")
      .withIndex("by_ingestionStatus", (q) => q.eq("ingestionStatus", "completed"))
      .paginate(args.paginationOpts);
    // Group within the page first so each counts row is touched once per page.
    const grouped = new Map<string, { key: CountKey; n: number }>();
    for (const d of page.page) {
      const k = JSON.stringify([d.jurisdiction, d.sourceType, d.court ?? "", d.decidedYear ?? null]);
      const g = grouped.get(k) ?? { key: d, n: 0 };
      g.n++;
      grouped.set(k, g);
    }
    for (const { key, n } of grouped.values()) {
      await adjustCount(ctx, { ...key, ingestionStatus: "completed" }, n);
    }
    return { counted: page.page.length, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
