/*
  # First-time-user tour — track completion

  Adds `onboarding_completed_at` to `profiles`, nullable. Null means the user
  hasn't finished (or skipped) the guided sidebar tour yet, so the Dashboard
  auto-starts it; a timestamp means it's been dismissed once and won't
  auto-trigger again (still replayable manually).
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
