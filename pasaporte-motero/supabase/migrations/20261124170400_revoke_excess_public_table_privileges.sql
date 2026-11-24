-- Revoke table-level maintenance privileges from API roles while retaining
-- existing RLS-governed CRUD grants. This prevents TRUNCATE and trigger
-- management from being available to anon/authenticated.
REVOKE TRUNCATE, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Add administrative audit metadata without changing existing records.
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.department_managers
  ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

COMMENT ON COLUMN public.content_reports.reviewed_by IS 'Administrator who last reviewed the report.';
COMMENT ON COLUMN public.content_reports.reviewed_at IS 'Timestamp of the last administrative review.';
COMMENT ON COLUMN public.department_managers.deactivated_by IS 'Administrator who deactivated this department manager.';
COMMENT ON COLUMN public.department_managers.deactivated_at IS 'Timestamp when this assignment was deactivated.';
