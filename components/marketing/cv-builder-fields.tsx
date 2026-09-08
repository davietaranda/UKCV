"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** Mirrors lib/validation/request.ts's builtCvSchema shape exactly — kept as
 * a plain client-side type (not importing the zod schema) so this component
 * doesn't pull server-only code into the client bundle. The server
 * re-validates everything on submit regardless. */
export interface BuiltCvExperienceDraft {
  _id: string;
  jobTitle: string;
  employer: string;
  startDate: string;
  endDate: string;
  bulletsText: string;
}

export interface BuiltCvEducationDraft {
  _id: string;
  qualification: string;
  institution: string;
  date: string;
}

export interface BuiltCvAwardDraft {
  _id: string;
  title: string;
  date: string;
}

export interface BuiltCvDraft {
  location: string;
  portfolioUrl: string;
  professionalProfile: string;
  skillsText: string;
  experience: BuiltCvExperienceDraft[];
  education: BuiltCvEducationDraft[];
  certificationsText: string;
  awards: BuiltCvAwardDraft[];
  otherText: string;
}

export const emptyBuiltCvDraft: BuiltCvDraft = {
  location: "",
  portfolioUrl: "",
  professionalProfile: "",
  skillsText: "",
  experience: [],
  education: [],
  certificationsText: "",
  awards: [],
  otherText: "",
};

/** Splits pasted text into one item per line even when it arrived as a
 * single run-on block with no line breaks — the exact bug pattern seen in a
 * real submission (list items concatenated with no separator, or sentences
 * joined by a period with no following space). Only used on paste, and only
 * when it finds more than one item; typed text and already-broken-up paste
 * content are left untouched. See lib/ai/prompts/cv-normalize.ts for the
 * server-side safety net that catches whatever still slips through. */
export function smartSplitLines(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\n")) {
    return trimmed.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  const candidate = trimmed
    .replace(/([.!?);])(?=[A-Z])/g, "$1\n")
    .replace(/(?<=[a-z0-9])(?=[A-Z][a-z])/g, "\n");
  return candidate.split("\n").map((s) => s.trim()).filter(Boolean);
}

function handleSmartPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  apply: (next: string) => void
) {
  const pasted = e.clipboardData.getData("text");
  if (!pasted || pasted.includes("\n")) return;
  const lines = smartSplitLines(pasted);
  if (lines.length <= 1) return;
  e.preventDefault();
  apply(currentValue.trim() ? `${currentValue}\n${lines.join("\n")}` : lines.join("\n"));
}

/** Converts the draft (multi-line textareas, local-only React keys) into the
 * exact shape lib/validation/request.ts's builtCvSchema expects. */
