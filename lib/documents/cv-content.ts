import type { StructuredCV, TailoredCV } from "@/lib/ai/schemas";

export interface CvContent {
  name: string;
  /** Optional headline under the name (e.g. "Chartered Accountant"). Null
   * hides it entirely — either nothing was derivable, or an admin
   * explicitly cleared it (see resolveProfessionalTitle). */
  professionalTitle: string | null;
  contactParts: string[];
  profile: string;
  skills: string[];
  experience: Array<{ jobTitle: string; employer: string; dateRange: string; bullets: string[] }>;
  education: Array<{ qualification: string; institution: string; date: string | null }>;
  certifications: string[];
  additionalInfo: string[];
  /** Entry-level/recent-grad convention (Indeed's own template for that
   * audience) leads with Education before Experience, since work history is
   * limited — the opposite of the standard experienced-hire order this
   * layout otherwise uses. Set by lib/documents/cv-builder.ts; left unset
   * (Experience-first) for the AI-tailored path. */
  educationFirst?: boolean;
}

/** null or undefined (never explicitly set — undefined covers every
 * cv_documents row stored before this field existed, since Postgres jsonb
 * has no schema of its own to backfill it) falls back to the candidate's
 * own most recent job title (employment is sorted most-recent-first by
 * lib/ai/employment-order.ts); "" (an admin explicitly cleared the field)
 * hides the line entirely rather than falling back; any other string is
 * used as given. */
export function resolveProfessionalTitle(structuredCV: StructuredCV): string | null {
  const title = structuredCV.professionalTitle;
  if (title === null || title === undefined) {
    return structuredCV.employment[0]?.jobTitle ?? null;
  }
  return title.trim() || null;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  if (start && !end) return `${start} – Present`;
  if (!start && end) return end;
  return `${start} – ${end}`;
}

/**
 * Merges the AI-tailored sections (profile, experience, skills — the parts
 * genuinely rewritten for the target role) with the untouched factual
 * sections from the original extracted CV (contact, education,
 * certifications, etc. — nothing about these needs rewriting, and rewriting
 * them would risk introducing unsupported claims).
 */
export function buildCvContent(
  structuredCV: StructuredCV,
  tailoredCV: TailoredCV,
  fallback: { customerName: string; email: string; phone: string | null }
): CvContent {
  const name = structuredCV.name?.trim() || fallback.customerName;
  const contactParts = [
    structuredCV.contact.email || fallback.email,
    structuredCV.contact.phone || fallback.phone,
    structuredCV.contact.location,
  ].filter((v): v is string => Boolean(v && v.trim()));

  const experience = tailoredCV.tailoredExperience.map((exp) => ({
    jobTitle: exp.jobTitle,
    employer: exp.employer,
    dateRange: formatDateRange(exp.startDate, exp.endDate),
    bullets: exp.bullets,
  }));

  const additionalInfo = [
    ...structuredCV.languages,
    ...structuredCV.memberships,
    ...structuredCV.awards,
    ...structuredCV.publications,
    ...structuredCV.other,
  ];

  return {
    name,
    professionalTitle: resolveProfessionalTitle(structuredCV),
    contactParts,
    profile: tailoredCV.tailoredProfile,
    skills: tailoredCV.skills,
    experience,
    education: structuredCV.education,
    certifications: structuredCV.certifications,
    additionalInfo,
  };
}
