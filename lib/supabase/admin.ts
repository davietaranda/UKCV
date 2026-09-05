import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv, getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role Supabase client. Bypasses RLS entirely — use only in trusted
 * server-side code paths (API routes, server actions, background jobs) that
 * have already established the caller is either the public submission flow
 * (with its own validation/rate limiting) or an authenticated admin.
 *
 * Never import this into any file that could end up in a client bundle.
 */
export function createAdminClient() {
  const serverEnv = getServerEnv();
  const publicEnv = getPublicEnv();

  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
