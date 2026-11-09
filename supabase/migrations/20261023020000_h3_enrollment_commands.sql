-- H3 validation and commands. Existing authorization/version/catalog helpers reused.
create function private.validate_alumno() returns trigger
language plpgsql set search_path='' as $$
declare kind text;
begin
 if coalesce(length(btrim(new.apellido_paterno)),0)=0 or coalesce(length(btrim(new.apellido_materno)),0)=0 or coalesce(length(btrim(new.nombres)),0)=0 or coalesce(length(btrim(new.celular)),0)=0 or coalesce(length(btrim(new.domicilio)),0)=0 or new.fecha_nacimiento is null or new.nacimiento_departamento_id is null or new.nacimiento_provincia_id is null or new.nacimiento_distrito_id is null or new.domicilio_departamento_id is null or new.domicilio_provincia_id is null or new.domicilio_distrito_id is null then raise exception using errcode='23514',message='Complete los campos obligatorios del Alumno'; end if;
 if (tg_op='INSERT' or new.nacimiento_departamento_id is distinct from old.nacimiento_departamento_id) and not exists(select 1 from public.departamento where id=new.nacimiento_departamento_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.nacimiento_provincia_id is distinct from old.nacimiento_provincia_id) and not exists(select 1 from public.provincia where id=new.nacimiento_provincia_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.nacimiento_distrito_id is distinct from old.nacimiento_distrito_id) and not exists(select 1 from public.distrito where id=new.nacimiento_distrito_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.domicilio_departamento_id is distinct from old.domicilio_departamento_id) and not exists(select 1 from public.departamento where id=new.domicilio_departamento_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.domicilio_provincia_id is distinct from old.domicilio_provincia_id) and not exists(select 1 from public.provincia where id=new.domicilio_provincia_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
 if (tg_op='INSERT' or new.domicilio_distrito_id is distinct from old.domicilio_distrito_id) and not exists(select 1 from public.distrito where id=new.domicilio_distrito_id and active) then raise exception using errcode='23514',message='Referencia geográfica no válida o inactiva'; end if;
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
create trigger alumno_validate before insert or update on public.alumno for each row execute function private.validate_alumno();

-- Explicit minimization: PII values are compared in memory, never copied to audit.
create function private.audit_enrollment() returns trigger
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
  prev:=prev-'alumno_snapshot'; nextval:=nextval-'alumno_snapshot';
 end if;
 insert into public.auditoria(entidad,registro_id,accion,actor,motivo,old_values,new_values)
 values(tg_table_name,new.id,case when tg_op='INSERT' then 'CREATE' else 'UPDATE' end,auth.uid(),
 nullif(current_setting('perumar.audit_reason',true),''),prev,nextval);
 return null;
end; $$;
create trigger alumno_audit after insert or update on public.alumno for each row execute function private.audit_enrollment();
create trigger alumno_contacto_emergencia_audit after insert or update on public.alumno_contacto_emergencia for each row execute function private.audit_enrollment();
create trigger empresa_patrocinadora_audit after insert or update on public.empresa_patrocinadora for each row execute function private.audit_enrollment();
create trigger tarifa_audit after insert or update on public.tarifa for each row execute function private.audit_enrollment();
create trigger ciclo_tarifa_audit after insert or update on public.ciclo_tarifa for each row execute function private.audit_enrollment();
create trigger matricula_audit after insert or update on public.matricula for each row execute function private.audit_enrollment();
create trigger matricula_cargo_audit after insert or update on public.matricula_cargo for each row execute function private.audit_enrollment();
create function public.guardar_alumno(p jsonb) returns public.alumno
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.alumno; incoming public.alumno; clean jsonb; parent public.alumno; item jsonb; contact public.alumno_contacto_emergencia;
begin
 perform private.authorize(false);
 perform private.assert_fields(p-'contactos',array['id','expected_updated_at','apellido_paterno','apellido_materno','nombres','tipo_di_id','numero_di','fecha_nacimiento','sexo_id','estado_civil_id','nacimiento_departamento_id','nacimiento_provincia_id','nacimiento_distrito_id','celular','telefono_fijo','email','domicilio','numero_mz_lt','domicilio_departamento_id','domicilio_provincia_id','domicilio_distrito_id','grupo_sanguineo_id','grado_instruccion_id','color_ojos_id','color_cabello_id','estatura_cm','peso_kg','senas_particulares','ocupacion']);
 select jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end)
 into clean from jsonb_each(p-'contactos');
 clean:=clean||jsonb_build_object('numero_di',upper(clean->>'numero_di'));
 select * into incoming from jsonb_populate_record(null::public.alumno,clean);
 perform set_config('perumar.audit_reason','',true);
 if incoming.id is null then
 insert into public.alumno(apellido_paterno,apellido_materno,nombres,tipo_di_id,numero_di,fecha_nacimiento,sexo_id,estado_civil_id,nacimiento_departamento_id,nacimiento_provincia_id,nacimiento_distrito_id,celular,telefono_fijo,email,domicilio,numero_mz_lt,domicilio_departamento_id,domicilio_provincia_id,domicilio_distrito_id,grupo_sanguineo_id,grado_instruccion_id,color_ojos_id,color_cabello_id,estatura_cm,peso_kg,senas_particulares,ocupacion) values(incoming.apellido_paterno,incoming.apellido_materno,incoming.nombres,incoming.tipo_di_id,incoming.numero_di,incoming.fecha_nacimiento,incoming.sexo_id,incoming.estado_civil_id,incoming.nacimiento_departamento_id,incoming.nacimiento_provincia_id,incoming.nacimiento_distrito_id,incoming.celular,incoming.telefono_fijo,incoming.email,incoming.domicilio,incoming.numero_mz_lt,incoming.domicilio_departamento_id,incoming.domicilio_provincia_id,incoming.domicilio_distrito_id,incoming.grupo_sanguineo_id,incoming.grado_instruccion_id,incoming.color_ojos_id,incoming.color_cabello_id,incoming.estatura_cm,incoming.peso_kg,incoming.senas_particulares,incoming.ocupacion) returning * into result;
 else
 update public.alumno set apellido_paterno=incoming.apellido_paterno,apellido_materno=incoming.apellido_materno,nombres=incoming.nombres,tipo_di_id=incoming.tipo_di_id,numero_di=incoming.numero_di,fecha_nacimiento=incoming.fecha_nacimiento,sexo_id=incoming.sexo_id,estado_civil_id=incoming.estado_civil_id,nacimiento_departamento_id=incoming.nacimiento_departamento_id,nacimiento_provincia_id=incoming.nacimiento_provincia_id,nacimiento_distrito_id=incoming.nacimiento_distrito_id,celular=incoming.celular,telefono_fijo=incoming.telefono_fijo,email=incoming.email,domicilio=incoming.domicilio,numero_mz_lt=incoming.numero_mz_lt,domicilio_departamento_id=incoming.domicilio_departamento_id,domicilio_provincia_id=incoming.domicilio_provincia_id,domicilio_distrito_id=incoming.domicilio_distrito_id,grupo_sanguineo_id=incoming.grupo_sanguineo_id,grado_instruccion_id=incoming.grado_instruccion_id,color_ojos_id=incoming.color_ojos_id,color_cabello_id=incoming.color_cabello_id,estatura_cm=incoming.estatura_cm,peso_kg=incoming.peso_kg,senas_particulares=incoming.senas_particulares,ocupacion=incoming.ocupacion
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
create function public.guardar_empresa_patrocinadora(p jsonb) returns public.empresa_patrocinadora
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.empresa_patrocinadora; incoming public.empresa_patrocinadora; clean jsonb; parent public.alumno;
begin
 perform private.authorize(false);
 perform private.assert_fields(p,array['id','expected_updated_at','ruc','razon_social','persona_contacto','telefono','email']);
 select jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end)
 into clean from jsonb_each(p);
 select * into incoming from jsonb_populate_record(null::public.empresa_patrocinadora,clean);
 perform set_config('perumar.audit_reason','',true);
 if incoming.id is null then
 insert into public.empresa_patrocinadora(ruc,razon_social,persona_contacto,telefono,email) values(incoming.ruc,incoming.razon_social,incoming.persona_contacto,incoming.telefono,incoming.email) returning * into result;
 else
 update public.empresa_patrocinadora set ruc=incoming.ruc,razon_social=incoming.razon_social,persona_contacto=incoming.persona_contacto,telefono=incoming.telefono,email=incoming.email
 where id=incoming.id and updated_at=(p->>'expected_updated_at')::timestamptz returning * into result;
 if not found then perform private.require_version(null,(p->>'expected_updated_at')::timestamptz); end if;
 end if;
 return result;
