-- Add column to store revised contract text after applying redlines
ALTER TABLE contract_analyses 
ADD COLUMN IF NOT EXISTS revised_contract_text TEXT;

-- Add column to track which redlines have been applied
ALTER TABLE contract_analyses 
ADD COLUMN IF NOT EXISTS applied_redlines JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries on analyses with revisions
CREATE INDEX IF NOT EXISTS idx_contract_analyses_has_revision 
ON contract_analyses (id) 
WHERE revised_contract_text IS NOT NULL;
