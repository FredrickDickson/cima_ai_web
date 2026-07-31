/*
  # Cases/Matters usability pass — evidence<->issues linkage + activity log

  - `evidence_issues`: many-to-many junction between `evidence` and `issues`
    so a litigator can attach "Issue #3 is supported by Exhibits 3, 7, 12"
    as real, clickable data instead of only unstructured AI prose.
  - `case_events`: lightweight append-only activity log so a matter has a
    visible history (deadline added, hearing scheduled, document uploaded,
    status changed, etc.) without needing to check every tab individually.

  RLS on both mirrors the existing `auth.uid() = user_id` pattern already
  used on `evidence`/`issues`/`deadlines`/etc.
*/

CREATE TABLE evidence_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT evidence_issues_unique UNIQUE (evidence_id, issue_id)
);

ALTER TABLE evidence_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evidence-issue links"
  ON evidence_issues FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence-issue links"
  ON evidence_issues FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evidence-issue links"
  ON evidence_issues FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_evidence_issues_evidence_id ON evidence_issues(evidence_id);
CREATE INDEX idx_evidence_issues_issue_id ON evidence_issues(issue_id);

CREATE TABLE case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own case events"
  ON case_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own case events"
  ON case_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_case_events_case_id ON case_events(case_id, created_at DESC);
