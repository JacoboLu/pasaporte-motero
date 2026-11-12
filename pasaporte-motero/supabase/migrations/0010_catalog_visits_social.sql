-- Pasaporte Motero · catálogo regional y registros sincronizados
-- Catálogo estable con IDs compatibles con el frontend; idempotente.
create table if not exists public.destination_catalog (
  id integer primary key,
  name text not null,
  department text not null,
  province text not null,
  city text not null,
  category text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  geofence_radius_m integer not null default 250,
  is_active boolean not null default true,
  source_note text,
  updated_at timestamptz not null default now()
);
alter table public.destination_catalog enable row level security;
drop policy if exists "Public read destination catalog" on public.destination_catalog;
create policy "Public read destination catalog" on public.destination_catalog for select to anon, authenticated using (is_active);

insert into public.destination_catalog
(id,name,department,province,city,category,description,latitude,longitude,geofence_radius_m,source_note)
values
(1,'Abra Anticona (Ticlio)','Junín','Yauli','Morococha','Montañas','Paso altoandino de la Carretera Central.',-11.609,-76.193,350,'Catálogo inicial Pasaporte Motero'),
(2,'Reserva Nacional de Paracas','Ica','Pisco','Paracas','Costa','Reserva natural de desierto, mar y acantilados.',-13.835,-76.25,500,'Catálogo inicial Pasaporte Motero'),
(3,'Cañón del Pato','Áncash','Huaylas','Huallanca','Rutas','Ruta escénica de túneles y paredes rocosas.',-8.817,-77.87,500,'Catálogo inicial Pasaporte Motero'),
(4,'Laguna Llanganuco','Áncash','Yungay','Yungay','Montañas','Lagunas de aguas turquesas en el Parque Nacional Huascarán.',-9.064,-77.612,500,'Catálogo inicial Pasaporte Motero'),
(5,'Torre Torre','Junín','Huancayo','Huancayo','Naturaleza','Formaciones geológicas de arcilla y arena.',-12.052,-75.205,300,'Catálogo inicial Pasaporte Motero'),
(6,'Huacachina','Ica','Ica','Ica','Desierto','Oasis rodeado de dunas.',-14.087,-75.763,300,'Catálogo inicial Pasaporte Motero'),
(7,'Plaza de Armas de Cusco','Cusco','Cusco','Cusco','Histórico','Centro histórico de la ciudad del Cusco.',-13.5167,-71.9786,250,'PROMPERÚ'),
(8,'Qorikancha','Cusco','Cusco','Cusco','Histórico','Antiguo templo inca del Sol.',-13.5186,-71.9757,180,'PROMPERÚ'),
(9,'Sacsayhuamán','Cusco','Cusco','Cusco','Histórico','Parque arqueológico sobre la ciudad del Cusco.',-13.5087,-71.9824,350,'COSITUC'),
(10,'Qenqo','Cusco','Cusco','Cusco','Histórico','Complejo arqueológico ceremonial.',-13.5080,-71.9700,180,'COSITUC'),
(11,'Puka Pukara','Cusco','Cusco','Cusco','Histórico','Sitio arqueológico del circuito de Sacsayhuamán.',-13.4847,-71.9674,180,'COSITUC'),
(12,'Tambomachay','Cusco','Cusco','Cusco','Histórico','Complejo arqueológico de fuentes y canales.',-13.4786,-71.9726,180,'COSITUC'),
(13,'Pisac','Cusco','Calca','Pisac','Histórico','Pueblo y parque arqueológico del Valle Sagrado.',-13.4214,-71.8512,300,'COSITUC'),
(14,'Ollantaytambo','Cusco','Urubamba','Ollantaytambo','Histórico','Pueblo inca vivo y parque arqueológico.',-13.2589,-72.2633,300,'COSITUC'),
(15,'Moray','Cusco','Urubamba','Maras','Histórico','Andenes circulares incas.',-13.3297,-72.1968,250,'COSITUC'),
(16,'Salineras de Maras','Cusco','Urubamba','Maras','Naturaleza','Conjunto de pozas de sal.',-13.3002,-72.1568,250,'PROMPERÚ'),
(17,'Chinchero','Cusco','Urubamba','Chinchero','Histórico','Pueblo andino con restos incas y tradición textil.',-13.3928,-72.0478,250,'COSITUC'),
(18,'Machu Picchu','Cusco','Urubamba','Machu Picchu','Histórico','Santuario Histórico; requiere boleto y planificación.',-13.1631,-72.5450,400,'PROMPERÚ'),
(19,'Laguna Humantay','Cusco','Anta','Mollepata','Montañas','Laguna altoandina con acceso por caminata.',-13.4208,-72.6867,350,'PROMPERÚ'),
(20,'Nevado Ausangate','Cusco','Quispicanchi','Ocongate','Montañas','Montaña sagrada y ruta de alta montaña.',-13.7875,-71.2300,600,'PROMPERÚ'),
(21,'Montaña Vinicunca','Cusco','Quispicanchi','Cusipata','Montañas','Montaña de colores de gran altitud.',-13.8700,-71.3020,350,'PROMPERÚ'),
(22,'Palccoyo','Cusco','Canchis','Checacupe','Montañas','Cordillera de colores y miradores.',-13.8730,-71.2960,450,'PROMPERÚ'),
(23,'Parque Arqueológico de Raqchi','Cusco','Canchis','San Pedro','Histórico','Complejo arqueológico del templo de Wiracocha.',-14.1760,-71.3670,250,'PROMPERÚ'),
(24,'Andahuaylillas','Cusco','Quispicanchi','Andahuaylillas','Histórico','Templo histórico de la Ruta del Barroco Andino.',-13.6730,-71.6780,200,'PROMPERÚ'),
(25,'Tipón','Cusco','Quispicanchi','Oropesa','Histórico','Complejo arqueológico con terrazas y canales.',-13.5650,-71.7770,250,'COSITUC'),
(26,'Parque Nacional del Manu','Cusco','Paucartambo','Paucartambo','Naturaleza','Área natural protegida; acceso con planificación y operadores autorizados.',-13.0000,-71.5000,1500,'PROMPERÚ'),
(27,'Plaza de Armas de Huaraz','Áncash','Huaraz','Huaraz','Histórico','Centro urbano y punto de partida del Callejón de Huaylas.',-9.5278,-77.5278,250,'MINCETUR'),
(28,'Laguna Parón','Áncash','Huaylas','Caraz','Montañas','Laguna turquesa rodeada por cumbres de la Cordillera Blanca.',-8.9990,-77.6840,500,'MINCETUR'),
(29,'Laguna 69','Áncash','Yungay','Yungay','Montañas','Laguna de alta montaña; trekking exigente y aclimatación.',-9.0100,-77.6060,350,'MINCETUR'),
(30,'Laguna Churup','Áncash','Huaraz','Huaraz','Montañas','Laguna de altura con acceso por caminata desde Pitec.',-9.4890,-77.4060,350,'MINCETUR'),
(31,'Nevado Pastoruri','Áncash','Recuay','Cátac','Montañas','Ruta de alta montaña en el Parque Nacional Huascarán.',-9.8880,-77.1780,500,'MINCETUR'),
(32,'Chavín de Huántar','Áncash','Huari','Chavín de Huántar','Histórico','Monumento arqueológico preincaico Patrimonio Mundial.',-9.5920,-77.1780,300,'MINCETUR'),
(33,'Callejón de Huaylas','Áncash','Huaylas','Caraz','Rutas','Corredor escénico entre las cordilleras Blanca y Negra.',-9.0470,-77.8100,1200,'MINCETUR'),
(34,'Caraz','Áncash','Huaylas','Caraz','Naturaleza','Ciudad del Callejón de Huaylas y base para Laguna Parón.',-9.0470,-77.8100,250,'MINCETUR'),
(35,'Carhuaz','Áncash','Carhuaz','Carhuaz','Naturaleza','Ciudad tradicional del Callejón de Huaylas.',-9.2810,-77.6450,250,'MINCETUR'),
(36,'Chacas','Áncash','Asunción','Chacas','Histórico','Pueblo andino de patrimonio cultural y tradición artesanal.',-9.1600,-77.3700,300,'MINCETUR'),
(37,'Nevado Alpamayo','Áncash','Huaylas','Santa Cruz','Montañas','Cumbre de andinismo técnico; requiere guía especializado.',-8.8800,-77.6530,1000,'MINCETUR'),
(38,'Cordillera Huayhuash','Áncash','Bolognesi','Chiquián','Montañas','Circuito remoto de alta montaña; requiere guía y aclimatación.',-10.2500,-76.9000,1800,'MINCETUR'),
(39,'Piedra de los 12 Ángulos','Cusco','Cusco','Cusco','Histórico','Elemento emblemático de la arquitectura inca en Hatunrumiyoc.',-13.5162,-71.9753,100,'PROMPERÚ'),
(40,'Barrio de San Blas','Cusco','Cusco','Cusco','Cultural','Barrio tradicional de talleres artesanales y calles históricas.',-13.5140,-71.9730,250,'PROMPERÚ'),
(41,'Mercado de San Pedro','Cusco','Cusco','Cusco','Cultural','Mercado tradicional de productos y gastronomía local.',-13.5200,-71.9820,180,'PROMPERÚ'),
(42,'Pikillaqta','Cusco','Quispicanchi','Lucre','Histórico','Parque arqueológico preincaico del Valle Sur.',-13.ೆಯ?,-71.7,300,'COSITUC'),
(43,'Waqrapukara','Cusco','Acomayo','Acopia','Histórico','Complejo arqueológico en un promontorio rocoso.',-13.9250,-71.6750,500,'GERCETUR Cusco'),
(44,'Q’eswachaka','Cusco','Canas','Quehue','Cultural','Puente colgante tradicional de ichu sobre el río Apurímac.',-14.3800,-71.4850,250,'GERCETUR Cusco'),
(45,'Pallay Punchu','Cusco','Canas','Layo','Montañas','Montaña de formaciones y colores en el sur de Cusco.',-14.4900,-71.1500,450,'GERCETUR Cusco'),
(46,'Laguna de Pomacanchi','Cusco','Acomayo','Pomacanchi','Naturaleza','Laguna altoandina del circuito sur.',-14.0300,-71.5700,400,'GERCETUR Cusco'),
(47,'Laguna de Langui-Layo','Cusco','Canas','Layo','Naturaleza','Gran laguna altoandina del sur de Cusco.',-14.4900,-71.1500,500,'GERCETUR Cusco'),
(48,'Huchuy Qosqo','Cusco','Calca','Lamay','Histórico','Sitio arqueológico con vistas al Valle Sagrado.',-13.3600,-71.9450,350,'PROMPERÚ'),
(49,'Lares','Cusco','Calca','Lares','Naturaleza','Valle andino y baños termales.',-13.1060,-71.9230,350,'PROMPERÚ'),
(50,'Choquequirao','Cusco','La Convención','Santa Teresa','Histórico','Complejo arqueológico remoto con acceso de trekking exigente.',-13.3950,-72.8740,1000,'PROMPERÚ'),
(51,'Salkantay (mirador)','Cusco','Anta','Mollepata','Montañas','Ruta de montaña hacia el nevado Salkantay.',-13.3400,-72.5400,800,'PROMPERÚ'),
(52,'Laguna Wilcacocha','Áncash','Huaraz','Huaraz','Naturaleza','Laguna y mirador hacia la Cordillera Blanca.',-9.5750,-77.5550,300,'MINCETUR'),
(53,'Mirador de Rataquenua','Áncash','Huaraz','Huaraz','Naturaleza','Mirador panorámico de la ciudad y las cordilleras.',-9.5400,-77.5150,250,'MINCETUR'),
(54,'Wilkawain','Áncash','Huaraz','Independencia','Histórico','Complejo arqueológico de tradición Recuay y Wari.',-9.4900,-77.5150,250,'MINCETUR'),
(55,'Campo Santo de Yungay','Áncash','Yungay','Yungay','Histórico','Memorial de la antigua ciudad de Yungay.',-9.1380,-77.7450,300,'MINCETUR'),
(56,'Laguna Orconcocha','Áncash','Yungay','Yungay','Montañas','Laguna del conjunto de Llanganuco.',-9.0750,-77.6100,300,'MINCETUR'),
(57,'Laguna Chinancocha','Áncash','Yungay','Yungay','Montañas','Laguna principal de Llanganuco.',-9.0730,-77.6100,300,'MINCETUR'),
(58,'Laguna Rocotuyoc','Áncash','Huaraz','Huaraz','Montañas','Laguna altoandina en la zona de la Cordillera Blanca.',-9.4000,-77.4000,350,'MINCETUR'),
(59,'Laguna Rajucolta','Áncash','Huaraz','Huaraz','Montañas','Laguna glaciar al pie del nevado Huantsán.',-9.5600,-77.3900,350,'MINCETUR'),
(60,'Nevado Huascarán (sector de acceso)','Áncash','Yungay','Yungay','Montañas','Sector de acceso al entorno del nevado; requiere operador y planificación.',-9.1200,-77.6050,600,'MINCETUR')
on conflict (id) do update set name=excluded.name,department=excluded.department,province=excluded.province,city=excluded.city,category=excluded.category,description=excluded.description,latitude=excluded.latitude,longitude=excluded.longitude,geofence_radius_m=excluded.geofence_radius_m,source_note=excluded.source_note,updated_at=now();

