"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { runAnalysis } from "@/app/admin/(protected)/requests/[id]/actions";

export function RunAnalysisButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await runAnalysis(requestId);
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
        {isPending ? "Running AI analysis..." : "Run AI Analysis"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Extracts the CV, analyses the job description, and matches evidence
        against requirements. Calls the Gemini API — see the run log below
        for usage.
      </p>
    </div>
  );
}
