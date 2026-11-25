create or replace function public.admin_destination_fuzzy_name_review_report()
returns jsonb
language sql
security definer
set search_path=public,extensions
stable
as $$
  with candidates as (
    select
      a.id as id_a,b.id as id_b,a.name as name_a,b.name as name_b,
      a.department,a.province,a.city,a.category as category_a,b.category as category_b,
      round(extensions.similarity(a.name,b.name)::numeric,3) as similarity,
      round((6371000*2*asin(sqrt(least(1,
        power(sin(radians((b.latitude-a.latitude)/2)),2)
        +cos(radians(a.latitude))*cos(radians(b.latitude))
        *power(sin(radians((b.longitude-a.longitude)/2)),2)
      ))))::numeric,0) as distance_m,
      a.source_note as source_a,b.source_note as source_b
    from public.destination_catalog a
    join public.destination_catalog b
      on a.id<b.id and a.is_active=true and b.is_active=true
      and coalesce(a.department,'')=coalesce(b.department,'')
      and coalesce(a.province,'')=coalesce(b.province,'')
      and coalesce(a.city,'')=coalesce(b.city,'')
    where a.latitude between -90 and 90 and b.latitude between -90 and 90
      and a.longitude between -180 and 180 and b.longitude between -180 and 180
      and not (a.latitude=0 and a.longitude=0) and not (b.latitude=0 and b.longitude=0)
      and public.normalize_destination_name(a.name)<>public.normalize_destination_name(b.name)
      and extensions.similarity(a.name,b.name)>=0.60
      and 6371000*2*asin(sqrt(least(1,
        power(sin(radians((b.latitude-a.latitude)/2)),2)
        +cos(radians(a.latitude))*cos(radians(b.latitude))
        *power(sin(radians((b.longitude-a.longitude)/2)),2)
      )))<=1000
  )
  select jsonb_build_object(
    'scope','national','threshold_similarity',0.60,'maximum_distance_m',1000,
    'candidate_count',count(*),
    'candidates',coalesce(jsonb_agg(jsonb_build_object(
      'id_a',id_a,'name_a',name_a,'id_b',id_b,'name_b',name_b,
      'department',department,'province',province,'city',city,
      'category_a',category_a,'category_b',category_b,
      'similarity',similarity,'distance_m',distance_m,'source_a',source_a,'source_b',source_b
    ) order by similarity desc,distance_m,id_a,id_b),'[]'::jsonb)
  ) from candidates;
$$;
revoke all on function public.admin_destination_fuzzy_name_review_report() from public,anon,authenticated;
grant execute on function public.admin_destination_fuzzy_name_review_report() to service_role;
