/*
  # CIMA AI — Full Schema Reset & Sync

  The remote database had a legacy schema from an older version of the app
  with incompatible table structures (different column names, missing columns).
  This migration drops all legacy tables and recreates the complete schema
  that matches the current frontend and edge functions.

  Legacy tables dropped:
    - audit_log, calendar_events, case_issues, chat_messages, citations,
      contracts, document_embeddings, draft_documents, ghana_laws,
      law_categories, notifications, team_members

  Legacy tables dropped & recreated (incompatible columns):
    - cases, documents, profiles, hearings, research_sessions,
      evidence, procedural_orders

  New tables added:
    - ai_conversations, ai_messages, drafts, document_chunks,
      legal_library, contract_analyses, issues, deadlines, templates

  RPC functions:
    - match_legal_library, match_document_chunks, search_legal_library_fts

  Extensions:
    - pgvector (already enabled, kept for safety)
*/

-- ============================================================
-- STEP 0: Drop legacy functions & triggers
-- ============================================================

DROP FUNCTION IF EXISTS search_document_embeddings CASCADE;
DROP FUNCTION IF EXISTS ghana_laws_search_trigger CASCADE;
DROP FUNCTION IF EXISTS set_updated_at CASCADE;
-- keep handle_new_user for now — we'll recreate if needed

-- ============================================================
-- STEP 1: Drop ALL legacy tables (CASCADE drops policies + indexes)
-- ============================================================

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS case_issues CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS citations CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS document_embeddings CASCADE;
DROP TABLE IF EXISTS draft_documents CASCADE;
DROP TABLE IF EXISTS ghana_laws CASCADE;
DROP TABLE IF EXISTS law_categories CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;

-- Drop tables that exist with incompatible schemas
-- (CASCADE handles FK dependencies)
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS legal_library CASCADE;
DROP TABLE IF EXISTS contract_analyses CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS deadlines CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS drafts CASCADE;
DROP TABLE IF EXISTS hearings CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS procedural_orders CASCADE;
DROP TABLE IF EXISTS research_sessions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- STEP 2: Ensure pgvector is available
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- STEP 3: Recreate ALL tables with correct schema
-- ============================================================

-- PROFILES
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'lawyer',
  organization text DEFAULT '',
  jurisdiction text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- CASES
CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  matter_number text DEFAULT '',
  type text NOT NULL DEFAULT 'arbitration',
  status text NOT NULL DEFAULT 'active',
  framework text DEFAULT '',
  description text DEFAULT '',
  parties jsonb DEFAULT '[]'::jsonb,
  next_hearing timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cases"
  ON cases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases"
  ON cases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
  ON cases FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases"
  ON cases FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- DOCUMENTS
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'document',
  file_path text DEFAULT '',
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT '',
  extracted_text text DEFAULT '',
  ai_summary text DEFAULT '',
  risk_score int DEFAULT 0,
  status text NOT NULL DEFAULT 'ready',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- AI CONVERSATIONS
CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New Conversation',
  context text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON ai_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- AI MESSAGES
CREATE TABLE ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON ai_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON ai_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- RESEARCH SESSIONS
CREATE TABLE research_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query text NOT NULL DEFAULT '',
  jurisdiction text DEFAULT '',
  results jsonb DEFAULT '[]'::jsonb,
  ai_analysis text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research"
  ON research_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research"
  ON research_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own research"
  ON research_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- DRAFTS
CREATE TABLE drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  template_type text NOT NULL DEFAULT 'custom',
  content text DEFAULT '',
  jurisdiction text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON drafts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON drafts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON drafts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON drafts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- HEARINGS
CREATE TABLE hearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL,
  location text DEFAULT '',
  type text NOT NULL DEFAULT 'preliminary',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hearings"
  ON hearings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hearings"
  ON hearings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hearings"
  ON hearings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hearings"
  ON hearings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- DOCUMENT CHUNKS (RAG embeddings)
CREATE TABLE document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  embedding vector(384),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document chunks"
  ON document_chunks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document chunks"
  ON document_chunks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own document chunks"
  ON document_chunks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own document chunks"
  ON document_chunks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- LEGAL LIBRARY (shared reference data)
CREATE TABLE legal_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  embedding vector(384),
  source_type text NOT NULL DEFAULT '',
  jurisdiction text DEFAULT '',
  citation text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE legal_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view legal library"
  ON legal_library FOR SELECT TO authenticated
  USING (true);

-- CONTRACT ANALYSES
CREATE TABLE contract_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  overall_risk_score int DEFAULT 0,
  risk_items jsonb DEFAULT '[]'::jsonb,
  clauses_data jsonb DEFAULT '[]'::jsonb,
  missing_clauses jsonb DEFAULT '[]'::jsonb,
  obligations jsonb DEFAULT '{}'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  ai_summary text DEFAULT '',
  contract_text text DEFAULT '',
  arbitration_clause_valid boolean DEFAULT false,
  arbitration_clause_issues text DEFAULT '',
  governing_law_found boolean DEFAULT false,
  governing_law text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contract_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contract analyses"
  ON contract_analyses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contract analyses"
  ON contract_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contract analyses"
  ON contract_analyses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contract analyses"
  ON contract_analyses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ISSUES (case sub-tab)
CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issue_number int NOT NULL DEFAULT 1,
  description text NOT NULL DEFAULT '',
  claimant_position text DEFAULT '',
  respondent_position text DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own issues"
  ON issues FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own issues"
  ON issues FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own issues"
  ON issues FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own issues"
  ON issues FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- DEADLINES (case sub-tab)
CREATE TABLE deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  due_date timestamptz NOT NULL,
  type text DEFAULT 'filing',
  status text NOT NULL DEFAULT 'pending',
  notes text DEFAULT ''
);

ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deadlines"
  ON deadlines FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deadlines"
  ON deadlines FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deadlines"
  ON deadlines FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deadlines"
  ON deadlines FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- EVIDENCE (case sub-tab)
CREATE TABLE evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  type text DEFAULT 'documentary',
  summary text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evidence"
  ON evidence FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence"
  ON evidence FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evidence"
  ON evidence FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evidence"
  ON evidence FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- PROCEDURAL ORDERS (case sub-tab)
CREATE TABLE procedural_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_number int NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT '',
  content text DEFAULT '',
  issued_at timestamptz,
  status text NOT NULL DEFAULT 'active'
);

ALTER TABLE procedural_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own procedural orders"
  ON procedural_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own procedural orders"
  ON procedural_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own procedural orders"
  ON procedural_orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own procedural orders"
  ON procedural_orders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- TEMPLATES (shared reference data)
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  template_type text DEFAULT '',
  jurisdiction text DEFAULT '',
  framework text DEFAULT '',
  variables jsonb DEFAULT '[]'::jsonb,
  content text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON templates FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- STEP 4: RPC Functions
-- ============================================================

-- Vector similarity search on legal_library
CREATE OR REPLACE FUNCTION match_legal_library(
  query_embedding vector(384),
  match_count int DEFAULT 5,
  filter_jurisdiction text DEFAULT NULL,
  filter_source_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source_type text,
  jurisdiction text,
  citation text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ll.id,
    ll.title,
    ll.content,
    ll.source_type,
    ll.jurisdiction,
    ll.citation,
    1 - (ll.embedding <=> query_embedding) AS similarity
  FROM legal_library ll
  WHERE ll.embedding IS NOT NULL
    AND (filter_jurisdiction IS NULL OR ll.jurisdiction = filter_jurisdiction)
    AND (filter_source_type IS NULL OR ll.source_type = filter_source_type)
  ORDER BY ll.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Vector similarity search on user document chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_name text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    d.name AS document_name,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  LEFT JOIN documents d ON d.id = dc.document_id
  WHERE dc.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR dc.user_id = filter_user_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Full-text search fallback on legal_library
CREATE OR REPLACE FUNCTION search_legal_library_fts(
  search_query text,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source_type text,
  jurisdiction text,
  citation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ll.id,
    ll.title,
    ll.content,
    ll.source_type,
    ll.jurisdiction,
    ll.citation
  FROM legal_library ll
  WHERE to_tsvector('english', ll.title || ' ' || ll.content)
        @@ plainto_tsquery('english', search_query)
  ORDER BY ts_rank(
    to_tsvector('english', ll.title || ' ' || ll.content),
    plainto_tsquery('english', search_query)
  ) DESC
  LIMIT match_count;
END;
$$;

-- ============================================================
-- STEP 5: Indexes
-- ============================================================

-- B-tree indexes on foreign keys
CREATE INDEX idx_cases_user_id ON cases(user_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_research_sessions_user_id ON research_sessions(user_id);
CREATE INDEX idx_drafts_user_id ON drafts(user_id);
CREATE INDEX idx_hearings_case_id ON hearings(case_id);
CREATE INDEX idx_hearings_user_id ON hearings(user_id);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_user_id ON document_chunks(user_id);
CREATE INDEX idx_contract_analyses_user_id ON contract_analyses(user_id);
CREATE INDEX idx_contract_analyses_document_id ON contract_analyses(document_id);
CREATE INDEX idx_issues_case_id ON issues(case_id);
CREATE INDEX idx_issues_user_id ON issues(user_id);
CREATE INDEX idx_deadlines_case_id ON deadlines(case_id);
CREATE INDEX idx_deadlines_user_id ON deadlines(user_id);
CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_user_id ON evidence(user_id);
CREATE INDEX idx_procedural_orders_case_id ON procedural_orders(case_id);
CREATE INDEX idx_procedural_orders_user_id ON procedural_orders(user_id);
CREATE INDEX idx_legal_library_jurisdiction ON legal_library(jurisdiction);
CREATE INDEX idx_legal_library_source_type ON legal_library(source_type);
CREATE INDEX idx_templates_category ON templates(category);

-- Vector similarity indexes (HNSW — works on empty tables)
CREATE INDEX idx_document_chunks_embedding
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_legal_library_embedding
  ON legal_library
  USING hnsw (embedding vector_cosine_ops);

-- Full-text search index on legal_library
CREATE INDEX idx_legal_library_fts
  ON legal_library
  USING gin (to_tsvector('english', title || ' ' || content));
