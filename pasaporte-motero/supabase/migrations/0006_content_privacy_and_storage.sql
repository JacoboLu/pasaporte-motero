-- Pasaporte Motero · sincronización y seguridad de contenido privado.
-- Idempotente: puede ejecutarse más de una vez sin duplicar políticas.

alter table public.trips drop constraint if exists trips_visibility_check;
alter table public.trips add constraint trips_visibility_check
  check (visibility in ('public','followers','private'));

drop policy if exists "Read visible trips" on public.trips;
drop policy if exists "Read public or own trips" on public.trips;
create policy "Read visible trips" on public.trips for select
using (
  user_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'followers' and exists (
    select 1 from public.follows f
    where f.follower_id = auth.uid() and f.followed_id = trips.user_id
  ))
);

drop policy if exists "Read trip destinations for visible trips" on public.trip_destinations;
create policy "Read trip destinations for visible trips" on public.trip_destinations for select
using (exists (
  select 1 from public.trips t where t.id = trip_id and (
    t.user_id = auth.uid() or t.visibility = 'public'
    or (t.visibility = 'followers' and exists (
      select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = t.user_id
    ))
  )
));

drop policy if exists "Read trip photos for visible trips" on public.trip_photos;
create policy "Read trip photos for visible trips" on public.trip_photos for select
using (exists (
  select 1 from public.trips t where t.id = trip_id and (
    t.user_id = auth.uid() or t.visibility = 'public'
    or (t.visibility = 'followers' and exists (
      select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = t.user_id
    ))
  )
));

drop policy if exists "Read post photos" on public.post_photos;
create policy "Read post photos" on public.post_photos for select
using (exists (
  select 1 from public.posts p where p.id = post_id and (
    p.user_id = auth.uid() or p.visibility = 'public'
    or (p.visibility = 'followers' and exists (
      select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = p.user_id
    ))
  )
));

-- Bucket de fotos de motocicleta utilizado por la ficha técnica.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('motorcycles','motorcycles',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "Motorcycle owner reads own images" on storage.objects;
create policy "Motorcycle owner reads own images" on storage.objects for select to authenticated
using (bucket_id = 'motorcycles' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Motorcycle owner uploads own images" on storage.objects;
create policy "Motorcycle owner uploads own images" on storage.objects for insert to authenticated
with check (bucket_id = 'motorcycles' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Motorcycle owner updates own images" on storage.objects;
create policy "Motorcycle owner updates own images" on storage.objects for update to authenticated
using (bucket_id = 'motorcycles' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'motorcycles' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Motorcycle owner deletes own images" on storage.objects;
create policy "Motorcycle owner deletes own images" on storage.objects for delete to authenticated
using (bucket_id = 'motorcycles' and (storage.foldername(name))[1] = auth.uid()::text);

-- Community media remains private in Storage; access follows the parent post's visibility.
drop policy if exists "Read community media by post visibility" on storage.objects;
create policy "Read community media by post visibility" on storage.objects for select to authenticated
using (
  bucket_id = 'community' and exists (
    select 1 from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.storage_path = name and (
      p.user_id = auth.uid() or p.visibility = 'public'
      or (p.visibility = 'followers' and exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = p.user_id
      ))
    )
  )
);

-- Permite al usuario cancelar únicamente visitas aún pendientes.
drop policy if exists "Delete own pending visits" on public.visits;
create policy "Delete own pending visits" on public.visits
for delete to authenticated
using (auth.uid() = user_id and validation_status = 'pending');