end; $$;
create function public.guardar_contacto_emergencia(p jsonb) returns public.alumno_contacto_emergencia
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.alumno_contacto_emergencia; incoming public.alumno_contacto_emergencia; clean jsonb; parent public.alumno;
begin
 perform private.authorize(false);
 perform private.assert_fields(p,array['id','expected_updated_at','alumno_id','apellido','nombre','parentesco_id','celular','direccion','expected_alumno_updated_at']);
 select jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end)
 into clean from jsonb_each(p);
 select * into incoming from jsonb_populate_record(null::public.alumno_contacto_emergencia,clean);
 select * into parent from public.alumno where id=incoming.alumno_id for update;
 perform private.require_version(parent.updated_at,(p->>'expected_alumno_updated_at')::timestamptz);
 perform private.require_catalog(incoming.parentesco_id,'PARENTESCO');
 if incoming.id is not null and not exists(select 1 from public.alumno_contacto_emergencia where id=incoming.id and alumno_id=parent.id and activo) then raise exception using errcode='23514',message='Contacto no editable'; end if;
 update public.alumno set updated_at=clock_timestamp() where id=parent.id;
 perform set_config('perumar.audit_reason','',true);
 if incoming.id is null then
 insert into public.alumno_contacto_emergencia(alumno_id,apellido,nombre,parentesco_id,celular,direccion) values(incoming.alumno_id,incoming.apellido,incoming.nombre,incoming.parentesco_id,incoming.celular,incoming.direccion) returning * into result;
 else
 update public.alumno_contacto_emergencia set alumno_id=incoming.alumno_id,apellido=incoming.apellido,nombre=incoming.nombre,parentesco_id=incoming.parentesco_id,celular=incoming.celular,direccion=incoming.direccion
 where id=incoming.id and updated_at=(p->>'expected_updated_at')::timestamptz returning * into result;
 if not found then perform private.require_version(null,(p->>'expected_updated_at')::timestamptz); end if;
 end if;
 return result;
