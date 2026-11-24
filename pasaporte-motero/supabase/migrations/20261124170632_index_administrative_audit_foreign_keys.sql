-- Cover newly added audit foreign keys with indexes to avoid advisor warnings
-- and keep administrative lookups efficient as audit history grows.
CREATE INDEX IF NOT EXISTS content_reports_reviewed_by_idx
  ON public.content_reports(reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS department_managers_deactivated_by_idx
  ON public.department_managers(deactivated_by) WHERE deactivated_by IS NOT NULL;
