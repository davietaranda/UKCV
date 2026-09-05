import { z } from "zod";

/**
 * Single source of truth for AI pipeline data shapes. lib/ai/provider.ts
 * imports its types from here (via z.infer) rather than duplicating them,
 * so the runtime validation and the compile-time types can't drift apart.
 */

export const structuredCVSchema = z.object({
  name: z.string().nullable(),
  contact: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
  }),
  professionalProfile: z.string().nullable(),
  employment: z.array(
    z.object({
      jobTitle: z.string(),
      employer: z.string(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      responsibilities: z.array(z.string()),
      achievements: z.array(z.string()),
    })
  ),
  education: z.array(
    z.object({
      qualification: z.string(),
      institution: z.string(),
      date: z.string().nullable(),
    })
  ),
  certifications: z.array(z.string()),
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  projects: z.array(z.string()),
  languages: z.array(z.string()),
  memberships: z.array(z.string()),
  awards: z.array(z.string()),
  publications: z.array(z.string()),
  other: z.array(z.string()),
});

export const jobAnalysisSchema = z.object({
  jobTitle: z.string().nullable(),
  company: z.string().nullable(),
  seniority: z.string().nullable(),
  responsibilities: z.array(z.string()),
  essentialRequirements: z.array(z.string()),
  desirableRequirements: z.array(z.string()),
  impliedSignals: z.array(z.string()),
  technicalSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
  qualifications: z.array(z.string()),
  certifications: z.array(z.string()),
  experienceRequirements: z.array(z.string()),
  industryRequirements: z.array(z.string()),
  keywords: z.array(z.string()),
});

const matchStatusSchema = z.enum(["strong_match", "partial_match", "missing"]);

const evidenceMatchItemSchema = z.object({
  requirement: z.string(),
  status: matchStatusSchema,
  evidence: z.string().nullable(),
  sourceSection: z.string().nullable(),
});

export const matchingResultSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  strongMatches: z.array(evidenceMatchItemSchema),
  partialMatches: z.array(evidenceMatchItemSchema),
  missingRequirements: z.array(evidenceMatchItemSchema),
});

const truthGuardFlagSchema = z.object({
  generatedClaim: z.string(),
  sourceSection: z.string().nullable(),
  sourceText: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  status: z.enum(["supported", "unsupported", "needs_review"]),
});

export const tailoredCVSchema = z.object({
  tailoredProfile: z.string(),
  tailoredExperience: z.array(
    z.object({
      jobTitle: z.string(),
      employer: z.string(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      bullets: z.array(z.string()),
    })
  ),
  skills: z.array(z.string()),
  keywordsIncorporated: z.array(z.string()),
  truthGuardFlags: z.array(truthGuardFlagSchema),
});

export const coverLetterResultSchema = z.object({
  coverLetter: z.string(),
});

export const applicationAnswersResultSchema = z.object({
  answers: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ),
});

export type StructuredCV = z.infer<typeof structuredCVSchema>;
export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;
export type MatchStatus = z.infer<typeof matchStatusSchema>;
export type EvidenceMatchItem = z.infer<typeof evidenceMatchItemSchema>;
export type MatchingResult = z.infer<typeof matchingResultSchema>;
export type TruthGuardFlag = z.infer<typeof truthGuardFlagSchema>;
export type TailoredCV = z.infer<typeof tailoredCVSchema>;
export type CoverLetterResult = z.infer<typeof coverLetterResultSchema>;
export type ApplicationAnswersResult = z.infer<typeof applicationAnswersResultSchema>;
