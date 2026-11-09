-- Human-approved occupation selector/OTROS and catalog list, 2026-10-28.
-- CNO codes and profile descriptions are deliberately not stored.
insert into public.catalogo(codigo,nombre) values ('OCUPACION','OCUPACIÓN');
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'OTROS','OTROS',0 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'PESCADOR','PESCADOR',1 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'VENDEDOR','VENDEDOR',2 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'CHOFER','CHOFER',3 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'ALBANIL','ALBAÑIL',4 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'MECANICO','MECÁNICO',5 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'COCINERO','COCINERO',6 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'MOZO','MOZO',7 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'VIGILANTE','VIGILANTE',8 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'PANADERO','PANADERO',9 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'CARPINTERO','CARPINTERO',10 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'AGRICULTOR','AGRICULTOR',11 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'TECNICO','TÉCNICO',12 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'LIMPIADOR','LIMPIADOR',13 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'GASFITERO','GASFITERO',14 from public.catalogo where codigo='OCUPACION';
insert into public.catalogo_valor(catalogo_id,codigo,nombre,orden) select id,'ELECTRICISTA','ELECTRICISTA',15 from public.catalogo where codigo='OCUPACION';
alter table public.alumno add column ocupacion_id uuid references public.catalogo_valor(id);
-- Existing free-text occupations remain intact until explicitly edited by the user.
create or replace function private.validate_alumno() returns trigger
language plpgsql set search_path='' as $$
declare kind text; occupation public.catalogo_valor;
begin
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
create or replace function public.guardar_alumno(p jsonb) returns public.alumno
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.alumno; incoming public.alumno; clean jsonb; parent public.alumno; item jsonb; contact public.alumno_contacto_emergencia;
begin
 perform private.authorize(false);
 perform private.assert_fields(p-'contactos',array['id','expected_updated_at','apellido_paterno','apellido_materno','nombres','tipo_di_id','numero_di','fecha_nacimiento','sexo_id','estado_civil_id','nacimiento_departamento_id','nacimiento_provincia_id','nacimiento_distrito_id','celular','telefono_fijo','email','domicilio','numero_mz_lt','domicilio_departamento_id','domicilio_provincia_id','domicilio_distrito_id','grupo_sanguineo_id','grado_instruccion_id','color_ojos_id','color_cabello_id','estatura_cm','peso_kg','senas_particulares','ocupacion','ocupacion_id']);
 select jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end)
 into clean from jsonb_each(p-'contactos');
 clean:=clean||jsonb_build_object('numero_di',upper(clean->>'numero_di'));
 select * into incoming from jsonb_populate_record(null::public.alumno,clean);
 perform set_config('perumar.audit_reason','',true);
 if incoming.id is null then
 insert into public.alumno(apellido_paterno,apellido_materno,nombres,tipo_di_id,numero_di,fecha_nacimiento,sexo_id,estado_civil_id,nacimiento_departamento_id,nacimiento_provincia_id,nacimiento_distrito_id,celular,telefono_fijo,email,domicilio,numero_mz_lt,domicilio_departamento_id,domicilio_provincia_id,domicilio_distrito_id,grupo_sanguineo_id,grado_instruccion_id,color_ojos_id,color_cabello_id,estatura_cm,peso_kg,senas_particulares,ocupacion,ocupacion_id) values(incoming.apellido_paterno,incoming.apellido_materno,incoming.nombres,incoming.tipo_di_id,incoming.numero_di,incoming.fecha_nacimiento,incoming.sexo_id,incoming.estado_civil_id,incoming.nacimiento_departamento_id,incoming.nacimiento_provincia_id,incoming.nacimiento_distrito_id,incoming.celular,incoming.telefono_fijo,incoming.email,incoming.domicilio,incoming.numero_mz_lt,incoming.domicilio_departamento_id,incoming.domicilio_provincia_id,incoming.domicilio_distrito_id,incoming.grupo_sanguineo_id,incoming.grado_instruccion_id,incoming.color_ojos_id,incoming.color_cabello_id,incoming.estatura_cm,incoming.peso_kg,incoming.senas_particulares,incoming.ocupacion,incoming.ocupacion_id) returning * into result;
 else
 update public.alumno set apellido_paterno=incoming.apellido_paterno,apellido_materno=incoming.apellido_materno,nombres=incoming.nombres,tipo_di_id=incoming.tipo_di_id,numero_di=incoming.numero_di,fecha_nacimiento=incoming.fecha_nacimiento,sexo_id=incoming.sexo_id,estado_civil_id=incoming.estado_civil_id,nacimiento_departamento_id=incoming.nacimiento_departamento_id,nacimiento_provincia_id=incoming.nacimiento_provincia_id,nacimiento_distrito_id=incoming.nacimiento_distrito_id,celular=incoming.celular,telefono_fijo=incoming.telefono_fijo,email=incoming.email,domicilio=incoming.domicilio,numero_mz_lt=incoming.numero_mz_lt,domicilio_departamento_id=incoming.domicilio_departamento_id,domicilio_provincia_id=incoming.domicilio_provincia_id,domicilio_distrito_id=incoming.domicilio_distrito_id,grupo_sanguineo_id=incoming.grupo_sanguineo_id,grado_instruccion_id=incoming.grado_instruccion_id,color_ojos_id=incoming.color_ojos_id,color_cabello_id=incoming.color_cabello_id,estatura_cm=incoming.estatura_cm,peso_kg=incoming.peso_kg,senas_particulares=incoming.senas_particulares,ocupacion=incoming.ocupacion,ocupacion_id=incoming.ocupacion_id
 where id=incoming.id and updated_at=(p->>'expected_updated_at')::timestamptz returning * into result;
 if not found then perform private.require_version(null,(p->>'expected_updated_at')::timestamptz); end if;
 end if;
 if p ? 'contactos' then
 if jsonb_typeof(p->'contactos') is distinct from 'array' or (incoming.id is not null and jsonb_array_length(p->'contactos')>0) then raise exception using errcode='22023',message='Contactos iniciales solo en alta de Alumno'; end if;
 for item in select * from jsonb_array_elements(p->'contactos') loop
 perform private.assert_fields(item,array['apellido','nombre','parentesco_id','celular','direccion']);
 select jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end) into clean from jsonb_each(item);
 select * into contact from jsonb_populate_record(null::public.alumno_contacto_emergencia,clean);
 perform private.require_catalog(contact.parentesco_id,'PARENTESCO');
 insert into public.alumno_contacto_emergencia(alumno_id,apellido,nombre,parentesco_id,celular,direccion)
 values(result.id,contact.apellido,contact.nombre,contact.parentesco_id,contact.celular,contact.direccion);
 end loop;
 end if;
 return result;
