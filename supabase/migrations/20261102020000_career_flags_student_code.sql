-- CHG-H3-003, human-approved 2026-11-02. Additive migration; no historical snapshots rewritten.
alter table public.materia alter column codigo drop not null;
alter table public.carrera alter column codigo drop not null;
alter table public.carrera add column con_experiencia boolean not null default false;
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden)
 select c.id,v.codigo,v.nombre,v.orden from public.catalogo c
 cross join (values ('PRESENCIAL','Presencial',1),('SEMIPRESENCIAL','Semipresencial',2),('A_DISTANCIA','A distancia',3)) v(codigo,nombre,orden)
 where c.codigo='MODALIDAD_CARRERA';
-- Controlled data migration, not a product operation. Keep audit history and optimistic versions intact.
-- Only the named audit/stamp triggers are disabled under the migration transaction's table lock.
alter table public.carrera disable trigger carrera_audit;
alter table public.carrera disable trigger carrera_stamp;
update public.carrera c set con_experiencia=coalesce((select v.codigo='CON_EXPERIENCIA' from public.catalogo_valor v where v.id=c.modalidad_id),false),
 modalidad_id=(select v.id from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='MODALIDAD_CARRERA' and v.codigo='PRESENCIAL');
alter table public.carrera enable trigger carrera_stamp;
alter table public.carrera enable trigger carrera_audit;
update public.catalogo_valor v set activo=false from public.catalogo c
 where c.id=v.catalogo_id and c.codigo='MODALIDAD_CARRERA' and v.codigo in ('CON_EXPERIENCIA','SIN_EXPERIENCIA');

create sequence private.alumno_codigo_seq as bigint minvalue 1 no cycle;
revoke all on sequence private.alumno_codigo_seq from public,anon,authenticated;
alter table public.alumno add column codigo_alumno text;
-- Backfill in registration order; no PII copied to audit and no historical matrícula changed.
alter table public.alumno disable trigger alumno_audit;
alter table public.alumno disable trigger alumno_stamp;
alter table public.alumno disable trigger alumno_validate;
do $$ declare r record; serial bigint; begin
 for r in select id from public.alumno order by created_at,id loop
  serial:=nextval('private.alumno_codigo_seq'::regclass);
  update public.alumno set codigo_alumno='A-'||lpad(serial::text,greatest(7,length(serial::text)),'0') where id=r.id;
 end loop;
end; $$;
alter table public.alumno enable trigger alumno_validate;
alter table public.alumno enable trigger alumno_stamp;
alter table public.alumno enable trigger alumno_audit;
alter table public.alumno alter column codigo_alumno set not null;
alter table public.alumno add constraint alumno_codigo_alumno_key unique(codigo_alumno);
alter table public.alumno add constraint alumno_codigo_alumno_format check(codigo_alumno ~ '^A-[0-9]{7,}$');

create or replace function public.guardar_materia(p jsonb) returns public.materia
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.materia; expected timestamptz;
begin
 perform private.authorize(true);
 perform private.assert_fields(p,array['id','expected_updated_at','nombre','descripcion']);
 perform set_config('perumar.audit_reason','',true);
 if p->>'id' is null then
  insert into public.materia(nombre,descripcion)
  values(upper(btrim(p->>'nombre')),p->>'descripcion') returning * into result;
 else
  expected:=(p->>'expected_updated_at')::timestamptz;
  update public.materia set nombre=upper(btrim(p->>'nombre')),descripcion=p->>'descripcion'
   where id=(p->>'id')::uuid and updated_at=expected returning * into result;
  if not found then perform private.require_version(null,expected); end if;
 end if;
 return result;
end; $$;

