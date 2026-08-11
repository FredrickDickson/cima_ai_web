Production-grade RAG upgrade for the legal research pipeline
Context
You asked me to research how production RAG systems are built and bring this app's retrieval architecture up to that bar, using the attached guide ("The 15 RAG concepts every AI engineer should know") as the framework. (I could not access the Instagram reel you linked — it's video behind an auth wall I have no way to fetch or watch — so this plan is built from the PDF plus live web research plus a fresh audit of this app's actual current pipeline.)

I benchmarked the app's existing legal-RAG implementation (legal-search, ai-chat, _shared/legal-retrieval.ts, the Supabase legal_library + Convex libraryChunks dual backend, and every ingestion script) against all 15 concepts. Good news: several are already solid — structure-aware chunking with sensible overlap, a consistent embedding model end-to-end (384-dim bge-small-en-v1.5), pgvector with HNSW + a mirrored Convex vector index, pre-filtered metadata search, and a real citation-marker system with prompt-level grounding instructions.

Two gaps stood out as both the biggest quality problems and the ones the guide (and current web research) rate highest-impact:

No real hybrid search. Retrieval today is "try vector search, and only fall back to keyword search if vector returns literally zero results" (_shared/legal-retrieval.ts:104-173, mirrored in convex/http.ts:12-75) — not vector + keyword running together and merged. This is the same class of bug behind the ICC-Rules query I fixed earlier this session (20260807000000_fts_or_fallback.sql) — that fix made the fallback less brittle, but the pipeline still only ever uses one signal at a time. Web research (see sources below) shows real hybrid search with Reciprocal Rank Fusion lifting precision from ~62% to ~84% over vector-only in comparable pgvector setups — this is the single highest-leverage change available.
No reranking, and no way to measure any of this. There's no cross-encoder rerank pass anywhere, and — more importantly — no retrieval-evaluation harness at all: no golden question set, no recall@k measurement, nothing. The guide calls evaluation "the single strongest differentiator" precisely because it's what turns "I think this is better" into "this change improved recall by 14 percent" — without it, every change from here on is a guess, including the ones in this plan.
Per your scope choice, this plan builds hybrid search + reranking + evaluation (Tier 1) plus four supporting fixes (Tier 2), and documents — without building — the two remaining gaps that require re-embedding the ~20k-document corpus (Tier 3), so that's a deliberate, informed decision later rather than something done blind now.

Tier 1 — build first, in this order
1. Retrieval evaluation harness (build before touching retrieval logic, so every later change is measured, not assumed)

New scripts/eval/golden-questions.json: ~25-30 real questions against this corpus (Ghana ADR Act, ICC/UNCITRAL/LCIA/Accra Arbitration Rules, Ghanaian case law), each with the expected doc_id/citation substring that should come back. Includes the "Standard for interim measures in ICC arbitration" query from earlier this session as a named regression case — it's a real, previously-broken query with a known-correct answer (ICC Rules Article 28).
New scripts/eval-retrieval.mjs: calls match_legal_library + search_legal_library_fts directly via @supabase/supabase-js (same approach as the existing ingestion scripts — service-role key from .env), computes recall@5 and recall@10, prints a summary. Deliberately tests retrieval in isolation from generation, per the guide's own methodology.
Run it now to get a baseline number before any pipeline change.
2. True hybrid search with Reciprocal Rank Fusion

New supabase/functions/_shared/rrf.ts: a small, reusable reciprocalRankFusion(resultLists, k=60) — the standard formula (score = Σ 1/(k + rank) across lists), operates on rank not raw score so it doesn't hit the vector-score-vs-FTS-rank incompatibility problem.
_shared/legal-retrieval.ts's searchLegalLibrary(): run match_legal_library (vector) and search_legal_library_fts (keyword) concurrently pulling ~20 candidates each (not "vector, else FTS"), fuse with RRF, then slice to the caller's matchCount. This also fixes the flagged inconsistency where Supabase-vs-Convex results were merged by raw similarity even though FTS-only hits have no comparable score — cross-backend merging switches to RRF too.
convex/http.ts /searchLibrary + convex/libraryChunks.ts: same concurrent-then-fuse change, mirroring the Supabase side (this file already documents itself as "mirrors search_legal_library_fts" — keep that mirroring intact).
Re-run the eval harness — expect a measurable recall lift, roughly in line with the ~62%→84% figure found in research (exact number depends on this corpus).
3. Reranking (HuggingFace-hosted cross-encoder, per your choice — reuses the existing HUGGINGFACE_API_KEY, no new vendor)

New supabase/functions/_shared/rerank.ts: calls a HF-hosted cross-encoder reranking model with (query, candidate) pairs, returns relevance-sorted order. Fails soft — if the call errors, return the RRF-fused order unchanged, matching this codebase's existing fail-soft pattern for getEmbedding.
Wire into searchLegalLibrary(): after RRF-fusing ~20-30 candidates, rerank, keep the top matchCount (5-8) — the "retrieve wide, rerank, narrow" pattern the guide and current research both converge on.
Re-run the eval harness again; this is the number to compare against Tier 1 step 2's result to prove reranking earns its latency cost.
Tier 2 — supporting fixes
4. Query rewriting for multi-turn chat. ai-chat's extractLegalQuery only ever looks at the last message — a follow-up like "what about the Court of Appeal ruling on that?" searches on that sentence alone, with no antecedent. New _shared/query-rewrite.ts: when messages.length > 1, a cheap/fast DeepSeek call folds conversation history into a standalone search query before retrieval. legal-search doesn't need this (single-shot by design).