end; $$;
create or replace function private.enrollment_snapshot(subject uuid) returns jsonb
language plpgsql set search_path='' as $$
declare a public.alumno; refs jsonb:='{}'; pair record; contacts jsonb;
begin
 select * into a from public.alumno where id=subject;
 if a.id is null or a.apellido_paterno is null or a.apellido_materno is null or a.nombres is null or a.numero_di is null or a.fecha_nacimiento is null or a.celular is null or a.domicilio is null then raise exception using errcode='23514',message='Complete la ficha del Alumno'; end if;
 for pair in select * from (values
 ('TIPO_DI',a.tipo_di_id),('SEXO',a.sexo_id),('ESTADO_CIVIL',a.estado_civil_id),('GRUPO_SANGUINEO',a.grupo_sanguineo_id),
 ('GRADO_INSTRUCCION',a.grado_instruccion_id),('COLOR_OJOS',a.color_ojos_id),('COLOR_CABELLO',a.color_cabello_id),('OCUPACION',a.ocupacion_id)) x(code,id) loop
 if pair.id is not null then
 perform private.require_catalog(pair.id,pair.code);
 refs:=refs||jsonb_build_object(pair.code,(select jsonb_build_object('id',id,'etiqueta',nombre) from public.catalogo_valor where id=pair.id));
 else refs:=refs||jsonb_build_object(pair.code,null); end if;
 end loop;
 for pair in select parentesco_id as id from public.alumno_contacto_emergencia where alumno_id=subject and activo loop
 perform private.require_catalog(pair.id,'PARENTESCO');
 end loop;
 select jsonb_agg((to_jsonb(c)-'created_at'-'updated_at')||jsonb_build_object('parentesco',jsonb_build_object('id',v.id,'etiqueta',v.nombre)) order by c.id)
 into contacts from public.alumno_contacto_emergencia c join public.catalogo_valor v on v.id=c.parentesco_id where c.alumno_id=subject and c.activo;
 if contacts is null then raise exception using errcode='23514',message='Se requiere contacto de emergencia activo y válido'; end if;
 return jsonb_build_object('version',1,'fecha',clock_timestamp(),'alumno',to_jsonb(a)-'updated_at'-'created_at','catalogos',refs,'contactos',contacts,
 'geografia',(select jsonb_object_agg(x.id::text,x.etiqueta) from (
 select id,nombre as etiqueta from public.departamento where id in (a.nacimiento_departamento_id,a.domicilio_departamento_id)
 union all select id,nombre from public.provincia where id in (a.nacimiento_provincia_id,a.domicilio_provincia_id)
 union all select id,nombre from public.distrito where id in (a.nacimiento_distrito_id,a.domicilio_distrito_id)) x));
end; $$;
notify pgrst,'reload schema';
