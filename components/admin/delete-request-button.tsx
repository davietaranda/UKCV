"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { deleteRequestPermanently } from "@/app/admin/(protected)/requests/[id]/actions";

export function DeleteRequestButton({
  requestId,
  customerName,
}: {
  requestId: string;
  customerName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    const confirmed = window.confirm(
      `Permanently delete all data for ${customerName}? This deletes the CV, generated documents, and every record for this request. This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteRequestPermanently(requestId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button variant="destructive" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Deleting..." : "Delete permanently"}
      </Button>
    </div>
  );
}
