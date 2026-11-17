-- Recuperada desde supabase_migrations.schema_migrations (versión 20261112205314).
create or replace view public.public_profiles
with (security_barrier = true)
as
select
  id,
  username,
  coalesce(display_name, full_name) as full_name,
  avatar_url,
  bio,
  city,
  country,
  motorcycle_brand,
  motorcycle_model,
  motorcycle_year,
  created_at
from public.profiles;
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
