"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/auth";
import { ALLOWED_TRANSITIONS } from "@/lib/admin/status";
import { runRequestAnalysis } from "@/lib/ai/pipeline";
import {
  runDocumentGeneration,
  runApplicationAnswers,
  generateTailoredCvAndRender,
  generateCoverLetterAndRender,
  reRenderCvDocuments,
  saveTailoredCvEdits,
} from "@/lib/ai/generate";
import { deleteRequestData } from "@/lib/admin/retention";
import { logger } from "@/lib/logger";
import { redirect } from "next/navigation";
import type { RequestStatus } from "@/lib/supabase/types";

export type UpdateStatusState = { error?: string };

export async function updateRequestStatus(
  requestId: string,
  currentStatus: RequestStatus,
  nextStatus: RequestStatus
): Promise<UpdateStatusState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
    return { error: `Cannot move a request from ${currentStatus} to ${nextStatus}.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("requests")
    .update({ status: nextStatus })
    .eq("id", requestId);

  if (error) {
    logger.error("Failed to update request status", { requestId, message: error.message });
    return { error: "Could not update status. Please try again." };
  }

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin/dashboard");
  return {};
}

export type RunAnalysisState = { error?: string };

/** Runs Stages 1-3 (CV extraction, job analysis, evidence matching) for a
 * request. See lib/ai/pipeline.ts for the actual pipeline logic. */
export async function runAnalysis(requestId: string): Promise<RunAnalysisState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const result = await runRequestAnalysis(requestId);

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin/dashboard");

  return result;
}

export type GenerateDocumentsState = { error?: string };

/** Generates the tailored CV (PDF + DOCX) and, if the package includes one,
 * a cover letter. See lib/ai/generate.ts. */
export async function generateDocuments(requestId: string): Promise<GenerateDocumentsState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const result = await runDocumentGeneration(requestId);

  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin/dashboard");

  return result;
}

export type GenerateAnswersState = { error?: string };

export async function generateAnswers(
  requestId: string,
  questions: string[]
): Promise<GenerateAnswersState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const result = await runApplicationAnswers(requestId, questions);

  revalidatePath(`/admin/requests/${requestId}`);

  return result;
}

export type RegenerateState = { error?: string };

/** Regenerates just the tailored CV via Gemini — overwrites any manual
 * edits made via saveTailoredCvEditsAction. */
export async function regenerateTailoredCv(requestId: string): Promise<RegenerateState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const result = await generateTailoredCvAndRender(requestId);
  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin/dashboard");
  return result;
}

/** Regenerates just the cover letter via Gemini, from the current tailored
 * CV (AI-generated or manually edited). */
export async function regenerateCoverLetter(requestId: string): Promise<RegenerateState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const result = await generateCoverLetterAndRender(requestId);
  revalidatePath(`/admin/requests/${requestId}`);
  return result;
}

/** Re-renders the CV PDF/DOCX from the current outputs.tailored_cv without
 * calling Gemini — use after saving manual edits. */
export async function reRenderDocuments(requestId: string): Promise<RegenerateState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const result = await reRenderCvDocuments(requestId);
  revalidatePath(`/admin/requests/${requestId}`);
  return result;
}

export type SaveEditsState = { error?: string };

export async function saveTailoredCvEditsAction(
  requestId: string,
  edits: { tailoredProfile: string; skills: string[]; experienceBullets: string[][] }
): Promise<SaveEditsState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const result = await saveTailoredCvEdits(requestId, edits);
  revalidatePath(`/admin/requests/${requestId}`);
  return result;
}

export type DeleteRequestState = { error?: string };

/** Permanently deletes this request's stored files and database records.
 * Irreversible — see lib/admin/retention.ts. */
export async function deleteRequestPermanently(requestId: string): Promise<DeleteRequestState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const supabase = await createClient();
  const result = await deleteRequestData(supabase, requestId);
  if (result.error) return result;

  revalidatePath("/admin/requests");
  revalidatePath("/admin/dashboard");
  redirect("/admin/requests");
}
