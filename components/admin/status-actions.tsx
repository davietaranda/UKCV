"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { updateRequestStatus } from "@/app/admin/(protected)/requests/[id]/actions";
import { ALLOWED_TRANSITIONS, STATUS_FLOW, STATUS_LABELS } from "@/lib/admin/status";
import type { RequestStatus } from "@/lib/supabase/types";

/** Every status offers a forward step, an escape-hatch archive, and
 * sometimes a revert — those three read identically as same-weight
 * buttons, so it's unclear which one is the normal next step. Classifying
 * by position in STATUS_FLOW lets the UI make the forward step the obvious
 * default and demote the rest. */
function classify(current: RequestStatus, next: RequestStatus): "forward" | "back" | "archive" {
  if (next === "archived") return "archive";
  return STATUS_FLOW.indexOf(next) > STATUS_FLOW.indexOf(current) ? "forward" : "back";
}

export function StatusActions({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: RequestStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState<RequestStatus | null>(null);

  const transitions = ALLOWED_TRANSITIONS[currentStatus];
  if (transitions.length === 0) return null;

  const handleClick = (next: RequestStatus) => {
    setError(null);
    setPendingTarget(next);
    startTransition(async () => {
      const result = await updateRequestStatus(requestId, currentStatus, next);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const classified = transitions.map((next) => ({ next, kind: classify(currentStatus, next) }));
  const forward = classified.filter((t) => t.kind === "forward");
  const back = classified.filter((t) => t.kind === "back");
  const archive = classified.filter((t) => t.kind === "archive");

  const label = (next: RequestStatus, kind: "forward" | "back" | "archive") => {
    if (isPending && pendingTarget === next) return "Updating...";
    if (kind === "archive") return "Archive";
    if (kind === "back") return `Revert to ${STATUS_LABELS[next]}`;
    return `Move to ${STATUS_LABELS[next]}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2">
        {/* Forward is the normal next step, so it's the one button that
            looks like the default action; revert and archive are real but
            rare, so they're deliberately quieter. */}
        {forward.map(({ next }) => (
          <Button key={next} size="sm" variant="primary" disabled={isPending} onClick={() => handleClick(next)}>
            {label(next, "forward")}
          </Button>
        ))}
        {back.map(({ next }) => (
          <Button key={next} size="sm" variant="ghost" disabled={isPending} onClick={() => handleClick(next)}>
            {label(next, "back")}
          </Button>
        ))}
        {archive.map(({ next }) => (
          <Button
            key={next}
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={isPending}
            onClick={() => handleClick(next)}
          >
            {label(next, "archive")}
          </Button>
        ))}
      </div>
    </div>
  );
}
