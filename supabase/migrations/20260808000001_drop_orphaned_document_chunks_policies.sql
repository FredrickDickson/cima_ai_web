/*
  20260613000000_add_document_chunks_table.sql tried to create a second,
  differently-shaped document_chunks table (vector(1536), FK to a separate
  legal_documents table) via CREATE TABLE IF NOT EXISTS. Because the real
  document_chunks table (user-owned RAG chunks, vector(384), FK to documents)
  already existed from 20260606000000_add_missing_tables_and_rpcs.sql, that
  CREATE TABLE was a no-op for the table itself — but the CREATE POLICY
  statements in the same migration weren't conditioned on the table being
  new, so they attached two extra permissive policies to the REAL
  document_chunks table (which holds private per-user document embeddings):
  "Anyone can view chunks from active documents" and "Authenticated users
  can insert chunks", both referencing the unrelated, orphaned
  legal_documents table. Since legal_documents has always had 0 rows, their
  EXISTS(...) conditions never matched, so this was never actively
  exploitable — but it left the wrong policy set stacked onto sensitive
  user data. Removing the dead policies and the orphaned table+function they
  reference.
*/

DROP POLICY IF EXISTS "Anyone can view chunks from active documents" ON document_chunks;
DROP POLICY IF EXISTS "Authenticated users can insert chunks" ON document_chunks;

-- search_document_chunks joined the real (384-dim) document_chunks against
-- legal_documents using a vector(1536) parameter — a dimension mismatch that
-- would error if ever called, and legal_documents has 0 rows regardless.
DROP FUNCTION IF EXISTS search_document_chunks(vector, float, integer, text, text);

DROP TABLE IF EXISTS legal_documents CASCADE;
