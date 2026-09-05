# UK CV Tailoring Service

Admin-operated service that turns a customer's existing CV into a tailored,
UK ATS-friendly application (CV, cover letter, application answers) for a
specific job. Customers submit without an account; an administrator
reviews and approves everything the AI-assisted pipeline produces before
delivery. See the master build spec for full product/architecture detail.

## Stack

Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4, Supabase
(Postgres + Auth for admin login only), Cloudflare R2 (private document
storage), Gemini API (client-owned key) for AI, Zod for validation, `docx`
+ `@react-pdf/renderer` for document generation, `pdf-parse` + `mammoth`
for CV text extraction.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in every value (see
   "Environment variables" below).
3. Apply the database schema: run `supabase/migrations/0001_init.sql`
   against your Supabase project (via the SQL editor, or `supabase db push`
   if using the Supabase CLI).
4. Create your first admin user in Supabase Auth (Dashboard → Authentication
   → Add user), then insert a matching row:
   ```sql
   insert into admin_profiles (id, email) values ('<auth-user-uuid>', 'you@example.com');
   ```
5. `npm run dev` and open `http://localhost:3000`. Admin login is at
   `/admin/login`.

## Environment variables

All required variables are listed in `.env.example`. Notably:

- `GEMINI_API_KEY` / `GEMINI_MODEL` — **must be the client's own Gemini API
  key**, not the developer's. It is server-only and must never be exposed to
  the browser or committed to git. See "Ownership" below.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses Row Level Security.
  Only used from trusted server code (`lib/supabase/admin.ts`), specifically
  the public submission flow (unauthenticated by design) and the cron
  retention endpoint (no browser session to authenticate with).
- `R2_*` — Cloudflare R2 credentials for the private document bucket. Use an
  R2 API token scoped to just that one bucket (Cloudflare dashboard → R2 →
  Manage API Tokens), not an account-wide token.
- `RETENTION_DAYS` — how long delivered/archived requests are kept before
  they're eligible for deletion. See "Retention & deletion" below.
- `CRON_SECRET` — required before wiring up the scheduled retention sweep;
  see the same section.

Never commit `.env` / `.env.local` — `.gitignore` already excludes them.

## Ownership / billing

The developer does not own or pay for production AI usage. The client owns
the Gemini API account, billing, and production API key; the client also
owns the production Supabase, R2, and Vercel accounts where practical. The
application reads `GEMINI_API_KEY` from environment configuration only — it
is never hardcoded.

## Production deployment

1. **Supabase**: create a production project, run
   `supabase/migrations/0001_init.sql` against it, create the first admin
   user (see "Local setup" above) in the production project specifically.
2. **Cloudflare R2**: create a private production bucket + a bucket-scoped
   API token (not account-wide).
3. **Gemini**: the client creates their own API key on their own Google
   account/billing (see "Ownership / billing"). Pick a `GEMINI_MODEL` that's
   generally available, not a preview/experimental model, for production.
4. **Vercel**: import the repo, set every variable from `.env.example` in
   the project's environment variables (production + preview as needed).
   `NEXT_PUBLIC_APP_URL` should be the real production domain.
   - Node version: this app requires **Node 22.3+** (`package.json`
     `engines.node`) — set that in Vercel's project settings if it isn't
     picked up automatically. Local dev has been running on Node 20.11.1
     throughout this build (`@supabase/supabase-js` and `pdf-parse` both
     warn about this) — upgrade local dev too before it becomes a hard
     requirement.
   - Cron: `vercel.json` already declares the retention sweep — just set
     `CRON_SECRET`. Vercel Cron requires a paid plan for anything more
     frequent than daily; the configured schedule (once/day) works on the
     Hobby tier.
   - Domain/HTTPS: both handled by Vercel once a custom domain is attached
     in project settings — nothing in the application code depends on a
     specific domain other than `NEXT_PUBLIC_APP_URL`.
5. **Monitoring**: `GET /api/health` is unauthenticated and reports
   `{status, checks: {envConfigured, databaseReachable}}` (booleans only,
   no internal detail) — point an uptime monitor (Vercel's own, or
   UptimeRobot/Better Uptime/etc.) at it. Vercel's dashboard gives function
   logs and basic observability out of the box with no extra setup.
