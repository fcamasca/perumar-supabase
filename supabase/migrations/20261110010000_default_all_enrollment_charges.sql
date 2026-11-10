-- CHG-H4-002: include optional tariffs initially; mandatory means non-removable.
-- Additive function replacement only; no backfill of existing enrollments.
begin;
create or replace function private.apply_enrollment_charges(enrollment uuid,cycle uuid,options uuid[],cycle_change boolean) returns void
language plpgsql set search_path='' as $$
declare ct record; initial_set boolean;
begin
 initial_set:=cycle_change or not exists(select 1 from public.matricula_cargo where matricula_id=enrollment);
 if options is null or (select count(distinct x) from unnest(options) x)<>cardinality(options)
 or exists(select 1 from unnest(options) x left join public.ciclo_tarifa c on c.id=x left join public.tarifa t on t.id=c.tarifa_id where c.id is null or c.ciclo_id<>cycle or not c.activo or not t.activo or c.obligatorio)
 then raise exception using errcode='23514',message='Selección opcional no válida'; end if;
 -- New enrollment or destination Cycle: include every active tariff DB-side.
 -- Subsequent edits retain the explicit optional selection and payment guards.
 if initial_set then
 select coalesce(array_agg(c.id order by c.id),'{}'::uuid[]) into options
 from public.ciclo_tarifa c join public.tarifa t on t.id=c.tarifa_id
 where c.ciclo_id=cycle and c.activo and t.activo and not c.obligatorio;
 end if;
 if (select count(*) from public.ciclo_tarifa c join public.tarifa t on t.id=c.tarifa_id where c.ciclo_id=cycle and c.activo and t.activo and t.tipo='CARRERA')<>1
 or exists(select 1 from public.ciclo_tarifa c join public.tarifa t on t.id=c.tarifa_id where c.ciclo_id=cycle and c.activo and t.activo and t.tipo='CARRERA' and not c.obligatorio)
 then raise exception using errcode='23514',message='El Ciclo requiere exactamente una tarifa Carrera activa obligatoria'; end if;
 if cycle_change then
 perform set_config('perumar.audit_reason','CAMBIO_CICLO',true);
 update public.matricula_cargo set activo=false,motivo_inactivacion='CAMBIO_CICLO' where matricula_id=enrollment and activo;
 else
 perform set_config('perumar.audit_reason','RETIRO_OPCIONAL',true);
 update public.matricula_cargo cargo set activo=false,motivo_inactivacion='RETIRO_OPCIONAL'
 from public.ciclo_tarifa c where cargo.ciclo_tarifa_id=c.id and cargo.matricula_id=enrollment and cargo.activo and not c.obligatorio and not(c.id=any(options));
 end if;
 for ct in select c.*,t.codigo,t.nombre,t.tipo from public.ciclo_tarifa c join public.tarifa t on t.id=c.tarifa_id
 where c.ciclo_id=cycle and c.activo and t.activo and (c.obligatorio or c.id=any(options)) order by c.id for share of c,t loop
 if not exists(select 1 from public.matricula_cargo where matricula_id=enrollment and ciclo_tarifa_id=ct.id and activo)
 and (not ct.obligatorio or initial_set) then
 insert into public.matricula_cargo(matricula_id,ciclo_tarifa_id,tarifa_id,codigo,nombre,tipo,importe_original)
 values(enrollment,ct.id,ct.tarifa_id,ct.codigo,ct.nombre,ct.tipo,ct.importe);
 end if;
 end loop;
end; $$;

commit;
