-- Atomic save for the Cycle subjects tab. Historical commands and guards remain unchanged.
create function public.guardar_asignaturas_ciclo(
 p_ciclo_id uuid, p_expected_updated_at timestamptz, p_cambios jsonb,
 p_confirmar_matriculas_activas boolean default false
) returns public.ciclo language plpgsql security definer set search_path='' as $$
declare result public.ciclo; item jsonb;
begin
 perform private.authorize(false);
 if p_cambios is null or jsonb_typeof(p_cambios)<>'array' then
  raise exception using errcode='22023',message='Lista de asignaturas requerida'; end if;
 if jsonb_array_length(p_cambios)=0 or jsonb_array_length(p_cambios)>512 or p_confirmar_matriculas_activas is null then
  raise exception using errcode='22023',message='Cambios de asignaturas no válidos'; end if;
 for item in select value from jsonb_array_elements(p_cambios) loop
  perform private.assert_fields(item - 'activo',array['materia_id']);
  if item->>'materia_id' is null or jsonb_typeof(item->'activo') is distinct from 'boolean' then
   raise exception using errcode='22023',message='Asignatura y estado requeridos'; end if;
  perform (item->>'materia_id')::uuid;
 end loop;
 if (select count(distinct (value->>'materia_id')::uuid) from jsonb_array_elements(p_cambios))<>jsonb_array_length(p_cambios) then
  raise exception using errcode='22023',message='Asignaturas duplicadas'; end if;
 select * into result from public.ciclo where id=p_ciclo_id for update;
 perform private.require_version(result.updated_at,p_expected_updated_at);
 -- Each change uses the existing authorizer, current-state guards, explicit Director
 -- confirmation, version check, audit and historical-row preservation. Any failure
 -- aborts this entire RPC, including earlier changes and their audit records.
 for item in select value from jsonb_array_elements(p_cambios)
  order by (value->>'activo')::boolean desc,(value->>'materia_id')::uuid loop
  result:=public.cambiar_materia_ciclo(p_ciclo_id,(item->>'materia_id')::uuid,
   result.updated_at,(item->>'activo')::boolean,p_confirmar_matriculas_activas);
 end loop;
 return result;
end $$;
revoke all on function public.guardar_asignaturas_ciclo(uuid,timestamptz,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.guardar_asignaturas_ciclo(uuid,timestamptz,jsonb,boolean) to authenticated;
alter function public.guardar_asignaturas_ciclo(uuid,timestamptz,jsonb,boolean) set default_transaction_isolation='serializable';
notify pgrst,'reload schema';
