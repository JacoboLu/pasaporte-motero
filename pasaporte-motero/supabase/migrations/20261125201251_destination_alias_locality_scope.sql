-- Allow homonymous resources to reuse the same alias in different localities.
-- The trigger resolves the alias against location/coordinates before blocking a duplicate.
drop index if exists public.destination_name_aliases_normalized_uidx;
create unique index if not exists destination_name_aliases_normalized_destination_uidx
  on public.destination_name_aliases(normalized_alias,destination_id);

-- Trigger functions are not public APIs; only the trigger itself needs the function.
revoke all on function public.guard_destination_name_alias() from public,anon,authenticated;
