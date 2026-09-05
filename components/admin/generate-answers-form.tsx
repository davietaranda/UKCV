"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { generateAnswers } from "@/app/admin/(protected)/requests/[id]/actions";

export function GenerateAnswersForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [questionsText, setQuestionsText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const questions = questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);
    setError(null);
    startTransition(async () => {
      const result = await generateAnswers(requestId, questions);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div>
        <Label htmlFor="questions">Application questions (one per line)</Label>
        <Textarea
          id="questions"
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          rows={4}
          placeholder={"Why do you want this role?\nWhy do you want to work for this company?"}
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending} className="self-start">
        {isPending ? "Generating answers..." : "Generate Answers"}
      </Button>
    </form>
  );
}
