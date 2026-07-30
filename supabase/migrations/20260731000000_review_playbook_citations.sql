/*
  # Document Review — playbook grounding + inline citations + ask-questions

  - `contract_analyses.cited_sources`: persists the citation markers/sources
    produced by contract-analyze so a reloaded past review still shows them.
  - `ai_conversations.document_id`: lets a review's "Ask Questions" thread be
    looked up by the reviewed document, mirroring the existing `case_id`
    column on the same table.
*/

ALTER TABLE contract_analyses
  ADD COLUMN cited_sources jsonb DEFAULT '[]'::jsonb;

ALTER TABLE ai_conversations
  ADD COLUMN document_id uuid REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_conversations_document_id ON ai_conversations(document_id);
