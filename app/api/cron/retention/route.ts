import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeExpiredRequests } from "@/lib/admin/retention";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Scheduled retention sweep — deletes delivered/archived requests past
 * RETENTION_DAYS (spec §20). No browser session exists when a cron
 * scheduler calls this, so it authenticates via a shared secret instead of
 * admin login, and uses the service-role client (RLS is session-based and
 * there's no session here).
 *
 * Wire this to a scheduler in production (e.g. Vercel Cron) with the
 * `Authorization: Bearer <CRON_SECRET>` header. Without CRON_SECRET set,
 * this endpoint refuses every request — it does not run unauthenticated.
 */
export async function GET(request: Request) {
  // getServerEnv() requires every var (Supabase/R2/Gemini/etc.), not just
  // CRON_SECRET, to be set — so this can throw well before the CRON_SECRET
  // check below if the app isn't configured at all yet. Caught explicitly
  // so a scheduler hitting this too early still gets a clean JSON response
  // instead of a bare 500.
  let env;
  try {
    env = getServerEnv();
  } catch {
    return NextResponse.json({ error: "Retention endpoint not configured" }, { status: 503 });
  }

  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Retention endpoint not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await purgeExpiredRequests(supabase, env.RETENTION_DAYS);

  logger.info("Scheduled retention sweep completed", {
    deleted: result.deleted,
    errors: result.errors,
  });

  return NextResponse.json(result);
}
