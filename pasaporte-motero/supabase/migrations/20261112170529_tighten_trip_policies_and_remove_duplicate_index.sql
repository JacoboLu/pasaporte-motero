-- Recuperada desde supabase_migrations.schema_migrations (versión 20261112170529).
begin;
-- Remove overlapping ALL policies and express ownership per operation.
drop policy if exists "Owners manage their trips" on public.trips;
create policy "Owners insert their trips" on public.trips for insert to authenticated
with check(user_id=(select auth.uid()));
create policy "Owners update their trips" on public.trips for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Owners delete their trips" on public.trips for delete to authenticated
using(user_id=(select auth.uid()));

drop policy if exists "Manage own custom stops" on public.trip_custom_stops;
create policy "Owners insert custom stops" on public.trip_custom_stops for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.trips t where t.id=trip_custom_stops.trip_id and t.user_id=(select auth.uid())));
create policy "Owners update custom stops" on public.trip_custom_stops for update to authenticated
using(user_id=(select auth.uid()) and exists(select 1 from public.trips t where t.id=trip_custom_stops.trip_id and t.user_id=(select auth.uid())))
with check(user_id=(select auth.uid()) and exists(select 1 from public.trips t where t.id=trip_custom_stops.trip_id and t.user_id=(select auth.uid())));
create policy "Owners delete custom stops" on public.trip_custom_stops for delete to authenticated
using(user_id=(select auth.uid()) and exists(select 1 from public.trips t where t.id=trip_custom_stops.trip_id and t.user_id=(select auth.uid())));

drop index if exists public.motorcycles_user_id_uidx;

-- Cache auth.uid() once per statement in hot visit policies.
drop policy if exists "Read own app visits" on public.app_visits;
create policy "Read own app visits" on public.app_visits for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Create pending app visits" on public.app_visits;
create policy "Create pending app visits" on public.app_visits for insert to authenticated with check(user_id=(select auth.uid()) and validation_status='pending');
drop policy if exists "Delete own pending app visits" on public.app_visits;
create policy "Delete own pending app visits" on public.app_visits for delete to authenticated using(user_id=(select auth.uid()) and validation_status<>'validated');

commit;
