-- Recuperada desde supabase_migrations.schema_migrations (versión 20261112201035).
-- Impide que un usuario cambie su propio rol: solo postgres, service_role y supabase_admin pueden hacerlo.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'El rol del perfil solo puede modificarse desde un proceso administrativo seguro.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update of role on public.profiles
for each row
execute function public.prevent_profile_role_escalation();
