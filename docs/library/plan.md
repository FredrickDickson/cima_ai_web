Ready for review
Select text to add comments on the plan
Legal Library (Law Reports) — Implementation Plan
Context
docs/library/library.md sketches a RAG-based legal library (Supabase Storage + pgvector + chunked embeddings + citations + a document viewer + "chat with a document"). The user has a local folder, assests/Law Reports/, containing 20,674 files (~1.08GB, 625 folders) of real Ghana case law and legislation — Supreme Court, Court of Appeal, High Court judgments, and constitutional instruments — that need to become part of the app's searchable legal library so the AI can cite them and users can browse/read them.

The app already has most of the RAG plumbing built, just not wired to real data or a UI:

legal_library table (chunked, embedded, pgvector) + match_legal_library/search_legal_library_fts RPCs
legal-search and ai-chat edge functions that already query legal_library
A working single-file ingestion edge function (ingest-legal-document) and a working local Node ingestion script (scripts/ingest-legal-documents.mjs) with the exact pdfjs-dist/mammoth/HuggingFace pattern needed
A legal-documents storage bucket + legal_document_ingestion status-tracking table
What's missing: (1) the schema has no way to group chunks back into a source document or link to the original file, (2) there is no frontend at all for browsing/viewing the library, (3) there is no bulk-ingestion path for 20k local files (existing tooling assumes one file at a time via UI upload), and (4) .htm (7,223 files) isn't a supported extraction format anywhere yet.

This plan reorganizes the data logically (via metadata + DB, not by moving the 20k source files around on disk — the original assests/Law Reports/ folder is left untouched as read-only source material) and builds the missing schema, ingestion, and UI pieces.

Confirmed decisions (from user):

Bulk embeddings: run locally via a self-hosted BAAI/bge-small-en-v1.5 model (e.g. @xenova/transformers / transformers.js, quantized ONNX build) — no network rate limits for the ~150k–250k chunk backfill. The live single-file edge function keeps using Hugging Face's API as-is (low volume, no change needed there).
.htm-sourced cases (7,223 files, "saved webpage" clutter with _files/ asset folders): store extracted plain text only as the "original" artifact — do not preserve raw HTML. No bucket MIME-type widening needed.
Document viewer ships in v1 with real page-rendered viewing (not deferred): PDF page rendering for .pdf-sourced docs, a formatted view for .docx-sourced docs, and a chunk-navigable text reader for .htm-sourced (text-only) docs.
1. Schema changes
New migration: supabase/migrations/20260720000000_library_documents_and_grouping.sql

Add a parent table so chunks in legal_library can be grouped back into one source document, plus a real FK (replacing the existing fragile ilike title delete-before-reinsert pattern used by ingest-legal-document and scripts/ingest-legal-documents.mjs):

CREATE TABLE legal_library_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT '',      -- reuse existing vocabulary: 'case' | 'statute'
  jurisdiction text NOT NULL DEFAULT 'ghana',
  citation text DEFAULT '',                  -- e.g. "[1973] 1 GLR 273-278" if parsed from filename
  court text DEFAULT '',                     -- 'Supreme Court' | 'Court of Appeal' | 'High Court' | NULL for legislation
  decided_year int,
  parties jsonb DEFAULT '[]'::jsonb,         -- best-effort [{role, name}, ...] parsed from filename
  legislation_number text DEFAULT '',        -- e.g. "C.I. 47"
  storage_path text,                         -- original (pdf/docx) or extracted-text (.txt for htm sources) artifact
  original_format text DEFAULT '',           -- 'docx' | 'pdf' | 'htm-text'
  source_collection text DEFAULT '',         -- which source folder branch, for audit/dedup traceability
  extracted_char_count int DEFAULT 0,
  ingestion_status text NOT NULL DEFAULT 'pending', -- pending|processing|completed|failed
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legal_library_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view library documents"
  ON legal_library_documents FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_llib_docs_source_type ON legal_library_documents(source_type);
CREATE INDEX idx_llib_docs_court ON legal_library_documents(court);
CREATE INDEX idx_llib_docs_year ON legal_library_documents(decided_year);
CREATE INDEX idx_llib_docs_title ON legal_library_documents(title);
CREATE UNIQUE INDEX idx_llib_docs_storage_path ON legal_library_documents(storage_path) WHERE storage_path IS NOT NULL;

ALTER TABLE legal_library
  ADD COLUMN doc_id uuid REFERENCES legal_library_documents(id) ON DELETE CASCADE,
  ADD COLUMN chunk_index int;
CREATE INDEX idx_legal_library_doc_id ON legal_library(doc_id);
doc_id is nullable so existing rows (e.g. Accra Arbitration Rules ingested previously) keep working untouched.

