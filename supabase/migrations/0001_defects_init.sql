-- A/C Defects module — initial schema, RLS, approval RPCs and private storage.
-- Idempotent-ish: safe to run once on a fresh Supabase project. See
-- docs/DEFECTS_SETUP.md for the surrounding setup + Admin bootstrap.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type defect_role as enum ('viewer', 'uploader', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type defect_category as enum ('B', 'C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum (
    'uploaded', 'processing', 'review_required', 'ready_to_publish',
    'published', 'failed', 'superseded'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role defect_role not null default 'viewer',
  approval_status approval_status not null default 'pending',
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a pending profile whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, approval_status)
  values (new.id, new.email, 'viewer', 'pending')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role/approval helpers (SECURITY DEFINER bypasses RLS → no policy recursion).
create or replace function public.current_role()
returns defect_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select approval_status = 'approved' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('uploader','admin') from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------------
-- defect_reports
-- ---------------------------------------------------------------------------
create table if not exists public.defect_reports (
  id uuid primary key default gen_random_uuid(),
  category defect_category not null,
  status report_status not null default 'uploaded',
  source_file_name text not null,
  storage_path text not null,
  file_sha256 text,
  page_count int,
  report_generated_at timestamptz,           -- from PDF header (authoritative)
  report_generated_at_raw text,
  uploaded_by uuid references auth.users (id),
  uploaded_at timestamptz not null default now(),
  published_by uuid references auth.users (id),
  published_at timestamptz,
  is_current boolean not null default false,
  parser_version text,
  ai_provider text,
  ai_model text,
  processing_summary jsonb,
  warnings jsonb,
  error_message text,
  pdf_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one current report per category.
create unique index if not exists defect_reports_one_current_per_category
  on public.defect_reports (category) where is_current;
create index if not exists defect_reports_category_status on public.defect_reports (category, status);

-- ---------------------------------------------------------------------------
-- report_aircraft (includes aircraft with Open Defects = 0)
-- ---------------------------------------------------------------------------
create table if not exists public.report_aircraft (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.defect_reports (id) on delete cascade,
  registration text not null,
  expected_open_count int,
  parsed_open_count int,
  warning_count int not null default 0,
  source_page_start int,
  source_page_end int
);
create index if not exists report_aircraft_report on public.report_aircraft (report_id);

-- ---------------------------------------------------------------------------
-- defect_records
-- ---------------------------------------------------------------------------
create table if not exists public.defect_records (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.defect_reports (id) on delete cascade,
  report_aircraft_id uuid references public.report_aircraft (id) on delete cascade,
  category defect_category not null,
  registration text not null,
  defect_key text not null,
  wo_number text,
  defect_id_raw text,
  defect_id_normalized text,
  short_title text not null,
  full_description text not null,
  issued_date date,
  issue_station text,
  doc_reference text,
  mel_reference text,
  mel_category text,
  current_due_date date,
  original_due_date date,
  concession_due_date date,
  is_concession boolean not null default false,
  raw_declared_deadline text,
  source_page_start int,
  source_page_end int,
  source_text text,
  raw_payload jsonb,
  review_required boolean not null default false,
  manually_edited boolean not null default false,
  edited_by uuid references auth.users (id),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists defect_records_report on public.defect_records (report_id);
create index if not exists defect_records_lookup on public.defect_records (category, registration);

-- ---------------------------------------------------------------------------
-- defect_limits (a defect may have several limits)
-- ---------------------------------------------------------------------------
create table if not exists public.defect_limits (
  id uuid primary key default gen_random_uuid(),
  defect_record_id uuid not null references public.defect_records (id) on delete cascade,
  limit_type text not null,
  remaining_text text,
  remaining_numeric numeric,
  due_date date,
  threshold_text text,
  raw_text text,
  sort_order int not null default 0
);
create index if not exists defect_limits_record on public.defect_limits (defect_record_id);

-- ---------------------------------------------------------------------------
-- defect_history_events
-- ---------------------------------------------------------------------------
create table if not exists public.defect_history_events (
  id uuid primary key default gen_random_uuid(),
  category defect_category not null,
  registration text not null,
  defect_key text not null,
  previous_report_id uuid references public.defect_reports (id) on delete set null,
  new_report_id uuid references public.defect_reports (id) on delete set null,
  previous_record_id uuid,
  new_record_id uuid,
  event_type text not null,   -- NEW | UPDATED | UNCHANGED | REMOVED_FROM_LATEST_REPORT
  changed_fields jsonb,
  created_at timestamptz not null default now()
);
create index if not exists defect_history_reg on public.defect_history_events (category, registration);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id),
  action text not null,
  entity_type text,
  entity_id uuid,
  report_id uuid references public.defect_reports (id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_report on public.audit_logs (report_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.defect_reports enable row level security;
alter table public.report_aircraft enable row level security;
alter table public.defect_records enable row level security;
alter table public.defect_limits enable row level security;
alter table public.defect_history_events enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: read own; staff read all. No direct writes (role/approval via RPC).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_staff());

-- defect_reports: approved viewers see published; staff see everything.
drop policy if exists reports_select on public.defect_reports;
create policy reports_select on public.defect_reports
  for select using (
    public.is_staff() or (public.is_approved() and status = 'published')
  );

-- Child tables mirror the parent report's visibility.
drop policy if exists aircraft_select on public.report_aircraft;
create policy aircraft_select on public.report_aircraft
  for select using (
    public.is_staff() or exists (
      select 1 from public.defect_reports r
      where r.id = report_aircraft.report_id
        and public.is_approved() and r.status = 'published'
    )
  );

drop policy if exists records_select on public.defect_records;
create policy records_select on public.defect_records
  for select using (
    public.is_staff() or exists (
      select 1 from public.defect_reports r
      where r.id = defect_records.report_id
        and public.is_approved() and r.status = 'published'
    )
  );

drop policy if exists limits_select on public.defect_limits;
create policy limits_select on public.defect_limits
  for select using (
    exists (
      select 1 from public.defect_records d
      join public.defect_reports r on r.id = d.report_id
      where d.id = defect_limits.defect_record_id
        and (public.is_staff() or (public.is_approved() and r.status = 'published'))
    )
  );

drop policy if exists history_select on public.defect_history_events;
create policy history_select on public.defect_history_events
  for select using (public.is_staff() or public.is_approved());

drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select using (public.is_staff());

-- NOTE: no INSERT/UPDATE/DELETE policies are defined for authenticated users.
-- All writes (upload metadata, parsing, draft edits, publish, corrections,
-- cleanup, approvals) go through the service role in /api, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Approval / role RPCs — each re-checks the caller's role in the database.
-- ---------------------------------------------------------------------------
create or replace function public.approve_user_as_viewer(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() not in ('uploader','admin') then
    raise exception 'not authorized';
  end if;
  update public.profiles
    set role = 'viewer', approval_status = 'approved',
        approved_by = auth.uid(), approved_at = now(), updated_at = now()
    where id = target;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id)
    values (auth.uid(), 'approve_user_as_viewer', 'profile', target);
end $$;

create or replace function public.reject_user(target uuid, reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() not in ('uploader','admin') then
    raise exception 'not authorized';
  end if;
  update public.profiles
    set approval_status = 'rejected', updated_at = now()
    where id = target;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, reason)
    values (auth.uid(), 'reject_user', 'profile', target, reason);
end $$;

create or replace function public.suspend_user(target uuid, reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'not authorized';
  end if;
  update public.profiles
    set approval_status = 'suspended', updated_at = now()
    where id = target;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, reason)
    values (auth.uid(), 'suspend_user', 'profile', target, reason);
end $$;

-- Only admins may set roles; only admins may grant 'admin'. Uploaders cannot
-- reach this function (guarded), enforcing "uploader can approve viewers only".
create or replace function public.admin_set_user_role(target uuid, new_role defect_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'not authorized';
  end if;
  update public.profiles
    set role = new_role, approval_status = 'approved',
        approved_by = auth.uid(), approved_at = now(), updated_at = now()
    where id = target;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, after_data)
    values (auth.uid(), 'admin_set_user_role', 'profile', target, jsonb_build_object('role', new_role));
end $$;

revoke all on function public.approve_user_as_viewer(uuid) from public;
revoke all on function public.reject_user(uuid, text) from public;
revoke all on function public.suspend_user(uuid, text) from public;
revoke all on function public.admin_set_user_role(uuid, defect_role) from public;
grant execute on function public.approve_user_as_viewer(uuid) to authenticated;
grant execute on function public.reject_user(uuid, text) to authenticated;
grant execute on function public.suspend_user(uuid, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, defect_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket for original PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('defect-pdfs', 'defect-pdfs', false)
on conflict (id) do nothing;

-- Only approved staff may upload; reads happen via service-role signed URLs.
drop policy if exists defect_pdfs_insert on storage.objects;
create policy defect_pdfs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'defect-pdfs' and public.is_staff() and public.is_approved());

drop policy if exists defect_pdfs_select_staff on storage.objects;
create policy defect_pdfs_select_staff on storage.objects
  for select to authenticated
  using (bucket_id = 'defect-pdfs' and public.is_staff());
