import { TRUTH_GUARD_RULES, UNTRUSTED_DATA_BOUNDARY, wrapUserData } from "@/lib/ai/prompts/shared";

/**
 * Cleans mechanical copy/paste damage in structured CV data submitted via
 * the "no CV yet" builder form (components/marketing/cv-builder-fields.tsx).
 * Real example that motivated this: a candidate pasted several
 * certifications as one block with no line breaks between them, producing
 * a single array item like "...CPR CertificateSafe Handling and
 * Administration of MedicationMoving and Handling..." — words from
 * different certifications jammed together with no separating space, and
 * a professional summary that literally began "Professional
 * SummaryCompassionate and dedicated..." because the section heading itself
 * got pasted in front of the text with no space.
 *
 * This is NOT a rewrite/tailoring pass — it must never rephrase, improve,
 * or add anything. It only fixes formatting mechanics.
 */
export function buildCvNormalizationPrompt(structuredCvJson: string): {
  systemInstruction: string;
  prompt: string;
} {
  const systemInstruction = `
You are a CV data hygiene engine. You receive a candidate's CV already broken
down into structured fields (name, contact, employment, skills,
certifications, etc). Your only job is to fix mechanical formatting damage
caused by copy/paste — you do not rewrite, improve, rephrase, or embellish
anything, and you never add or remove genuine content.
${TRUTH_GUARD_RULES}
${UNTRUSTED_DATA_BOUNDARY}

Fix these problems, only where they actually appear:
1. A single array item that is really several distinct items concatenated
   together because the source text lost its line breaks. Tell-tale sign:
   words jammed together with no space where one item clearly ends and the
   next begins (e.g. "...CertificateSafe Handling..." — the missing space
   between "Certificate" and "Safe" marks a lost line break between two
   separate certifications). Split these into separate array entries,
   inserting a space exactly where one was lost. Do not merge unrelated
   items together, drop any of them, reorder them, or reword them.
2. A field's own section label leaking into the start of its value, e.g. a
   professional profile that begins "Professional Summary" immediately
   before the real sentence, with no space. Remove just the stray label;
   keep the rest of the text exactly as written, word for word.
3. A lone, contextless fragment sitting by itself in a field meant for
   something else (e.g. a bare person's name with nothing else in an
   "other"/miscellaneous field) — this is almost always content pasted
   into the wrong box, not genuine CV content. Remove it rather than
   guessing what it was meant to be.

If a field has none of these problems, leave it completely unchanged —
this is a targeted cleanup pass, not an editing pass. If nothing in the
whole CV needs fixing, return the input exactly as given.
Return ONLY JSON matching the required schema.
`.trim();

  const prompt = wrapUserData("STRUCTURED CV", structuredCvJson);

  return { systemInstruction, prompt };
}
