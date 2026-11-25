create or replace function public.guard_destination_name_alias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  canonical_id integer;
begin
  if new.is_active is distinct from true then
    return new;
  end if;

  select destination_id into canonical_id
  from public.destination_name_aliases
  where normalized_alias = public.normalize_destination_name(new.name)
  limit 1;

  if canonical_id is not null and canonical_id <> new.id then
    raise exception 'El nombre "%" ya está homologado al destino canónico ID %. Usa ese registro en lugar de crear otro destino.', new.name, canonical_id
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists destination_catalog_alias_guard on public.destination_catalog;
create trigger destination_catalog_alias_guard
before insert or update of name, is_active
on public.destination_catalog
for each row execute function public.guard_destination_name_alias();

alter table public.destination_name_aliases enable row level security;
drop policy if exists "Public can read destination aliases" on public.destination_name_aliases;
create policy "Public can read destination aliases"
on public.destination_name_aliases for select
to anon, authenticated
using (true);
grant select on public.destination_name_aliases to anon, authenticated;
