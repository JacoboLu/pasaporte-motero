-- Recuperada desde supabase_migrations.schema_migrations (versión 20261112205337).
create index if not exists saved_trips_trip_id_idx on public.saved_trips (trip_id);
