import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { getAIProvider } from "@/lib/ai/provider";
import { withAIRunLogging } from "@/lib/ai/logging";
import { getObjectBytes } from "@/lib/storage/r2";
import { extractTextFromCv } from "@/lib/documents/extract-text";
import { logger } from "@/lib/logger";

export interface PipelineResult {
  error?: string;
}

/**
 * Runs Stages 1-3 of the AI pipeline (CV extraction, job analysis, evidence
 * matching) for a request and persists the results. Stage 4+ (CV tailoring,
 * cover letter, application answers, document generation) is Phase 5 — kept
 * separate because it depends on the DOCX/PDF generation work, not just the
 * AI provider.
 *
 * Each stage is independently logged to ai_runs (success or failure) via
 * withAIRunLogging, and text extraction is cached on cv_documents so a
 * re-run doesn't re-parse the same file.
 */
export async function runRequestAnalysis(requestId: string): Promise<PipelineResult> {
  const supabase = await createClient();
  const env = getServerEnv();

  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { error: "Request not found." };

  const { data: cvDocument } = await supabase
    .from("cv_documents")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cvDocument) return { error: "No CV on file for this request." };

  if (request.status === "new") {
    await supabase.from("requests").update({ status: "processing" }).eq("id", requestId);
  }

  const provider = await getAIProvider();

  let extractedText = cvDocument.extracted_text;
  if (!extractedText) {
    try {
      const bytes = await getObjectBytes(cvDocument.original_file_path);
      const extension = cvDocument.original_filename.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : "docx";
      extractedText = await extractTextFromCv(bytes, extension);
      await supabase
        .from("cv_documents")
        .update({ extracted_text: extractedText })
        .eq("id", cvDocument.id);
    } catch (err) {
      logger.error("CV text extraction failed", {
        requestId,
        message: err instanceof Error ? err.message : "unknown",
      });
      return { error: "Could not extract text from the CV file." };
    }
  }

  if (!extractedText || extractedText.trim().length < 20) {
    return { error: "The CV file appears to contain no readable text." };
  }

  let structuredCV;
  try {
    structuredCV = await withAIRunLogging(
      { requestId, operation: "cv_extraction", model: env.GEMINI_MODEL },
      () => provider.extractCV(extractedText!)
    );
    await supabase
      .from("cv_documents")
      .update({ structured_cv: structuredCV })
      .eq("id", cvDocument.id);
  } catch (err) {
    logger.error("CV extraction failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "AI CV extraction failed. Check the AI usage log for details." };
  }

  let jobAnalysis;
  try {
    jobAnalysis = await withAIRunLogging(
      { requestId, operation: "job_analysis", model: env.GEMINI_MODEL },
      () => provider.analyseJob(request.job_description)
    );
    await supabase.from("job_analysis").insert({
      request_id: requestId,
      requirements: {
        essential: jobAnalysis.essentialRequirements,
        desirable: jobAnalysis.desirableRequirements,
        implied: jobAnalysis.impliedSignals,
      },
      responsibilities: jobAnalysis.responsibilities,
      keywords: jobAnalysis.keywords,
      skills: { technical: jobAnalysis.technicalSkills, soft: jobAnalysis.softSkills },
      qualifications: jobAnalysis.qualifications,
    });
  } catch (err) {
    logger.error("Job analysis failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "AI job analysis failed. Check the AI usage log for details." };
  }

  try {
    const matching = await withAIRunLogging(
      { requestId, operation: "evidence_matching", model: env.GEMINI_MODEL },
      () => provider.matchEvidence(structuredCV, jobAnalysis)
    );
    await supabase.from("matching").insert({
      request_id: requestId,
      strong_matches: matching.strongMatches,
      partial_matches: matching.partialMatches,
      missing_requirements: matching.missingRequirements,
      evidence_map: [
        ...matching.strongMatches,
        ...matching.partialMatches,
        ...matching.missingRequirements,
      ],
    });
    await supabase
      .from("requests")
      .update({ match_score: matching.matchScore })
      .eq("id", requestId);
  } catch (err) {
    logger.error("Evidence matching failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "AI evidence matching failed. Check the AI usage log for details." };
  }

  return {};
}