5. Server-side citation-marker validation. Right now a model-cited marker ([C7], [L2], etc.) is only checked against real sources client-side, cosmetically, in src/lib/citations.tsx — the server never verifies its own output. New _shared/validate-citations.ts: after generation, regex-scan the model's text for markers, check each against the known citedSources set, and attach citation_warnings to the response so the existing client-side warning UI has real backing and this becomes observable server-side. Applied in ai-chat, legal-search, contract-analyze, generate-draft — the four functions that produce cited content.

6. Fix embed-document's inconsistent chunking. Every ingestion path except this one uses structure-aware chunking (split on Article/Section headings, 1000/150-char fallback) — embed-document alone still does naive fixed 800/100-char windows for user-uploaded documents. The chunkByArticle/charChunk logic is currently copy-pasted across 4+ ingestion scripts; extract it once into _shared/chunking.ts and have embed-document use the same shared logic as everything else — fixes the inconsistency and removes duplication in one move.

7. Standardize top-k. Falls out of steps 2-3 naturally: retrieve ~20 per source → RRF fuse → rerank → return 5-8. Apply the same constants consistently across legal-search, ai-chat, case-citator, case-brief's calls into searchLegalLibrary/match_legal_library instead of today's inconsistent per-call-site values (3, 4, 5, 6, 8, 40).

Tier 3 — documented, not built now
Contextual retrieval (prepend a generated context line to each chunk before embedding, per Anthropic's published technique): real quality gain on a corpus this size and this repetitive (many similarly-formatted case reports), but requires a full re-embed of ~20k documents/150k+ chunks — a new ingestion-time LLM-call-per-chunk cost plus hours of reprocessing. Worth doing as its own scoped project once Tier 1's eval harness exists to measure whether it's worth the cost on this corpus specifically.
Small-to-big / parent-document retrieval: cheaper than contextual retrieval since the parent linkage (legal_library.doc_id → legal_library_documents, and the existing get_legal_library_document RPC) already exists — "just" needs wiring into the retrieval path to expand a chunk hit into its parent section. Natural next project once Tier 1/2 are proven out.
Dead code flag: scripts/ingest-pdf.mjs targets an already-dropped 1536-dim schema via a stub generate_embedding() Postgres function that returns an all-zero vector (20260613000001_add_embedding_function.sql) — it's non-functional against the live schema. Worth deleting in a fast follow-up; not touched by this plan since it's unrelated to the hybrid-search work.
HyDE: the guide itself rates this low-impact/situational for most corpora — skipped deliberately, not an oversight.
Files touched
New: scripts/eval/golden-questions.json, scripts/eval-retrieval.mjs, supabase/functions/_shared/{rrf,rerank,query-rewrite,validate-citations,chunking}.ts
Modified: supabase/functions/_shared/legal-retrieval.ts, convex/http.ts, convex/libraryChunks.ts, supabase/functions/ai-chat/index.ts, supabase/functions/legal-search/index.ts, supabase/functions/contract-analyze/index.ts, supabase/functions/generate-draft/index.ts, supabase/functions/embed-document/index.ts
No new SQL migrations expected — RRF fusion and reranking are application-level, layered on top of the existing match_legal_library/ search_legal_library_fts RPCs, which already accept the wider match_count this needs.
Verification
Run scripts/eval-retrieval.mjs before any change — record baseline recall@5/@10.
After hybrid search (Tier 1.2): re-run eval, compare numbers.
After reranking (Tier 1.3): re-run eval again, compare.
Confirm the ICC-Rules golden question specifically now returns Article 28 with a real similarity/rank signal (not just via the FTS OR-fallback safety net from the earlier fix).
Manually test a multi-turn follow-up in AI Assistant ("what is arbitration under Ghana law" → "what about interim measures") and confirm the second query actually retrieves interim-measures content, not generic "arbitration" results.
Confirm citation_warnings stays empty on a normal well-grounded response (no false positives) — spot-check a few real queries.
Upload a document through the app and confirm embed-document still processes it correctly after switching to shared structure-aware chunking.
npx tsc --noEmit and npm run test:edge — no regressions.
Deploy edge functions, re-run the same live-curl-style checks used in the last session (auth still enforced, rate limits still fire) to confirm this work didn't regress the security hardening just shipped.
Sources consulted:

Building Hybrid Search for RAG: Combining pgvector and Full-Text Search with Reciprocal Rank Fusion
Hybrid Search and Re-ranking in Production RAG 2026
RAG Production Guide 2026
Case Study: RAG Deployment at a Legal Research Firm
How AI Legal Research Works: RAG, Grounding, and Citations