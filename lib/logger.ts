/**
 * Minimal structured logger. Swap the transport later (e.g. pipe to a log
 * drain) without touching call sites — everything goes through here.
 *
 * Never log secrets (API keys, tokens, service-role credentials) or full CV
 * contents. `context` is for identifiers (requestId, operation) only.
 */

type LogContext = Record<string, string | number | boolean | null | undefined>;

function emit(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
