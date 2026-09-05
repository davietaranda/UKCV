import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { getAIProvider } from "@/lib/ai/provider";
import { withAIRunLogging } from "@/lib/ai/logging";
import { buildCvContent } from "@/lib/documents/cv-content";
import { renderCvPdf } from "@/lib/documents/cv-pdf";
import { renderCvDocx } from "@/lib/documents/cv-docx";
import { renderCoverLetterPdf } from "@/lib/documents/cover-letter-pdf";
import { uploadObject, tailoredCvPdfKey, tailoredCvDocxKey, coverLetterPdfKey } from "@/lib/storage/r2";
import { getPackageById } from "@/lib/packages";
import { logger } from "@/lib/logger";
import { tailoredCVSchema } from "@/lib/ai/schemas";
import type { StructuredCV, JobAnalysis, MatchingResult, TailoredCV } from "@/lib/ai/schemas";
import type { Database } from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type OutputsFields = Partial<Database["public"]["Tables"]["outputs"]["Insert"]>;

export interface ActionResult {
  error?: string;
}

async function loadContext(supabase: SupabaseClient, requestId: string) {
  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { error: "Request not found." } as const;

  const { data: cvDocument } = await supabase
    .from("cv_documents")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cvDocument?.structured_cv) {
    return { error: "Run AI Analysis first — no extracted CV data found." } as const;
  }

  const { data: jobAnalysisRow } = await supabase
    .from("job_analysis")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!jobAnalysisRow) {
    return { error: "Run AI Analysis first — job analysis is missing." } as const;
  }

  const { data: outputRow } = await supabase
    .from("outputs")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    request,
    cvDocument,
    structuredCV: cvDocument.structured_cv as unknown as StructuredCV,
    jobAnalysis: reconstructJobAnalysis(jobAnalysisRow, request),
    jobAnalysisRow,
    outputRow,
  } as const;
}

async function upsertOutputs(
  supabase: SupabaseClient,
  requestId: string,
  existingOutputId: string | undefined,
  fields: OutputsFields
): Promise<{ error?: string }> {
  const { error } = existingOutputId
    ? await supabase.from("outputs").update(fields).eq("id", existingOutputId)
    : await supabase.from("outputs").insert({ request_id: requestId, ...fields });

  if (error) {
    logger.error("Failed to save outputs row", { requestId, message: error.message });
    return { error: "Generated content but failed to save. Please try again." };
  }
  return {};
}

async function renderAndUploadCv(
  requestId: string,
  structuredCV: StructuredCV,
  tailoredCV: TailoredCV,
  request: { customer_name: string; email: string; phone: string | null }
): Promise<
  | { ok: true; cvPdfKey: string; cvDocxKey: string; content: ReturnType<typeof buildCvContent> }
  | { ok: false; error: string }
