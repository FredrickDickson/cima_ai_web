-- Add case_id to research_sessions so sessions can be linked to a matter
ALTER TABLE research_sessions
  ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES cases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS research_sessions_case_id_idx ON research_sessions(case_id);