end; $$;
create function public.guardar_tarifa(p jsonb) returns public.tarifa
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.tarifa; incoming public.tarifa; clean jsonb; parent public.alumno;
begin
 perform private.authorize(true);
 perform private.assert_fields(p,array['id','expected_updated_at','codigo','nombre','descripcion','tipo','monto_por_defecto']);
 select jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end)
 into clean from jsonb_each(p);
 clean:=clean||jsonb_build_object('codigo',upper(clean->>'codigo'));
 if coalesce(clean->>'monto_por_defecto','') !~ '^[0-9]+([.][0-9]{1,2})?$' then raise exception using errcode='23514',message='Importe no válido'; end if;
 select * into incoming from jsonb_populate_record(null::public.tarifa,clean);
 perform set_config('perumar.audit_reason','',true);
 if incoming.id is null then
 insert into public.tarifa(codigo,nombre,descripcion,tipo,monto_por_defecto) values(incoming.codigo,incoming.nombre,incoming.descripcion,incoming.tipo,incoming.monto_por_defecto) returning * into result;
 else
 update public.tarifa set codigo=incoming.codigo,nombre=incoming.nombre,descripcion=incoming.descripcion,tipo=incoming.tipo,monto_por_defecto=incoming.monto_por_defecto
 where id=incoming.id and updated_at=(p->>'expected_updated_at')::timestamptz returning * into result;
 if not found then perform private.require_version(null,(p->>'expected_updated_at')::timestamptz); end if;
 end if;
 return result;
