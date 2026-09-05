import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AiOperation, AiRunStatus } from "@/lib/supabase/types";
import type { AIUsage } from "@/lib/ai/provider";
import { logger } from "@/lib/logger";

/**
 * Wraps a single AI provider call, recording it to ai_runs regardless of
 * outcome (spec §17/§26 — usage monitoring and cost tracking). Re-throws on
 * failure so the caller's own error handling still runs.
 */
export async function withAIRunLogging<T>(
  params: { requestId: string; operation: AiOperation; model: string },
  fn: () => Promise<{ data: T; usage: AIUsage }>
): Promise<T> {
  const started = Date.now();
  try {
    const { data, usage } = await fn();
    await recordRun({
      ...params,
      status: "success",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      durationMs: usage.durationMs,
    });
    return data;
  } catch (err) {
    const isTimeout = err instanceof Error && /timeout/i.test(err.message);
    await recordRun({
      ...params,
      status: isTimeout ? "timeout" : "error",
      inputTokens: null,
      outputTokens: null,
      durationMs: Date.now() - started,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    throw err;
  }
}

async function recordRun(params: {
  requestId: string;
  operation: AiOperation;
  model: string;
  status: AiRunStatus;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
  errorMessage?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_runs").insert({
    request_id: params.requestId,
    operation: params.operation,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    duration_ms: params.durationMs,
    status: params.status,
    error_message: params.errorMessage ?? null,
  });
  if (error) {
    // Logging failure shouldn't mask the original AI result/error — just log it.
    logger.error("Failed to write ai_runs row", { requestId: params.requestId, message: error.message });
  }
}
