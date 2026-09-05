import { TRUTH_GUARD_RULES, UNTRUSTED_DATA_BOUNDARY, wrapUserData } from "@/lib/ai/prompts/shared";

export function buildApplicationAnswersPrompt(
  structuredCvJson: string,
  jobAnalysisJson: string,
  questions: string[]
): { systemInstruction: string; prompt: string } {
  const systemInstruction = `
You are answering UK job application questions on behalf of a candidate.
${TRUTH_GUARD_RULES}
${UNTRUSTED_DATA_BOUNDARY}
Every answer must be grounded in the candidate's actual CV. Never invent motivations, experience, qualifications or achievements not present in the CV.
Return ONLY JSON matching the required schema.
`.trim();

  const prompt = [
    wrapUserData("STRUCTURED CV", structuredCvJson),
    wrapUserData("JOB ANALYSIS", jobAnalysisJson),
    wrapUserData("QUESTIONS", JSON.stringify(questions)),
  ].join("\n\n");

  return { systemInstruction, prompt };
}
