-- CHG-H3-011: only Director may confirm changes to current Cycle subjects with active enrollments.
-- No changes to historical enrollment snapshots, codes, charges or Course restrictions.
create or replace function private.guard_enrollment_history() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_table_name='matricula' then
 if old.estado_codigo='ANULADO' or new.alumno_id is distinct from old.alumno_id or new.alumno_snapshot is distinct from old.alumno_snapshot
 or new.codigo_generado_original is distinct from old.codigo_generado_original or new.anio_generacion<>old.anio_generacion or new.sigla_generacion<>old.sigla_generacion or new.correlativo<>old.correlativo then
 raise exception using errcode='23514',message='Historia de matrícula inmutable'; end if;
 elsif tg_table_name='matricula_cargo' then
 if not old.activo or (to_jsonb(new)-array['updated_at','activo','motivo_inactivacion','descuento','motivo_descuento','importe_final']) is distinct from (to_jsonb(old)-array['updated_at','activo','motivo_inactivacion','descuento','motivo_descuento','importe_final'])
 or (not new.activo and (new.descuento is distinct from old.descuento or new.motivo_descuento is distinct from old.motivo_descuento)) then
 raise exception using errcode='23514',message='Historia de cargo inmutable'; end if;
 elsif tg_table_name='ciclo' then
 if new.estado_codigo='ANULADO' and exists(select 1 from public.matricula where ciclo_id=old.id) then raise exception using errcode='23514',message='Ciclo con matrículas no puede anularse'; end if;
 if exists(select 1 from public.matricula where ciclo_id=old.id and estado_codigo='ACTIVO') then
 if not private.has_active_role('DIRECTOR_ACADEMICO') or (to_jsonb(new)-array['updated_at','nombre_promocion','fecha_inicio','fecha_fin','codigo_ciclo','estado_codigo','motivo','motivo_desierto_id']) is distinct from (to_jsonb(old)-array['updated_at','nombre_promocion','fecha_inicio','fecha_fin','codigo_ciclo','estado_codigo','motivo','motivo_desierto_id']) then raise exception using errcode='23514',message='Ciclo con matrícula activa: solo Director, promoción y fechas'; end if;
 end if;
 elsif tg_table_name='ciclo_materia' then
 if tg_op='INSERT' and exists(select 1 from public.ciclo_materia where ciclo_id=new.ciclo_id and materia_id=new.materia_id) then return new; end if;
 if exists(select 1 from public.matricula where ciclo_id=new.ciclo_id and estado_codigo='ACTIVO') and
  (not private.has_active_role('DIRECTOR_ACADEMICO') or current_setting('perumar.confirm_cycle_subjects',true) is distinct from new.ciclo_id::text) then
 raise exception using errcode='23514',message='Materias de Ciclo con matrícula activa no editables'; end if;
 end if;
 return new;
end; $$;

-- Replace the existing command, not an overload or additional API.
drop function public.cambiar_materia_ciclo(uuid,uuid,timestamptz,boolean);
create function public.cambiar_materia_ciclo(ciclo_id uuid,materia_id uuid,expected_updated_at timestamptz,activo boolean,confirmar_matriculas_activas boolean default false)
returns public.ciclo language plpgsql security definer set search_path='' as $$
declare result public.ciclo; has_enrollments boolean;
begin
 perform private.authorize(false);
 if activo is null or confirmar_matriculas_activas is null then raise exception using errcode='22023',message='Estado y confirmación requeridos'; end if;
 perform set_config('perumar.confirm_cycle_subjects','',true);
 perform set_config('perumar.audit_reason','',true);
 if confirmar_matriculas_activas and not private.has_active_role('DIRECTOR_ACADEMICO') then
  raise exception using errcode='42501',message='Solo Director puede confirmar cambios de asignaturas con matrículas activas'; end if;
 select exists(select 1 from public.matricula m where m.ciclo_id=cambiar_materia_ciclo.ciclo_id and m.estado_codigo='ACTIVO') into has_enrollments;
 if has_enrollments then
  if not private.has_active_role('DIRECTOR_ACADEMICO') then raise exception using errcode='23514',message='Materias de Ciclo con matrícula activa no editables'; end if;
  if not confirmar_matriculas_activas then raise exception using errcode='23514',message='Confirmación requerida para asignaturas con matrículas activas'; end if;
  perform set_config('perumar.confirm_cycle_subjects',ciclo_id::text,true);
  perform set_config('perumar.audit_reason','Director confirma cambio de asignaturas del Ciclo con matrículas activas',true);
 end if;
 update public.ciclo c set updated_at=clock_timestamp()
 where c.id=cambiar_materia_ciclo.ciclo_id and c.updated_at=expected_updated_at and c.estado_codigo in ('PROGRAMADO','EN_CURSO') returning * into result;
 if not found then perform private.require_version(null,expected_updated_at); end if;
 update public.ciclo_materia cm set activo=cambiar_materia_ciclo.activo,
 motivo_inactivacion=case when cambiar_materia_ciclo.activo then null else 'RETIRO_MANUAL' end
 where cm.ciclo_id=cambiar_materia_ciclo.ciclo_id and cm.materia_id=cambiar_materia_ciclo.materia_id;
 if not found then
  if not activo or not exists(select 1 from public.materia m where m.id=cambiar_materia_ciclo.materia_id and m.active) then
   raise exception using errcode='23514',message='Asignatura adicional no válida o inactiva'; end if;
  insert into public.ciclo_materia(ciclo_id,materia_id,origen) values(cambiar_materia_ciclo.ciclo_id,cambiar_materia_ciclo.materia_id,'ADICIONAL');
 end if;
 perform set_config('perumar.confirm_cycle_subjects','',true);
 return result;
end $$;
revoke all on function public.cambiar_materia_ciclo(uuid,uuid,timestamptz,boolean,boolean) from public,anon,authenticated;
grant execute on function public.cambiar_materia_ciclo(uuid,uuid,timestamptz,boolean,boolean) to authenticated;
alter function public.cambiar_materia_ciclo(uuid,uuid,timestamptz,boolean,boolean) set default_transaction_isolation='serializable';
notify pgrst,'reload schema';
