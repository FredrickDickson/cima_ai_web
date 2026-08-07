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
});
