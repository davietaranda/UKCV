-- UK CV Tailoring Service — initial schema
-- Admin-operated workflow: customers never authenticate, so there is no
-- `customers` table with auth linkage. Admin identity comes from Supabase
-- Auth (auth.users); `admin_profiles` just marks who is allowed in.

create extension if not exists "pgcrypto";

create type request_status as enum (
  'new',
  'processing',
  'draft_ready',
  'review',
  'approved',
  'delivered',
  'archived'
);

create type ai_operation as enum (
  'cv_extraction',
  'job_analysis',
  'evidence_matching',
  'cv_tailoring',
  'cover_letter',
  'application_answers'
);

create type ai_run_status as enum ('success', 'error', 'timeout');

-- ---------------------------------------------------------------------------
-- admin_profiles: allow-list of admin users, keyed to auth.users
-- ---------------------------------------------------------------------------
create table admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- requests: one row per customer submission
-- ---------------------------------------------------------------------------
create table requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text,
  job_title text,
  company text,
  job_url text,
  job_description text not null,
  package text not null,
  urgency text,
  -- SHA-256 of the submitter's IP, for abuse rate-limiting only — never the
  -- raw address. See lib/security/rate-limit.ts.
  ip_hash text,
  consent_given_at timestamptz not null default now(),
  status request_status not null default 'new',
  match_score smallint check (match_score is null or (match_score between 0 and 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_status_idx on requests (status);
create index requests_created_at_idx on requests (created_at desc);
create index requests_email_idx on requests (email);
create index requests_ip_hash_idx on requests (ip_hash);

-- ---------------------------------------------------------------------------
-- cv_documents: original upload + extracted structured CV
-- ---------------------------------------------------------------------------
create table cv_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  original_file_path text not null,
  original_filename text not null,
  extracted_text text,
  structured_cv jsonb,
  created_at timestamptz not null default now()
);

create index cv_documents_request_id_idx on cv_documents (request_id);

-- ---------------------------------------------------------------------------
-- job_analysis: structured breakdown of the target job description
-- ---------------------------------------------------------------------------
create table job_analysis (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  requirements jsonb,
  responsibilities jsonb,
  keywords jsonb,
  skills jsonb,
  qualifications jsonb,
  created_at timestamptz not null default now()
);

create index job_analysis_request_id_idx on job_analysis (request_id);

-- ---------------------------------------------------------------------------
-- matching: evidence map between CV and job requirements
-- ---------------------------------------------------------------------------
create table matching (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  strong_matches jsonb,
  partial_matches jsonb,
  missing_requirements jsonb,
  evidence_map jsonb,
  created_at timestamptz not null default now()
);

create index matching_request_id_idx on matching (request_id);

-- ---------------------------------------------------------------------------
-- outputs: generated deliverables for a request
-- ---------------------------------------------------------------------------
create table outputs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  tailored_cv jsonb,
  cv_pdf_path text,
  cv_docx_path text,
  cover_letter text,
  cover_letter_path text,
  application_answers jsonb,
  truth_guard_flags jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outputs_request_id_idx on outputs (request_id);

-- ---------------------------------------------------------------------------
-- ai_runs: usage/audit log for every Gemini call
-- ---------------------------------------------------------------------------
create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests (id) on delete cascade,
  operation ai_operation not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  status ai_run_status not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index ai_runs_request_id_idx on ai_runs (request_id);
create index ai_runs_created_at_idx on ai_runs (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger requests_set_updated_at
  before update on requests
  for each row execute function set_updated_at();

create trigger outputs_set_updated_at
  before update on outputs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- All customer-facing writes go through the service-role client from a
-- validated server action (never straight from the browser), so the anon
-- role gets no access at all. Admins access data through the anon key while
-- authenticated, gated on membership in admin_profiles.
-- ---------------------------------------------------------------------------
alter table admin_profiles enable row level security;
alter table requests enable row level security;
alter table cv_documents enable row level security;
alter table job_analysis enable row level security;
alter table matching enable row level security;
alter table outputs enable row level security;
alter table ai_runs enable row level security;

create function is_admin() returns boolean as $$
  select exists (
    select 1 from admin_profiles where id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create policy "Admins can read own profile" on admin_profiles
  for select using (id = auth.uid());

create policy "Admins can read requests" on requests
  for select using (is_admin());
create policy "Admins can update requests" on requests
  for update using (is_admin());
create policy "Admins can delete requests" on requests
  for delete using (is_admin());

create policy "Admins can read cv_documents" on cv_documents
  for select using (is_admin());
create policy "Admins can update cv_documents" on cv_documents
  for update using (is_admin());

create policy "Admins can read job_analysis" on job_analysis
  for select using (is_admin());
create policy "Admins can insert job_analysis" on job_analysis
  for insert with check (is_admin());

create policy "Admins can read matching" on matching
  for select using (is_admin());
create policy "Admins can insert matching" on matching
  for insert with check (is_admin());

create policy "Admins can read outputs" on outputs
  for select using (is_admin());
create policy "Admins can insert outputs" on outputs
  for insert with check (is_admin());
create policy "Admins can update outputs" on outputs
  for update using (is_admin());

create policy "Admins can read ai_runs" on ai_runs
  for select using (is_admin());
create policy "Admins can insert ai_runs" on ai_runs
  for insert with check (is_admin());
