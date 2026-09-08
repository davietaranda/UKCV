import { z } from "zod";
import { PACKAGES } from "@/lib/packages";

const PACKAGE_IDS = PACKAGES.map((p) => p.id) as [string, ...string[]];

export const MAX_CV_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
export const ACCEPTED_CV_EXTENSIONS = [".pdf", ".docx"];
export const ACCEPTED_CV_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const submissionSchema = z.object({
  customerName: z.string().trim().min(2, "Enter your full name.").max(200),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  jobTitle: z.string().trim().max(200).optional().or(z.literal("")),
  jobUrl: z.string().trim().url("Enter a valid URL.").max(2000).optional().or(z.literal("")),
  jobDescription: z
    .string()
    .trim()
    .min(100, "Paste the full job description (at least 100 characters).")
    .max(20000),
  packageId: z.enum(PACKAGE_IDS, { message: "Select a package." }),
  urgency: z.string().trim().max(100).optional().or(z.literal("")),
  consent: z.literal("on", { message: "You must consent to processing to continue." }),
  // Honeypot: real users never fill this in (it's visually hidden). Any
  // non-empty value here is a strong bot signal.
  website: z.string().max(0, "Spam detected.").optional().or(z.literal("")),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

/**
 * The "build a CV from scratch" path (for applicants with no existing CV
 * file) — a deliberately smaller set of sections than the full AI-extracted
 * StructuredCV shape (lib/ai/schemas.ts), matching what a standard resume
 * builder asks for. See lib/documents/cv-builder.ts for how this maps into
 * both a rendered PDF and the StructuredCV shape the AI pipeline expects.
 */
export const builtCvExperienceSchema = z.object({
  jobTitle: z.string().trim().min(1, "Enter a job title.").max(200),
  employer: z.string().trim().min(1, "Enter an employer.").max(200),
  startDate: z.string().trim().max(50).optional().or(z.literal("")),
  endDate: z.string().trim().max(50).optional().or(z.literal("")),
  bullets: z.array(z.string().trim().min(1)).max(20).default([]),
});

export const builtCvEducationSchema = z.object({
  qualification: z.string().trim().min(1, "Enter a qualification.").max(200),
  institution: z.string().trim().min(1, "Enter an institution.").max(200),
  date: z.string().trim().max(50).optional().or(z.literal("")),
});

export const builtCvAwardSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200),
  date: z.string().trim().max(50).optional().or(z.literal("")),
});

export const builtCvSchema = z
  .object({
    location: z.string().trim().max(200).optional().or(z.literal("")),
    portfolioUrl: z.string().trim().max(300).optional().or(z.literal("")),
    professionalProfile: z.string().trim().max(2000).optional().or(z.literal("")),
    skills: z.array(z.string().trim().min(1)).max(60).default([]),
    experience: z.array(builtCvExperienceSchema).max(20).default([]),
    education: z.array(builtCvEducationSchema).max(10).default([]),
    certifications: z.array(z.string().trim().min(1)).max(30).default([]),
    // "Awards/Recognitions/Volunteer Work" per Indeed's own entry-level/
    // recent-grad resume template — the natural audience for this builder.
    awards: z.array(builtCvAwardSchema).max(20).default([]),
    // Catch-all: languages, memberships, publications, or anything else that
    // doesn't fit the sections above — maps to StructuredCV.other.
    other: z.array(z.string().trim().min(1)).max(30).default([]),
  })
  .superRefine((v, ctx) => {
    const hasContent =
      (v.professionalProfile ?? "").length > 0 ||
      v.skills.length > 0 ||
      v.experience.length > 0 ||
      v.education.length > 0;
    if (!hasContent) {
      ctx.addIssue({
        code: "custom",
        message:
          "Add at least some CV content (a summary, one job, one qualification, or a skill) before submitting.",
      });
    }
  });

export type BuiltCvExperience = z.infer<typeof builtCvExperienceSchema>;
export type BuiltCvEducation = z.infer<typeof builtCvEducationSchema>;
export type BuiltCvAward = z.infer<typeof builtCvAwardSchema>;
export type BuiltCv = z.infer<typeof builtCvSchema>;
