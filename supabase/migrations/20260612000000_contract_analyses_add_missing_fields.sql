-- Add missing fields to contract_analyses for full past-review restoration
ALTER TABLE contract_analyses
  ADD COLUMN IF NOT EXISTS arbitration_seat        text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS arbitration_institution text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS arbitration_improved    text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS detected_parties        jsonb   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS detected_document_type  text    DEFAULT '';
