/*
  # Persist the verbatim generation prompt on drafts

  Adds generation_prompt (text, nullable) to drafts so a user can see
  exactly what they typed after navigating away or reloading. Covers both
  the natural-language prompt and template-mode custom instructions — both
  answer "what did I tell the AI to draft?", and a draft is only ever one
  mode or the other, so one shared column is simpler than two. Nullable:
  existing drafts have no recoverable prompt, and template-mode drafts
  often have no custom instructions at all — no backfill is attempted.
*/

ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS generation_prompt text;