create table if not exists public.app_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination_id integer not null references public.destination_catalog(id),
  visited_at timestamptz not null default now(),
  validation_method text not null check (validation_method in ('gps','photo','qr')),
  validation_status text not null default 'pending' check (validation_status in ('pending','validated','rejected')),
  notes text,
  latitude double precision,
  longitude double precision,
  evidence_path text,
  created_at timestamptz not null default now()
);
alter table public.app_visits enable row level security;
drop policy if exists "Read own app visits" on public.app_visits;
create policy "Read own app visits" on public.app_visits for select to authenticated using (user_id=auth.uid());
drop policy if exists "Create pending app visits" on public.app_visits;
create policy "Create pending app visits" on public.app_visits for insert to authenticated with check (user_id=auth.uid() and validation_status='pending');
drop policy if exists "Delete own pending app visits" on public.app_visits;
create policy "Delete own pending app visits" on public.app_visits for delete to authenticated using (user_id=auth.uid() and validation_status<>'validated');

-- Correct follow relationship column is followed_id (not following_id).
drop policy if exists "Posts read visible" on public.posts;
create policy "Posts read visible" on public.posts for select to anon, authenticated using (
  visibility='public' or user_id=(select auth.uid()) or (
    visibility='followers' and exists (
      select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.followed_id=posts.user_id
    )
  )
);
drop policy if exists "Read visible trips" on public.trips;
create policy "Read visible trips" on public.trips for select to anon, authenticated using (
  visibility='public' or user_id=(select auth.uid()) or (
    visibility='followers' and exists (
      select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.followed_id=trips.user_id
    )
  )
);
drop policy if exists "Read custom stops for visible trips" on public.trip_custom_stops;
create policy "Read custom stops for visible trips" on public.trip_custom_stops for select to anon, authenticated using (
  exists(select 1 from public.trips t where t.id=trip_id and (
    t.visibility='public' or t.user_id=(select auth.uid()) or (
      t.visibility='followers' and exists (
        select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.followed_id=t.user_id
      )
    )
  ))
);

-- Persist social interactions.
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
drop policy if exists "Read likes" on public.post_likes;
create policy "Read likes" on public.post_likes for select to anon, authenticated using (true);
drop policy if exists "Manage own likes" on public.post_likes;
create policy "Manage own likes" on public.post_likes for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "Read comments" on public.comments;
create policy "Read comments" on public.comments for select to anon, authenticated using (exists(select 1 from public.posts p where p.id=post_id and (p.visibility='public' or p.user_id=auth.uid() or (p.visibility='followers' and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.followed_id=p.user_id)))));
drop policy if exists "Create own comments" on public.comments;
create policy "Create own comments" on public.comments for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and (p.visibility='public' or p.user_id=auth.uid() or (p.visibility='followers' and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.followed_id=p.user_id)))));
drop policy if exists "Delete own comments" on public.comments;
create policy "Delete own comments" on public.comments for delete to authenticated using (user_id=auth.uid());
