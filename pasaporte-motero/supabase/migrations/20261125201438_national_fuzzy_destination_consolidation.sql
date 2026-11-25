-- High-confidence fuzzy-name consolidations:
-- each pair is in the same locality, shares the same physical attraction,
-- has matching category/official inventory evidence, and lies within 500 m.
-- Canonical IDs are the MINCETUR inventory record where one exists.

-- Pampa de Ayacucho (MINCETUR ficha 1947).
update public.app_visits set destination_id=796 where destination_id=4266;
update public.visit_qr_challenges set destination_id=796 where destination_id=4266;
update public.passport_destination_stamps set destination_id=796 where destination_id=4266;
update public.passport_department_stamps set first_destination_id=796 where first_destination_id=4266;
update public.posts set catalog_destination_id=796 where catalog_destination_id=4266;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Escenario de la Batalla de Ayacucho y espacio conmemorativo nacional.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 4266; se conserva MINCETUR ficha 1947.'),updated_at=now() where id=796;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 796.'),updated_at=now() where id=4266;

-- Plaza de Armas del Cusco (MINCETUR ficha 2600); preserve licensed photo from ID 7.
update public.app_visits set destination_id=1310 where destination_id=7;
update public.visit_qr_challenges set destination_id=1310 where destination_id=7;
update public.passport_destination_stamps set destination_id=1310 where destination_id=7;
update public.passport_department_stamps set first_destination_id=1310 where first_destination_id=7;
update public.posts set catalog_destination_id=1310 where catalog_destination_id=7;
update public.destination_catalog set image_url=coalesce(image_url,(select image_url from public.destination_catalog where id=7)),description=concat_ws(' ',nullif(description,''),'Plaza principal y núcleo del centro histórico de la ciudad del Cusco.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 7; se conserva MINCETUR ficha 2600 y la referencia fotográfica licenciada.'),updated_at=now() where id=1310;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 1310.'),updated_at=now() where id=7;

-- Nevado Ausangate (MINCETUR ficha 2216); preserve licensed photo from ID 20.
update public.app_visits set destination_id=1298 where destination_id=20;
update public.visit_qr_challenges set destination_id=1298 where destination_id=20;
update public.passport_destination_stamps set destination_id=1298 where destination_id=20;
update public.passport_department_stamps set first_destination_id=1298 where first_destination_id=20;
update public.posts set catalog_destination_id=1298 where catalog_destination_id=20;
update public.destination_catalog set image_url=coalesce(image_url,(select image_url from public.destination_catalog where id=20)),description=concat_ws(' ',nullif(description,''),'Montaña sagrada y ruta de alta montaña.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 20; se conserva MINCETUR ficha 2216 y la referencia fotográfica licenciada.'),updated_at=now() where id=1298;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 1298.'),updated_at=now() where id=20;

-- Saywite (MINCETUR ficha 571).
update public.app_visits set destination_id=278 where destination_id=63;
update public.visit_qr_challenges set destination_id=278 where destination_id=63;
update public.passport_destination_stamps set destination_id=278 where destination_id=63;
update public.passport_department_stamps set first_destination_id=278 where first_destination_id=63;
update public.posts set catalog_destination_id=278 where catalog_destination_id=63;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Complejo arqueológico conocido por su monolito tallado y andenes.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 63; se conserva MINCETUR ficha 571.'),updated_at=now() where id=278;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 278.'),updated_at=now() where id=63;

-- Fortaleza Real Felipe (MINCETUR ficha 1307); preserve licensed photo from ID 71.
update public.app_visits set destination_id=970 where destination_id=71;
update public.visit_qr_challenges set destination_id=970 where destination_id=71;
update public.passport_destination_stamps set destination_id=970 where destination_id=71;
update public.passport_department_stamps set first_destination_id=970 where first_destination_id=71;
update public.posts set catalog_destination_id=970 where catalog_destination_id=71;
update public.destination_catalog set image_url=coalesce(image_url,(select image_url from public.destination_catalog where id=71)),description=concat_ws(' ',nullif(description,''),'Fortaleza histórica del puerto del Callao, vinculada a la defensa del litoral.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 71; se conserva MINCETUR ficha 1307 y la referencia fotográfica licenciada.'),updated_at=now() where id=970;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 970.'),updated_at=now() where id=71;

