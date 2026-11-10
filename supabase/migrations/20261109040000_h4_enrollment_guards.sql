-- H4 adds only the approved financial guards; CHG-H3-011 preserved.
create or replace function private.guard_enrollment_history() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_table_name='matricula' then
 if new.ciclo_id is distinct from old.ciclo_id and exists(select 1 from public.pago where matricula_id=old.id) then
 raise exception using errcode='23514',message='PAYMENT_PREVENTS_CYCLE_TRANSFER'; end if;
 if old.estado_codigo='ANULADO' or new.alumno_id is distinct from old.alumno_id or new.alumno_snapshot is distinct from old.alumno_snapshot
 or new.codigo_generado_original is distinct from old.codigo_generado_original or new.anio_generacion<>old.anio_generacion or new.sigla_generacion<>old.sigla_generacion or new.correlativo<>old.correlativo then
 raise exception using errcode='23514',message='Historia de matrícula inmutable'; end if;
 elsif tg_table_name='matricula_cargo' then
 if (not new.activo and exists(select 1 from public.pago_aplicacion a join public.pago p on p.id=a.pago_id where a.matricula_cargo_id=old.id and p.estado_codigo='CONFIRMADO')) then
 raise exception using errcode='23514',message='PAYMENT_PREVENTS_CARGO_RETIREMENT'; end if;
 if new.importe_original-new.descuento < (select coalesce(sum(a.importe),0) from public.pago_aplicacion a join public.pago p on p.id=a.pago_id where a.matricula_cargo_id=old.id and p.estado_codigo='CONFIRMADO') then
 raise exception using errcode='23514',message='PAYMENT_DISCOUNT_BELOW_PAID'; end if;
 if not old.activo or (to_jsonb(new)-array['updated_at','activo','motivo_inactivacion','descuento','motivo_descuento','importe_final']) is distinct from (to_jsonb(old)-array['updated_at','activo','motivo_inactivacion','descuento','motivo_descuento','importe_final'])
 or (not new.activo and (new.descuento is distinct from old.descuento or new.motivo_descuento is distinct from old.motivo_descuento)) then
 raise exception using errcode='23514',message='Historia de cargo inmutable'; end if;
 elsif tg_table_name='ciclo' then
 if new.estado_codigo in ('DESIERTO','ANULADO') and exists(select 1 from public.pago p join public.matricula m on m.id=p.matricula_id where m.ciclo_id=old.id) then
 raise exception using errcode='23514',message='PAYMENT_PREVENTS_CYCLE_STATE'; end if;
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

