import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type AiRunRow = Database["public"]["Tables"]["ai_runs"]["Row"];

export async function getAIRunsForRequest(requestId: string, limit = 20): Promise<AiRunRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_runs")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
