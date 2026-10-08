alter table public.equipments
add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipment-photos',
  'equipment-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists equipment_photos_select_authenticated on storage.objects;
create policy equipment_photos_select_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'equipment-photos'
  and (select private.current_access_level()) is not null
);

drop policy if exists equipment_photos_insert_editor on storage.objects;
create policy equipment_photos_insert_editor
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'equipment-photos'
  and (select private.current_access_level()) in ('admin', 'editor')
);

drop policy if exists equipment_photos_update_editor on storage.objects;
create policy equipment_photos_update_editor
on storage.objects
for update
to authenticated
using (
  bucket_id = 'equipment-photos'
  and (select private.current_access_level()) in ('admin', 'editor')
)
with check (
  bucket_id = 'equipment-photos'
  and (select private.current_access_level()) in ('admin', 'editor')
);

drop policy if exists equipment_photos_delete_editor on storage.objects;
create policy equipment_photos_delete_editor
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'equipment-photos'
  and (select private.current_access_level()) in ('admin', 'editor')
);
