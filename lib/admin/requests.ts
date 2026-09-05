import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database, RequestStatus } from "@/lib/supabase/types";

export type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
export type CvDocumentRow = Database["public"]["Tables"]["cv_documents"]["Row"];
export type JobAnalysisRow = Database["public"]["Tables"]["job_analysis"]["Row"];
export type MatchingRow = Database["public"]["Tables"]["matching"]["Row"];
export type OutputsRow = Database["public"]["Tables"]["outputs"]["Row"];

export interface DashboardStats {
  new: number;
  processing: number;
  draftReady: number;
  delivered: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const countFor = async (status: RequestStatus) => {
    const { count } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    return count ?? 0;
  };

  const [newCount, processingCount, draftReadyCount, deliveredCount] = await Promise.all([
    countFor("new"),
    countFor("processing"),
    countFor("draft_ready"),
    countFor("delivered"),
  ]);

  return {
    new: newCount,
    processing: processingCount,
    draftReady: draftReadyCount,
    delivered: deliveredCount,
  };
}

export async function getRecentRequests(limit = 8): Promise<RequestRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

const PAGE_SIZE = 20;

export async function listRequests(params: {
  status?: RequestStatus;
  page?: number;
}): Promise<{ requests: RequestRow[]; total: number; page: number; pageSize: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, count } = await query;

  return { requests: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export interface RequestDetail {
  request: RequestRow;
  cvDocument: CvDocumentRow | null;
  jobAnalysis: JobAnalysisRow | null;
  matching: MatchingRow | null;
  outputs: OutputsRow | null;
}

export async function getRequestDetail(id: string): Promise<RequestDetail | null> {
  const supabase = await createClient();

  const { data: request } = await supabase.from("requests").select("*").eq("id", id).maybeSingle();
  if (!request) return null;

  const latest = async <T extends { created_at: string }>(
    table: "cv_documents" | "job_analysis" | "matching" | "outputs"
  ): Promise<T | null> => {
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("request_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as T | null) ?? null;
  };

  const [cvDocument, jobAnalysis, matching, outputs] = await Promise.all([
    latest<CvDocumentRow>("cv_documents"),
    latest<JobAnalysisRow>("job_analysis"),
    latest<MatchingRow>("matching"),
    latest<OutputsRow>("outputs"),
  ]);

  return { request, cvDocument, jobAnalysis, matching, outputs };
}