> {
  const content = buildCvContent(structuredCV, tailoredCV, {
    customerName: request.customer_name,
    email: request.email,
    phone: request.phone,
  });

  let cvPdfBuffer: Buffer;
  let cvDocxBuffer: Buffer;
  try {
    [cvPdfBuffer, cvDocxBuffer] = await Promise.all([renderCvPdf(content), renderCvDocx(content)]);
  } catch (err) {
    logger.error("CV document rendering failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: "Failed to render the CV document." };
  }

  const cvPdfKey = tailoredCvPdfKey(requestId);
  const cvDocxKey = tailoredCvDocxKey(requestId);
  try {
    await Promise.all([
      uploadObject(cvPdfKey, cvPdfBuffer, "application/pdf"),
      uploadObject(
        cvDocxKey,
        cvDocxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ),
    ]);
  } catch (err) {
    logger.error("CV document upload failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: "Failed to store the generated CV." };
  }

  return { ok: true, cvPdfKey, cvDocxKey, content };
}

/** Calls Gemini to (re)generate the tailored CV and renders/uploads the
 * PDF+DOCX. Overwrites any manual edits made via saveTailoredCvEdits. */
export async function generateTailoredCvAndRender(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const env = getServerEnv();
  const ctx = await loadContext(supabase, requestId);
  if ("error" in ctx) return ctx;
  const { request, structuredCV, jobAnalysis } = ctx;

  const { data: matchingRow } = await supabase
    .from("matching")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!matchingRow) return { error: "Run AI Analysis first — matching is missing." };
  const matching = reconstructMatchingResult(matchingRow, request.match_score);

  const provider = await getAIProvider();
  let tailoredCV: TailoredCV;
  try {
    tailoredCV = await withAIRunLogging(
      { requestId, operation: "cv_tailoring", model: env.GEMINI_MODEL },
      () => provider.generateTailoredCV(structuredCV, jobAnalysis, matching)
    );
  } catch (err) {
    logger.error("CV tailoring failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "AI CV tailoring failed. Check the AI usage log for details." };
  }

  const rendered = await renderAndUploadCv(requestId, structuredCV, tailoredCV, request);
  if (!rendered.ok) return { error: rendered.error };

  const saveResult = await upsertOutputs(supabase, requestId, ctx.outputRow?.id, {
    tailored_cv: tailoredCV,
    cv_pdf_path: rendered.cvPdfKey,
    cv_docx_path: rendered.cvDocxKey,
    truth_guard_flags: tailoredCV.truthGuardFlags,
  });
  if (saveResult.error) return saveResult;

  if (request.status === "new" || request.status === "processing") {
    await supabase.from("requests").update({ status: "draft_ready" }).eq("id", requestId);
  }

  return {};
}

/** Calls Gemini to (re)generate the cover letter from the current tailored
 * CV (whether AI-generated or manually edited) and renders/uploads the PDF. */
export async function generateCoverLetterAndRender(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const env = getServerEnv();
  const ctx = await loadContext(supabase, requestId);
  if ("error" in ctx) return ctx;
  const { request, structuredCV, jobAnalysis, outputRow } = ctx;

  const tailoredCV = outputRow?.tailored_cv as unknown as TailoredCV | undefined;
  if (!tailoredCV) {
    return { error: "Generate the tailored CV first." };
  }

  const provider = await getAIProvider();
  let coverLetterText: string;
  try {
    coverLetterText = await withAIRunLogging(
      { requestId, operation: "cover_letter", model: env.GEMINI_MODEL },
      () => provider.generateCoverLetter(structuredCV, jobAnalysis, tailoredCV)
    );
  } catch (err) {
    logger.error("Cover letter generation failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "AI cover letter generation failed. Check the AI usage log for details." };
  }

  const content = buildCvContent(structuredCV, tailoredCV, {
    customerName: request.customer_name,
    email: request.email,
    phone: request.phone,
  });

  let coverLetterKey: string;
  try {
    const pdfBuffer = await renderCoverLetterPdf({
      name: content.name,
      contactParts: content.contactParts,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      paragraphs: coverLetterText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    });
    coverLetterKey = coverLetterPdfKey(requestId);
    await uploadObject(coverLetterKey, pdfBuffer, "application/pdf");
  } catch (err) {
    logger.error("Cover letter document failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "Failed to render or store the cover letter." };
  }

  return upsertOutputs(supabase, requestId, outputRow?.id, {
    cover_letter: coverLetterText,
    cover_letter_path: coverLetterKey,
  });
}

/** Re-renders the CV PDF/DOCX from whatever is currently in
 * outputs.tailored_cv (AI-generated or admin-edited) — no Gemini call, so
 * this is free to run after every manual edit. */
export async function reRenderCvDocuments(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const ctx = await loadContext(supabase, requestId);
  if ("error" in ctx) return ctx;
  const { request, structuredCV, outputRow } = ctx;

  const tailoredCV = outputRow?.tailored_cv as unknown as TailoredCV | undefined;
  if (!tailoredCV) return { error: "Generate the tailored CV first." };

  const rendered = await renderAndUploadCv(requestId, structuredCV, tailoredCV, request);
  if (!rendered.ok) return { error: rendered.error };

  return upsertOutputs(supabase, requestId, outputRow?.id, {
    cv_pdf_path: rendered.cvPdfKey,
    cv_docx_path: rendered.cvDocxKey,
  });
}

/** Saves admin edits to the tailored CV content (profile, skills, per-role
 * bullets) without calling the AI. Does not touch the rendered documents —
 * call reRenderCvDocuments afterwards to reflect the edits in the PDF/DOCX. */
export async function saveTailoredCvEdits(
  requestId: string,
  edits: { tailoredProfile: string; skills: string[]; experienceBullets: string[][] }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: outputRow } = await supabase
    .from("outputs")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const current = outputRow?.tailored_cv as unknown as TailoredCV | undefined;
  if (!current) return { error: "No tailored CV to edit yet — generate one first." };

  if (edits.experienceBullets.length !== current.tailoredExperience.length) {
    return { error: "Experience section mismatch — reload and try again." };
  }

  const updated: TailoredCV = {
    ...current,
    tailoredProfile: edits.tailoredProfile,
    skills: edits.skills,
    tailoredExperience: current.tailoredExperience.map((exp, i) => ({
      ...exp,
      bullets: edits.experienceBullets[i],
    })),
  };

  const validated = tailoredCVSchema.safeParse(updated);
  if (!validated.success) {
    return { error: "Edited content didn't pass validation. Please check for empty fields." };
  }

  return upsertOutputs(supabase, requestId, outputRow?.id, { tailored_cv: validated.data });
}

export interface GenerateAnswersResult {
  error?: string;
}

/** Generates answers to admin-supplied application questions, grounded in
 * the candidate's extracted CV. Requires Stage 1 (CV extraction) to have
 * already run. Questions come from the admin, not from job-description
 * auto-detection — the spec doesn't define a reliable way to extract
 * specific application questions from free-text job descriptions. */
export async function runApplicationAnswers(
  requestId: string,
  questions: string[]
): Promise<GenerateAnswersResult> {
  if (questions.length === 0) {
    return { error: "Add at least one question." };
  }

  const supabase = await createClient();
  const env = getServerEnv();
  const ctx = await loadContext(supabase, requestId);
  if ("error" in ctx) return ctx;
  const { structuredCV, jobAnalysis, outputRow } = ctx;

  const provider = await getAIProvider();
  let answers;
  try {
    answers = await withAIRunLogging(
      { requestId, operation: "application_answers", model: env.GEMINI_MODEL },
      () => provider.generateApplicationAnswers(structuredCV, jobAnalysis, questions)
    );
  } catch (err) {
    logger.error("Application answers generation failed", {
      requestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return { error: "AI answer generation failed. Check the AI usage log for details." };
  }

  return upsertOutputs(supabase, requestId, outputRow?.id, { application_answers: answers });
}

/** One-click convenience for the first generation pass: tailors the CV and,
 * if the request's package includes one, the cover letter too. Later
 * regeneration/editing uses the finer-grained functions above instead. */
export async function runDocumentGeneration(requestId: string): Promise<ActionResult> {
  const cvResult = await generateTailoredCvAndRender(requestId);
  if (cvResult.error) return cvResult;

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("requests")
    .select("package")
    .eq("id", requestId)
    .maybeSingle();
  const pkg = request ? getPackageById(request.package) : undefined;

  if (pkg?.includesCoverLetter) {
    const letterResult = await generateCoverLetterAndRender(requestId);
    if (letterResult.error) {
      return { error: `CV generated, but cover letter failed: ${letterResult.error}` };
    }
  }

  return {};
}

/**
 * job_analysis is stored denormalised for admin display (requirements.
 * essential/desirable/implied, skills.technical/soft) — this reassembles
 * the flat JobAnalysis shape the AI provider interface expects. jobTitle/
 * company aren't persisted separately in job_analysis (the customer-
 * supplied request.job_title/company are more reliable anyway), and a
 * handful of lower-signal fields (seniority, certifications, experience/
 * industry requirements) aren't persisted at all — acceptable for tailoring
 * purposes since essential/desirable/implied + keywords + skills carry the
 * signal that actually drives the rewrite.
 */
function reconstructJobAnalysis(
  row: {
    requirements: unknown;
    responsibilities: unknown;
    keywords: unknown;
    skills: unknown;
    qualifications: unknown;
  },
  request: { job_title: string | null; company: string | null }
): JobAnalysis {
  const requirements = (row.requirements ?? {}) as {
    essential?: string[];
    desirable?: string[];
    implied?: string[];
  };
  const skills = (row.skills ?? {}) as { technical?: string[]; soft?: string[] };

  return {
    jobTitle: request.job_title,
    company: request.company,
    seniority: null,
    responsibilities: (row.responsibilities as string[] | null) ?? [],
    essentialRequirements: requirements.essential ?? [],
    desirableRequirements: requirements.desirable ?? [],
    impliedSignals: requirements.implied ?? [],
    technicalSkills: skills.technical ?? [],
    softSkills: skills.soft ?? [],
    qualifications: (row.qualifications as string[] | null) ?? [],
    certifications: [],
    experienceRequirements: [],
    industryRequirements: [],
    keywords: (row.keywords as string[] | null) ?? [],
  };
}

function reconstructMatchingResult(
  row: {
    strong_matches: unknown;
    partial_matches: unknown;
    missing_requirements: unknown;
  },
  matchScore: number | null
): MatchingResult {
  return {
    matchScore: matchScore ?? 0,
    strongMatches: (row.strong_matches as MatchingResult["strongMatches"] | null) ?? [],
    partialMatches: (row.partial_matches as MatchingResult["partialMatches"] | null) ?? [],
    missingRequirements:
      (row.missing_requirements as MatchingResult["missingRequirements"] | null) ?? [],
  };
}
