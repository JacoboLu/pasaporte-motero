-- Public profile fields are exposed only through the curated public_profiles view.
-- Direct profile rows (including role) are visible only to their owner.
BEGIN;

DROP POLICY IF EXISTS "Read profiles of visible community authors" ON public.profiles;
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
CREATE POLICY "Read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

REVOKE SELECT ON TABLE public.profiles FROM anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true)
AS
SELECT
  id,
  username,
  COALESCE(display_name, full_name) AS full_name,
  avatar_url,
  bio,
  city,
  country,
  motorcycle_brand,
  motorcycle_model,
  motorcycle_year,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

COMMIT;
