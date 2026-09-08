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
The source text was mechanically extracted from a PDF or DOCX file, which sometimes loses line breaks between adjacent short lines (e.g. a bulleted list of certifications or skills can arrive as one run-on line with words jammed together, like "...CertificateSafe Handling..."). When you see this, split it back into separate, correctly-spaced items in the relevant array — insert a space exactly where one was lost, without merging, dropping, reordering, or rewording any of the underlying content.
Return ONLY JSON matching the required schema.
`.trim();

  const prompt = wrapUserData("CV CONTENT", rawCvText);

  return { systemInstruction, prompt };
}
