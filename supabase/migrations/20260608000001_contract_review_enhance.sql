-- Enhance contract_analyses table with new fields for comprehensive review
ALTER TABLE contract_analyses
  ADD COLUMN IF NOT EXISTS negotiation_points jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_insights        text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS industry_type      text    DEFAULT '';
