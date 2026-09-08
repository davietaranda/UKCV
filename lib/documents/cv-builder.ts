import "server-only";

import type { BuiltCv } from "@/lib/validation/request";
import type { StructuredCV } from "@/lib/ai/schemas";
import type { CvContent } from "@/lib/documents/cv-content";
import { renderCvPdf } from "@/lib/documents/cv-pdf";

interface ContactFallback {
  customerName: string;
  email: string;
  phone: string | null;
}

function formatDateRange(start: string | undefined, end: string | undefined): string {
  const s = start?.trim();
  const e = end?.trim();
  if (!s && !e) return "";
  if (s && !e) return `${s} – Present`;
  if (!s && e) return e;
  return `${s} – ${e}`;
}

function formatAward(award: { title: string; date?: string }): string {
  const date = award.date?.trim();
  return date ? `${award.title} (${date})` : award.title;
}

/** Same UK/ATS-friendly layout every AI-tailored CV uses (lib/documents/cv-pdf.tsx)
 * — a self-built CV should look identical in structure, not like a different product.
 * educationFirst: true and the Awards/Recognitions/Volunteer Work section follow
 * Indeed's own entry-level/recent-grad resume template — this builder's audience. */
export function builtCvToCvContent(builtCv: BuiltCv, fallback: ContactFallback): CvContent {
  const contactParts = [
    fallback.email,
    fallback.phone,
    builtCv.location,
    builtCv.portfolioUrl,
  ].filter((v): v is string => Boolean(v && v.trim()));

  return {
    name: fallback.customerName,
    contactParts,
    profile: builtCv.professionalProfile ?? "",
    skills: builtCv.skills,
    experience: builtCv.experience.map((exp) => ({
      jobTitle: exp.jobTitle,
      employer: exp.employer,
      dateRange: formatDateRange(exp.startDate, exp.endDate),
      bullets: exp.bullets,
    })),
    education: builtCv.education.map((ed) => ({
      qualification: ed.qualification,
      institution: ed.institution,
      date: ed.date?.trim() || null,
    })),
    certifications: builtCv.certifications,
    additionalInfo: [...builtCv.awards.map(formatAward), ...builtCv.other],
    educationFirst: true,
  };
}

/** Feeds the same data straight into cv_documents.structured_cv, in the
 * shape the AI pipeline expects (lib/ai/schemas.ts) — the applicant typed
 * this directly, so it's more reliable than round-tripping it through a
 * rendered PDF and re-parsing/re-extracting it with AI. See the
 * cvDocument.structured_cv short-circuit in lib/ai/pipeline.ts. */
export function builtCvToStructuredCV(builtCv: BuiltCv, fallback: ContactFallback): StructuredCV {
  return {
    name: fallback.customerName || null,
    contact: {
      email: fallback.email || null,
      phone: fallback.phone,
      location: builtCv.location?.trim() || null,
    },
    professionalProfile: builtCv.professionalProfile?.trim() || null,
    employment: builtCv.experience.map((exp) => ({
      jobTitle: exp.jobTitle,
      employer: exp.employer,
      startDate: exp.startDate?.trim() || null,
      endDate: exp.endDate?.trim() || null,
      responsibilities: exp.bullets,
      achievements: [],
    })),
    education: builtCv.education.map((ed) => ({
      qualification: ed.qualification,
      institution: ed.institution,
      date: ed.date?.trim() || null,
    })),
    certifications: builtCv.certifications,
    skills: builtCv.skills,
    tools: [],
    projects: [],
    languages: [],
    memberships: [],
    awards: builtCv.awards.map(formatAward),
    publications: [],
    other: [
      ...(builtCv.portfolioUrl?.trim() ? [builtCv.portfolioUrl.trim()] : []),
      ...builtCv.other,
    ],
  };
}

export async function renderBuiltCvPdf(builtCv: BuiltCv, fallback: ContactFallback): Promise<Buffer> {
  return renderCvPdf(builtCvToCvContent(builtCv, fallback));
}
