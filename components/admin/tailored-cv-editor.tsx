"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  saveTailoredCvEditsAction,
  reRenderDocuments,
  regenerateTailoredCv,
} from "@/app/admin/(protected)/requests/[id]/actions";
import type { StructuredCV, TailoredCV } from "@/lib/ai/schemas";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

interface ExperienceDraft {
  _id: string;
  jobTitle: string;
  employer: string;
  startDate: string;
  endDate: string;
  bulletsText: string;
}

interface EducationDraft {
  _id: string;
  qualification: string;
  institution: string;
  date: string;
}

interface RefereeDraft {
  _id: string;
  name: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
}

export function TailoredCvEditor({
  requestId,
  tailoredCV,
  name,
  contact,
  professionalTitle,
  education,
  referees,
  certifications,
  additionalInfo,
  fallbackName,
  fallbackEmail,
  fallbackPhone,
}: {
  requestId: string;
  tailoredCV: TailoredCV;
  /** From cv_documents.structured_cv.name — blank falls back to the
   * applicant's own name on the request at render time. */
  name: string;
  /** From cv_documents.structured_cv.contact — each blank field falls back
   * to the matching field on the request at render time. */
  contact: { email: string; phone: string; location: string };
  /** Pre-filled with the auto-derived suggestion (most recent job title) if
   * never explicitly set — see resolveProfessionalTitle in cv-content.ts.
   * Saving it blank hides the line entirely rather than falling back. */
  professionalTitle: string;
  /** From cv_documents.structured_cv — passed straight through to the
   * rendered CV unchanged by the AI tailoring stage, so editing them saves
   * to that row instead of outputs.tailored_cv. See saveTailoredCvEdits. */
  education: StructuredCV["education"];
  /** Optional "References" section — always empty unless an admin has
   * added entries here (never AI-populated, see structuredCVSchema).
   * Leaving it with zero entries hides the section on the rendered CV. */
  referees: StructuredCV["referees"];
  certifications: string[];
  additionalInfo: string[];
  fallbackName: string;
  fallbackEmail: string;
  fallbackPhone: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"save" | "render" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [nameText, setNameText] = useState(name);
  const [emailText, setEmailText] = useState(contact.email);
  const [phoneText, setPhoneText] = useState(contact.phone);
  const [locationText, setLocationText] = useState(contact.location);
  const [professionalTitleText, setProfessionalTitleText] = useState(professionalTitle);
  const [profile, setProfile] = useState(tailoredCV.tailoredProfile);
  const [skillsText, setSkillsText] = useState(tailoredCV.skills.join("\n"));
  const [experience, setExperience] = useState<ExperienceDraft[]>(
    tailoredCV.tailoredExperience.map((exp) => ({
      _id: newId(),
      jobTitle: exp.jobTitle,
      employer: exp.employer,
      startDate: exp.startDate ?? "",
      endDate: exp.endDate ?? "",
      bulletsText: exp.bullets.join("\n"),
    }))
  );
  const [educationDrafts, setEducationDrafts] = useState<EducationDraft[]>(
    education.map((ed) => ({
      _id: newId(),
      qualification: ed.qualification,
      institution: ed.institution,
      date: ed.date ?? "",
    }))
  );
  const [refereeDrafts, setRefereeDrafts] = useState<RefereeDraft[]>(
    referees.map((ref) => ({
      _id: newId(),
      name: ref.name,
      jobTitle: ref.jobTitle,
      company: ref.company,
      email: ref.email,
      phone: ref.phone,
    }))
  );
  const [certificationsText, setCertificationsText] = useState(certifications.join("\n"));
  const [additionalInfoText, setAdditionalInfoText] = useState(additionalInfo.join("\n"));

  const addExperience = () =>
    setExperience((prev) => [
      ...prev,
      { _id: newId(), jobTitle: "", employer: "", startDate: "", endDate: "", bulletsText: "" },
    ]);
  const updateExperience = (id: string, patch: Partial<ExperienceDraft>) =>
    setExperience((prev) => prev.map((exp) => (exp._id === id ? { ...exp, ...patch } : exp)));
  const removeExperience = (id: string) =>
    setExperience((prev) => prev.filter((exp) => exp._id !== id));

  const addEducation = () =>
    setEducationDrafts((prev) => [
      ...prev,
      { _id: newId(), qualification: "", institution: "", date: "" },
    ]);
  const updateEducation = (id: string, patch: Partial<EducationDraft>) =>
    setEducationDrafts((prev) => prev.map((ed) => (ed._id === id ? { ...ed, ...patch } : ed)));
  const removeEducation = (id: string) =>
    setEducationDrafts((prev) => prev.filter((ed) => ed._id !== id));

  const addReferee = () =>
    setRefereeDrafts((prev) => [
      ...prev,
      { _id: newId(), name: "", jobTitle: "", company: "", email: "", phone: "" },
    ]);
  const updateReferee = (id: string, patch: Partial<RefereeDraft>) =>
    setRefereeDrafts((prev) => prev.map((ref) => (ref._id === id ? { ...ref, ...patch } : ref)));
  const removeReferee = (id: string) =>
    setRefereeDrafts((prev) => prev.filter((ref) => ref._id !== id));

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
            ? "Edits saved and the PDF/DOCX updated."
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
    const editedCertifications = certificationsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const editedAdditionalInfo = additionalInfoText.split("\n").map((s) => s.trim()).filter(Boolean);
    run("save", () =>
      saveTailoredCvEditsAction(requestId, {
        name: nameText.trim(),
        contact: {
          email: emailText.trim(),
          phone: phoneText.trim(),
          location: locationText.trim(),
        },
        professionalTitle: professionalTitleText.trim(),
        tailoredProfile: profile,
        skills,
        experience: experience.map((exp) => ({
          jobTitle: exp.jobTitle.trim(),
          employer: exp.employer.trim(),
          startDate: exp.startDate.trim(),
          endDate: exp.endDate.trim(),
          bullets: exp.bulletsText.split("\n").map((b) => b.trim()).filter(Boolean),
        })),
        education: educationDrafts.map((ed) => ({
          qualification: ed.qualification.trim(),
          institution: ed.institution.trim(),
          date: ed.date.trim(),
        })),
        certifications: editedCertifications,
        additionalInfo: editedAdditionalInfo,
        referees: refereeDrafts.map((ref) => ({
          name: ref.name.trim(),
          jobTitle: ref.jobTitle.trim(),
          company: ref.company.trim(),
          email: ref.email.trim(),
          phone: ref.phone.trim(),
        })),
      })
    );
  };

  return (
    <div className="flex flex-col gap-6 rounded-md border border-border p-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <div>
        <Label htmlFor="cv-name">Name</Label>
        <Input
          id="cv-name"
          value={nameText}
          onChange={(e) => setNameText(e.target.value)}
          placeholder={fallbackName}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Leave blank to use the applicant&rsquo;s name from the request ({fallbackName}).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="cv-email">Email</Label>
          <Input
            id="cv-email"
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder={fallbackEmail}
          />
        </div>
        <div>
          <Label htmlFor="cv-phone">Phone</Label>
          <Input
            id="cv-phone"
            value={phoneText}
            onChange={(e) => setPhoneText(e.target.value)}
            placeholder={fallbackPhone ?? undefined}
          />
        </div>
        <div>
          <Label htmlFor="cv-location">Location</Label>
          <Input
            id="cv-location"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="professional-title">Professional title (optional)</Label>
        <Input
          id="professional-title"
          value={professionalTitleText}
          onChange={(e) => setProfessionalTitleText(e.target.value)}
          placeholder="e.g. Chartered Accountant"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Shown under the name on the CV. Pre-filled from their most recent job
          title — edit it, or clear it to hide the line entirely.
        </p>
      </div>

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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Work experience</h3>
          <Button type="button" variant="outline" size="sm" onClick={addExperience}>
            + Add job
          </Button>
        </div>
        {experience.map((exp, i) => (
          <div key={exp._id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Job {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeExperience(exp._id)}>
                Remove
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`exp-title-${exp._id}`}>Job title</Label>
                <Input
                  id={`exp-title-${exp._id}`}
                  value={exp.jobTitle}
                  onChange={(e) => updateExperience(exp._id, { jobTitle: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`exp-employer-${exp._id}`}>Employer</Label>
                <Input
                  id={`exp-employer-${exp._id}`}
                  value={exp.employer}
                  onChange={(e) => updateExperience(exp._id, { employer: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`exp-start-${exp._id}`}>Start date</Label>
                <Input
                  id={`exp-start-${exp._id}`}
                  value={exp.startDate}
                  onChange={(e) => updateExperience(exp._id, { startDate: e.target.value })}
                  placeholder="e.g. Jan 2021"
                />
              </div>
              <div>
                <Label htmlFor={`exp-end-${exp._id}`}>End date</Label>
                <Input
                  id={`exp-end-${exp._id}`}
                  value={exp.endDate}
                  onChange={(e) => updateExperience(exp._id, { endDate: e.target.value })}
                  placeholder="Leave blank if current"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`exp-bullets-${exp._id}`}>Bullets (one per line)</Label>
              <Textarea
                id={`exp-bullets-${exp._id}`}
                value={exp.bulletsText}
                onChange={(e) => updateExperience(exp._id, { bulletsText: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Education</h3>
          <Button type="button" variant="outline" size="sm" onClick={addEducation}>
            + Add qualification
          </Button>
        </div>
        {educationDrafts.map((ed, i) => (
          <div key={ed._id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Qualification {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeEducation(ed._id)}>
                Remove
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`edu-qual-${ed._id}`}>Qualification</Label>
                <Input
                  id={`edu-qual-${ed._id}`}
                  value={ed.qualification}
                  onChange={(e) => updateEducation(ed._id, { qualification: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`edu-institution-${ed._id}`}>Institution</Label>
                <Input
                  id={`edu-institution-${ed._id}`}
                  value={ed.institution}
                  onChange={(e) => updateEducation(ed._id, { institution: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`edu-date-${ed._id}`}>Date</Label>
                <Input
                  id={`edu-date-${ed._id}`}
                  value={ed.date}
                  onChange={(e) => updateEducation(ed._id, { date: e.target.value })}
                  placeholder="e.g. 2022"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="certifications">Certifications (one per line)</Label>
        <Textarea
          id="certifications"
          value={certificationsText}
          onChange={(e) => setCertificationsText(e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="additional-info">Additional information (one per line)</Label>
        <Textarea
          id="additional-info"
          value={additionalInfoText}
          onChange={(e) => setAdditionalInfoText(e.target.value)}
          rows={3}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Languages, memberships, awards, publications, or anything else shown
          in this section — edited here as one combined list.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">References (optional)</h3>
          <Button type="button" variant="outline" size="sm" onClick={addReferee}>
            + Add referee
          </Button>
        </div>
        {refereeDrafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No referees added — this section won&rsquo;t appear on the CV.
          </p>
        ) : null}
        {refereeDrafts.map((ref, i) => (
          <div key={ref._id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Referee {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeReferee(ref._id)}>
                Remove
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`ref-name-${ref._id}`}>Name</Label>
                <Input
                  id={`ref-name-${ref._id}`}
                  value={ref.name}
                  onChange={(e) => updateReferee(ref._id, { name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`ref-jobtitle-${ref._id}`}>Job title</Label>
                <Input
                  id={`ref-jobtitle-${ref._id}`}
                  value={ref.jobTitle}
                  onChange={(e) => updateReferee(ref._id, { jobTitle: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`ref-company-${ref._id}`}>Company</Label>
                <Input
                  id={`ref-company-${ref._id}`}
                  value={ref.company}
                  onChange={(e) => updateReferee(ref._id, { company: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`ref-email-${ref._id}`}>Email</Label>
                <Input
                  id={`ref-email-${ref._id}`}
                  value={ref.email}
                  onChange={(e) => updateReferee(ref._id, { email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`ref-phone-${ref._id}`}>Phone</Label>
                <Input
                  id={`ref-phone-${ref._id}`}
                  value={ref.phone}
                  onChange={(e) => updateReferee(ref._id, { phone: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

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
