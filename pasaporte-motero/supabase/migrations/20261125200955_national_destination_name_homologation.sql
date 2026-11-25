-- National destination-name consolidation: keep only high-confidence physical duplicates.
-- Canonical Moray record is the official MINCETUR INRT entry (ficha 1814).
update public.visit_qr_challenges set destination_id=1292 where destination_id=4369;
update public.app_visits set destination_id=1292 where destination_id=4369;
update public.passport_destination_stamps set destination_id=1292 where destination_id=4369;
update public.passport_department_stamps set first_destination_id=1292 where first_destination_id=4369;
update public.posts set catalog_destination_id=1292 where catalog_destination_id=4369;

update public.destination_catalog
set is_active=false,
    source_note=concat_ws(' | ',nullif(source_note,''),'Registro duplicado consolidado en destino canónico ID 1292 (Complejo Arqueológico de Moray), ficha MINCETUR 1814.'),
    updated_at=now()
where id=4369;

update public.destination_catalog
set name='Complejo Arqueológico de Moray',
    category='Histórico',
    description='Recurso turístico inventariado por MINCETUR. Tipo: Sitios Arqueológicos. Altitud registrada: 3385 m s. n. m. Conocido también como Complejo Arqueologico de Moray.',
    geofence_radius_m=250,
    source_note=concat_ws(' | ',nullif(source_note,''),'Nombre homologado y consolidado. Se conserva la georreferencia del Inventario Nacional de Recursos Turísticos – MINCETUR, ficha 1814.'),
    updated_at=now()
where id=1292;

insert into public.destination_name_aliases(alias_name,destination_id,source_note)
values ('Complejo Arqueológico de Moray',1292,'Nombre oficial homologado; Inventario Nacional de Recursos Turísticos MINCETUR, ficha 1814')
on conflict (normalized_alias) do update
set destination_id=excluded.destination_id,source_note=excluded.source_note;

-- A name may legitimately repeat in different towns (e.g. churches, waterfalls).
-- Future duplicate blocking therefore applies only to the same physical area, not nationwide by name alone.
drop trigger if exists destination_catalog_alias_guard on public.destination_catalog;
create or replace function public.guard_destination_name_alias()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  canonical public.destination_catalog%rowtype;
  matched boolean := false;
begin
  if new.is_active is distinct from true then return new; end if;

  for canonical in
    select d.*
    from public.destination_name_aliases a
    join public.destination_catalog d on d.id=a.destination_id
    where a.normalized_alias=public.normalize_destination_name(new.name)
      and d.id<>new.id
      and d.is_active=true
  loop
    if (coalesce(new.department,'')=coalesce(canonical.department,'')
        and coalesce(new.province,'')=coalesce(canonical.province,'')
        and coalesce(new.city,'')=coalesce(canonical.city,''))
       or (
         new.latitude between -90 and 90 and new.longitude between -180 and 180
         and canonical.latitude between -90 and 90 and canonical.longitude between -180 and 180
         and not (new.latitude=0 and new.longitude=0)
         and not (canonical.latitude=0 and canonical.longitude=0)
         and (6371000*2*asin(sqrt(least(1,
           power(sin(radians((canonical.latitude-new.latitude)/2)),2)
           +cos(radians(new.latitude))*cos(radians(canonical.latitude))
           *power(sin(radians((canonical.longitude-new.longitude)/2)),2)
         )))) <= 500
       ) then
      matched:=true;
      exit;
    end if;
  end loop;

  if matched then
    raise exception 'El nombre "%" ya está homologado a un destino existente en esta zona. Reutiliza el registro canónico en lugar de crear un duplicado.',new.name
      using errcode='23505';
  end if;
  return new;
end;
$$;
create trigger destination_catalog_alias_guard
before insert or update of name,is_active,department,province,city,latitude,longitude
on public.destination_catalog
for each row execute function public.guard_destination_name_alias();
