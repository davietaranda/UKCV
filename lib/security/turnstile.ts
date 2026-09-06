import "server-only";

import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Cloudflare Turnstile token server-side. Returns `true` (i.e.
 * "allow the submission") whenever `TURNSTILE_SECRET_KEY` isn't configured —
 * CAPTCHA is opt-in until the client creates their own Turnstile widget, not
 * fail-closed, so the public form keeps working before that's set up.
 */
export async function verifyTurnstileToken(
  token: string | null,
  remoteIp: string | null
): Promise<boolean> {
  const env = getServerEnv();
  if (!env.TURNSTILE_SECRET_KEY) return true;

  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, { method: "POST", body });
    const data: { success?: boolean } = await res.json();
    return data.success === true;
  } catch (err) {
    logger.error("Turnstile verification request failed", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}
