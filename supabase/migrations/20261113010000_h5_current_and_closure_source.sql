-- CHG-H5-002: current source until closure; immutable final personal data afterward.
-- No development backfill: closed test cycles without a final capture are explicitly unavailable.
alter table public.matricula add column alumno_snapshot_cierre jsonb;
alter table public.matricula add constraint matricula_cierre_object check
 (alumno_snapshot_cierre is null or jsonb_typeof(alumno_snapshot_cierre)='object');

-- One coherent JWT/RLS read, also reused for capture and server-side fingerprint validation.
create view public.matricula_ficha_fuente with (security_invoker=true) as
with current_data as (
 select m.id, m.updated_at, m.estado_codigo, m.alumno_snapshot_cierre,
 jsonb_build_object('version',1,'alumno',to_jsonb(a)-array['created_at','updated_at'],
 'catalogos',(select jsonb_object_agg(ref.code,case when v.id is null then null else jsonb_build_object('id',v.id,'etiqueta',v.nombre) end)
 from (values ('TIPO_DI',a.tipo_di_id),('SEXO',a.sexo_id),('ESTADO_CIVIL',a.estado_civil_id),
 ('GRUPO_SANGUINEO',a.grupo_sanguineo_id),('GRADO_INSTRUCCION',a.grado_instruccion_id),
 ('COLOR_OJOS',a.color_ojos_id),('COLOR_CABELLO',a.color_cabello_id),('OCUPACION',a.ocupacion_id)) ref(code,id)
 left join public.catalogo_valor v on v.id=ref.id),
 'geografia',(select coalesce(jsonb_object_agg(g.id::text,g.nombre),'{}'::jsonb) from (
 select id,nombre from public.departamento where id in(a.nacimiento_departamento_id,a.domicilio_departamento_id)
 union select id,nombre from public.provincia where id in(a.nacimiento_provincia_id,a.domicilio_provincia_id)
 union select id,nombre from public.distrito where id in(a.nacimiento_distrito_id,a.domicilio_distrito_id)) g),
 'contactos',(select coalesce(jsonb_agg((to_jsonb(contact)-array['created_at','updated_at']) ||
 jsonb_build_object('parentesco',case when rel.id is null then null else jsonb_build_object('id',rel.id,'etiqueta',rel.nombre) end)
 order by contact.id),'[]'::jsonb) from public.alumno_contacto_emergencia contact
 left join public.catalogo_valor rel on rel.id=contact.parentesco_id where contact.alumno_id=a.id and contact.activo)) as datos_vigentes,
 jsonb_build_object('id',m.id,'created_at',m.created_at,'estado_codigo',m.estado_codigo,'codigo_matricula',m.codigo_matricula,
 'empresa_patrocinadora_id',m.empresa_patrocinadora_id,
 'empresa_patrocinadora',case when company.id is null then null else jsonb_build_object('razon_social',company.razon_social,'ruc',company.ruc,'persona_contacto',company.persona_contacto,'telefono',company.telefono,'email',company.email) end,
 'ciclo',jsonb_build_object('codigo_ciclo',c.codigo_ciclo,'nombre_promocion',c.nombre_promocion,'estado_codigo',c.estado_codigo,
 'carrera',jsonb_build_object('nombre',course.nombre),'distrito',jsonb_build_object('nombre',district.nombre))) as contexto,
 c.estado_codigo as ciclo_estado
 from public.matricula m join public.alumno a on a.id=m.alumno_id
 join public.ciclo c on c.id=m.ciclo_id join public.carrera course on course.id=c.carrera_id
 join public.distrito district on district.id=c.distrito_id
 left join public.empresa_patrocinadora company on company.id=m.empresa_patrocinadora_id
), selected as (
 select *, contexto || jsonb_build_object('fuente',case when ciclo_estado='CERRADO' then 'cierre' else 'vigente' end,
 'datos_ficha',case when ciclo_estado='CERRADO' then alumno_snapshot_cierre else datos_vigentes end) as payload
 from current_data
)
select id,updated_at,datos_vigentes,payload as source,
 encode(sha256(convert_to((payload || jsonb_build_object('template_version','h5-2'))::text,'UTF8')),'hex') as source_fingerprint
from selected;
revoke all on public.matricula_ficha_fuente from public,anon,authenticated;
grant select on public.matricula_ficha_fuente to authenticated;