6. **Before going live**: run through spec §35's success criteria list end
   to end against the production environment — submit a real request,
   confirm it lands in Supabase/R2, run AI analysis, generate documents,
   review/approve/deliver, confirm the customer-facing copy and legal pages
   are ones the client has actually reviewed (see the note in the Phase 2
   summary — the FAQ/example-transformation copy was drafted by the AI
   build process and hasn't been client-reviewed).

Verifying the AI pipeline, document generation, and file upload against a
*live* backend hasn't been possible during this build — there's no
Supabase/R2/Gemini project connected to it yet. Everything that could be
verified without live credentials has been (see each phase's report for
specifics); the rest needs a real run once this is deployed.

## Retention & deletion

Delivered or archived requests older than `RETENTION_DAYS` (based on last
status change, not raw submission date — in-flight requests are never
auto-deleted) are eligible for permanent deletion: every file in R2 plus
the full database record (cascades to `cv_documents`, `job_analysis`,
`matching`, `outputs`, `ai_runs`).

Three ways to trigger it:
- **Per-request**: "Delete permanently" in the request detail page's
  Overview tab (Danger zone).
- **Manual bulk**: Settings page shows the count of expired requests with a
  "Delete expired now" button.
- **Scheduled**: `vercel.json` already declares a daily cron
  (`0 3 * * *`) hitting `/api/cron/retention`. Set the `CRON_SECRET` env var
  in your Vercel project and Vercel automatically sends it as the
  `Authorization: Bearer <CRON_SECRET>` header on cron invocations — nothing
  else to wire up. The endpoint refuses every request until `CRON_SECRET` is
  set, so it's safe by default. If you deploy somewhere other than Vercel,
  point your own scheduler at the same path with the same header.

## Security notes

- Admin auth via Supabase Auth + an `admin_profiles` allow-list; every
  server action and Route Handler re-checks `getAdminProfile()` itself
  (doesn't rely solely on the layout guard, since Route Handlers and Server
  Actions aren't covered by a page layout).
- RLS is enabled on every table; the anon role has zero access. The public
  submission flow and the cron endpoint use the service-role client by
  necessity (no admin session exists in either context) — both are
  independently validated/authenticated in application code.
- File uploads: size cap, extension check, declared-MIME check, and a
  magic-byte signature check (the declared MIME type is never trusted
  alone). CV text extraction has a 30s timeout guard against a
  pathological file hanging the parser.
- Public submission is rate-limited two ways: 3/day per email, 5/hour per
  IP (SHA-256 hashed, not stored raw). Neither is bulletproof against a
  determined attacker — add a CAPTCHA if abuse shows up in practice.
- AI prompts explicitly separate system instructions from CV/job-description
  content and instruct the model to treat the latter as data, never
  instructions (see `lib/ai/prompts/shared.ts`) — defence against prompt
  injection via a malicious CV or job posting.
- Content-Security-Policy is set with strict directives (`frame-ancestors
  'none'`, `object-src 'none'`, `base-uri 'self'`, etc.) but `script-src`
  and `style-src` include `'unsafe-inline'` as a deliberate trade-off: a
  stricter nonce-based policy was implemented and tested against this
  Next.js 16/Turbopack setup, but Next's own hydration scripts didn't
  reliably pick up the nonce and it broke the app. A working CSP with one
  weaker directive beats a theoretically-stronger one that doesn't work —
  revisit if Next's nonce support improves.
- Error boundary (`app/error.tsx`) never surfaces stack traces or internal
  details to users; `lib/logger.ts` only logs identifiers and error
  messages, never secrets or full CV/document content.

## Project structure

```
app/
  (marketing)/               Public site: landing, /apply, /privacy, /terms
    apply/actions.ts          Public submission server action (rate-limited, validated)
  admin/
    login/                    Admin sign-in (public)
    (protected)/              Auth-guarded admin routes
      dashboard/, requests/, requests/[id]/, settings/
  api/cron/retention/         Scheduled deletion sweep (CRON_SECRET-protected)
  api/health/                 Unauthenticated health check for uptime monitoring
  error.tsx, not-found.tsx    Global error/404 handling
proxy.ts                      Middleware — refreshes the Supabase session cookie
lib/
  env.ts                      Zod-validated environment config — import from here, not process.env
  supabase/                   client.ts (browser), server.ts (RLS-respecting), admin.ts (service role)
  storage/r2.ts                Private R2 upload/download/delete (signed URLs only)
  security/rate-limit.ts       IP hashing for the submission rate limit
  validation/                  Zod schemas + file signature/size/extension checks
  documents/                   CV/cover-letter content model + PDF (react-pdf) + DOCX (docx) rendering
  admin/                       Data access (requests, ai-runs), status workflow, retention/deletion, auth
  ai/
    provider.ts                 AIProvider interface + getAIProvider() factory
    gemini.ts                   Gemini implementation
    schemas.ts                  Zod schemas (single source of truth for AI I/O types)
    pipeline.ts                 Stages 1-3: CV extraction, job analysis, evidence matching
    generate.ts                 Stages 4-5: CV tailoring, cover letter, application answers, rendering
    prompts/                    Per-stage prompt builders + shared Truth Guard / anti-injection rules
  packages.ts                  Central package configuration (spec §23)
  logger.ts                    Structured logging
components/
  ui/                          Design system primitives (Button, Input, Card, Badge, Table, ...)
  admin/                       Admin-specific views (status badges, match lists, Truth Guard, editor)
  marketing/                   Public site header/footer/apply form
supabase/migrations/           SQL schema
```

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build
npm run start    # run a production build locally
npm run lint     # eslint
```
