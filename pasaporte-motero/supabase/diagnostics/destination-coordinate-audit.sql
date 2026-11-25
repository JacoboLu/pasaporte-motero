-- Read-only destination quality report for Pasaporte Motero.
-- Do not auto-correct coordinates: many records share city/region coordinates
-- and need manual classification before GPS can award stamps.

-- 1) Overall coordinate and geofence integrity.
select
  count(*) as total_destinations,
  count(*) filter (where is_active) as active_destinations,
  count(*) filter (where latitude is null or longitude is null) as missing_coordinates,
  count(*) filter (where latitude not between -90 and 90 or longitude not between -180 and 180) as invalid_coordinates,
  count(*) filter (where geofence_radius_m is null or geofence_radius_m <= 0) as invalid_geofences
from public.destination_catalog;

-- 2) Coordinate clusters that currently force photo/QR validation.
select
  latitude,
  longitude,
  count(*) as destination_count,
  array_agg(id order by id) as destination_ids,
  array_agg(name order by id) as destination_names
from public.destination_catalog
where is_active and latitude is not null and longitude is not null
group by latitude, longitude
having count(*) > 1
order by destination_count desc, latitude, longitude;

-- 3) GPS eligibility by category (categories are not auto-modified).
select
  category,
  count(*) as active_destinations,
  count(*) filter (where latitude is not null and longitude is not null and geofence_radius_m > 0) as coordinate_complete
from public.destination_catalog
where is_active
group by category
order by category;
