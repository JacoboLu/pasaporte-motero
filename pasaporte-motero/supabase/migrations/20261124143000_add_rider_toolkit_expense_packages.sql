-- Add named expense packages to the rider toolkit without removing legacy expense records.
ALTER TABLE public.rider_toolkit
  ADD COLUMN IF NOT EXISTS expense_packages jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.rider_toolkit'::regclass
      AND conname = 'rider_toolkit_expense_packages_array'
  ) THEN
    ALTER TABLE public.rider_toolkit
      ADD CONSTRAINT rider_toolkit_expense_packages_array
      CHECK (jsonb_typeof(expense_packages) = 'array');
  END IF;
END $$;

COMMENT ON COLUMN public.rider_toolkit.expense_packages IS
  'User-owned named trip expense packages; each package contains its own expense entries.';
