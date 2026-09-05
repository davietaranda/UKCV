"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/admin/auth";
import { purgeExpiredRequests } from "@/lib/admin/retention";
import { getServerEnv } from "@/lib/env";

export type PurgeState = { error?: string; deleted?: number };

export async function purgeExpiredNow(): Promise<PurgeState> {
  const admin = await getAdminProfile();
  if (!admin) return { error: "Not authorised." };

  const supabase = await createClient();
  const env = getServerEnv();
  const result = await purgeExpiredRequests(supabase, env.RETENTION_DAYS);

  revalidatePath("/admin/settings");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/dashboard");

  if (result.errors > 0) {
    return { error: `Deleted ${result.deleted}, but ${result.errors} failed. Check logs.` };
  }
  return { deleted: result.deleted };
}