-- Plaza Daniel Alcides Carrión (MINCETUR ficha 2447).
update public.app_visits set destination_id=3225 where destination_id=89;
update public.visit_qr_challenges set destination_id=3225 where destination_id=89;
update public.passport_destination_stamps set destination_id=3225 where destination_id=89;
update public.passport_department_stamps set first_destination_id=3225 where first_destination_id=89;
update public.posts set catalog_destination_id=3225 where catalog_destination_id=89;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Plaza cívica de Cerro de Pasco, capital del departamento.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 89; se conserva MINCETUR ficha 2447.'),updated_at=now() where id=3225;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 3225.'),updated_at=now() where id=89;

-- Canteras de Añashuayco / Ruta del Sillar (MINCETUR ficha 3941).
update public.app_visits set destination_id=505 where destination_id=106;
update public.visit_qr_challenges set destination_id=505 where destination_id=106;
update public.passport_destination_stamps set destination_id=505 where destination_id=106;
update public.passport_department_stamps set first_destination_id=505 where first_destination_id=106;
update public.posts set catalog_destination_id=505 where catalog_destination_id=106;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Canteras donde se extrae y talla el sillar, piedra volcánica emblemática de Arequipa; parte de la Ruta del Sillar.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 106; se conserva MINCETUR ficha 3941 y documentación GORE Arequipa.'),updated_at=now() where id=505;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 505.'),updated_at=now() where id=106;

-- Baños Termales de Yura (MINCETUR ficha 606).
update public.app_visits set destination_id=534 where destination_id=109;
update public.visit_qr_challenges set destination_id=534 where destination_id=109;
update public.passport_destination_stamps set destination_id=534 where destination_id=109;
update public.passport_department_stamps set first_destination_id=534 where first_destination_id=109;
update public.posts set catalog_destination_id=534 where catalog_destination_id=109;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Aguas termales en un entorno de quebradas y paisaje volcánico.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 109; se conserva MINCETUR ficha 606.'),updated_at=now() where id=534;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 534.'),updated_at=now() where id=109;

-- Mirador de la Cruz del Cóndor (MINCETUR ficha 615).
update public.app_visits set destination_id=539 where destination_id=110;
update public.visit_qr_challenges set destination_id=539 where destination_id=110;
update public.passport_destination_stamps set destination_id=539 where destination_id=110;
update public.passport_department_stamps set first_destination_id=539 where first_destination_id=110;
update public.posts set catalog_destination_id=539 where catalog_destination_id=110;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Mirador del cañón desde donde suele observarse el vuelo de los cóndores.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro cartográfico complementario ID 110; se conserva MINCETUR ficha 615.'),updated_at=now() where id=539;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 539.'),updated_at=now() where id=110;

-- Huacas del Sol y la Luna (MINCETUR ficha 114).
update public.app_visits set destination_id=2044 where destination_id=4314;
update public.visit_qr_challenges set destination_id=2044 where destination_id=4314;
update public.passport_destination_stamps set destination_id=2044 where destination_id=4314;
update public.passport_department_stamps set first_destination_id=2044 where first_destination_id=4314;
update public.posts set catalog_destination_id=2044 where catalog_destination_id=4314;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Complejo monumental de la cultura Moche.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 4314; se conserva MINCETUR ficha 114.'),updated_at=now() where id=2044;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 2044.'),updated_at=now() where id=4314;

