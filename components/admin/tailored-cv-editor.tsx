"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  saveTailoredCvEditsAction,
  reRenderDocuments,
  regenerateTailoredCv,
} from "@/app/admin/(protected)/requests/[id]/actions";
import type { TailoredCV } from "@/lib/ai/schemas";

export function TailoredCvEditor({
  requestId,
  tailoredCV,
}: {
  requestId: string;
  tailoredCV: TailoredCV;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"save" | "render" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [profile, setProfile] = useState(tailoredCV.tailoredProfile);
  const [skillsText, setSkillsText] = useState(tailoredCV.skills.join("\n"));
  const [bulletsText, setBulletsText] = useState(
    tailoredCV.tailoredExperience.map((exp) => exp.bullets.join("\n"))
  );

  const run = (action: "save" | "render" | "regenerate", fn: () => Promise<{ error?: string }>) => {
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
            ? "Edits saved. Re-render documents to update the PDF/DOCX."
            : action === "render"
              ? "Documents re-rendered from the current content."
              : "Tailored CV regenerated from AI — any manual edits were overwritten."
        );
        router.refresh();
      }
    });
  };

  const handleSave = () => {
    const skills = skillsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const experienceBullets = bulletsText.map((text) =>
      text.split("\n").map((b) => b.trim()).filter(Boolean)
    );
    run("save", () => saveTailoredCvEditsAction(requestId, { tailoredProfile: profile, skills, experienceBullets }));
  };

  return (
    <div className="flex flex-col gap-6 rounded-md border border-border p-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <div>
        <Label htmlFor="profile">Professional profile</Label>
        <Textarea id="profile" value={profile} onChange={(e) => setProfile(e.target.value)} rows={4} />
      </div>

      <div>
        <Label htmlFor="skills">Key skills (one per line)</Label>
        <Textarea
          id="skills"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          rows={4}
        />
      </div>

      {tailoredCV.tailoredExperience.map((exp, i) => (
        <div key={i}>
          <Label htmlFor={`bullets-${i}`}>
            {exp.jobTitle}, {exp.employer} — bullets (one per line)
          </Label>
          <Textarea
            id={`bullets-${i}`}
            value={bulletsText[i]}
            onChange={(e) =>
              setBulletsText((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
            }
            rows={4}
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending && pendingAction === "save" ? "Saving..." : "Save Edits"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => run("render", () => reRenderDocuments(requestId))}
          disabled={isPending}
        >
          {isPending && pendingAction === "render" ? "Rendering..." : "Re-render Documents"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => run("regenerate", () => regenerateTailoredCv(requestId))}
          disabled={isPending}
        >
          {isPending && pendingAction === "regenerate" ? "Regenerating..." : "Regenerate with AI"}
        </Button>
      </div>
    </div>
  );
}
