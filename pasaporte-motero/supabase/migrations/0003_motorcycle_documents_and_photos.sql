-- Pasaporte Motero: ficha de motocicleta, mantenimiento y documentos privados.
create extension if not exists pgcrypto;

alter table public.motorcycles add column if not exists photo_position_x integer not null default 50;
alter table public.motorcycles add column if not exists photo_position_y integer not null default 50;
create unique index if not exists motorcycles_user_id_uidx on public.motorcycles(user_id);

create table if not exists public.motorcycle_maintenance (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_date date not null default current_date,
  service_type text not null,
  odometer_km numeric,
  cost_pen numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.motorcycle_documents (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  expiry_date date not null,
  storage_path text,
  created_at timestamptz not null default now()
);
alter table public.motorcycle_documents add column if not exists storage_path text;

alter table public.motorcycles enable row level security;
alter table public.motorcycle_maintenance enable row level security;
alter table public.motorcycle_documents enable row level security;

drop policy if exists "Owners manage motorcycles" on public.motorcycles;
create policy "Owners manage motorcycles" on public.motorcycles
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Owners manage motorcycle maintenance" on public.motorcycle_maintenance;
create policy "Owners manage motorcycle maintenance" on public.motorcycle_maintenance
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Owners manage motorcycle documents" on public.motorcycle_documents;
create policy "Owners manage motorcycle documents" on public.motorcycle_documents
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('motorcycles','motorcycles',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "Motorcycle owners read own files" on storage.objects;
create policy "Motorcycle owners read own files" on storage.objects
for select to authenticated using (bucket_id='motorcycles' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Motorcycle owners upload own files" on storage.objects;
create policy "Motorcycle owners upload own files" on storage.objects
for insert to authenticated with check (bucket_id='motorcycles' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Motorcycle owners update own files" on storage.objects;
create policy "Motorcycle owners update own files" on storage.objects
for update to authenticated using (bucket_id='motorcycles' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='motorcycles' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Motorcycle owners delete own files" on storage.objects;
create policy "Motorcycle owners delete own files" on storage.objects
for delete to authenticated using (bucket_id='motorcycles' and (storage.foldername(name))[1]=auth.uid()::text);

-- Avatar images are public profile media; writes remain restricted to the owner's UUID folder.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar" on storage.objects
for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar" on storage.objects
for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar" on storage.objects
for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