create or replace function public.guardar_carrera(p jsonb,materias uuid[]) returns public.carrera
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.carrera; previous_sigla text; expected timestamptz; delivery uuid;
begin
 perform private.authorize(true);
 perform private.assert_fields(p-'con_experiencia',array['id','expected_updated_at','nombre','descripcion','sigla','modalidad_id']);
 if p ? 'con_experiencia' and jsonb_typeof(p->'con_experiencia') is distinct from 'boolean' then
  raise exception using errcode='22023',message='Con experiencia debe ser booleano';
 end if;
 perform set_config('perumar.audit_reason','',true);
 if not(p ? 'modalidad_id') then
  select v.id into delivery from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id
   where c.codigo='MODALIDAD_CARRERA' and v.codigo='PRESENCIAL';
 else delivery:=nullif(btrim(p->>'modalidad_id'),'')::uuid; end if;
 if delivery is not null then
  if not exists(select 1 from public.carrera where id=(p->>'id')::uuid and modalidad_id=delivery) then
   perform private.require_catalog(delivery,'MODALIDAD_CARRERA');
  end if;
  if not exists(select 1 from public.catalogo_valor where id=delivery and codigo in ('PRESENCIAL','SEMIPRESENCIAL','A_DISTANCIA')) then
   raise exception using errcode='23514',message='Modalidad no válida';
  end if;
 end if;
 if materias is null or cardinality(materias)=0 or
  (select count(distinct x) from unnest(materias) x)<>cardinality(materias) then
  raise exception using errcode='23514',message='Seleccione Materias sin duplicados';
 end if;
 if exists(select 1 from unnest(materias) x left join public.materia m on m.id=x
 where m.id is null or (not m.active and not exists(select 1 from public.carrera_materia cm
 where cm.carrera_id=(p->>'id')::uuid and cm.materia_id=x))) then
  raise exception using errcode='23514',message='No puede agregar Materias inactivas';
 end if;
 if not exists(select 1 from public.materia where id=any(materias) and active) then
  raise exception using errcode='23514',message='Seleccione al menos una Materia activa';
 end if;
 if p->>'id' is null then
  insert into public.carrera(nombre,descripcion,sigla,modalidad_id,con_experiencia)
  values(upper(btrim(p->>'nombre')),p->>'descripcion',upper(btrim(p->>'sigla')),delivery,coalesce((p->>'con_experiencia')::boolean,false))
  returning * into result;
 else
  select sigla into previous_sigla from public.carrera where id=(p->>'id')::uuid;
  expected:=(p->>'expected_updated_at')::timestamptz;
  update public.carrera set nombre=upper(btrim(p->>'nombre')),
   descripcion=p->>'descripcion',sigla=upper(btrim(p->>'sigla')),modalidad_id=delivery,con_experiencia=coalesce((p->>'con_experiencia')::boolean,con_experiencia)
   where id=(p->>'id')::uuid and updated_at=expected returning * into result;
  if not found then perform private.require_version(null,expected); end if;
 end if;
 delete from public.carrera_materia where carrera_id=result.id and not(materia_id=any(materias));
 insert into public.carrera_materia(carrera_id,materia_id) select result.id,x from unnest(materias) x
  on conflict(carrera_id,materia_id) do nothing;
 perform private.sync_missing(result.id);
 if previous_sigla is distinct from result.sigla then
  update public.ciclo set codigo_ciclo=anio::text||'-'||lpad(correlativo::text,greatest(3,length(correlativo::text)),'0')||'-'||result.sigla
   where carrera_id=result.id and estado_codigo in ('PROGRAMADO','EN_CURSO');
 end if;
 return result;
end; $$;

