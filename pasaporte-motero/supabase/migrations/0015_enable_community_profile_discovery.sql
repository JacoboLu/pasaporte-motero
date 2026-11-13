-- Allow signed-in riders to discover public community profiles.
-- The view exposes only its explicit public columns; never grant direct profile-table access.
ALTER VIEW public.public_profiles
  SET (security_invoker = false);

GRANT SELECT ON public.public_profiles TO authenticated;
