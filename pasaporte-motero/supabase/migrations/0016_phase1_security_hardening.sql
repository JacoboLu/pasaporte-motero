-- PASAPORTE MOTERO · Fase 1: hardening de visitas, sellos y notificaciones
-- Safe/idempotent: preserves historical visits and stamps.

-- Persist the GPS accuracy used for geofence decisions for audit/support.
alter table public.app_visits
  add column if not exists accuracy_m double precision;
alter table public.app_visits
  drop constraint if exists app_visits_accuracy_m_check;
alter table public.app_visits
  add constraint app_visits_accuracy_m_check
  check (accuracy_m is null or (accuracy_m > 0 and accuracy_m <= 100));

-- A signed-in rider may only clear their own evidence pointer.
-- In particular, clients must never update validation_status/reviewed_by/rejection_reason.
drop policy if exists "Owners clear own visit evidence" on public.app_visits;
revoke update on public.app_visits from authenticated;
revoke update (evidence_path) on public.app_visits from authenticated;
grant update (evidence_path) on public.app_visits to authenticated;
create policy "Owners clear own visit evidence"
  on public.app_visits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and evidence_path is null
  );

-- Clients can only submit pending visits; staff review remains server-side.
drop policy if exists "Create pending app visits" on public.app_visits;
create policy "Create pending app visits"
  on public.app_visits for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and validation_status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
    and (visited_at is null or visited_at <= now() + interval '5 minutes')
    and (notes is null or char_length(notes) <= 500)
    and (latitude is null or latitude between -90 and 90)
    and (longitude is null or longitude between -180 and 180)
    and (accuracy_m is null or (accuracy_m > 0 and accuracy_m <= 100))
    and (
      evidence_path is null
      or evidence_path like (select auth.uid())::text || '/visits/%'
    )
  );

-- Prevent multiple simultaneously pending submissions for the same rider/destination.
-- Existing validated history is intentionally untouched.
create unique index if not exists app_visits_one_pending_per_destination
  on public.app_visits(user_id, destination_id)
  where validation_status = 'pending';

create index if not exists app_visits_review_queue_idx
  on public.app_visits(validation_status, visited_at)
  where validation_status = 'pending';
create index if not exists visit_qr_challenges_expiry_idx
  on public.visit_qr_challenges(expires_at)
  where redeemed_at is null;

-- Notifications for each first-earned passport stamp. ON CONFLICT in the stamp
-- trigger prevents duplicate stamps; these AFTER INSERT triggers therefore
-- notify only once per destination/department.
create or replace function public.notify_on_passport_destination_stamp()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.user_notifications(
    recipient_id, event_type, entity_type, entity_id, message
  )
  values (
    new.user_id, 'stamp_earned', 'destination_stamp', new.id,
    '¡Nuevo sello! Has completado este destino en tu pasaporte.'
  );
  return new;
end;
$$;

drop trigger if exists notify_destination_stamp_earned on public.passport_destination_stamps;
create trigger notify_destination_stamp_earned
  after insert on public.passport_destination_stamps
  for each row execute function public.notify_on_passport_destination_stamp();

create or replace function public.notify_on_passport_department_stamp()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare department_name text;
begin
  select name into department_name
  from public.passport_department_catalog
  where code = new.department_code;

  insert into public.user_notifications(
    recipient_id, event_type, entity_type, entity_id, message
  )
  values (
    new.user_id, 'stamp_earned', 'department_stamp', new.id,
    '¡Departamento completado! Has conseguido el sello de ' ||
      coalesce(department_name, new.department_code) || '.'
  );
  return new;
end;
$$;

drop trigger if exists notify_department_stamp_earned on public.passport_department_stamps;
create trigger notify_department_stamp_earned
  after insert on public.passport_department_stamps
  for each row execute function public.notify_on_passport_department_stamp();

-- Keep the app's existing notification read-only contract: no client-created
-- notifications and only the read_at column may be changed by authenticated users.
