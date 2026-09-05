import type { StructuredCV, TailoredCV } from "@/lib/ai/schemas";

export interface CvContent {
  name: string;
  contactParts: string[];
  profile: string;
  skills: string[];
  experience: Array<{ jobTitle: string; employer: string; dateRange: string; bullets: string[] }>;
  education: Array<{ qualification: string; institution: string; date: string | null }>;
  certifications: string[];
  additionalInfo: string[];
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
    contactParts,
    profile: tailoredCV.tailoredProfile,
    skills: tailoredCV.skills,
    experience,
    education: structuredCV.education,
    certifications: structuredCV.certifications,
    additionalInfo,
  };
}
