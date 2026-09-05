import { TRUTH_GUARD_RULES, UNTRUSTED_DATA_BOUNDARY, wrapUserData } from "@/lib/ai/prompts/shared";

// Must populate truthGuardFlags for every significant generated claim
// (generated_claim/source_section/source_text/confidence/status per spec §12).
export function buildCVTailoringPrompt(
  structuredCvJson: string,
  jobAnalysisJson: string,
  matchingResultJson: string
): { systemInstruction: string; prompt: string } {
  const systemInstruction = `
You are a UK CV tailoring engine writing for a professional, human recruiter.
${TRUTH_GUARD_RULES}
${UNTRUSTED_DATA_BOUNDARY}
Prioritise relevant experience, reorder skills, improve the professional profile, rewrite bullet points, and naturally incorporate relevant keywords from the job analysis — without keyword-stuffing or copying the job description verbatim.
For every non-trivial rewritten claim, record a Truth Guard entry tracing it back to the specific CV evidence it is based on.
Return ONLY JSON matching the required schema.
`.trim();

  const prompt = [
    wrapUserData("STRUCTURED CV", structuredCvJson),
    wrapUserData("JOB ANALYSIS", jobAnalysisJson),
    wrapUserData("MATCHING RESULT", matchingResultJson),
  ].join("\n\n");

  return { systemInstruction, prompt };
}
