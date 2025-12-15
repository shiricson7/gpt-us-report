-- Ultrasound Report with AI (Supabase)
-- Run in Supabase SQL editor or via CLI migrations.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hospital_name text not null default '',
  doctor_name text not null default '',
  license_no text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_name text not null default '',
  chart_no text not null default '',
  rrn text not null default '',
  exam_date date,
  age_text text not null default '',
  sex text not null default '',
  ultrasound_type text not null default '',
  clinical_history text not null default '',
  findings text not null default '',
  impression text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;

-- Profiles: owner-only
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Reports: owner-only
create policy "reports_select_own"
on public.reports for select
using (auth.uid() = user_id);

create policy "reports_insert_own"
on public.reports for insert
with check (auth.uid() = user_id);

create policy "reports_update_own"
on public.reports for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reports_delete_own"
on public.reports for delete
using (auth.uid() = user_id);

