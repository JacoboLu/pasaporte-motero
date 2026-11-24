-- Replace the curated public profile view with a read-only projection table.
-- This avoids SECURITY DEFINER views while keeping private columns and role out of public reads.
BEGIN;

DROP VIEW IF EXISTS public.public_profiles;

CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid PRIMARY KEY,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  city text,
  country text,
  motorcycle_brand text,
  motorcycle_model text,
  motorcycle_year integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are readable" ON public.public_profiles;
CREATE POLICY "Public profiles are readable"
ON public.public_profiles
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE ALL ON TABLE public.public_profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_public_profile_projection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.public_profiles (
    id, username, full_name, avatar_url, bio, city, country,
    motorcycle_brand, motorcycle_model, motorcycle_year, created_at
  )
  VALUES (
    NEW.id, NEW.username, COALESCE(NEW.display_name, NEW.full_name), NEW.avatar_url,
    NEW.bio, NEW.city, NEW.country, NEW.motorcycle_brand, NEW.motorcycle_model,
    NEW.motorcycle_year, NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    motorcycle_brand = EXCLUDED.motorcycle_brand,
    motorcycle_model = EXCLUDED.motorcycle_model,
    motorcycle_year = EXCLUDED.motorcycle_year,
    created_at = EXCLUDED.created_at;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_public_profile_projection() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_public_profile_projection ON public.profiles;
CREATE TRIGGER sync_public_profile_projection
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile_projection();

INSERT INTO public.public_profiles (
  id, username, full_name, avatar_url, bio, city, country,
  motorcycle_brand, motorcycle_model, motorcycle_year, created_at
)
SELECT
  id, username, COALESCE(display_name, full_name), avatar_url, bio, city, country,
  motorcycle_brand, motorcycle_model, motorcycle_year, created_at
FROM public.profiles
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  motorcycle_brand = EXCLUDED.motorcycle_brand,
  motorcycle_model = EXCLUDED.motorcycle_model,
  motorcycle_year = EXCLUDED.motorcycle_year,
  created_at = EXCLUDED.created_at;

COMMIT;
