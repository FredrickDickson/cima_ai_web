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
    // Supabase legal_library_documents.id for docs copied over by
    // scripts/migrate-legal-library-to-convex.mjs — keeps old /library/:uuid
    // links and stored citations resolvable after the Supabase tables are dropped.
    legacyId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_jurisdiction", ["jurisdiction"])
    .index("by_sourceType", ["sourceType"])
    .index("by_ingestionStatus", ["ingestionStatus"])
    .index("by_sourceKey", ["sourceKey"])
    .index("by_legacyId", ["legacyId"])
    // Library browse order: newest decided year first, optionally within one
    // jurisdiction (mirrors the old Supabase .order("decided_year", desc)).
    .index("by_ingestionStatus_and_jurisdiction_and_decidedYear", [
      "ingestionStatus",
      "jurisdiction",
      "decidedYear",
    ])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["sourceType", "court", "decidedYear", "jurisdiction"],
    }),

  // Denormalized count of *completed* libraryDocuments per filter combination —
  // kept in step by upsertDocument (same transaction), so the Library sidebar's
  // jurisdiction counts read a few hundred rows instead of every document.
  // Rebuilt from scratch by scripts/rebuild-library-counts.mjs.
  libraryCounts: defineTable({
    jurisdiction: v.string(),
    sourceType: v.string(),
    court: v.string(), // "" when the doc has no court (e.g. legislation)
    decidedYear: v.optional(v.number()),
    count: v.number(),
  }).index("by_jurisdiction_and_sourceType_and_court_and_decidedYear", [
    "jurisdiction",
    "sourceType",
    "court",
    "decidedYear",
  ]),

  libraryChunks: defineTable({
    docId: v.id("libraryDocuments"),
    chunkIndex: v.number(),
    title: v.string(),
    citation: v.optional(v.string()),
    content: v.string(),
    // 384-dim, BAAI/bge-small-en-v1.5 — same model as Supabase. Optional because
    // some migrated Supabase rows have no embedding; the vector index simply
    // skips those, and full-text search still covers them.
    embedding: v.optional(v.array(v.float64())),
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

  // ─── User files (replaces the Supabase `documents` / `avatars` /
  // `legal-documents` storage buckets) ────────────────────────────────────
  // The bytes live in Convex storage; Supabase rows reference them as
  // "convex:<storageId>.<ext>" (documents.storage_path, ghana_laws.file_path)
  // or by URL (profiles.avatar_url). See convex/userFiles.ts.
  userFiles: defineTable({
    ownerId: v.string(), // Supabase auth.users.id, verified from the caller's access token
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.optional(v.string()),
    size: v.number(),
    kind: v.union(v.literal("document"), v.literal("contract"), v.literal("avatar"), v.literal("admin")),
    createdAt: v.number(),
  })
    .index("by_storageId", ["storageId"])
    .index("by_ownerId", ["ownerId"]),

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
    // Raw uploaded PDF, read by each shard. Absent until a multi-part upload
    // (see uploadParts) has been reassembled into one file.
    storageId: v.optional(v.id("_storage")),
    // The browser uploads big files as ~8MB parts — Convex upload URLs time
    // out after 2 minutes, which one 150MB request can't beat on a slow
    // connection. startSharding concatenates these into storageId first.
    uploadParts: v.optional(v.array(v.id("_storage"))),
    totalPages: v.optional(v.number()),
    totalShards: v.optional(v.number()),
    shardsCompleted: v.number(),
    pagesProcessed: v.number(),
    totalChunks: v.number(),
    errorMessage: v.optional(v.string()),
    retryCount: v.number(),
    // Set while an ingestion action owns this document (sharding it or
    // processing a shard); cleared when that step finishes. Outlasts
    // Convex's action time limit, so an expired lease means its holder is
    // dead — the resumeStalled cron uses that to restart a stalled chain.
    leaseUntil: v.optional(v.number()),
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
