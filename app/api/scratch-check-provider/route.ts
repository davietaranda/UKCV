import { NextResponse } from "next/server";

// TEMPORARY — reads the raw AI_PROVIDER env var, no AI calls, zero cost.
// Delete right after use.
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    AI_PROVIDER: process.env.AI_PROVIDER ?? "(unset — defaults to gemini)",
    ANTHROPIC_API_KEY_present: Boolean(process.env.ANTHROPIC_API_KEY),
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? "(unset — defaults to claude-haiku-4-5)",
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? "(unset)",
  });
}
