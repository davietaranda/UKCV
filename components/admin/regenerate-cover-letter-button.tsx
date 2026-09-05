"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { regenerateCoverLetter } from "@/app/admin/(protected)/requests/[id]/actions";

export function RegenerateCoverLetterButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await regenerateCoverLetter(requestId);
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
      <Button onClick={handleClick} disabled={isPending} size="sm" variant="outline" className="self-start">
        {isPending ? "Regenerating..." : "Regenerate Cover Letter"}
      </Button>
    </div>
  );
}
