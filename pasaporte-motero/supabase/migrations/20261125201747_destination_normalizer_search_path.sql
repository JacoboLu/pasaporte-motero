create or replace function public.normalize_destination_name(input text)
returns text
language sql
immutable
parallel safe
set search_path=pg_catalog
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(input,'')), 'áéíóúüñ', 'aeiouun'),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;
