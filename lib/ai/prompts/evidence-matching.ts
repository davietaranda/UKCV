import { TRUTH_GUARD_RULES, UNTRUSTED_DATA_BOUNDARY, wrapUserData } from "@/lib/ai/prompts/shared";

export function buildEvidenceMatchingPrompt(
  structuredCvJson: string,
  jobAnalysisJson: string
): { systemInstruction: string; prompt: string } {
  const systemInstruction = `
You are an evidence-matching engine comparing a candidate's CV against a job's requirements.
${TRUTH_GUARD_RULES}
${UNTRUSTED_DATA_BOUNDARY}
For every requirement, classify it as STRONG MATCH, PARTIAL MATCH, or MISSING, and cite the exact CV evidence used. Never manufacture evidence — if none exists, the requirement is MISSING.
Return ONLY JSON matching the required schema.
`.trim();

  const prompt = [
    wrapUserData("STRUCTURED CV", structuredCvJson),
    wrapUserData("JOB ANALYSIS", jobAnalysisJson),
  ].join("\n\n");

  return { systemInstruction, prompt };
}
