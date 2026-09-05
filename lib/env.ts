import { z } from "zod";

/**
 * Centralised, validated environment configuration.
 * Import from here instead of touching `process.env` directly, so a missing
 * or malformed variable fails fast at startup rather than deep in a request.
 */

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),

  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),

  RETENTION_DAYS: z.coerce.number().int().positive().default(30),

  // Shared secret for the scheduled retention endpoint (app/api/cron/retention).
  // Optional in dev; required before wiring up a real cron trigger.
  CRON_SECRET: z.string().min(16).optional(),

  ADMIN_ALLOWED_EMAILS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    ),
});

const publicEnvSchema = serverEnvSchema.pick({
  NEXT_PUBLIC_APP_URL: true,
  NEXT_PUBLIC_SUPPORT_EMAIL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

/**
 * Validates and returns server-only env vars. Throws with a readable message
 * listing every missing/invalid key, instead of a bare Zod stack trace.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n\nCheck .env.local against .env.example.`
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Support/contact email shown on public pages. Reads directly (not via the
 * strict schema) so static content pages don't fail just because unrelated
 * required vars (Supabase, R2, Gemini) aren't configured yet. Returns null
 * if unset — callers must handle that rather than fabricate an address. */
export function getSupportEmail(): string | null {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null;
}

/** Validated env vars that are safe to read on the client. */
export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid or missing public environment variables:\n${issues}`);
  }
  return parsed.data;
}
