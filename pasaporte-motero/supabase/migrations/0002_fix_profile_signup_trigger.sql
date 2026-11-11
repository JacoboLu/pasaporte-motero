-- Pasaporte Motero · alinear el trigger de registro con la tabla profiles existente.
-- Normaliza perfiles creados desde el esquema inicial o desde el proyecto ya activo.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists country text default 'Perú';
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists motorcycle text;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
create table if not exists public.user_qr_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_code uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  display_name_value text;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    'viajero_' || substr(new.id::text, 1, 8)
  );

  display_name_value := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    'Nuevo viajero'
  );

  insert into public.profiles (id, username, display_name, full_name, country, city)
  values (
    new.id,
    base_username,
    display_name_value,
    display_name_value,
    coalesce(nullif(trim(new.raw_user_meta_data->>'country'), ''), 'Perú'),
    nullif(trim(new.raw_user_meta_data->>'city'), '')
  )
  on conflict (id) do nothing;

  insert into public.user_qr_codes (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.user_qr_codes enable row level security;
drop policy if exists "Read own QR" on public.user_qr_codes;
create policy "Read own QR" on public.user_qr_codes
for select to authenticated using (auth.uid() = user_id);
