-- Pasaporte Motero · esquema inicial
-- Ejecutar en Supabase SQL Editor. RLS se activa desde el primer día.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  home_city text,
  traveler_type text default 'motociclista',
  public_profile boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_qr_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_code uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true
);

create table if not exists public.provinces (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  unique(department_id, name)
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  province_id uuid references public.provinces(id) on delete set null,
  name text not null,
  latitude double precision,
  longitude double precision
);

create table if not exists public.tourist_places (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.cities(id) on delete set null,
  name text not null,
  description text,
  latitude double precision,
  longitude double precision,
  geofence_radius_m integer not null default 250,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tourist_place_id uuid not null references public.tourist_places(id),
  visited_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  validation_method text not null default 'gps' check (validation_method in ('gps','photo','staff_qr','admin')),
  validation_status text not null default 'pending' check (validation_status in ('pending','validated','rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null default 'diary' check (post_type in ('photo','diary','visit')),
  title text,
  body text not null,
  tourist_place_id uuid references public.tourist_places(id) on delete set null,
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create table if not exists public.post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.validators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.validator_locations (
  validator_id uuid not null references public.validators(id) on delete cascade,
  tourist_place_id uuid not null references public.tourist_places(id) on delete cascade,
  primary key (validator_id, tourist_place_id)
);

create table if not exists public.visit_validations (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  validator_id uuid not null references public.validators(id),
  validation_method text not null check (validation_method in ('staff_qr','admin')),
  validated_at timestamptz not null default now(),
  unique(visit_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- Profile and personal QR are created automatically after registration.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  base_username text;
begin
  base_username := coalesce(nullif(new.raw_user_meta_data->>'username',''), 'viajero_' || substr(new.id::text,1,8));
  insert into public.profiles(id, username, display_name)
  values (new.id, base_username, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'Nuevo viajero'))
  on conflict (id) do nothing;
  insert into public.user_qr_codes(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_qr_codes enable row level security;
alter table public.departments enable row level security;
alter table public.provinces enable row level security;
alter table public.cities enable row level security;
alter table public.tourist_places enable row level security;
alter table public.visits enable row level security;
alter table public.visit_photos enable row level security;
alter table public.posts enable row level security;
alter table public.post_photos enable row level security;
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.validators enable row level security;
alter table public.validator_locations enable row level security;
alter table public.visit_validations enable row level security;
alter table public.reports enable row level security;

-- Public catalog
create policy "Public read departments" on public.departments for select using (is_active);
create policy "Public read provinces" on public.provinces for select using (true);
create policy "Public read cities" on public.cities for select using (true);
create policy "Public read tourist places" on public.tourist_places for select using (is_active);

-- Profiles: public profiles readable; owner can update own profile.
create policy "Read public profiles" on public.profiles for select using (public_profile or auth.uid() = id);
create policy "Update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Personal QR: owner can read; never directly editable by client.
create policy "Read own QR" on public.user_qr_codes for select using (auth.uid() = user_id);

-- Visits and photos belong to their owner.
create policy "Read own visits" on public.visits for select using (auth.uid() = user_id);
create policy "Create own visits" on public.visits for insert with check (auth.uid() = user_id and validation_status = 'pending');
create policy "Read own visit photos" on public.visit_photos for select using (auth.uid() = user_id);
create policy "Add own visit photos" on public.visit_photos for insert with check (auth.uid() = user_id);

-- Public posts and own post management.
create policy "Read visible posts" on public.posts for select using (
  visibility = 'public' or user_id = auth.uid()
  or (visibility = 'followers' and exists (
    select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = user_id
  ))
);
create policy "Create own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Update own posts" on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own posts" on public.posts for delete using (auth.uid() = user_id);

create policy "Read post photos" on public.post_photos for select using (exists(select 1 from public.posts p where p.id = post_id and (p.visibility = 'public' or p.user_id = auth.uid())));
create policy "Add own post photos" on public.post_photos for insert with check (auth.uid() = user_id);
create policy "Manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "Read likes" on public.post_likes for select using (true);
create policy "Manage own likes" on public.post_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Read comments" on public.comments for select using (true);
create policy "Create own comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Delete own comments" on public.comments for delete using (auth.uid() = user_id);
create policy "Create own reports" on public.reports for insert with check (auth.uid() = reporter_id);

-- NOTE: staff QR validation must be implemented through a server-side Edge Function.
-- Do not grant client-side update permissions to visits.validation_status or validators.

-- Additional travel diary and saved-destination modules.
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  visibility text not null default 'private' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.saved_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  tourist_place_id uuid not null references public.tourist_places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tourist_place_id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  badge_image_url text,
  rule jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.trips enable row level security;
alter table public.trip_destinations enable row level security;
alter table public.trip_photos enable row level security;
alter table public.saved_places enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "Read public or own trips" on public.trips for select using (visibility = 'public' or auth.uid() = user_id);
create policy "Create own trips" on public.trips for insert with check (auth.uid() = user_id);
create policy "Update own trips" on public.trips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own trips" on public.trips for delete using (auth.uid() = user_id);
create policy "Read trip destinations for visible trips" on public.trip_destinations for select using (exists(select 1 from public.trips t where t.id = trip_id and (t.visibility = 'public' or t.user_id = auth.uid())));
create policy "Manage destinations in own trips" on public.trip_destinations for all using (exists(select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid())) with check (exists(select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "Read trip photos for visible trips" on public.trip_photos for select using (exists(select 1 from public.trips t where t.id = trip_id and (t.visibility = 'public' or t.user_id = auth.uid())));
create policy "Add own trip photos" on public.trip_photos for insert with check (auth.uid() = user_id and exists(select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "Manage own saved places" on public.saved_places for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Read active achievements" on public.achievements for select using (is_active);
create policy "Read own achievements" on public.user_achievements for select using (auth.uid() = user_id);

-- IMPORTANT: QR validation, GPS verification, photo review, and achievement awarding
-- must be completed by trusted Edge Functions or privileged server-side workflows.
-- Never mark a visit as validated directly from an untrusted browser client.

-- Private media bucket: each authenticated user writes only inside their own UUID folder.
insert into storage.buckets (id, name, public)
values ('travel-media', 'travel-media', false)
on conflict (id) do nothing;

create policy "Read own travel media" on storage.objects
for select to authenticated
using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Upload own travel media" on storage.objects
for insert to authenticated
with check (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Update own travel media" on storage.objects
for update to authenticated
using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Delete own travel media" on storage.objects
for delete to authenticated
using (bucket_id = 'travel-media' and (storage.foldername(name))[1] = auth.uid()::text);