Also add/extend RPCs in the same migration:

get_legal_library_document(doc_id uuid) — returns parent row + ordered chunks (by chunk_index) in one call, for the viewer.
Extend match_legal_library's RETURNS TABLE to also project doc_id, and add an optional filter_doc_id param — needed for (a) real source-linking in legal-search results instead of today's fuzzy name-matching in Documents.tsx, and (b) document-scoped AI chat (Phase 4).
Reuse the existing source_type vocabulary ('case', 'statute') rather than inventing new values, so legal-search/ai-chat's existing filters keep working unchanged; finer distinctions (e.g. constitutional instrument vs. other statute) live in the new legislation_number/court columns instead.

2. Storage
Reuse the existing legal-documents bucket with a new library/ path prefix (bulk script uses the service-role key, which bypasses the bucket's per-user RLS entirely — no bucket recreation needed). Add one additive RLS policy so end users can read library files (they aren't the "owner" per the existing per-user foldername check):

CREATE POLICY "Authenticated users can view library files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'legal-documents' AND (storage.foldername(name))[1] = 'library');
Path convention: library/{source_type}/{court-or-legislation}/{year}/{sanitized-name}-{shortHash}.{ext} — the short hash (from the original relative path) guards against collisions after sanitizing ~80–100 char truncated citation filenames, and keeps the path stable/idempotent across script reruns.

.htm-sourced cases: extract text, discard the raw .htm + _files/ clutter, upload the extracted body as .txt at that same path convention (already an allowed MIME type — no bucket config change needed, per the confirmed decision).

3. Bulk ingestion script
New file: scripts/ingest-law-reports.mjs, forked from the existing working scripts/ingest-legal-documents.mjs (same .env/service-role/pdfjs-dist-in-Node pattern — do not fork the two orphaned scripts ingest-pdf.mjs/ingest-cima-rules.mjs, which target a dead superseded schema).

Pipeline per file:

Walk & filter assests/Law Reports/ recursively. Skip by content-based detection (not hardcoded year cutoffs): Thumbs.db, 0-byte .exe, .gif/.jpg/.png UI chrome, placeholder-only folders (year folders whose only files match known template patterns like TEMP.htm/bookflip.gif — this naturally excludes the empty 2024–2047 folders without hardcoding a year). MIME-sniff files with missing/truncated extensions via magic bytes (PK\x03\x04 → docx, %PDF → pdf, else treat as htm/text) instead of trusting extensions.
Dedup — exact-normalized-filename match only (not fuzzy — safer against false-merges of distinct "Republic v. X" style cases at 20k-file scale). Preference order .docx > .pdf > .htm when the same normalized case name + court + year appears in both a primary collection (COURT OF APPEAL, HIGH COURT, Supreme Court Cases) and its "A" duplicate (Court Of Appeal Cases A, High Court A). Same exact-match dedup for the 3 near-duplicate CI legislation scan folders. Log every dedup decision (not silent) for later review.
Extract text: .docx → mammoth.extractRawText (existing pattern); .pdf → pdfjs-dist/legacy/build/pdf.mjs page-by-page (existing pattern, including the Node worker-path fix already solved in ingest-legal-documents.mjs); .htm → new — add html-to-text as a dependency (real parser, not regex-stripping, since "saved webpage" HTML is often malformed). Enforce the same >= 50 chars minimum as the existing edge function; log (don't silently drop) failures — expect some old scanned-image PDFs with no text layer (OCR is out of scope for this pass; flagged as a possible follow-up once the real failure count from Phase 1's dry run is known).
Parse metadata from folder path + filename: court from the top-2 folder levels (normalized to Supreme Court/Court of Appeal/High Court), decided_year from the year folder, parties via regex split on v./v/vrs/VRS, citation via GLR-pattern regex (\[\d{4}\]\s*\d*\s*[A-Z]+\s*\d+) when present in the filename, legislation_number via \(C\.?I\.?\s*\d+\) for bons/ content.
Upload extracted/original artifact to storage (service-role client, upsert: true).
Chunk + embed + insert: reuse chunkByArticle/charChunk verbatim (statutes structurally chunk on Article/Section; case judgments will mostly fall through to the charChunk fallback, which is expected/fine). Embed via local model (new dependency — self-hosted BAAI/bge-small-en-v1.5, e.g. via @xenova/transformers, verified 384-dim output compatible with the existing vector(384) column/HNSW index — no network calls, no rate limits). Insert one legal_library_documents row per source file, then chunk rows into legal_library with doc_id/chunk_index set.
Resumability: key everything off legal_library_documents.storage_path (unique). Skip files already completed; on failed/stuck-processing, delete existing chunks for that doc_id and reprocess. Write a local JSONL run log (scripts/logs/law-reports-ingest-{timestamp}.jsonl) per file (path/status/doc_id/error) so failures are greppable without a DB query at this scale. Support --dry-run (walk/parse/dedup-report only, no writes), --limit=N, --only=<glob> for iterative testing, and --batch-size/--batch-delay-ms flags.
4. Frontend
Routing/nav (trivial, existing patterns): add <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} /> and <Route path="/library/:docId" element={<RequireAuth><LibraryDocument /></RequireAuth>} /> in src/App.tsx; add { to: "/library", icon: Library, label: "Legal Library" } to navItems in src/components/layout/Sidebar.tsx.

