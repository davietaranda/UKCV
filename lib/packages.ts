/**
 * Central package configuration (spec §23). UI, submission form, and admin
 * dashboard all read from here — never hardcode package names/pricing/
 * deliverables elsewhere.
 */

export interface PackageDefinition {
  id: string;
  name: string;
  description: string;
  deliverables: string[];
  includesCoverLetter: boolean;
  includesApplicationAnswers: boolean;
}

export const PACKAGES: PackageDefinition[] = [
  {
    id: "cv-tailoring",
    name: "CV Tailoring",
    description: "A job-specific version of your CV, tailored to the role.",
    deliverables: ["Job-specific CV"],
    includesCoverLetter: false,
    includesApplicationAnswers: false,
  },
  {
    id: "application-pack",
    name: "Application Pack",
    description: "Tailored CV plus a matching cover letter.",
    deliverables: ["Tailored CV", "Cover letter"],
    includesCoverLetter: true,
    includesApplicationAnswers: false,
  },
  {
    id: "premium-application",
    name: "Premium Application",
    description: "Tailored CV, cover letter, and application question answers.",
    deliverables: ["Tailored CV", "Cover letter", "Application answers"],
    includesCoverLetter: true,
    includesApplicationAnswers: true,
  },
];

export function getPackageById(id: string): PackageDefinition | undefined {
  return PACKAGES.find((p) => p.id === id);
}