end; $$;
create function public.retirar_contacto_emergencia(id uuid,expected_alumno_updated_at timestamptz) returns public.alumno
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare parent public.alumno;
begin
 perform private.authorize(false);
 select a.* into parent from public.alumno a join public.alumno_contacto_emergencia c on c.alumno_id=a.id where c.id=retirar_contacto_emergencia.id for update of a;
 perform private.require_version(parent.updated_at,expected_alumno_updated_at);
 perform set_config('perumar.audit_reason','RETIRO_CONTACTO',true);
 update public.alumno_contacto_emergencia c set activo=false where c.id=retirar_contacto_emergencia.id and activo;
 if not found then raise exception using errcode='23514',message='Contacto no activo'; end if;
 update public.alumno set updated_at=clock_timestamp() where public.alumno.id=parent.id returning * into parent;
 return parent;
end; $$;
create function public.cambiar_activo_tarifa(id uuid,expected_updated_at timestamptz,activo boolean) returns public.tarifa
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.tarifa;
begin
 perform private.authorize(true);
 if activo is null then raise exception using errcode='22023',message='Estado requerido'; end if;
 perform set_config('perumar.audit_reason','',true);
 update public.tarifa t set activo=cambiar_activo_tarifa.activo where t.id=cambiar_activo_tarifa.id and t.updated_at=expected_updated_at returning * into result;
 if not found then perform private.require_version(null,expected_updated_at); end if;
 return result;
end; $$;
create function public.guardar_ciclo_tarifas(ciclo_id uuid,expected_updated_at timestamptz,configuracion jsonb) returns public.ciclo
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.ciclo; item jsonb; t public.tarifa;
begin
 perform private.authorize(true);
 select * into result from public.ciclo c where c.id=ciclo_id for update;
 perform private.require_version(result.updated_at,expected_updated_at);
 if result.estado_codigo not in ('PROGRAMADO','EN_CURSO') then raise exception using errcode='23514',message='Ciclo no editable'; end if;
 if jsonb_typeof(configuracion) is distinct from 'array' or exists(select 1 from jsonb_array_elements(configuracion) v group by v->>'tarifa_id' having count(*)>1) then raise exception using errcode='22023',message='Configuración no válida'; end if;
 perform set_config('perumar.audit_reason','CONFIGURACION_TARIFAS',true);
 update public.ciclo_tarifa ct set activo=false where ct.ciclo_id=guardar_ciclo_tarifas.ciclo_id;
 for item in select * from jsonb_array_elements(configuracion) loop
 perform private.assert_fields(item,array['tarifa_id','importe','obligatorio']);
 select * into t from public.tarifa where id=(item->>'tarifa_id')::uuid and activo for share;
 if t.id is null or coalesce(item->>'importe','') !~ '^[0-9]+([.][0-9]{1,2})?$' or coalesce(item->>'obligatorio','') not in ('true','false') then raise exception using errcode='23514',message='Tarifa o importe no válido'; end if;
 insert into public.ciclo_tarifa(ciclo_id,tarifa_id,importe,obligatorio) values(result.id,t.id,(item->>'importe')::numeric,(item->>'obligatorio')::boolean)
 on conflict on constraint ciclo_tarifa_ciclo_id_tarifa_id_key do update set importe=excluded.importe,obligatorio=excluded.obligatorio,activo=true;
 end loop;
 update public.ciclo set updated_at=clock_timestamp() where public.ciclo.id=result.id returning * into result;
 return result;
