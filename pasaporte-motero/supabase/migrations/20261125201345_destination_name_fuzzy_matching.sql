create extension if not exists pg_trgm with schema extensions;
create index if not exists destination_catalog_name_trgm_idx
  on public.destination_catalog using gin (name extensions.gin_trgm_ops);
