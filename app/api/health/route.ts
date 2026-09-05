import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";

/**
 * Unauthenticated health check for uptime monitoring (Vercel, UptimeRobot,
 * etc). Reports config presence and a cheap live DB check — booleans only,
 * never error messages or any other internal detail, since this endpoint
 * has no auth gate by design.
 */
export async function GET() {
  let envConfigured = true;
  try {
    getServerEnv();
  } catch {
    envConfigured = false;
  }

  let databaseReachable = false;
  if (envConfigured) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("requests").select("id", { head: true, count: "exact" }).limit(1);
      databaseReachable = !error;
    } catch {
      databaseReachable = false;
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
