-- Add indexes to the referencing columns used by passport stamp foreign keys.
CREATE INDEX IF NOT EXISTS passport_department_stamps_department_code_idx
  ON public.passport_department_stamps (department_code);
CREATE INDEX IF NOT EXISTS passport_department_stamps_first_destination_id_idx
  ON public.passport_department_stamps (first_destination_id);
CREATE INDEX IF NOT EXISTS passport_department_stamps_first_visit_id_idx
  ON public.passport_department_stamps (first_visit_id);
CREATE INDEX IF NOT EXISTS passport_destination_stamps_destination_id_idx
  ON public.passport_destination_stamps (destination_id);
