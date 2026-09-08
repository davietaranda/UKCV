"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";
import { logger } from "@/lib/logger";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean(),
});

export type SignInState = { error?: string };

export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const cookieStore = await cookies();
  const env = getPublicEnv();
  // Built inline (rather than lib/supabase/server's shared client) so an
  // unchecked "Remember me" can drop the maxAge Supabase normally sets
  // (@supabase/ssr defaults to a 400-day cookie), making the session end
  // when the browser closes instead.
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(
              name,
              value,
              parsed.data.remember ? options : { ...options, maxAge: undefined, expires: undefined }
            );
          }
        },
      },
    }
  );
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError || !signInData.user) {
    return { error: "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    logger.warn("Non-admin login attempt", { email: parsed.data.email });
    return { error: "This account is not authorised for admin access." };
  }

  redirect("/admin/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
