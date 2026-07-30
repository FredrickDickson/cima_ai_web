/*
  # Authority tagging — persist @-tagged sources

  Adds `tagged_authorities` (jsonb array of {id, type, label, citation?,
  marker}) to `research_sessions` and `drafts` so reloading a saved research
  session or generated draft restores which cases/legislation/documents were
  @-tagged for strict grounding. Additive, defaults to an empty array so
  existing rows are unaffected.
*/

ALTER TABLE research_sessions
  ADD COLUMN IF NOT EXISTS tagged_authorities jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS tagged_authorities jsonb NOT NULL DEFAULT '[]'::jsonb;
