import "server-only";

import { headers } from "next/headers";
import { createHash } from "crypto";

/**
 * Best-effort client IP from proxy headers (Vercel/Cloudflare set
 * x-forwarded-for). Not spoof-proof against a determined attacker bypassing
 * the platform's own proxy, but sufficient for abuse rate-limiting rather
 * than security-critical access control.
 */
export async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerList.get("x-real-ip");
}

/** One-way hash of an IP for rate-limit correlation — deliberately not a
 * strong/peppered hash (IPv4 space is brute-forceable regardless), just
 * avoids storing raw addresses at rest. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
