import type { NextConfig } from "next";

// A strict nonce-based script-src (the "correct" CSP approach) was tried
// via middleware and reverted: in this Next.js 16 / Turbopack setup, Next's
// own hydration/chunk-loading scripts didn't reliably pick up the nonce,
// which broke the app outright (verified against a production build, not
// just dev). 'unsafe-inline' for scripts is a real trade-off — it weakens
// XSS defense-in-depth — but every other directive here is strict, and a
// working CSP beats a theoretically-stronger one that breaks the app.
const isDev = process.env.NODE_ENV !== "production";

// 'unsafe-eval' is dev-only — Turbopack/React dev-mode call-stack
// reconstruction needs it (harmless: React never uses eval() in production).
// Cloudflare Turnstile (optional CAPTCHA on /apply — see
// NEXT_PUBLIC_TURNSTILE_SITE_KEY) needs its script allowed and its
// challenge iframe allowed via frame-src; harmless to include even when the
// site key isn't configured, since nothing loads from that host otherwise.
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' ${TURNSTILE_ORIGIN}${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${originOnly(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? ""}${isDev ? " ws://localhost:*" : ""}`.trim(),
  `frame-src ${TURNSTILE_ORIGIN}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join("; ");

function originOnly(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
