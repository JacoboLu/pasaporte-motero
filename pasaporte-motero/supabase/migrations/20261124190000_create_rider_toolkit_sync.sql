-- Personal rider toolkit data, scoped to the authenticated owner.
CREATE TABLE IF NOT EXISTS public.rider_toolkit (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  checklist text[] NOT NULL DEFAULT '{}'::text[],
  contact_name text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  expenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rider_toolkit_expenses_array CHECK (jsonb_typeof(expenses) = 'array')
);

ALTER TABLE public.rider_toolkit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rider_toolkit FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rider_toolkit TO authenticated;

DROP POLICY IF EXISTS "Users manage own rider toolkit" ON public.rider_toolkit;
CREATE POLICY "Users manage own rider toolkit"
  ON public.rider_toolkit
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_toolkit;
