-- Recuperada desde supabase_migrations.schema_migrations (versión 20261112170416).
begin;
-- Correct visibility-aware private bucket access for trip photos. The old rule compared
-- trip_photos.storage_path with trips.name, which could never authorize the intended file.
drop policy if exists "Read own travel media" on storage.objects;
create policy "Read visible travel media" on storage.objects
for select to authenticated
using (
 bucket_id='travel-media' and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists (
   select 1 from public.trip_photos tp
   join public.trips t on t.id=tp.trip_id
   where tp.storage_path=objects.name
     and (
      t.user_id=(select auth.uid())
      or t.visibility='public'
      or (t.visibility='followers' and exists(
       select 1 from public.follows f
       where f.follower_id=(select auth.uid()) and f.following_id=t.user_id
      ))
     )
  )
 )
);

-- Community bucket must also allow only media attached to a visible post.
drop policy if exists "Read community media by post visibility" on storage.objects;
drop policy if exists "Read visible community media" on storage.objects;
create policy "Read visible community media" on storage.objects
for select to anon,authenticated
using (
 bucket_id='community' and exists (
  select 1 from public.post_photos pp
  join public.posts p on p.id=pp.post_id
  where pp.storage_path=objects.name
    and (
      p.visibility='public'
      or p.user_id=(select auth.uid())
      or (p.visibility='followers' and exists(
        select 1 from public.follows f
        where f.follower_id=(select auth.uid()) and f.following_id=p.user_id
      ))
    )
 )
);

-- Make catalog ids used by the frontend available, without changing the canonical source.
grant select on public.destination_catalog to anon,authenticated;
grant select,insert,delete on public.app_visits to authenticated;
grant select,insert,update,delete on public.trips,public.trip_custom_stops,public.trip_photos to authenticated;
grant select,insert,update,delete on public.posts,public.post_photos,public.post_likes,public.comments to authenticated;
grant select on public.profiles to anon,authenticated;
grant select,insert,delete on public.follows to authenticated;

commit;
