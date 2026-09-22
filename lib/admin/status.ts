import type { RequestStatus } from "@/lib/supabase/types";
import type { BadgeProps } from "@/components/ui/badge";

/** The simplified flow shown day-to-day: New -> Ready -> Delivered, with
 * Archive as a side action from anywhere. "processing"/"review"/"approved"
 * remain valid database values (existing rows may sit in them, and Review
 * is reused deliberately — see STATUS_TRANSITIONS) but are no longer a
 * distinct step admins have to manage; each one funnels back into this
 * flow instead. Used for the Requests list filter pills. */
export const STATUS_FLOW: RequestStatus[] = ["new", "draft_ready", "delivered", "archived"];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  processing: "Processing",
  draft_ready: "Ready",
  review: "Review",
  approved: "Approved",
  delivered: "Delivered",
  archived: "Archived",
};

export const STATUS_BADGE_VARIANT: Record<RequestStatus, NonNullable<BadgeProps["variant"]>> = {
  new: "info",
  processing: "warning",
  draft_ready: "accent",
  review: "warning",
  approved: "success",
  delivered: "success",
  archived: "neutral",
};

export interface StatusTransition {
  to: RequestStatus;
  /** Drives how StatusActions renders the button: forward = the one
   * obvious next step (primary), back = a real but rare correction (quiet
   * text), archive = a side exit (visually separated). */
  kind: "forward" | "back" | "archive";
  label: string;
}

/**
 * Manual admin transitions available from each status, each labelled for
 * exactly what an admin is trying to do — not a generic "Move to X"
 * template. "processing"/"approved" only exist here to give any old row
 * still sitting in them a way back into the simplified flow; nothing
 * writes those values going forward. "review" is the one exception kept
 * meaningfully alive: reachable from Delivered when the admin wants to
 * manually edit the tailored CV/cover letter before re-downloading, without
 * losing "already delivered once" context by resetting all the way to New.
 */
export const STATUS_TRANSITIONS: Record<RequestStatus, StatusTransition[]> = {
  new: [
    { to: "draft_ready", kind: "forward", label: "Mark Ready" },
    { to: "archived", kind: "archive", label: "Archive" },
  ],
  processing: [
    { to: "draft_ready", kind: "forward", label: "Mark Ready" },
    { to: "new", kind: "back", label: "Revert to New" },
    { to: "archived", kind: "archive", label: "Archive" },
  ],
  draft_ready: [
    { to: "delivered", kind: "forward", label: "Mark Delivered" },
    { to: "new", kind: "back", label: "Revert to New" },
    { to: "archived", kind: "archive", label: "Archive" },
  ],
  review: [
    { to: "delivered", kind: "forward", label: "Mark Delivered" },
    { to: "draft_ready", kind: "back", label: "Revert to Ready" },
    { to: "archived", kind: "archive", label: "Archive" },
  ],
  approved: [
    { to: "delivered", kind: "forward", label: "Mark Delivered" },
    { to: "draft_ready", kind: "back", label: "Revert to Ready" },
    { to: "archived", kind: "archive", label: "Archive" },
  ],
  delivered: [
    { to: "review", kind: "back", label: "Edit & Re-review" },
    { to: "archived", kind: "archive", label: "Archive" },
  ],
  archived: [],
};

/** Flat to-list per status, for server-side transition validation
 * (app/admin/(protected)/requests/[id]/actions.ts). */
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = Object.fromEntries(
  Object.entries(STATUS_TRANSITIONS).map(([status, transitions]) => [
    status,
    transitions.map((t) => t.to),
  ])
) as Record<RequestStatus, RequestStatus[]>;
