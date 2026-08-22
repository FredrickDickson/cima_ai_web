import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  libraryDocuments: defineTable({
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
    // Dedup key equivalent to Supabase's storage_path uniqueness (see
    // buildStoragePath() in scripts/ingest-law-reports.mjs) — lets ingestion
    // re-run idempotently against Convex the same way it does against Supabase.
    sourceKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_jurisdiction", ["jurisdiction"])
    .index("by_sourceType", ["sourceType"])
    .index("by_ingestionStatus", ["ingestionStatus"])
    .index("by_sourceKey", ["sourceKey"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["sourceType", "court", "decidedYear", "jurisdiction"],
    }),

  libraryChunks: defineTable({
    docId: v.id("libraryDocuments"),
    chunkIndex: v.number(),
    title: v.string(),
    citation: v.optional(v.string()),
    content: v.string(),
    embedding: v.array(v.float64()), // 384-dim, BAAI/bge-small-en-v1.5 — same model as Supabase
    sourceType: v.string(),
    jurisdiction: v.string(),
  })
    .index("by_docId", ["docId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["jurisdiction", "sourceType"],
    })
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["jurisdiction", "sourceType"],
    }),

  // ─── Large user-uploaded documents (>~2,000 pages) ──────────────────────
  // Separate from libraryDocuments/libraryChunks (the legal-library corpus)
  // — these are user uploads, owned by a Supabase auth user id (auth stays
  // on Supabase for now), routed here instead of the small-document path
  // (Supabase documents/document_chunks) specifically because they exceed
  // what a single serverless request/browser session can process — see the
  // large-document ingestion plan.
  largeDocuments: defineTable({
    ownerId: v.string(), // Supabase auth.users.id
    name: v.string(),
    status: v.union(
      v.literal("queued"), // uploaded, not yet sharded
      v.literal("sharding"), // page count known, splitting into shards
      v.literal("processing"), // shards extracting/chunking
      v.literal("ready"),
      v.literal("error"),
    ),
    storageId: v.id("_storage"), // raw uploaded PDF, read by each shard
    totalPages: v.optional(v.number()),
    totalShards: v.optional(v.number()),
    shardsCompleted: v.number(),
    pagesProcessed: v.number(),
    totalChunks: v.number(),
    errorMessage: v.optional(v.string()),
    retryCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["ownerId"] }),

  documentShards: defineTable({
    parentDocId: v.id("largeDocuments"),
    shardIndex: v.number(),
    pageStart: v.number(), // 1-based, inclusive
    pageEnd: v.number(), // 1-based, inclusive
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
  })
    .index("by_parentDoc", ["parentDocId"])
    .index("by_parentDoc_status", ["parentDocId", "status"])
    .index("by_parentDoc_shardIndex", ["parentDocId", "shardIndex"]),

  documentChunks: defineTable({
    docId: v.id("largeDocuments"),
    shardId: v.id("documentShards"),
    chunkIndex: v.number(), // global index within the document, deterministic
    pageStart: v.number(), // 1-based, inclusive — required for citation-quality retrieval
    pageEnd: v.number(),
    content: v.string(),
    // Embedding intentionally deferred (see legal-retrieval.ts's getEmbedding —
    // disabled this session, no working provider) — a future decoupled
    // backfill job would set embedding and flip needsEmbedding to false,
    // never blocking ingestion on it.
    embedding: v.optional(v.array(v.float64())),
    needsEmbedding: v.boolean(),
  })
    .index("by_docId", ["docId"])
    .index("by_docId_chunkIndex", ["docId", "chunkIndex"])
    .index("by_shardId", ["shardId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["docId"],
    }),
});
