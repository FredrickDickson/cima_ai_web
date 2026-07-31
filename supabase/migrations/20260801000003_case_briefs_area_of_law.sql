/*
  # AI Case Briefs — area of law classification

  Adds `area_of_law` to `case_briefs` so the AI-generated brief states which
  field(s) of law a case falls under (e.g. "Contract Law", "Arbitration &
  ADR") up front, before the facts. Additive, safe default.
*/

ALTER TABLE case_briefs
  ADD COLUMN area_of_law text DEFAULT '';
