import { supabase } from "./supabase";

export type CaseEventType =
  | "deadline_added"
  | "deadline_completed"
  | "hearing_scheduled"
  | "hearing_updated"
  | "issue_added"
  | "issue_resolved"
  | "evidence_added"
  | "document_uploaded"
  | "order_added"
  | "draft_created"
  | "status_changed";

/**
 * Fire-and-forget append to the matter's activity log. Never throws —
 * a logging failure should never block the actual mutation it's recording.
 */
export function logCaseEvent(caseId: string, userId: string, eventType: CaseEventType, description: string): void {
  supabase.from("case_events").insert({ case_id: caseId, user_id: userId, event_type: eventType, description }).then(
    () => {},
    () => {},
  );
}
