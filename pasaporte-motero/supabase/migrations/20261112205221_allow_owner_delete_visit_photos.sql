-- Recuperada desde supabase_migrations.schema_migrations (versión 20261112205221).
drop policy if exists "Owners clear own visit evidence" on public.app_visits;
create policy "Owners clear own visit evidence" on public.app_visits
for update to authenticated using (
  user_id = (select auth.uid())
) with check (
  user_id = (select auth.uid())
);
revoke update on public.app_visits from authenticated;
grant update (evidence_path) on public.app_visits to authenticated;
