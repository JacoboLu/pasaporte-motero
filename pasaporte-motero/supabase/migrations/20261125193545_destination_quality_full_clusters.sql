-- Return every duplicate coordinate cluster; the admin review must not silently omit records.
create or replace function public.admin_destination_quality_report()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with base as (
    select id, name, department, province, city, latitude, longitude, geofence_radius_m, image_url, is_active
    from public.destination_catalog
  ), duplicate_groups as (
    select latitude, longitude, count(*)::integer as destination_count,
      jsonb_agg(jsonb_build_object('id',id,'name',name,'department',department,'province',province,'city',city) order by name) as destinations
    from base
    where is_active and latitude is not null and longitude is not null
    group by latitude, longitude
    having count(*) > 1
  )
  select jsonb_build_object(
    'total', count(*),
    'active', count(*) filter (where is_active),
    'missing_images', count(*) filter (where is_active and (image_url is null or btrim(image_url) = '')),
    'missing_coordinates', count(*) filter (where is_active and (latitude is null or longitude is null)),
    'invalid_coordinates', count(*) filter (where is_active and (latitude not between -90 and 90 or longitude not between -180 and 180)),
    'radius_outliers', count(*) filter (where is_active and (geofence_radius_m is null or geofence_radius_m < 50 or geofence_radius_m > 1000)),
    'duplicate_coordinate_groups', (select count(*) from duplicate_groups),
    'duplicate_coordinate_destinations', (select coalesce(sum(destination_count),0) from duplicate_groups),
    'duplicate_clusters', (select coalesce(jsonb_agg(jsonb_build_object('latitude',latitude,'longitude',longitude,'count',destination_count,'destinations',destinations) order by destination_count desc, latitude, longitude),'[]'::jsonb) from duplicate_groups)
  )
  from base;
$$;
revoke all on function public.admin_destination_quality_report() from public, anon, authenticated;
grant execute on function public.admin_destination_quality_report() to service_role;
