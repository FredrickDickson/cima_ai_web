-- The previous migration (20260821000000_search_legal_library_fts_doc_id_filter.sql)
-- added a filter_doc_id parameter via CREATE OR REPLACE FUNCTION, but Postgres
-- treats a function's parameter list as part of its identity — CREATE OR REPLACE
-- with a different signature creates a second, overloaded function instead of
-- replacing the first. This left both search_legal_library_fts(text, int) and
-- search_legal_library_fts(text, int, uuid) live simultaneously, so any caller
-- that omits filter_doc_id (case-citator/index.ts, contract-analyze/index.ts's
-- fetchCaseLawRows — both call it with just {search_query, match_count}) now
-- gets PGRST203 "Could not choose the best candidate function" on every call,
-- since both overloads are equally valid candidates for that call shape.
--
-- Fix: drop the old 2-arg overload so only the 3-arg version (with
-- filter_doc_id defaulting to NULL, behaving identically to the old function
-- for callers that don't pass it) remains. Mirrors the pattern
-- match_legal_library's own signature change already used correctly
-- (20260728000000_library_documents_and_grouping.sql).

DROP FUNCTION IF EXISTS search_legal_library_fts(text, int);
