-- Pasaporte Motero · destinos adicionales del departamento de Arequipa
-- IDs 104–112 continúan el catálogo existente (máximo previo: 102).
-- Coordenadas basadas en inventarios turísticos MINCETUR/PROMPERÚ y cartografía;
-- revisar el punto físico y el radio GPS en la primera visita de campo.
insert into public.destination_catalog
(id,name,department,province,city,category,description,latitude,longitude,geofence_radius_m,source_note)
values
(104,'Mirador de Yanahuara','Arequipa','Arequipa','Yanahuara','Naturaleza','Mirador tradicional con arcos de sillar y vistas panorámicas del volcán Misti.',-16.3875,-71.5417,180,'MINCETUR ficha 597; coordenadas cartográficas'),
(105,'Mirador de Carmen Alto','Arequipa','Arequipa','Cayma','Naturaleza','Mirador de la campiña y de los volcanes que rodean Arequipa.',-16.37001,-71.53671,180,'Mapcarta / cartografía OSM; validar punto de acceso'),
(106,'Canteras de Añashuayco · Ruta del Sillar','Arequipa','Arequipa','Cerro Colorado','Cultural','Canteras donde se extrae y talla el sillar, piedra volcánica emblemática de Arequipa.',-16.3608,-71.6097,250,'MINCETUR ficha 3941 y documentación GORE Arequipa'),
(107,'Molino de Sabandía','Arequipa','Arequipa','Sabandía','Histórico','Molino histórico de sillar rodeado de andenes, jardines y paisaje campestre.',-16.45654,-71.49963,220,'Cartografía OpenStreetMap / Wikimedia Commons'),
(108,'Mirador de Sachaca','Arequipa','Arequipa','Sachaca','Naturaleza','Mirador elevado con panorámica de la campiña y de los volcanes.',-16.42626,-71.56747,200,'MINCETUR ficha 6235; coordenadas cartográficas'),
(109,'Baños Termales de Yura','Arequipa','Arequipa','Yura','Naturaleza','Aguas termales en un entorno de quebradas y paisaje volcánico.',-16.24564,-71.6936,250,'MINCETUR ficha 606; coordenadas cartográficas'),
(110,'Mirador Cruz del Cóndor · Colca','Arequipa','Caylloma','Cabanaconde','Montañas','Mirador del cañón desde donde suele observarse el vuelo de los cóndores.',-15.61141,-71.90595,300,'Cartografía OpenStreetMap'),
(111,'Petroglifos de Toro Muerto','Arequipa','Castilla','Uraca-Corire','Histórico','Conjunto de grabados rupestres en bloques volcánicos del valle de Majes.',-16.22453,-72.50209,350,'UNESCO Lista Indicativa 6408; cartografía OSM'),
(112,'Santuario Nacional Lagunas de Mejía','Arequipa','Islay','Deán Valdivia','Naturaleza','Humedales costeros y refugio de aves migratorias en el litoral de Islay.',-17.1273,-71.8812,350,'MINCETUR ficha 633; inventario turístico regional')
on conflict (id) do update set
  name=excluded.name,department=excluded.department,province=excluded.province,city=excluded.city,
  category=excluded.category,description=excluded.description,latitude=excluded.latitude,
  longitude=excluded.longitude,geofence_radius_m=excluded.geofence_radius_m,
  source_note=excluded.source_note,updated_at=now();
