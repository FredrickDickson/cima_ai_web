/*
  # Authority tagging — persist @-tagged sources

  Adds `tagged_authorities` (jsonb array of {id, type, label, citation?,
  marker}) to `research_sessions`, `drafts`, and `contract_analyses` so
  reloading a saved research session, generated draft, or document review
  restores which cases/legislation/documents/playbook items were @-tagged.
  Additive, defaults to an empty array so existing rows are unaffected.
*/

ALTER TABLE research_sessions
  ADD COLUMN IF NOT EXISTS tagged_authorities jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS tagged_authorities jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE contract_analyses
  ADD COLUMN IF NOT EXISTS tagged_authorities jsonb NOT NULL DEFAULT '[]'::jsonb;
