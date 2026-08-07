/*
  # Smart Citator + AI Case Briefs

  Adds the schema needed for two new Legal Library features:

  - `case_citations` / `case_citator_runs`: grounded judicial-treatment
    tracking. A "run" screens the corpus for documents that cite a given
    case, and each surviving candidate gets a classified treatment
    (followed/applied/distinguished/disapproved/overruled/mentioned)
    persisted as a `case_citations` row. Populated on-demand by the new
    `case-citator` edge function; never written to by clients directly.
  - `case_briefs`: cached AI-generated structured case brief (facts,
    issues, holding, procedural history, principles, concurrences/
    dissents), one row per case document. Populated on-demand by the new
    `case-brief` edge function.

  Both mirror the RLS pattern already used for `legal_library_documents`:
  authenticated users can read (shared/global corpus data), all writes
  are service-role-only from edge functions.
*/

-- ============================================================
-- CASE CITATIONS (Smart Citator — judicial treatment records)
-- ============================================================

CREATE TABLE case_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cited_doc_id uuid NOT NULL REFERENCES legal_library_documents(id) ON DELETE CASCADE,
  citing_doc_id uuid NOT NULL REFERENCES legal_library_documents(id) ON DELETE CASCADE,
  treatment text NOT NULL DEFAULT 'mentioned',
  context_snippet text NOT NULL DEFAULT '',
  citing_chunk_id uuid REFERENCES legal_library(id) ON DELETE SET NULL,
  reasoning text DEFAULT '',
  confidence text NOT NULL DEFAULT 'medium',
  model text NOT NULL DEFAULT 'deepseek-chat',
  analysis_run_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT case_citations_treatment_check CHECK (
    treatment IN ('followed', 'applied', 'distinguished', 'disapproved', 'overruled', 'mentioned')
  ),
  CONSTRAINT case_citations_confidence_check CHECK (confidence IN ('low', 'medium', 'high')),
  CONSTRAINT case_citations_no_self_cite CHECK (cited_doc_id <> citing_doc_id),
  CONSTRAINT case_citations_unique_pair UNIQUE (cited_doc_id, citing_doc_id)
);

ALTER TABLE case_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view case citations"
  ON case_citations FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_case_citations_cited_doc ON case_citations(cited_doc_id);
CREATE INDEX idx_case_citations_citing_doc ON case_citations(citing_doc_id);
CREATE INDEX idx_case_citations_treatment ON case_citations(treatment);
CREATE INDEX idx_case_citations_run ON case_citations(analysis_run_id);

-- One row per citator analysis run, for the "checked against N documents
-- on <date>" honesty framing shown in the UI regardless of result count.
CREATE TABLE case_citator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cited_doc_id uuid NOT NULL REFERENCES legal_library_documents(id) ON DELETE CASCADE,
  candidates_screened int NOT NULL DEFAULT 0,
  treatments_found int NOT NULL DEFAULT 0,
  corpus_doc_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error_message text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT case_citator_runs_status_check CHECK (status IN ('completed', 'failed'))
);

ALTER TABLE case_citator_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view case citator runs"
  ON case_citator_runs FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_case_citator_runs_doc ON case_citator_runs(cited_doc_id, created_at DESC);

-- ============================================================
-- CASE BRIEFS (cached AI-generated structured brief)
-- ============================================================

CREATE TABLE case_briefs (
  doc_id uuid PRIMARY KEY REFERENCES legal_library_documents(id) ON DELETE CASCADE,
  facts text DEFAULT '',
  issues jsonb DEFAULT '[]'::jsonb,
  holding text DEFAULT '',
  procedural_history text DEFAULT '',
  principles jsonb DEFAULT '[]'::jsonb,
  concurrences_dissents jsonb DEFAULT '[]'::jsonb,
  raw_model_output text DEFAULT '',
  parse_status text NOT NULL DEFAULT 'ok',
  model text NOT NULL DEFAULT 'deepseek-chat',
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT case_briefs_parse_status_check CHECK (parse_status IN ('ok', 'partial', 'failed'))
);

ALTER TABLE case_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view case briefs"
  ON case_briefs FOR SELECT TO authenticated USING (true);
