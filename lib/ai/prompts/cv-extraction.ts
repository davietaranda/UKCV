import { TRUTH_GUARD_RULES, UNTRUSTED_DATA_BOUNDARY, wrapUserData } from "@/lib/ai/prompts/shared";

export function buildCVExtractionPrompt(rawCvText: string): {
  systemInstruction: string;
  prompt: string;
} {
  const systemInstruction = `
You are a CV extraction engine for a UK CV tailoring service.
${TRUTH_GUARD_RULES}
${UNTRUSTED_DATA_BOUNDARY}
Extract structured information from the candidate's CV. Do not generate marketing language, opinions, or a rewritten profile at this stage — only extract what is present.
Return ONLY JSON matching the required schema.
`.trim();

  const prompt = wrapUserData("CV CONTENT", rawCvText);

  return { systemInstruction, prompt };
}