end; $$;

-- Snapshot helper is shared validation/serialization at registration, not a public API.
create function private.enrollment_snapshot(subject uuid) returns jsonb
language plpgsql set search_path='' as $$
declare a public.alumno; refs jsonb:='{}'; pair record; contacts jsonb;
begin
 select * into a from public.alumno where id=subject;
 if a.id is null or a.apellido_paterno is null or a.apellido_materno is null or a.nombres is null or a.numero_di is null or a.fecha_nacimiento is null or a.celular is null or a.domicilio is null then raise exception using errcode='23514',message='Complete la ficha del Alumno'; end if;
 for pair in select * from (values
 ('TIPO_DI',a.tipo_di_id),('SEXO',a.sexo_id),('ESTADO_CIVIL',a.estado_civil_id),('GRUPO_SANGUINEO',a.grupo_sanguineo_id),
 ('GRADO_INSTRUCCION',a.grado_instruccion_id),('COLOR_OJOS',a.color_ojos_id),('COLOR_CABELLO',a.color_cabello_id)) x(code,id) loop
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

-- One bounded charge operation shared by create/edit; no table/actor/SQL arguments.
create function private.apply_enrollment_charges(enrollment uuid,cycle uuid,options uuid[],cycle_change boolean) returns void
language plpgsql set search_path='' as $$
declare ct record; initial_set boolean;
begin
 initial_set:=cycle_change or not exists(select 1 from public.matricula_cargo where matricula_id=enrollment);
 if options is null or (select count(distinct x) from unnest(options) x)<>cardinality(options)
 or exists(select 1 from unnest(options) x left join public.ciclo_tarifa c on c.id=x left join public.tarifa t on t.id=c.tarifa_id where c.id is null or c.ciclo_id<>cycle or not c.activo or not t.activo or c.obligatorio)
 then raise exception using errcode='23514',message='Selección opcional no válida'; end if;
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

create function public.registrar_matricula(p jsonb,opcionales uuid[] default '{}') returns public.matricula
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare c public.ciclo; a public.alumno; result public.matricula; shot jsonb; y integer; s text; n bigint; generated text; discount numeric;
begin
 perform private.authorize(false);
 perform private.assert_fields(p,array['alumno_id','expected_alumno_updated_at','ciclo_id','expected_ciclo_updated_at','empresa_patrocinadora_id','codigo_matricula','descuento','motivo_descuento']);
 select * into c from public.ciclo where id=(p->>'ciclo_id')::uuid for update;
 perform private.require_version(c.updated_at,(p->>'expected_ciclo_updated_at')::timestamptz);
 if c.estado_codigo not in ('PROGRAMADO','EN_CURSO') then raise exception using errcode='23514',message='Ciclo no elegible'; end if;
 select * into a from public.alumno where id=(p->>'alumno_id')::uuid for update;
 perform private.require_version(a.updated_at,(p->>'expected_alumno_updated_at')::timestamptz);
 shot:=private.enrollment_snapshot(a.id);
 if coalesce(p->>'descuento','0') !~ '^[0-9]+([.][0-9]{1,2})?$' then raise exception using errcode='23514',message='Descuento no válido'; end if;
 discount:=coalesce(p->>'descuento','0')::numeric;
 if discount>0 then perform private.authorize(true); end if;
 y:=extract(year from clock_timestamp() at time zone 'America/Lima');
 select sigla into s from public.carrera where id=c.carrera_id for share;
 loop
 insert into private.matricula_correlativo(anio,sigla,ultimo) values(y,s,1)
 on conflict(anio,sigla) do update set ultimo=private.matricula_correlativo.ultimo+1 returning ultimo into n;
 generated:=y::text||'-'||s||'-'||lpad(n::text,greatest(3,length(n::text)),'0');
 exit when not exists(select 1 from public.matricula where codigo_matricula=generated);
 end loop;
 perform set_config('perumar.audit_reason','REGISTRO_MATRICULA',true);
 insert into public.matricula(alumno_id,ciclo_id,empresa_patrocinadora_id,codigo_matricula,codigo_generado_original,anio_generacion,sigla_generacion,correlativo,alumno_snapshot)
 values(a.id,c.id,nullif(p->>'empresa_patrocinadora_id','')::uuid,coalesce(nullif(upper(btrim(p->>'codigo_matricula')),''),generated),generated,y,s,n,shot) returning * into result;
 perform private.apply_enrollment_charges(result.id,c.id,opcionales,false);
 if discount>0 then
 perform set_config('perumar.audit_reason',p->>'motivo_descuento',true);
 update public.matricula_cargo set descuento=discount,motivo_descuento=nullif(btrim(p->>'motivo_descuento'),'') where matricula_id=result.id and activo and tipo='CARRERA';
 end if;
 return result;
