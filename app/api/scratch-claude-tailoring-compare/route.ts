import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadContext, reconstructMatchingResult } from "@/lib/ai/generate";
import { ClaudeProvider } from "@/lib/ai/claude";

// TEMPORARY — one-off quality comparison: runs a real existing request's
// data through Claude Haiku 4.5 for CV tailoring + cover letter, and
// returns it alongside the existing Gemini-generated output already
// sitting in the DB, so the two can be judged side by side. Read-only
// against the DB — writes nothing, calls ClaudeProvider directly (not
// getAIProvider()), so production stays on Gemini throughout. Guarded by
// CRON_SECRET. Delete this route right after use.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestId = url.searchParams.get("requestId") ?? "b50c52f4-f0de-4259-a60b-3efee9e10bb7";

  const supabase = await createClient();
  const ctx = await loadContext(supabase, requestId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 400 });
  }

  const { data: matchingRow } = await supabase
    .from("matching")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!matchingRow) {
    return NextResponse.json({ error: "No matching data for this request." }, { status: 400 });
  }
  const matching = reconstructMatchingResult(matchingRow, ctx.request.match_score);

  const provider = new ClaudeProvider();
  const claudeTailored = await provider.generateTailoredCV(ctx.structuredCV, ctx.jobAnalysis, matching);
  const claudeCoverLetter = await provider.generateCoverLetter(
    ctx.structuredCV,
    ctx.jobAnalysis,
    claudeTailored.data
  );

  return NextResponse.json({
    customerName: ctx.request.customer_name,
    jobTitle: ctx.request.job_title,
    company: ctx.request.company,
    gemini: {
      tailoredCV: ctx.outputRow?.tailored_cv ?? null,
      coverLetter: ctx.outputRow?.cover_letter ?? null,
    },
    claudeHaiku: {
      tailoredCV: claudeTailored.data,
      tailoredCVUsage: claudeTailored.usage,
      coverLetter: claudeCoverLetter.data,
      coverLetterUsage: claudeCoverLetter.usage,
    },
  });
}
