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
