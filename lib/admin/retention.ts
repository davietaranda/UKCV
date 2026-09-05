import "server-only";

import { createClient } from "@/lib/supabase/server";
import { deleteObject } from "@/lib/storage/r2";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient as GenericSupabaseClient } from "@supabase/supabase-js";

type Client = GenericSupabaseClient<Database> | Awaited<ReturnType<typeof createClient>>;

/**
 * Deletion workflow (spec §20). Deleting a request removes every stored
 * file for it from R2 first, then deletes the `requests` row — the
 * `on delete cascade` foreign keys take care of cv_documents, job_analysis,
 * matching, outputs, and ai_runs. This is a genuine, irreversible delete,
 * not a soft-delete flag, since the point is the data stops existing.
 *
 * Takes the Supabase client as a parameter rather than constructing one
 * internally, so it works both from an authenticated admin session (RLS-
 * respecting `createClient()`) and from the unauthenticated scheduled
 * retention endpoint (service-role `createAdminClient()`).
 */
export async function deleteRequestData(supabase: Client, requestId: string): Promise<{ error?: string }> {
  const { data: cvDocument } = await supabase
    .from("cv_documents")
    .select("original_file_path")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: outputRow } = await supabase
    .from("outputs")
    .select("cv_pdf_path, cv_docx_path, cover_letter_path")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const keys = [
    cvDocument?.original_file_path,
    outputRow?.cv_pdf_path,
    outputRow?.cv_docx_path,
    outputRow?.cover_letter_path,
  ].filter((k): k is string => Boolean(k));

  for (const key of keys) {
    try {
      await deleteObject(key);
    } catch (err) {
      // Log and continue — a missing/already-deleted object shouldn't block
      // deleting the customer's data record.
      logger.error("Failed to delete R2 object during retention cleanup", {
        requestId,
        key,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const { error } = await supabase.from("requests").delete().eq("id", requestId);
  if (error) {
    logger.error("Failed to delete request row", { requestId, message: error.message });
    return { error: "Failed to delete the request record." };
  }

  logger.info("Request data deleted", { requestId, filesDeleted: String(keys.length) });
  return {};
}

export interface ExpiredRequestSummary {
  id: string;
  customerName: string;
  status: string;
  createdAt: string;
}

/** Requests past the configured retention window, based on status reaching
 * a terminal state (delivered/archived) rather than raw age — an in-flight
 * request shouldn't be deleted just because it's old. */
export async function getExpiredRequests(
  supabase: Client,
  retentionDays: number
): Promise<ExpiredRequestSummary[]> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("requests")
    .select("id, customer_name, status, updated_at")
    .in("status", ["delivered", "archived"])
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    status: r.status,
    createdAt: r.updated_at,
  }));
}

/** Deletes every expired request's data. Used by both the admin "Delete
 * expired now" button and the scheduled retention endpoint. */
export async function purgeExpiredRequests(
  supabase: Client,
  retentionDays: number
): Promise<{ deleted: number; errors: number }> {
  const expired = await getExpiredRequests(supabase, retentionDays);
  let deleted = 0;
  let errors = 0;

  for (const r of expired) {
    const result = await deleteRequestData(supabase, r.id);
    if (result.error) errors += 1;
    else deleted += 1;
  }

  return { deleted, errors };
}