end; $$;

create function public.editar_matricula(p jsonb,opcionales uuid[] default null) returns public.matricula
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.matricula; previous public.matricula; target uuid; current_state text; target_state text; discount numeric;
begin
 perform private.authorize(false);
 perform private.assert_fields(p,array['id','expected_updated_at','ciclo_id','expected_ciclo_updated_at','empresa_patrocinadora_id','codigo_matricula','descuento','motivo_descuento']);
 select * into previous from public.matricula where id=(p->>'id')::uuid;
 target:=coalesce((p->>'ciclo_id')::uuid,previous.ciclo_id);
 perform 1 from public.ciclo where id in(previous.ciclo_id,target) order by id for update;
 perform 1 from public.alumno where id=previous.alumno_id for update;
 select * into result from public.matricula where id=previous.id for update;
 perform private.require_version(result.updated_at,(p->>'expected_updated_at')::timestamptz);
 select estado_codigo into current_state from public.ciclo where id=result.ciclo_id;
 select estado_codigo into target_state from public.ciclo where id=target;
 if result.estado_codigo<>'ACTIVO' or current_state not in ('PROGRAMADO','EN_CURSO') or target_state is null or target_state not in ('PROGRAMADO','EN_CURSO') then raise exception using errcode='23514',message='Matrícula o Ciclo no editable'; end if;
 if target<>result.ciclo_id or opcionales is not null then
 perform private.require_version((select updated_at from public.ciclo where id=target),(p->>'expected_ciclo_updated_at')::timestamptz);
 end if;
 if target<>result.ciclo_id and (p ? 'descuento' or p ? 'motivo_descuento') then raise exception using errcode='42501',message='Cambio de Ciclo no admite descuento'; end if;
 if p ? 'descuento' or p ? 'motivo_descuento' then
 perform private.authorize(true);
 if coalesce(p->>'descuento','') !~ '^[0-9]+([.][0-9]{1,2})?$' then raise exception using errcode='23514',message='Descuento no válido'; end if;
 discount:=(p->>'descuento')::numeric;
 end if;
 perform set_config('perumar.audit_reason',case when target<>result.ciclo_id then 'CAMBIO_CICLO' else 'EDICION_MATRICULA' end,true);
 update public.matricula set ciclo_id=target,
 empresa_patrocinadora_id=case when p ? 'empresa_patrocinadora_id' then nullif(p->>'empresa_patrocinadora_id','')::uuid else result.empresa_patrocinadora_id end,
 codigo_matricula=case when p ? 'codigo_matricula' then upper(btrim(p->>'codigo_matricula')) else result.codigo_matricula end
 where id=result.id returning * into result;
 if target<>previous.ciclo_id or opcionales is not null then
 perform private.apply_enrollment_charges(result.id,target,coalesce(opcionales,'{}'),target<>previous.ciclo_id);
 end if;
 if discount is not null then
 perform set_config('perumar.audit_reason',coalesce(p->>'motivo_descuento',''),true);
 update public.matricula_cargo set descuento=discount,motivo_descuento=nullif(btrim(p->>'motivo_descuento'),'') where matricula_id=result.id and activo and tipo='CARRERA';
 end if;
 return result;
