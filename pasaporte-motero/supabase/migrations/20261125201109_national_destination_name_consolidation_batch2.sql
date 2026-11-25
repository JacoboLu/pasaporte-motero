-- Consolidate national records that share the same normalized attraction name,
-- same administrative locality and category, where one is the MINCETUR INRT record
-- and the other is explicitly a complementary proposal with approximate coordinates.
-- Keep the official MINCETUR geometry and preserve proposal notes on the canonical record.

-- Allpahuayo Mishana: canonical MINCETUR ficha 1971 (ID 2907).
update public.visit_qr_challenges set destination_id=2907 where destination_id=4331;
update public.app_visits set destination_id=2907 where destination_id=4331;
update public.passport_destination_stamps set destination_id=2907 where destination_id=4331;
update public.passport_department_stamps set first_destination_id=2907 where first_destination_id=4331;
update public.posts set catalog_destination_id=2907 where catalog_destination_id=4331;
update public.destination_catalog
set description=concat_ws(' ',nullif(description,''),'El área comprende bosques de arena blanca y alta biodiversidad amazónica.'),
    source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con el registro complementario ID 4331; se conserva la georreferencia oficial MINCETUR, ficha 1971.'),
    updated_at=now()
where id=2907;
update public.destination_catalog
set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en el registro oficial MINCETUR ID 2907; coordenadas aproximadas descartadas.'),
    updated_at=now()
where id=4331;

-- Valle de los Géiseres de Candarave: canonical MINCETUR ficha 11665 (ID 3836).
update public.visit_qr_challenges set destination_id=3836 where destination_id=4339;
update public.app_visits set destination_id=3836 where destination_id=4339;
update public.passport_destination_stamps set destination_id=3836 where destination_id=4339;
update public.passport_department_stamps set first_destination_id=3836 where first_destination_id=4339;
update public.posts set catalog_destination_id=3836 where catalog_destination_id=4339;
update public.destination_catalog
set description=concat_ws(' ',nullif(description,''),'Recurso geotermal altoandino con manifestaciones geotermales; verificar condiciones de acceso antes de la visita.'),
    source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con el registro complementario ID 4339; se conserva la georreferencia oficial MINCETUR, ficha 11665.'),
    updated_at=now()
where id=3836;
update public.destination_catalog
set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en el registro oficial MINCETUR ID 3836; coordenadas aproximadas descartadas.'),
    updated_at=now()
where id=4339;

-- Playa Boca del Río: canonical MINCETUR ficha 494 (ID 3884).
update public.visit_qr_challenges set destination_id=3884 where destination_id=4283;
update public.app_visits set destination_id=3884 where destination_id=4283;
update public.passport_destination_stamps set destination_id=3884 where destination_id=4283;
update public.passport_department_stamps set first_destination_id=3884 where first_destination_id=4283;
update public.posts set catalog_destination_id=3884 where catalog_destination_id=4283;
update public.destination_catalog
set description=concat_ws(' ',nullif(description,''),'Balneario del litoral tacneño asociado a la desembocadura del río Sama.'),
    source_note=concat_ws(' | ',nullif(source_note,''),'Homologado con el registro complementario ID 4283; se conserva la georreferencia oficial MINCETUR, ficha 494.'),
    updated_at=now()
where id=3884;
update public.destination_catalog
set is_active=false,source_note=concat_ws(' | ',nullif(source_note,''),'Consolidado en el registro oficial MINCETUR ID 3884; coordenadas aproximadas descartadas.'),
    updated_at=now()
where id=4283;

insert into public.destination_name_aliases(alias_name,destination_id,source_note)
values
 ('Reserva Nacional Allpahuayo Mishana',2907,'Variante de escritura del nombre oficial; MINCETUR ficha 1971'),
 ('Valle de los Géiseres de Candarave',3836,'Variante con tilde del nombre oficial; MINCETUR ficha 11665'),
 ('Playa Boca del Río',3884,'Variante con tilde del nombre oficial; MINCETUR ficha 494')
on conflict (normalized_alias) do update
set destination_id=excluded.destination_id,source_note=excluded.source_note;
