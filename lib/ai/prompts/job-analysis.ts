import { TRUTH_GUARD_RULES, UNTRUSTED_DATA_BOUNDARY, wrapUserData } from "@/lib/ai/prompts/shared";

export function buildJobAnalysisPrompt(jobDescription: string): {
  systemInstruction: string;
  prompt: string;
} {
  const systemInstruction = `
You are a UK job description analysis engine.
${TRUTH_GUARD_RULES}
${UNTRUSTED_DATA_BOUNDARY}
Analyse the job description and separate requirements into ESSENTIAL, DESIRABLE, and IMPLIED SIGNALS (skills/experience the role clearly implies but does not state outright).
Return ONLY JSON matching the required schema.
`.trim();

  const prompt = wrapUserData("JOB DESCRIPTION", jobDescription);

  return { systemInstruction, prompt };
}
