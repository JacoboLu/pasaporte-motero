-- Pasaporte Motero · privacidad de viajes y fotografías.
-- Añade el nivel "followers" y aplica el mismo control a fotos y destinos asociados.

-- Compatibilidad: el catálogo de lugares aún no existe en algunas bases.
-- Se crea la tabla mínima esperada por visitas, publicaciones y viajes.
create table if not exists public.tourist_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  latitude double precision,
  longitude double precision,
  geofence_radius_m integer not null default 250,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- El catálogo solo es legible públicamente para mostrar destinos activos.
-- No se concede escritura directa desde el cliente; la gestión administrativa
-- deberá realizarse mediante operaciones de servidor autorizadas.
alter table public.tourist_places enable row level security;
grant select on public.tourist_places to anon, authenticated;
drop policy if exists "Read active tourist places" on public.tourist_places;
create policy "Read active tourist places" on public.tourist_places
for select to anon, authenticated
using (is_active = true);

-- Compatibilidad con bases existentes donde faltan tablas auxiliares del diario.
-- Las claves foráneas mantienen la integridad y no eliminan registros.
create table if not exists public.trip_destinations (
  trip_id uuid not null references public.trips(id) on delete cascade,
  tourist_place_id uuid not null references public.tourist_places(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (trip_id, tourist_place_id)
);

create table if not exists public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.trip_destinations enable row level security;
alter table public.trip_photos enable row level security;

-- Compatibilidad con proyectos donde trips se creó antes de incorporar visibilidad.
alter table public.trips add column if not exists visibility text not null default 'private';

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
        and f.following_id = trips.user_id
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
              and f.following_id = t.user_id
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
              and f.following_id = t.user_id
          )
        )
      )
  )
);

-- Compatibilidad con bases donde aún no existe la tabla de fotos de publicaciones.
create table if not exists public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.post_photos enable row level security;
drop policy if exists "Add own post photos" on public.post_photos;
create policy "Add own post photos" on public.post_photos
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.user_id = auth.uid()
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
              and f.following_id = p.user_id
          )
        )
      )
  )
);

-- Los cambios de visibilidad nunca conceden permisos de escritura sobre viajes ajenos.