-- Templo de San Pedro Apóstol de Andahuaylillas (MINCETUR ficha 944).
update public.app_visits set destination_id=1404 where destination_id=4362;
update public.visit_qr_challenges set destination_id=1404 where destination_id=4362;
update public.passport_destination_stamps set destination_id=1404 where destination_id=4362;
update public.passport_department_stamps set first_destination_id=1404 where first_destination_id=4362;
update public.posts set catalog_destination_id=1404 where catalog_destination_id=4362;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Templo colonial conocido por su decoración mural y patrimonio artístico.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 4362; se conserva MINCETUR ficha 944.'),updated_at=now() where id=1404;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico MINCETUR ID 1404.'),updated_at=now() where id=4362;

-- Raqchi: same archaeological complex and adjacent reference point; preserve the existing licensed image on ID 23.
update public.app_visits set destination_id=23 where destination_id=4279;
update public.visit_qr_challenges set destination_id=23 where destination_id=4279;
update public.passport_destination_stamps set destination_id=23 where destination_id=4279;
update public.passport_department_stamps set first_destination_id=23 where first_destination_id=4279;
update public.posts set catalog_destination_id=23 where catalog_destination_id=4279;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Complejo arqueológico inca conocido por el templo de Wiracocha.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 4279; se conserva el punto canónico y la fotografía licenciada existente.'),updated_at=now() where id=23;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico ID 23 (Parque Arqueológico de Raqchi).'),updated_at=now() where id=4279;

-- Catarata Tirol: exact same coordinates, same locality and same natural attraction.
update public.app_visits set destination_id=4301 where destination_id=4367;
update public.visit_qr_challenges set destination_id=4301 where destination_id=4367;
update public.passport_destination_stamps set destination_id=4301 where destination_id=4367;
update public.passport_department_stamps set first_destination_id=4301 where first_destination_id=4367;
update public.posts set catalog_destination_id=4301 where catalog_destination_id=4367;
update public.destination_catalog set description=concat_ws(' ',nullif(description,''),'Cascada en el entorno de San Ramón; verificar el punto de ingreso y las condiciones del sendero.'),source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con registro complementario ID 4367; se conserva el mismo punto geográfico de referencia.'),updated_at=now() where id=4301;
update public.destination_catalog set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en destino canónico ID 4301 (Catarata Tirol).'),updated_at=now() where id=4367;

insert into public.destination_name_aliases(alias_name,destination_id,source_note)
values
 ('Pampa de Ayacucho - Santuario Histórico',796,'Variante de nombre; MINCETUR ficha 1947'),
 ('Plaza de Armas de Cusco',1310,'Variante de nombre; MINCETUR ficha 2600'),
 ('Nevado Ausangate',1298,'Variante de nombre; MINCETUR ficha 2216'),
 ('Complejo arqueológico de Saywite',278,'Variante de nombre; MINCETUR ficha 571'),
 ('Fortaleza del Real Felipe',970,'Variante de nombre; MINCETUR ficha 1307'),
 ('Plaza Daniel Alcides Carrión',3225,'Variante de nombre; MINCETUR ficha 2447'),
 ('Canteras de Añashuayco · Ruta del Sillar',505,'Variante de nombre; MINCETUR ficha 3941'),
 ('Baños Termales de Yura',534,'Variante de nombre; MINCETUR ficha 606'),
 ('Mirador Cruz del Cóndor · Colca',539,'Variante de nombre; MINCETUR ficha 615'),
 ('Huaca del Sol y de la Luna',2044,'Variante de nombre; MINCETUR ficha 114'),
 ('Templo de San Pedro de Andahuaylillas',1404,'Variante de nombre; MINCETUR ficha 944'),
 ('Complejo Arqueológico de Raqchi',23,'Variante de nombre; referencia arqueológica complementaria'),
 ('Catarata El Tirol - acceso',4301,'Variante de nombre del mismo punto geográfico')
on conflict (normalized_alias,destination_id) do update
set source_note=excluded.source_note;
