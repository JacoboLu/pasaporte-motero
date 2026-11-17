-- Recuperada desde supabase_migrations.schema_migrations (versión 20261112170434).
drop policy if exists "comments_select_visible" on public.comments;
drop policy if exists "Read comments on visible posts only" on public.comments;
create policy "Read comments on visible posts only" on public.comments
for select to anon,authenticated using (
 exists (
  select 1 from public.posts p where p.id=comments.post_id and (
   p.visibility='public' or p.user_id=(select auth.uid()) or
   (p.visibility='followers' and exists(select 1 from public.follows f
    where f.follower_id=(select auth.uid()) and f.following_id=p.user_id))
  )
 )
);
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Read profiles of visible community authors" on public.profiles
for select to anon,authenticated using (
 id=(select auth.uid()) or exists(
  select 1 from public.posts p where p.user_id=profiles.id and (
   p.visibility='public' or
   (p.visibility='followers' and exists(select 1 from public.follows f
    where f.follower_id=(select auth.uid()) and f.following_id=p.user_id))
  )
 )
);
