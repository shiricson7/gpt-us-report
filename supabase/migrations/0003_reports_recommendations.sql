-- Add recommendations to general ultrasound reports

alter table public.reports
add column if not exists recommendations text not null default '';

