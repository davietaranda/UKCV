"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { purgeExpiredNow } from "@/app/admin/(protected)/settings/actions";

export function PurgeExpiredButton({ count }: { count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (count === 0) {
    return <p className="text-sm text-muted-foreground">No requests are past the retention period.</p>;
  }

  const handleClick = () => {
    const confirmed = window.confirm(
      `Permanently delete data for ${count} request${count === 1 ? "" : "s"} past the retention period? This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await purgeExpiredNow();
      if (result.error) setError(result.error);
      else {
        setNotice(`Deleted ${result.deleted} request${result.deleted === 1 ? "" : "s"}.`);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      <Button variant="destructive" size="sm" onClick={handleClick} disabled={isPending} className="self-start">
        {isPending ? "Deleting..." : `Delete ${count} expired request${count === 1 ? "" : "s"} now`}
      </Button>
    </div>
  );
}
