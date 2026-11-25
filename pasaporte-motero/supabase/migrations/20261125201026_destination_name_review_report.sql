create or replace function public.admin_destination_name_review_report()
returns jsonb
language sql
security definer
set search_path=public
stable
as $$
  with grouped as (
    select
      public.normalize_destination_name(name) as normalized_name,
      coalesce(department,'') as department,
      coalesce(province,'') as province,
      coalesce(city,'') as city,
      count(*) as record_count,
      jsonb_agg(jsonb_build_object(
        'id',id,'name',name,'category',category,
        'latitude',latitude,'longitude',longitude,
        'source_note',source_note,'description',description
      ) order by id) as records
    from public.destination_catalog
    where is_active=true
    group by 1,2,3,4
    having count(*)>1
  )
  select jsonb_build_object(
    'scope','national',
    'review_required',coalesce(sum(record_count),0),
    'candidate_groups',count(*),
    'groups',coalesce(jsonb_agg(jsonb_build_object(
      'normalized_name',normalized_name,'department',department,
      'province',province,'city',city,'record_count',record_count,'records',records
    ) order by department,province,city,normalized_name),'[]'::jsonb)
  )
  from grouped;
$$;
revoke all on function public.admin_destination_name_review_report() from public,anon,authenticated;
grant execute on function public.admin_destination_name_review_report() to service_role;
