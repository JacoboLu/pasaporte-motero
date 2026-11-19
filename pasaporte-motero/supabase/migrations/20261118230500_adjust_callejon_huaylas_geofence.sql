-- Reduce the broad regional waypoint geofence to a more precise radius.
-- Callejón de Huaylas is represented by a single catalog coordinate near Caraz.
UPDATE public.destination_catalog
SET geofence_radius_m = 500
WHERE id = 33
  AND name = 'Callejón de Huaylas'
  AND geofence_radius_m = 1200;
