"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { processRequest } from "@/app/admin/(protected)/requests/[id]/actions";

export function ProcessRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await processRequest(requestId);
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
      <Button onClick={handleClick} disabled={isPending} size="sm">
        {isPending ? "Processing request..." : "Process Request"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Extracts the CV, analyses the job, matches evidence, and generates
        the tailored CV — plus a cover letter if the package includes one.
        Calls the Gemini API — see the AI run log for usage. Safe to re-run
        any time; the tailored CV and cover letter can also be regenerated
        individually further down the page.
      </p>
    </div>
  );
}
