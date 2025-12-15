-- Store encrypted RRN (application-side encryption) while keeping masked RRN in rrn column.

alter table public.reports
add column if not exists rrn_enc text not null default '';

alter table public.thyroid_reports
add column if not exists rrn_enc text not null default '';

