-- Thyroid ultrasound reports (K-TIRADS)

create table if not exists public.thyroid_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patient_name text not null default '',
  chart_no text not null default '',
  rrn text not null default '',
  exam_date date,
  age_text text not null default '',
  sex text not null default '',
  clinical_info text not null default '',
  findings text not null default '',
  impression text not null default '',
  recommendations text not null default '',
  highest_k_tirads int not null default 0,
  nodules jsonb not null default '[]'::jsonb,
  image_assignments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.thyroid_reports enable row level security;

-- Thyroid reports: owner-only
create policy "thyroid_reports_select_own"
on public.thyroid_reports for select
using (auth.uid() = user_id);

create policy "thyroid_reports_insert_own"
on public.thyroid_reports for insert
with check (auth.uid() = user_id);

create policy "thyroid_reports_update_own"
on public.thyroid_reports for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "thyroid_reports_delete_own"
on public.thyroid_reports for delete
using (auth.uid() = user_id);