-- The Cycle row is already locked by its transition. Stable lock protocol: Cycle -> Students -> Enrollments.
create function private.freeze_cycle_students() returns trigger
language plpgsql security definer set search_path='' as $$
declare prior text; captured_at timestamptz;
begin
 if old.estado_codigo<>'EN_CURSO' or new.estado_codigo<>'CERRADO' then return new; end if;
 perform private.authorize(true);
 perform 1 from public.alumno a where exists(select 1 from public.matricula m
 where m.ciclo_id=new.id and m.estado_codigo='ACTIVO' and m.alumno_id=a.id) order by a.id for update;
 perform 1 from public.matricula m where m.ciclo_id=new.id and m.estado_codigo='ACTIVO' order by m.id for update;
 prior:=current_setting('perumar.closing_cycle',true);
 perform set_config('perumar.closing_cycle',new.id::text,true);
 captured_at:=clock_timestamp();
 -- One statement gives every capture the same MVCC view of labels/geography/context.
 -- All row locks have already been acquired in UUID order above.
 update public.matricula m set alumno_snapshot_cierre=f.datos_vigentes || jsonb_build_object('fecha',captured_at)
 from public.matricula_ficha_fuente f
 where f.id=m.id and m.ciclo_id=new.id and m.estado_codigo='ACTIVO';
 if exists(select 1 from public.matricula m where m.ciclo_id=new.id and m.estado_codigo='ACTIVO' and m.alumno_snapshot_cierre is null) then
  raise exception using errcode='23514',message='Captura final de Ciclo incompleta';
 end if;
 perform set_config('perumar.closing_cycle',coalesce(prior,''),true);
 return new;
end; $$;
revoke all on function private.freeze_cycle_students() from public,anon,authenticated;
create trigger ciclo_freeze_students after update of estado_codigo on public.ciclo
for each row when (old.estado_codigo='EN_CURSO' and new.estado_codigo='CERRADO') execute function private.freeze_cycle_students();

create or replace function private.guard_enrollment_history() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_table_name='matricula' then
 if tg_op='INSERT' then
  if new.alumno_snapshot_cierre is not null then raise exception using errcode='23514',message='Snapshot de cierre solo durante cierre de Ciclo'; end if;
  return new;
 end if;
 if new.alumno_snapshot_cierre is distinct from old.alumno_snapshot_cierre then
  if old.alumno_snapshot_cierre is not null or new.alumno_snapshot_cierre is null
   or old.estado_codigo<>'ACTIVO' or new.estado_codigo<>old.estado_codigo or new.ciclo_id<>old.ciclo_id
   or pg_trigger_depth()<>2 or current_setting('perumar.closing_cycle',true) is distinct from old.ciclo_id::text
   or not private.has_active_role('DIRECTOR_ACADEMICO')
   or not exists(select 1 from public.ciclo c where c.id=old.ciclo_id and c.estado_codigo='CERRADO') then
   raise exception using errcode='23514',message='Snapshot de cierre inmutable';
  end if;
 end if;
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


drop trigger matricula_history on public.matricula;
create trigger matricula_history before insert or update on public.matricula for each row execute function private.guard_enrollment_history();

create or replace function private.audit_enrollment() returns trigger
language plpgsql security definer set search_path='' as $$
declare prev jsonb; nextval jsonb; changed jsonb;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Actor requerido'; end if;
 if tg_op='UPDATE' then prev:=to_jsonb(old)-'updated_at'; end if;
 nextval:=to_jsonb(new)-'updated_at';
 if prev is not distinct from nextval then return null; end if;
 if tg_table_name in ('alumno','alumno_contacto_emergencia','empresa_patrocinadora') then
  select jsonb_agg(k order by k) into changed from jsonb_object_keys(nextval) k
   where k not in ('created_at','id') and (prev->k) is distinct from (nextval->k);
  prev:=case when tg_op='UPDATE' then jsonb_build_object('id',old.id) end;
  nextval:=jsonb_build_object('id',new.id,'campos_modificados',changed);
 else
  prev:=prev-array['alumno_snapshot','alumno_snapshot_cierre']; nextval:=nextval-array['alumno_snapshot','alumno_snapshot_cierre'];
 end if;
 insert into public.auditoria(entidad,registro_id,accion,actor,motivo,old_values,new_values)
 values(tg_table_name,new.id,case when tg_op='INSERT' then 'CREATE' else 'UPDATE' end,auth.uid(),
 nullif(current_setting('perumar.audit_reason',true),''),prev,nextval);
 return null;
