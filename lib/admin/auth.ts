import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AdminProfile {
  id: string;
  email: string;
}

/** Returns the authenticated admin profile, or null if the caller is not a
 * signed-in admin. Route Handlers aren't wrapped by app/admin/(protected)'s
 * layout guard (layouts only gate page rendering), so anything under that
 * tree exposing a route.ts must call this explicitly. */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("id, email")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
}
