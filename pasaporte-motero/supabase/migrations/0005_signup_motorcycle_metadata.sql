-- Pasaporte Motero · guardar los datos opcionales de moto al crear una cuenta.
-- Se entrega como nueva migración: no modificar migraciones que ya fueron ejecutadas.

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

  motorcycle_year_value := nullif(trim(new.raw_user_meta_data->>'motorcycle_year'), '')::integer;

  insert into public.profiles (
    id, username, full_name, country, city,
    motorcycle_brand, motorcycle_model, motorcycle_year
  )
  values (
    new.id,
    base_username,
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
