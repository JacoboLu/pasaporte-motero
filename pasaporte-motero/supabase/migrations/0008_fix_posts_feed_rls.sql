-- Pasaporte Motero · reparar políticas RLS del feed de comunidad
-- Elimina políticas anteriores de posts que puedan referenciar columnas inexistentes
-- (por ejemplo, el typo posts.tittle) y recrea las reglas con el esquema vigente.

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'posts'
  loop
    execute format('drop policy if exists %I on public.posts', policy_row.policyname);
  end loop;
end $$;

alter table public.posts enable row level security;

create policy "Posts read visible"
on public.posts
for select
to anon, authenticated
using (
  visibility = 'public'
  or user_id = (select auth.uid())
  or (
    visibility = 'followers'
    and exists (
      select 1
      from public.follows f
      where f.follower_id = (select auth.uid())
        and f.following_id = posts.user_id
    )
  )
);

create policy "Posts insert own"
on public.posts
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Posts update own"
on public.posts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Posts delete own"
on public.posts
for delete
to authenticated
using (user_id = (select auth.uid()));
