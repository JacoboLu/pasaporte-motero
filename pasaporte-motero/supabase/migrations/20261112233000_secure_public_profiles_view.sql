-- Make the public profile view obey the caller's privileges and RLS policies.
-- PostgreSQL 15+ supports security_invoker for views.
ALTER VIEW public.public_profiles
  SET (security_invoker = true);