export function draftToBuiltCv(draft: BuiltCvDraft) {
  const linesOf = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  return {
    location: draft.location,
    portfolioUrl: draft.portfolioUrl,
    professionalProfile: draft.professionalProfile,
    skills: linesOf(draft.skillsText),
    certifications: linesOf(draft.certificationsText),
    other: linesOf(draft.otherText),
    experience: draft.experience.map((exp) => ({
      jobTitle: exp.jobTitle,
      employer: exp.employer,
      startDate: exp.startDate,
      endDate: exp.endDate,
      bullets: linesOf(exp.bulletsText),
    })),
    education: draft.education.map((ed) => ({
      qualification: ed.qualification,
      institution: ed.institution,
      date: ed.date,
    })),
    awards: draft.awards.map((a) => ({ title: a.title, date: a.date })),
  };
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function CvBuilderFields({
  value,
  onChange,
}: {
  value: BuiltCvDraft;
  onChange: (next: BuiltCvDraft) => void;
}) {
  const addExperience = () =>
    onChange({
      ...value,
      experience: [
        ...value.experience,
        { _id: newId(), jobTitle: "", employer: "", startDate: "", endDate: "", bulletsText: "" },
      ],
    });

  const updateExperience = (id: string, patch: Partial<BuiltCvExperienceDraft>) =>
    onChange({
      ...value,
      experience: value.experience.map((exp) => (exp._id === id ? { ...exp, ...patch } : exp)),
    });

  const removeExperience = (id: string) =>
    onChange({ ...value, experience: value.experience.filter((exp) => exp._id !== id) });

  const addEducation = () =>
    onChange({
      ...value,
      education: [...value.education, { _id: newId(), qualification: "", institution: "", date: "" }],
    });

  const updateEducation = (id: string, patch: Partial<BuiltCvEducationDraft>) =>
    onChange({
      ...value,
      education: value.education.map((ed) => (ed._id === id ? { ...ed, ...patch } : ed)),
    });

  const removeEducation = (id: string) =>
    onChange({ ...value, education: value.education.filter((ed) => ed._id !== id) });

  const addAward = () =>
    onChange({ ...value, awards: [...value.awards, { _id: newId(), title: "", date: "" }] });

  const updateAward = (id: string, patch: Partial<BuiltCvAwardDraft>) =>
    onChange({
      ...value,
      awards: value.awards.map((a) => (a._id === id ? { ...a, ...patch } : a)),
    });

  const removeAward = (id: string) =>
    onChange({ ...value, awards: value.awards.filter((a) => a._id !== id) });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="builder-location">Location (optional)</Label>
          <Input
            id="builder-location"
            value={value.location}
            onChange={(e) => onChange({ ...value, location: e.target.value })}
            placeholder="e.g. Manchester, UK"
          />
        </div>
        <div>
          <Label htmlFor="builder-portfolio">Portfolio / website (optional)</Label>
          <Input
            id="builder-portfolio"
            value={value.portfolioUrl}
            onChange={(e) => onChange({ ...value, portfolioUrl: e.target.value })}
            placeholder="e.g. linkedin.com/in/yourname"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="builder-profile">Professional summary (optional)</Label>
        <Textarea
          id="builder-profile"
          rows={4}
          value={value.professionalProfile}
          onChange={(e) => onChange({ ...value, professionalProfile: e.target.value })}
          placeholder="A couple of sentences about your experience and what you're looking for..."
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Education (optional)</h3>
          <Button type="button" variant="outline" size="sm" onClick={addEducation}>
            + Add qualification
          </Button>
        </div>
        {value.education.map((ed, i) => (
          <div key={ed._id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Work experience (optional)</h3>
          <Button type="button" variant="outline" size="sm" onClick={addExperience}>
            + Add job
          </Button>
        </div>
        {value.experience.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No experience yet? That&rsquo;s fine — add any volunteer work or achievements
            further down instead.
          </p>
        ) : null}
        {value.experience.map((exp, i) => (
          <div key={exp._id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
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
              <Label htmlFor={`exp-bullets-${exp._id}`}>What did you do? (one point per line)</Label>
              <Textarea
                id={`exp-bullets-${exp._id}`}
                rows={3}
                value={exp.bulletsText}
                onChange={(e) => updateExperience(exp._id, { bulletsText: e.target.value })}
                onPaste={(e) =>
                  handleSmartPaste(e, exp.bulletsText, (next) =>
                    updateExperience(exp._id, { bulletsText: next })
                  )
                }
                placeholder={"Handled customer enquiries by phone and email\nTrained new starters"}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Pasting several points at once? We&rsquo;ll split them onto separate lines
                automatically.
              </p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="builder-skills">Skills (optional, one per line)</Label>
        <Textarea
          id="builder-skills"
          rows={3}
          value={value.skillsText}
          onChange={(e) => onChange({ ...value, skillsText: e.target.value })}
          onPaste={(e) =>
            handleSmartPaste(e, value.skillsText, (next) => onChange({ ...value, skillsText: next }))
          }
          placeholder={"Customer service\nMicrosoft Office\nTeam leadership"}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Pasting a list of skills at once? We&rsquo;ll split them onto separate lines
          automatically.
        </p>
      </div>

      <div>
        <Label htmlFor="builder-certifications">Certifications (optional, one per line)</Label>
        <Textarea
          id="builder-certifications"
          rows={2}
          value={value.certificationsText}
          onChange={(e) => onChange({ ...value, certificationsText: e.target.value })}
          onPaste={(e) =>
            handleSmartPaste(e, value.certificationsText, (next) =>
              onChange({ ...value, certificationsText: next })
            )
          }
          placeholder={"First Aid at Work, Red Cross - 2023"}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Awards / recognitions / volunteer work (optional)</h3>
          <Button type="button" variant="outline" size="sm" onClick={addAward}>
            + Add
          </Button>
        </div>
        {value.awards.map((a, i) => (
          <div key={a._id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Item {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeAward(a._id)}>
                Remove
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`award-title-${a._id}`}>Title</Label>
                <Input
                  id={`award-title-${a._id}`}
                  value={a.title}
                  onChange={(e) => updateAward(a._id, { title: e.target.value })}
                  placeholder="e.g. Employee of the Month"
                />
              </div>
              <div>
                <Label htmlFor={`award-date-${a._id}`}>Date</Label>
                <Input
                  id={`award-date-${a._id}`}
                  value={a.date}
                  onChange={(e) => updateAward(a._id, { date: e.target.value })}
                  placeholder="e.g. 2023"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="builder-other">Anything else? (optional, one per line)</Label>
        <Textarea
          id="builder-other"
          rows={2}
          value={value.otherText}
          onChange={(e) => onChange({ ...value, otherText: e.target.value })}
          onPaste={(e) =>
            handleSmartPaste(e, value.otherText, (next) => onChange({ ...value, otherText: next }))
          }
          placeholder={"Fluent in French\nMember, Royal College of Nursing"}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Languages, professional memberships, publications, or anything else worth
          including that doesn&rsquo;t fit above.
        </p>
      </div>
    </div>
  );
}
