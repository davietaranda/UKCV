"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { updateRequestStatus } from "@/app/admin/(protected)/requests/[id]/actions";
import { STATUS_TRANSITIONS } from "@/lib/admin/status";
import type { RequestStatus } from "@/lib/supabase/types";

const VARIANT_BY_KIND = {
  forward: "primary",
  back: "ghost",
  archive: "outline",
} as const;

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

  const transitions = STATUS_TRANSITIONS[currentStatus];
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
      <div className="flex flex-wrap items-center gap-2">
        {/* Forward is the normal next step, so it's the one button that
            looks like the default action; back/archive are real but rare,
            so they're deliberately quieter — archive pushed to the end. */}
        {transitions.map(({ to, kind, label }) => (
          <Button
            key={to}
            size="sm"
            variant={VARIANT_BY_KIND[kind]}
            className={kind === "archive" ? "ml-auto" : undefined}
            disabled={isPending}
            onClick={() => handleClick(to)}
          >
            {isPending && pendingTarget === to ? "Updating..." : label}
          </Button>
        ))}
      </div>
    </div>
  );
}
