-- Pasaporte Motero · comunidad pública y paradas manuales de bitácora
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('community','community',false,2621440,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false;

drop policy if exists "Community public media read" on storage.objects;
create policy "Community public media read" on storage.objects
for select to anon, authenticated
using (
  bucket_id='community' and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id=pp.post_id
    where pp.storage_path=name
      and (p.visibility='public' or p.user_id=auth.uid()
        or (p.visibility='followers' and exists (
          select 1 from public.follows f
          where f.follower_id=auth.uid() and f.followed_id=p.user_id
        )))
  )
);

drop policy if exists "Community own media upload" on storage.objects;
create policy "Community own media upload" on storage.objects
for insert to authenticated
with check (bucket_id='community' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Community own media delete" on storage.objects;
create policy "Community own media delete" on storage.objects
for delete to authenticated
using (bucket_id='community' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Read post photos" on public.post_photos;
create policy "Read post photos" on public.post_photos
for select to anon, authenticated
using (exists (
  select 1 from public.posts p where p.id=post_id
  and (p.visibility='public' or p.user_id=auth.uid()
    or (p.visibility='followers' and exists (
      select 1 from public.follows f
      where f.follower_id=auth.uid() and f.followed_id=p.user_id
    )))
));

-- Support the three privacy levels already exposed by the app.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid='public.trips'::regclass and contype='c'
      and pg_get_constraintdef(oid) ilike '%visibility%'
  loop
    execute format('alter table public.trips drop constraint %I',c.conname);
  end loop;
end $$;
alter table public.trips add constraint trips_visibility_check
check (visibility in ('public','followers','private'));

drop policy if exists "Read public or own trips" on public.trips;
create policy "Read visible trips" on public.trips for select to anon, authenticated
using (visibility='public' or auth.uid()=user_id
  or (visibility='followers' and exists (
    select 1 from public.follows f where f.follower_id=auth.uid() and f.followed_id=user_id
  )));

drop policy if exists "Read trip destinations for visible trips" on public.trip_destinations;
create policy "Read trip destinations for visible trips" on public.trip_destinations
for select to anon, authenticated using (exists (
  select 1 from public.trips t where t.id=trip_id and (
    t.visibility='public' or t.user_id=auth.uid()
    or (t.visibility='followers' and exists (
      select 1 from public.follows f where f.follower_id=auth.uid() and f.followed_id=t.user_id
    ))
  )
));

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
for select to anon, authenticated using (exists (
  select 1 from public.trips t where t.id=trip_id and (
    t.visibility='public' or t.user_id=auth.uid()
    or (t.visibility='followers' and exists (
      select 1 from public.follows f where f.follower_id=auth.uid() and f.followed_id=t.user_id
    ))
  )
));
drop policy if exists "Manage own custom stops" on public.trip_custom_stops;
create policy "Manage own custom stops" on public.trip_custom_stops
for all to authenticated using (auth.uid()=user_id and exists (
  select 1 from public.trips t where t.id=trip_id and t.user_id=auth.uid()
)) with check (auth.uid()=user_id and exists (
  select 1 from public.trips t where t.id=trip_id and t.user_id=auth.uid()
));
