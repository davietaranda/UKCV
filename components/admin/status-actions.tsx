"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { updateRequestStatus } from "@/app/admin/(protected)/requests/[id]/actions";
import { ALLOWED_TRANSITIONS, STATUS_LABELS } from "@/lib/admin/status";
import type { RequestStatus } from "@/lib/supabase/types";

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

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {transitions.map((next) => (
          <Button
            key={next}
            size="sm"
            variant={next === "archived" ? "outline" : "primary"}
            disabled={isPending}
            onClick={() => handleClick(next)}
          >
            {isPending && pendingTarget === next
              ? "Updating..."
              : `Move to ${STATUS_LABELS[next]}`}
          </Button>
        ))}
      </div>
    </div>
  );
}
