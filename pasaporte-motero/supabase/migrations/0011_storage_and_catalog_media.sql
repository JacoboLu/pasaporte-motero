-- Pasaporte Motero · completar almacenamiento seguro para viajes y comunidad
-- Idempotente: se puede ejecutar más de una vez.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('travel-media', 'travel-media', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('community', 'community', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Archivos privados de viajes, evidencias y bitácoras.
drop policy if exists "Read own travel media" on storage.objects;
create policy "Read own travel media" on storage.objects
for select to authenticated
using (
  bucket_id = 'travel-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.trip_photos tp
      join public.trips t on t.id = tp.trip_id
      where tp.storage_path = name
        and (
          t.visibility = 'public'
          or t.user_id = auth.uid()
          or (
            t.visibility = 'followers'
            and exists (
              select 1 from public.follows f
              where f.follower_id = auth.uid()
                and f.following_id = t.user_id
            )
          )
        )
    )
  )
);

drop policy if exists "Upload own travel media" on storage.objects;
create policy "Upload own travel media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'travel-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Update own travel media" on storage.objects;
create policy "Update own travel media" on storage.objects
for update to authenticated
using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Delete own travel media" on storage.objects;
create policy "Delete own travel media" on storage.objects
for delete to authenticated
using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Las fotos de publicaciones solo se pueden consultar cuando la publicación
-- es pública, pertenece al usuario o es visible para sus seguidores.
drop policy if exists "Read visible community media" on storage.objects;
create policy "Read visible community media" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'community'
  and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.storage_path = name
      and (
        p.visibility = 'public'
        or p.user_id = auth.uid()
        or (
          p.visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid()
              and f.following_id = p.user_id
          )
        )
      )
  )
);

drop policy if exists "Upload own community media" on storage.objects;
create policy "Upload own community media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'community'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Delete own community media" on storage.objects;
create policy "Delete own community media" on storage.objects
for delete to authenticated
using (
  bucket_id = 'community'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Permite que el catálogo tenga una imagen específica por destino.
alter table public.destination_catalog
  add column if not exists image_url text;
