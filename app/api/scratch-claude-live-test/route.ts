import { NextResponse } from "next/server";
import { ClaudeProvider } from "@/lib/ai/claude";

// TEMPORARY — one-off live verification that ANTHROPIC_API_KEY (just added
// in Vercel) actually works against the real Claude API, and that
// structured-output parsing holds up against two different schema shapes.
// Calls ClaudeProvider directly, NOT getAIProvider() — production traffic
// stays on Gemini (AI_PROVIDER unchanged) the entire time this exists.
// Guarded by CRON_SECRET (already set in prod) so this isn't a fully open
// AI-calling endpoint even briefly. Delete this route right after use.
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = new ClaudeProvider();
  const results: Record<string, unknown> = {};

  try {
    const jobAnalysis = await provider.analyseJob(
      "Nursing Assistant, Derby Hospital. Duties include supporting patients with daily living activities, monitoring vital signs, and assisting registered nurses. Requires NVQ Level 2 in Health and Social Care, strong communication skills, and a caring, patient-focused attitude. Full training on manual handling and infection control provided."
    );
    results.analyseJob = { ok: true, usage: jobAnalysis.usage, data: jobAnalysis.data };
  } catch (err) {
    results.analyseJob = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  try {
    const extracted = await provider.extractCV(
      "JANE SMITH\njane.smith@email.com | +44 7700 900456 | Manchester, UK\n\nPROFESSIONAL SUMMARY\nCaring and dedicated healthcare assistant with 2 years experience supporting elderly patients.\n\nEMPLOYMENT\nHealthcare Assistant, Manchester Care Home, Jan 2023 - Present\n- Assisted residents with daily living activities\n- Monitored and recorded vital signs\n- Supported nursing staff with medication rounds\n\nEDUCATION\nNVQ Level 2 Health and Social Care, Manchester College, 2022\n\nCERTIFICATIONS\nFirst Aid at Work, 2023\nManual Handling Certificate, 2023"
    );
    results.extractCV = { ok: true, usage: extracted.usage, data: extracted.data };
  } catch (err) {
    results.extractCV = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(results);
}
