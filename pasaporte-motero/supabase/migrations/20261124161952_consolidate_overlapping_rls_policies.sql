-- Consolidate overlapping permissive policies without changing the effective access model.
-- app_visits: owners and active regional managers retain SELECT access.
DROP POLICY IF EXISTS "Department managers read regional visits" ON public.app_visits;
DROP POLICY IF EXISTS "Read own app visits" ON public.app_visits;
CREATE POLICY "Read own or assigned regional app visits"
ON public.app_visits FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.destination_catalog d
    JOIN public.passport_department_catalog pc
      ON lower(pc.name) = lower(d.department)
    JOIN public.department_managers dm
      ON dm.department_code = pc.code
    WHERE d.id = app_visits.destination_id
      AND dm.user_id = (SELECT auth.uid())
      AND dm.is_active
  )
);

-- content_reports: reporters see/submit their own reports; admins retain full moderation rights.
DROP POLICY IF EXISTS "Admins review content reports" ON public.content_reports;
DROP POLICY IF EXISTS "Users submit content reports" ON public.content_reports;
DROP POLICY IF EXISTS "Users read own reports" ON public.content_reports;
CREATE POLICY "Read own or moderate content reports"
ON public.content_reports FOR SELECT TO authenticated
USING (
  reporter_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  )
);
CREATE POLICY "Submit own or admin content reports"
ON public.content_reports FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  )
);
CREATE POLICY "Admins update content reports"
ON public.content_reports FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
));
CREATE POLICY "Admins delete content reports"
ON public.content_reports FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
));

-- department_managers: admins manage assignments; each manager reads their own assignments.
DROP POLICY IF EXISTS "Admins manage department managers" ON public.department_managers;
DROP POLICY IF EXISTS "Managers read own assignments" ON public.department_managers;
CREATE POLICY "Read own or admin department manager assignments"
ON public.department_managers FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  )
);
CREATE POLICY "Admins insert department manager assignments"
ON public.department_managers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
));
CREATE POLICY "Admins update department manager assignments"
ON public.department_managers FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
));
CREATE POLICY "Admins delete department manager assignments"
ON public.department_managers FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
));
