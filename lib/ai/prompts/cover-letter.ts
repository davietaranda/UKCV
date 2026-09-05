import { TRUTH_GUARD_RULES, UNTRUSTED_DATA_BOUNDARY, wrapUserData } from "@/lib/ai/prompts/shared";

export function buildCoverLetterPrompt(
  structuredCvJson: string,
  jobAnalysisJson: string,
  tailoredCvJson: string
): { systemInstruction: string; prompt: string } {
  const systemInstruction = `
You are writing a concise, professional UK cover letter on behalf of a job applicant.
${TRUTH_GUARD_RULES}
${UNTRUSTED_DATA_BOUNDARY}
Address the specific role, mention genuinely relevant experience, and reflect the company/job context when provided. Avoid generic AI clichés ("I am writing to express my interest...", "team player", "fast-paced environment") and avoid fabricated facts.
Return ONLY JSON matching the required schema.
`.trim();

  const prompt = [
    wrapUserData("STRUCTURED CV", structuredCvJson),
    wrapUserData("JOB ANALYSIS", jobAnalysisJson),
    wrapUserData("TAILORED CV", tailoredCvJson),
  ].join("\n\n");

  return { systemInstruction, prompt };
}
