import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const DB_CHECK_TIMEOUT_MS = 3000;

/**
 * Unauthenticated health check for uptime monitoring (Vercel, UptimeRobot,
 * etc). Reports config presence and a cheap live DB check — booleans only,
 * never error messages or any other internal detail in the RESPONSE, since
 * this endpoint has no auth gate by design. The actual error still goes to
 * the server-side log (Vercel function logs), which only the project owner
 * can see — silently swallowing it there too just makes this endpoint
 * undebuggable when it matters.
 *
 * The DB check carries its own short timeout (AbortController, below)
 * rather than trusting @supabase/postgrest-js's default retry policy: that
 * policy retries any thrown fetch error up to 3 times with exponential
 * backoff (1s/2s/4s = 7s total) on the assumption it's transient. A
 * malformed credential (e.g. a stray non-ASCII character corrupting an
 * Authorization header — see lib/env.ts's asciiString()) is never
 * transient, so those retries just make a broken health check slower
 * without ever making it succeed. A liveness probe should fail in
 * milliseconds, not seconds.
 */
export async function GET() {
  let envConfigured = true;
  try {
    getServerEnv();
  } catch (err) {
    envConfigured = false;
    logger.error("Health check: env not configured", {
      message: err instanceof Error ? err.message : "unknown",
    });
  }

  let databaseReachable = false;
  if (envConfigured) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DB_CHECK_TIMEOUT_MS);
    try {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("requests")
        .select("id", { head: true, count: "exact" })
        .abortSignal(controller.signal)
        .limit(1);
      databaseReachable = !error;
      if (error) {
        logger.error("Health check: database query failed", { message: error.message });
      }
    } catch (err) {
      databaseReachable = false;
      logger.error("Health check: database call threw", {
        message: err instanceof Error ? err.message : "unknown",
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const healthy = envConfigured && databaseReachable;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: { envConfigured, databaseReachable },
    },
    { status: healthy ? 200 : 503 }
  );
}
