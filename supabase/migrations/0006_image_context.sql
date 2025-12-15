-- Optional image context/notes to help AI analysis

alter table public.reports
add column if not exists image_context text not null default '';

alter table public.thyroid_reports
add column if not exists image_context text not null default '';

