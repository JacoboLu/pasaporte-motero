-- Recuperada desde supabase_migrations.schema_migrations (versión 20261112204804).
create table if not exists public.saved_trips (
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);
alter table public.saved_trips enable row level security;
revoke all on table public.saved_trips from anon, authenticated;
grant select, insert, delete on table public.saved_trips to authenticated;
drop policy if exists "Users read own saved trips" on public.saved_trips;
create policy "Users read own saved trips" on public.saved_trips for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users save visible trips" on public.saved_trips;
create policy "Users save visible trips" on public.saved_trips for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.trips t where t.id = trip_id and
    (t.visibility = 'public' or t.user_id = (select auth.uid()) or
      (t.visibility = 'followers' and exists (
        select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = t.user_id
      )))
  )
);
drop policy if exists "Users remove own saved trips" on public.saved_trips;
create policy "Users remove own saved trips" on public.saved_trips for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Read profiles of visible community authors" on public.profiles;
create policy "Read profiles of visible community authors" on public.profiles
for select to anon, authenticated using (
  id = (select auth.uid()) or
  exists (select 1 from public.posts p where p.user_id = profiles.id and
    (p.visibility = 'public' or (p.visibility = 'followers' and exists (
      select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = p.user_id
    )))) or
  exists (select 1 from public.trips t where t.user_id = profiles.id and
    (t.visibility = 'public' or (t.visibility = 'followers' and exists (
      select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = t.user_id
    ))))
);

drop policy if exists "Owners delete own post photos" on public.post_photos;
create policy "Owners delete own post photos" on public.post_photos
for delete to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid())
  )
);

drop policy if exists "Owners clear own visit evidence" on public.app_visits;
create policy "Owners clear own visit evidence" on public.app_visits
for update to authenticated using (
  user_id = (select auth.uid()) and validation_status <> 'validated'
) with check (
  user_id = (select auth.uid()) and validation_status <> 'validated'
);
grant update (evidence_path) on public.app_visits to authenticated;
