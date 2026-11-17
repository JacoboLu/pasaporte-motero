-- Harden public profile visibility and internal notification trigger functions.
-- Preserve visit_qr_challenges as service-role-only: it intentionally has no client RLS policies.
ALTER VIEW public.public_profiles SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_passport_department_stamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_passport_destination_stamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_post_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_visit_review() FROM PUBLIC, anon, authenticated;

-- Cover foreign keys that were missing dedicated indexes.
CREATE INDEX IF NOT EXISTS department_managers_department_code_fk_idx
  ON public.department_managers (department_code);
CREATE INDEX IF NOT EXISTS department_managers_assigned_by_fk_idx
  ON public.department_managers (assigned_by);
CREATE INDEX IF NOT EXISTS user_notifications_actor_id_fk_idx
  ON public.user_notifications (actor_id);

-- Evaluate auth.uid() once per statement instead of once per row in RLS policies.
DO $$
DECLARE
  pol RECORD;
  stmt TEXT;
  q TEXT;
  wc TEXT;
  role_list TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~ '(?<!SELECT )auth\.uid\(\)'
        OR COALESCE(with_check, '') ~ '(?<!SELECT )auth\.uid\(\)'
      )
  LOOP
    q := CASE
      WHEN pol.qual IS NULL THEN NULL
      ELSE regexp_replace(pol.qual, '(?<!SELECT )auth\.uid\(\)', '(SELECT auth.uid())', 'g')
    END;
    wc := CASE
      WHEN pol.with_check IS NULL THEN NULL
      ELSE regexp_replace(pol.with_check, '(?<!SELECT )auth\.uid\(\)', '(SELECT auth.uid())', 'g')
    END;
    role_list := array_to_string(pol.roles, ', ');

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    stmt := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      pol.policyname, pol.schemaname, pol.tablename, pol.permissive, pol.cmd, role_list
    );
    IF q IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', q);
    END IF;
    IF wc IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', wc);
    END IF;
    EXECUTE stmt;
  END LOOP;
END $$;
