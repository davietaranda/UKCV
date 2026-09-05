import type { RequestStatus } from "@/lib/supabase/types";
import type { BadgeProps } from "@/components/ui/badge";

export const STATUS_FLOW: RequestStatus[] = [
  "new",
  "processing",
  "draft_ready",
  "review",
  "approved",
  "delivered",
  "archived",
];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  processing: "Processing",
  draft_ready: "Draft Ready",
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

/**
 * Manual admin transitions available from each status. Phase 4-6 will add
 * automated transitions (e.g. new -> processing when AI extraction starts,
 * processing -> draft_ready when generation completes) alongside these —
 * the admin can always override manually, since they stay in control of the
 * final output.
 */
export const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  new: ["processing", "archived"],
  processing: ["draft_ready", "new", "archived"],
  draft_ready: ["review", "processing", "archived"],
  review: ["approved", "draft_ready", "archived"],
  approved: ["delivered", "review", "archived"],
  delivered: ["archived"],
  archived: [],
};
