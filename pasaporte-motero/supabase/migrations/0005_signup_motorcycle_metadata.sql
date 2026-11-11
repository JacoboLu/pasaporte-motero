-- Pasaporte Motero · guardar datos opcionales de motocicleta durante el registro.
-- Esta migración es aditiva y no modifica las migraciones ya aplicadas.

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists country text default 'Perú';
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists motorcycle_brand text;
alter table public.profiles add column if not exists motorcycle_model text;
alter table public.profiles add column if not exists motorcycle_year integer;
alter table public.profiles add column if not exists profile_completed boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  display_name_value text;
  motorcycle_year_value integer;
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

  motorcycle_year_value := case
    when trim(coalesce(new.raw_user_meta_data->>'motorcycle_year', '')) ~ '^[0-9]{4}$'
      and trim(new.raw_user_meta_data->>'motorcycle_year')::integer between 1885 and extract(year from now())::integer + 1
    then trim(new.raw_user_meta_data->>'motorcycle_year')::integer
    else null
  end;

  insert into public.profiles (
    id, username, display_name, full_name, country, city,
    motorcycle_brand, motorcycle_model, motorcycle_year
  )
  values (
    new.id,
    base_username,
    display_name_value,
    display_name_value,
    coalesce(nullif(trim(new.raw_user_meta_data->>'country'), ''), 'Perú'),
    nullif(trim(new.raw_user_meta_data->>'city'), ''),
    nullif(trim(new.raw_user_meta_data->>'motorcycle_brand'), ''),
    nullif(trim(new.raw_user_meta_data->>'motorcycle_model'), ''),
    motorcycle_year_value
  )
  on conflict (id) do nothing;

  insert into public.user_qr_codes (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