end; $$;

create function public.anular_matricula(id uuid,expected_updated_at timestamptz,motivo text) returns public.matricula
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.matricula; c uuid; a uuid;
begin
 perform private.authorize(false);
 if coalesce(length(btrim(motivo)),0)=0 or length(motivo)>500 then raise exception using errcode='23514',message='Motivo obligatorio'; end if;
 select ciclo_id,alumno_id into c,a from public.matricula m where m.id=anular_matricula.id;
 perform 1 from public.ciclo where public.ciclo.id=c for update;
 perform 1 from public.alumno where public.alumno.id=a for update;
 perform set_config('perumar.audit_reason',btrim(motivo),true);
 update public.matricula m set estado_codigo='ANULADO',motivo_anulacion=btrim(motivo),anulado_por=auth.uid(),anulado_at=clock_timestamp()
 where m.id=anular_matricula.id and m.updated_at=expected_updated_at and m.estado_codigo='ACTIVO' returning * into result;
 if not found then perform private.require_version(null,expected_updated_at); end if;
 return result;
end; $$;

-- DB guards close internal accidental rewrites, including indirect H2 commands.
create function private.guard_enrollment_history() returns trigger
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
 if exists(select 1 from public.matricula where ciclo_id=new.ciclo_id and estado_codigo='ACTIVO') then raise exception using errcode='23514',message='Materias de Ciclo con matrícula activa no editables'; end if;
 end if;
 return new;
end; $$;
create trigger matricula_history before update on public.matricula for each row execute function private.guard_enrollment_history();
create trigger cargo_history before update on public.matricula_cargo for each row execute function private.guard_enrollment_history();
create trigger ciclo_enrollment_guard before update on public.ciclo for each row execute function private.guard_enrollment_history();
create trigger ciclo_materia_enrollment_guard before insert or update on public.ciclo_materia for each row execute function private.guard_enrollment_history();

revoke all on function public.guardar_alumno(jsonb) from public,anon,authenticated;
grant execute on function public.guardar_alumno(jsonb) to authenticated;
revoke all on function public.guardar_empresa_patrocinadora(jsonb) from public,anon,authenticated;
grant execute on function public.guardar_empresa_patrocinadora(jsonb) to authenticated;
revoke all on function public.guardar_contacto_emergencia(jsonb) from public,anon,authenticated;
grant execute on function public.guardar_contacto_emergencia(jsonb) to authenticated;
revoke all on function public.retirar_contacto_emergencia(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.retirar_contacto_emergencia(uuid,timestamptz) to authenticated;
revoke all on function public.guardar_tarifa(jsonb) from public,anon,authenticated;
grant execute on function public.guardar_tarifa(jsonb) to authenticated;
revoke all on function public.cambiar_activo_tarifa(uuid,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.cambiar_activo_tarifa(uuid,timestamptz,boolean) to authenticated;
revoke all on function public.guardar_ciclo_tarifas(uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.guardar_ciclo_tarifas(uuid,timestamptz,jsonb) to authenticated;
revoke all on function public.registrar_matricula(jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.registrar_matricula(jsonb,uuid[]) to authenticated;
revoke all on function public.editar_matricula(jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.editar_matricula(jsonb,uuid[]) to authenticated;
revoke all on function public.anular_matricula(uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.anular_matricula(uuid,timestamptz,text) to authenticated;
revoke all on function private.validate_alumno() from public,anon,authenticated;
revoke all on function private.audit_enrollment() from public,anon,authenticated;
revoke all on function private.enrollment_snapshot(uuid) from public,anon,authenticated;
revoke all on function private.apply_enrollment_charges(uuid,uuid,uuid[],boolean) from public,anon,authenticated;
revoke all on function private.guard_enrollment_history() from public,anon,authenticated;
notify pgrst,'reload schema';
