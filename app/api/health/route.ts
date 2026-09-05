import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Unauthenticated health check for uptime monitoring (Vercel, UptimeRobot,
 * etc). Reports config presence and a cheap live DB check — booleans only,
 * never error messages or any other internal detail in the RESPONSE, since
 * this endpoint has no auth gate by design. The actual error still goes to
 * the server-side log (Vercel function logs), which only the project owner
 * can see — silently swallowing it there too just makes this endpoint
 * undebuggable when it matters.
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
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("requests").select("id", { head: true, count: "exact" }).limit(1);
      databaseReachable = !error;
      if (error) {
        logger.error("Health check: database query failed", { message: error.message });
      }
    } catch (err) {
      databaseReachable = false;
      logger.error("Health check: database call threw", {
        message: err instanceof Error ? err.message : "unknown",
      });
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
