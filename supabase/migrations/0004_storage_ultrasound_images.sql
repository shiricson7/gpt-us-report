-- Private Storage bucket for ultrasound images
-- Stores objects under: <user_id>/<scope>/<uuid>.jpg

insert into storage.buckets (id, name, public)
values ('ultrasound-images', 'ultrasound-images', false)
on conflict (id) do nothing;

-- Enable RLS on storage.objects is already enabled in Supabase; define owner-only policies by folder.
-- foldername(name) returns text[] split on '/'. We use the first segment as the user_id.

create policy "ultrasound_images_select_own"
on storage.objects for select
using (
  bucket_id = 'ultrasound-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "ultrasound_images_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'ultrasound-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "ultrasound_images_update_own"
on storage.objects for update
using (
  bucket_id = 'ultrasound-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'ultrasound-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "ultrasound_images_delete_own"
on storage.objects for delete
using (
  bucket_id = 'ultrasound-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

