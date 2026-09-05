"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { generateDocuments } from "@/app/admin/(protected)/requests/[id]/actions";

export function GenerateDocumentsButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateDocuments(requestId);
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
      <Button onClick={handleClick} disabled={isPending} size="sm" variant="outline">
        {isPending ? "Generating documents..." : "Generate Documents"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Requires AI Analysis to have run first. Produces the tailored CV
        (PDF + DOCX) and, for packages that include one, a cover letter.
      </p>
    </div>
  );
}
