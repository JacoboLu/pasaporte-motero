-- Catálogo inicial de destinos que utiliza el MVP. Los UUID se generan en Supabase.
insert into public.tourist_places (name, description, latitude, longitude, geofence_radius_m, is_active)
select v.name, v.description, v.latitude, v.longitude, v.radius, true
from (values
 ('Abra Anticona (Ticlio)','Paso de montaña en la Carretera Central.',-11.609::double precision,-76.193::double precision,350),
 ('Reserva Nacional de Paracas','Reserva natural del litoral de Ica.',-13.835::double precision,-76.25::double precision,500),
 ('Cañón del Pato','Ruta escénica entre túneles y paredes rocosas.',-8.817::double precision,-77.87::double precision,500),
 ('Laguna Llanganuco','Lagunas altoandinas en el Parque Nacional Huascarán.',-9.064::double precision,-77.612::double precision,500),
 ('Torre Torre','Formaciones geológicas cerca de Huancayo.',-12.052::double precision,-75.205::double precision,300),
 ('Huacachina','Oasis y dunas en Ica.',-14.087::double precision,-75.763::double precision,300)
) as v(name,description,latitude,longitude,radius)
where not exists (select 1 from public.tourist_places p where p.name=v.name);
