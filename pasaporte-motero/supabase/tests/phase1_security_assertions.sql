-- Run AFTER migration 0016 in a non-production test project or controlled SQL session.
-- These assertions do not mutate application data.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.app_visits'::regclass) then
    raise exception 'RLS is not enabled on app_visits';
  end if;
  if has_table_privilege('authenticated', 'public.app_visits', 'UPDATE') then
    raise exception 'authenticated unexpectedly has table-level UPDATE on app_visits';
  end if;
  if not has_column_privilege('authenticated', 'public.app_visits', 'evidence_path', 'UPDATE') then
    raise exception 'authenticated cannot clear own evidence_path';
  end if;
  if has_column_privilege('authenticated', 'public.app_visits', 'validation_status', 'UPDATE') then
    raise exception 'authenticated can modify validation_status';
  end if;
  if has_column_privilege('authenticated', 'public.app_visits', 'reviewed_by', 'UPDATE') then
    raise exception 'authenticated can modify reviewed_by';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_visits' and column_name='accuracy_m') then
    raise exception 'GPS accuracy audit column is missing';
  end if;
  if to_regclass('public.app_visits_one_pending_per_destination') is null then
    raise exception 'pending visit uniqueness index is missing';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.passport_destination_stamps'::regclass
      and tgname = 'notify_destination_stamp_earned' and not tgisinternal
  ) then raise exception 'destination stamp notification trigger is missing'; end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.passport_department_stamps'::regclass
      and tgname = 'notify_department_stamp_earned' and not tgisinternal
  ) then raise exception 'department stamp notification trigger is missing'; end if;
end;
$$;