end; $$;

drop function public.registrar_evento_ficha_pdf(uuid,uuid,uuid,text,timestamptz,timestamptz);
create function public.registrar_evento_ficha_pdf(
 p_actor uuid,p_matricula_id uuid,p_artefacto_id uuid,p_evento text,
 p_source_version timestamptz,p_generated_at timestamptz,p_source_fingerprint text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.matricula; cycle_state text; fingerprint text; cycle_id uuid; student_id uuid; event_time timestamptz; manifest jsonb;
begin
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id
   join public.app_roles r on r.code=ur.role_code
   where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then
   raise exception using errcode='42501',message='Acceso denegado';
 end if;
 select ciclo_id,alumno_id into cycle_id,student_id from public.matricula where id=p_matricula_id;
 perform 1 from public.ciclo where id=cycle_id for share;
 perform 1 from public.alumno where id=student_id for share;
 select * into m from public.matricula where id=p_matricula_id for share;
 select estado_codigo into cycle_state from public.ciclo where id=m.ciclo_id;
 if m.id is null then raise exception using errcode='P0002',message='Ficha no disponible'; end if;
 if m.estado_codigo<>'ACTIVO' or cycle_state not in ('PROGRAMADO','EN_CURSO','CERRADO')
   or m.updated_at is distinct from p_source_version then
   raise exception using errcode='PT409',message='Contexto de ficha cambiado';
 end if;
 -- Recheck actor and source together after any lock wait.
 select f.source_fingerprint into fingerprint from public.matricula_ficha_fuente f where f.id=m.id
 and exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id
 join public.app_roles r on r.code=ur.role_code where u.id=p_actor and u.active and r.active
 and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO'));
 if fingerprint is null then raise exception using errcode='42501',message='Acceso denegado'; end if;
 if p_source_fingerprint is null or fingerprint is distinct from p_source_fingerprint then
  raise exception using errcode='PT409',message='Fuente de ficha modificada; regenere explicitamente';
 end if;
 if cycle_state='CERRADO' and m.alumno_snapshot_cierre is null then
  raise exception using errcode='PT409',message='Fotografia de cierre no disponible';
 end if;
 -- Retention is checked at validation time, never at the beginning of a lock wait.
 event_time:=clock_timestamp();
 if p_artefacto_id is null or p_generated_at is null or p_generated_at>event_time
   or p_generated_at<event_time-interval '24 hours' then
   raise exception using errcode='22023',message='Artefacto no válido o vencido';
 end if;
 if p_evento='FICHA_PDF_GENERADA' then
   if exists(select 1 from public.auditoria where entidad='ficha_pdf' and registro_id=p_matricula_id
     and accion='FICHA_PDF_GENERADA' and new_values->>'artefacto_id'=p_artefacto_id::text) then
     raise exception using errcode='PT409',message='Artefacto ya registrado';
   end if;
   manifest:=jsonb_build_object('artefacto_id',p_artefacto_id,'generated_at',p_generated_at,
     'expires_at',p_generated_at+interval '24 hours','source_version',p_source_version,'template_version','h5-2','source_fingerprint',fingerprint);
 elsif p_evento='FICHA_PDF_DESCARGA_INICIADA' then
   select new_values into manifest from public.auditoria where entidad='ficha_pdf' and registro_id=p_matricula_id
     and accion='FICHA_PDF_GENERADA' and new_values->>'artefacto_id'=p_artefacto_id::text
     and (new_values->>'generated_at')::timestamptz=p_generated_at
     and (new_values->>'expires_at')::timestamptz>event_time;
   if manifest is not null and manifest->>'source_fingerprint' is distinct from fingerprint then
    raise exception using errcode='PT409',message='Fuente de ficha modificada; regenere explicitamente';
   end if;
   if manifest is null then raise exception using errcode='P0002',message='Artefacto no disponible'; end if;
 else raise exception using errcode='22023',message='Evento no permitido';
 end if;
 insert into public.auditoria(entidad,registro_id,accion,actor,fecha,new_values)
 values('ficha_pdf',p_matricula_id,p_evento,p_actor,event_time,manifest);
 return manifest;
end; $$;
revoke all on function public.registrar_evento_ficha_pdf(uuid,uuid,uuid,text,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.registrar_evento_ficha_pdf(uuid,uuid,uuid,text,timestamptz,timestamptz,text) to service_role;

notify pgrst,'reload schema';
