"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  saveCoverLetterEditAction,
  regenerateCoverLetter,
} from "@/app/admin/(protected)/requests/[id]/actions";

export function CoverLetterEditor({
  requestId,
  coverLetter,
}: {
  requestId: string;
  coverLetter: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"save" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [text, setText] = useState(coverLetter);

  const run = (action: "save" | "regenerate", fn: () => Promise<{ error?: string }>) => {
    setError(null);
    setNotice(null);
    setPendingAction(action);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
      } else {
        setNotice(
          action === "save"
            ? "Cover letter saved and the PDF updated."
            : "Cover letter regenerated from AI — any manual edits were overwritten."
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <div>
        <Label htmlFor="cover-letter-text">Cover letter</Label>
        <Textarea
          id="cover-letter-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          className="leading-relaxed"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Blank lines between paragraphs control the PDF&rsquo;s paragraph breaks.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => run("save", () => saveCoverLetterEditAction(requestId, text))}
          disabled={isPending}
        >
          {isPending && pendingAction === "save" ? "Saving..." : "Save Edits"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => run("regenerate", () => regenerateCoverLetter(requestId))}
          disabled={isPending}
        >
          {isPending && pendingAction === "regenerate" ? "Regenerating..." : "Regenerate with AI"}
        </Button>
      </div>
    </div>
  );
}
