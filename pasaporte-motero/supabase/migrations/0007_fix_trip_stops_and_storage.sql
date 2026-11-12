-- Pasaporte Motero · bitácoras y almacenamiento de motocicleta
-- Idempotente: se puede ejecutar aunque parte del esquema ya exista.

create table if not exists public.trip_custom_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  catalog_destination_id integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.trip_custom_stops enable row level security;
drop policy if exists "Read custom stops for visible trips" on public.trip_custom_stops;
create policy "Read custom stops for visible trips" on public.trip_custom_stops
for select to anon, authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_id
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
);

drop policy if exists "Manage own custom stops" on public.trip_custom_stops;
create policy "Manage own custom stops" on public.trip_custom_stops
for all to authenticated
using (
  user_id = auth.uid()
  and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
)
with check (
  user_id = auth.uid()
  and exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())
);

-- Bucket privado utilizado por las fotos de bitácora y de motocicleta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('travel-media', 'travel-media', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('motorcycles', 'motorcycles', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Read own travel media" on storage.objects;
create policy "Read own travel media" on storage.objects
for select to authenticated
using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Upload own travel media" on storage.objects;
create policy "Upload own travel media" on storage.objects
for insert to authenticated
with check (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Delete own travel media" on storage.objects;
create policy "Delete own travel media" on storage.objects
for delete to authenticated
using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Read own motorcycle files" on storage.objects;
create policy "Read own motorcycle files" on storage.objects
for select to authenticated
using (bucket_id = 'motorcycles' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Upload own motorcycle files" on storage.objects;
create policy "Upload own motorcycle files" on storage.objects
for insert to authenticated
with check (bucket_id = 'motorcycles' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Delete own motorcycle files" on storage.objects;
create policy "Delete own motorcycle files" on storage.objects
for delete to authenticated
using (bucket_id = 'motorcycles' and (storage.foldername(name))[1] = auth.uid()::text);