create or replace function private.validate_alumno() returns trigger
language plpgsql set search_path='' as $$
declare kind text; occupation public.catalogo_valor; serial bigint;
begin
 if tg_op='INSERT' then
  if new.codigo_alumno is not null then raise exception using errcode='23514',message='Código de Alumno asignado exclusivamente por DB'; end if;
  serial:=nextval('private.alumno_codigo_seq'::regclass);
  new.codigo_alumno:='A-'||lpad(serial::text,greatest(7,length(serial::text)),'0');
 elsif new.codigo_alumno is distinct from old.codigo_alumno then
  raise exception using errcode='23514',message='Código de Alumno inmutable';
 end if;
 if coalesce(length(btrim(new.apellido_paterno)),0)=0 or coalesce(length(btrim(new.apellido_materno)),0)=0 or coalesce(length(btrim(new.nombres)),0)=0 or coalesce(length(btrim(new.celular)),0)=0 or coalesce(length(btrim(new.domicilio)),0)=0 or new.fecha_nacimiento is null or new.nacimiento_departamento_id is null or new.nacimiento_provincia_id is null or new.nacimiento_distrito_id is null or new.domicilio_departamento_id is null or new.domicilio_provincia_id is null or new.domicilio_distrito_id is null then raise exception using errcode='23514',message='Complete los campos obligatorios del Alumno'; end if;
 if (tg_op='INSERT' or new.nacimiento_departamento_id is distinct from old.nacimiento_departamento_id) and not exists(select 1 from public.departamento where id=new.nacimiento_departamento_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.nacimiento_provincia_id is distinct from old.nacimiento_provincia_id) and not exists(select 1 from public.provincia where id=new.nacimiento_provincia_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.nacimiento_distrito_id is distinct from old.nacimiento_distrito_id) and not exists(select 1 from public.distrito where id=new.nacimiento_distrito_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.domicilio_departamento_id is distinct from old.domicilio_departamento_id) and not exists(select 1 from public.departamento where id=new.domicilio_departamento_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.domicilio_provincia_id is distinct from old.domicilio_provincia_id) and not exists(select 1 from public.provincia where id=new.domicilio_provincia_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.domicilio_distrito_id is distinct from old.domicilio_distrito_id) and not exists(select 1 from public.distrito where id=new.domicilio_distrito_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if new.ocupacion_id is not null then
 perform private.require_catalog(new.ocupacion_id,'OCUPACION');
 select * into occupation from public.catalogo_valor where id=new.ocupacion_id;
 if occupation.codigo='OTROS' then
  new.ocupacion:=nullif(upper(btrim(new.ocupacion)),'');
  if new.ocupacion is null then raise exception using errcode='23514',message='Especifique la ocupación al seleccionar OTROS'; end if;
 else new.ocupacion:=occupation.nombre; end if;
 elsif nullif(btrim(new.ocupacion),'') is not null then
  if tg_op='INSERT' then raise exception using errcode='23514',message='Seleccione ocupación del catálogo u OTROS'; end if;
  if new.ocupacion is distinct from old.ocupacion or old.ocupacion_id is not null then raise exception using errcode='23514',message='Seleccione ocupación del catálogo u OTROS'; end if;
 end if;
 perform private.require_catalog(new.tipo_di_id,'TIPO_DI');
 perform private.require_catalog(new.sexo_id,'SEXO');
 if new.estado_civil_id is not null then perform private.require_catalog(new.estado_civil_id,'ESTADO_CIVIL'); end if;
 if new.grupo_sanguineo_id is not null then perform private.require_catalog(new.grupo_sanguineo_id,'GRUPO_SANGUINEO'); end if;
 if new.grado_instruccion_id is not null then perform private.require_catalog(new.grado_instruccion_id,'GRADO_INSTRUCCION'); end if;
 if new.color_ojos_id is not null then perform private.require_catalog(new.color_ojos_id,'COLOR_OJOS'); end if;
 if new.color_cabello_id is not null then perform private.require_catalog(new.color_cabello_id,'COLOR_CABELLO'); end if;
 select codigo into kind from public.catalogo_valor where id=new.tipo_di_id;
 if (kind='DNI' and new.numero_di !~ '^[0-9]{8}$') or
 (kind='CARNET_EXTRANJERIA' and new.numero_di !~ '^[A-Z0-9]{1,30}$') or kind not in ('DNI','CARNET_EXTRANJERIA')
 or new.fecha_nacimiento>(clock_timestamp() at time zone 'America/Lima')::date then
 raise exception using errcode='23514',message='Documento o fecha de nacimiento no válidos'; end if;
 return new;
end; $$;

notify pgrst,'reload schema';
