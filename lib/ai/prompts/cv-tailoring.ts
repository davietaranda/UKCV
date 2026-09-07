import { TRUTH_GUARD_RULES, UNTRUSTED_DATA_BOUNDARY, wrapUserData } from "@/lib/ai/prompts/shared";

const WRITING_STYLE_RULES = `
WRITING STYLE — every bullet and the profile must follow these:
- Start each bullet with a strong past-tense action verb (e.g. "Managed", "Resolved", "Built", "Reduced"). Never start with "Responsible for", "Worked on", "Helped with", "Involved in", or any first-person pronoun.
- One clear achievement or responsibility per bullet. Do not chain multiple unrelated ideas together with "and".
- Use active voice, not passive ("Managed the rollout", not "The rollout was managed by").
- Keep bullets to roughly 12-20 words — long enough to be substantive, short enough to scan in a few seconds.
- If the source CV evidence contains a number, outcome, or scale (e.g. team size, percentage, time saved), keep it in the bullet — quantified bullets are stronger. Never add a number, percentage, or outcome that is not present in the evidence.
- Within each role, order bullets by relevance to this specific job first, not by their original order in the source CV.
- Do not open two bullets in the same role with the same verb.
- Professional profile: 2-4 sentences, no more. Open with the candidate's role and years of experience if known, then connect their strongest evidence-backed matches to this specific job — do not just restate the job description back at the reader.

Illustrative style example (not this candidate's data — for tone only):
  Weak:   "Was responsible for handling customer queries and dealing with complaints on a daily basis."
  Strong: "Resolved customer queries and complaints daily via phone and email, escalating complex cases where needed."
The "Strong" version fixed the passive opener and vague framing, but did not invent any number the "Weak" version didn't already imply. Match that discipline: improve clarity and impact, never invent evidence.
`.trim();

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
${WRITING_STYLE_RULES}
Prioritise relevant experience, reorder skills, improve the professional profile, rewrite bullet points, and naturally incorporate relevant keywords from the job analysis — without keyword-stuffing or copying the job description verbatim.
Ground the rewrite in the MATCHING RESULT: lead with strong matches, phrase partial matches honestly without overclaiming, and never fabricate coverage for a missing requirement.
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