src/pages/Library.tsx — browse/filter view: query legal_library_documents directly (RLS allows any authenticated SELECT) with filters for source_type, court, decided_year, keyword search (ilike on title/citation). Semantic search mode mirrors Documents.tsx's existing AI-search toggle, calling legal-search — but now links results to documents via the real doc_id field (from the RPC/schema change in §1) instead of Documents.tsx's current fuzzy name-matching workaround. Requires a small change in supabase/functions/legal-search/index.ts where it builds sources[] from match_legal_library results, to include doc_id.

src/pages/LibraryDocument.tsx (/library/:docId) — the document viewer, fetching via the new get_legal_library_document RPC:

.pdf-sourced documents: real page-rendered viewer built directly on the existing pdfjs-dist dependency (already in package.json, no new lib needed) — canvas-per-page rendering, page navigation, zoom, and search-within-document using pdf.js's text layer.
.docx-sourced documents: formatted view via mammoth.convertToHtml (richer than plain text, still no new dependency).
.htm-sourced (text-only) documents: chunk-navigable reader — reassembled text grouped by chunk_index with a section TOC sidebar, matching Documents.tsx's existing plain-text viewer pattern but per-chunk anchored.
"View original" downloads via supabase.storage.from('legal-documents').createSignedUrl(...) (bucket is private).
AI chat panel scoped to the open document: reuse the ai-chat attach-document calling pattern from Documents.tsx/AIAssistant.tsx, adding a library_doc_id param; on the edge-function side, add a fetchLibraryDocumentContext(docId) helper in supabase/functions/ai-chat/index.ts (parallel to the existing fetchAccraRulesContext) that pulls the document's chunks via the new filter_doc_id RPC param, with a token-budget truncation since judgments can be much longer than the Accra Rules PDF this pattern was originally built for.
5. Phasing
Phase 0 — Schema + storage: the migration in §1/§2. Verify via manual SQL-editor inserts + RPC calls.
Phase 1 — Ingestion script, dry-run: build scripts/ingest-law-reports.mjs with --dry-run, validate junk-filtering/dedup/metadata-parsing against the real folder before any writes; wire up the local embedding model. Test with --limit=50 --only=<one folder> against a dev Supabase project, confirm resumability (kill mid-run, rerun, no duplicate work).
Phase 2 — Full bulk run: run against all of assests/Law Reports/, review the run log, iterate on edge cases surfaced by real data (malformed htm, unusual filenames, long paths).
Phase 3 — Browse + keyword search UI: Library.tsx, ships as soon as Phase 2 has real data, independently demoable.
Phase 4 — Semantic search + document viewer + doc-scoped AI chat: legal-search doc_id linking, LibraryDocument.tsx (PDF/docx/text viewer), doc-scoped ai-chat. Completes the RAG-with-citations-and-viewer vision from docs/library/library.md using the app's existing infrastructure.
Explicitly out of scope for this plan (future work, per library.md's "differentiator" section): OCR for scanned-image PDFs, cross-document comparison, automatic cross-reference/citation-graph extraction, AI-generated case timelines.

Verification
Phase 0: run the migration against a dev Supabase project; confirm legal_library_documents, new legal_library columns, and both RPCs work via SQL editor.
Phase 1: node scripts/ingest-law-reports.mjs --dry-run over the full folder — inspect the printed junk/dedup/parse-failure counts before trusting it with writes; then a small --limit/--only live run, inspect resulting rows + storage objects + the JSONL log.
Phase 2: full run in the background; spot-check a sample of legal_library_documents rows across courts/years for correct court/decided_year/parties parsing.
Phase 3/4: npm run dev, exercise /library — filter by court/year, keyword search, open a PDF-sourced doc (confirm page rendering/nav/zoom), open a docx-sourced doc, open an htm-sourced (text-only) doc, ask the doc-scoped AI chat a question and confirm it answers only from that document, and confirm legal-search/ai-chat citations elsewhere in the app now deep-link correctly into /library/:docId.