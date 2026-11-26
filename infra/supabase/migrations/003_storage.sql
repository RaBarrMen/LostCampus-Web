-- =====================================================================
-- LostCampus · 003 Almacenamiento de imágenes
-- Bucket privado, máximo 5 MB, solo JPG/PNG/WebP.
-- Cada usuario solo puede subir a su carpeta: item-images/<user_id>/archivo
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "subir a mi carpeta" on storage.objects;
create policy "subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "ver imagenes" on storage.objects;
create policy "ver imagenes" on storage.objects
  for select to authenticated
  using (bucket_id = 'item-images');

drop policy if exists "borrar mis imagenes" on storage.objects;
create policy "borrar mis imagenes" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
