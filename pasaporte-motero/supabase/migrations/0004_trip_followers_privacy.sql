-- Pasaporte Motero · privacidad de viajes y fotografías.
-- Añade el nivel "followers" y aplica el mismo control a fotos y destinos asociados.

alter table public.trips drop constraint if exists trips_visibility_check;
alter table public.trips
  add constraint trips_visibility_check
  check (visibility in ('public', 'followers', 'private'));

drop policy if exists "Read public or own trips" on public.trips;
drop policy if exists "Read visible trips" on public.trips;
create policy "Read visible trips" on public.trips
for select
using (
  user_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'followers'
    and exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid()
        and f.followed_id = trips.user_id
    )
  )
);

drop policy if exists "Read trip destinations for visible trips" on public.trip_destinations;
create policy "Read trip destinations for visible trips" on public.trip_destinations
for select to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_id
      and (
        t.user_id = auth.uid()
        or t.visibility = 'public'
        or (
          t.visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid()
              and f.followed_id = t.user_id
          )
        )
      )
  )
);

drop policy if exists "Read trip photos for visible trips" on public.trip_photos;
create policy "Read trip photos for visible trips" on public.trip_photos
for select to authenticated
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_id
      and (
        t.user_id = auth.uid()
        or t.visibility = 'public'
        or (
          t.visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid()
              and f.followed_id = t.user_id
          )
        )
      )
  )
);

drop policy if exists "Read post photos" on public.post_photos;
create policy "Read post photos" on public.post_photos
for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and (
        p.user_id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid()
              and f.followed_id = p.user_id
          )
        )
      )
  )
);

-- Los cambios de visibilidad nunca conceden permisos de escritura sobre viajes ajenos.
