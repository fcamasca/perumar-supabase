-- H6 block 2: persistent private bytes and closed reservation/confirmation contracts.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('h6-expediente','h6-expediente',false,5242880,array['application/pdf','image/jpeg','image/png']);

create function public.preparar_archivo_expediente(p_actor uuid,p_documento_id uuid,p_expected_updated_at timestamptz,p_plantilla_version text default null,p_datos_generacion jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.matricula_documento; m public.matricula; c public.ciclo; f public.matricula_documento_archivo; previous public.matricula; source_payload jsonb; base_fp text; normalized jsonb:='{}'; kind text; label text; full_hash text; prior text;
begin
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id join public.app_roles r on r.code=ur.role_code where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 select mx.* into previous from public.matricula mx join public.matricula_documento dx on dx.matricula_id=mx.id where dx.id=p_documento_id;
 select * into c from public.ciclo where id=previous.ciclo_id for share;
 perform 1 from public.alumno where id=previous.alumno_id for share;
 select * into m from public.matricula where id=previous.id for update;
 select * into d from public.matricula_documento where id=p_documento_id for update;
 if d.id is null or m.ciclo_id is distinct from previous.ciclo_id then raise exception using errcode='PT409',message='DOCUMENT_CONTEXT_CHANGED'; end if;
 perform private.require_version(d.updated_at,p_expected_updated_at);
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id join public.app_roles r on r.code=ur.role_code where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 if m.estado_codigo<>'ACTIVO' or c.estado_codigo not in ('PROGRAMADO','EN_CURSO','CERRADO') or not d.contexto_vigente or not d.activo then raise exception using errcode='PT409',message='DOCUMENT_STATE'; end if;
 if jsonb_typeof(p_datos_generacion) is distinct from 'object' then raise exception using errcode='22023',message='DOCUMENT_INPUT'; end if;
 if d.origen='GENERADO' then
  if coalesce(length(p_plantilla_version),0) not between 1 and 80 then raise exception using errcode='22023',message='DOCUMENT_TEMPLATE'; end if;
  if d.codigo='CARTA_PODER' then
   perform private.assert_fields(p_datos_generacion,array['apoderado_nombre','apoderado_tipo_di_id','apoderado_numero_di']);
   if coalesce(length(btrim(p_datos_generacion->>'apoderado_nombre')),0) not between 1 and 150 or p_datos_generacion->>'apoderado_nombre' ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='DOCUMENT_REPRESENTATIVE_REQUIRED'; end if;
   perform private.require_catalog((p_datos_generacion->>'apoderado_tipo_di_id')::uuid,'TIPO_DI');
   select codigo,nombre into kind,label from public.catalogo_valor where id=(p_datos_generacion->>'apoderado_tipo_di_id')::uuid for share;
   if kind='DNI' and coalesce(p_datos_generacion->>'apoderado_numero_di','') !~ '^[0-9]{8}$' or kind='CARNET_EXTRANJERIA' and coalesce(upper(p_datos_generacion->>'apoderado_numero_di'),'') !~ '^[A-Z0-9]{1,30}$' or kind not in ('DNI','CARNET_EXTRANJERIA') then raise exception using errcode='22023',message='DOCUMENT_REPRESENTATIVE_REQUIRED'; end if;
   normalized:=jsonb_build_object('apoderado_nombre',upper(btrim(p_datos_generacion->>'apoderado_nombre')),'apoderado_tipo_di_id',p_datos_generacion->>'apoderado_tipo_di_id','apoderado_numero_di',upper(p_datos_generacion->>'apoderado_numero_di'),'apoderado_tipo_di_codigo',kind,'apoderado_tipo_di_etiqueta',label);
  elsif p_datos_generacion<>'{}'::jsonb then raise exception using errcode='22023',message='DOCUMENT_INPUT'; end if;
  select source,source_fingerprint into source_payload,base_fp from public.matricula_ficha_fuente where id=m.id;
  if source_payload->'datos_ficha' is null or source_payload->'datos_ficha'='null'::jsonb then raise exception using errcode='PT409',message='DOCUMENT_SNAPSHOT'; end if;
  normalized:=normalized||jsonb_build_object('capitania_nombre',(select nombre from public.capitania where id=c.capitania_id));
  full_hash:=encode(sha256(convert_to(jsonb_build_object('source',source_payload,'contexto_id',d.contexto_id,'codigo',d.codigo,'plantilla',p_plantilla_version,'datos',normalized)::text,'UTF8')),'hex');
 elsif p_plantilla_version is not null or p_datos_generacion<>'{}'::jsonb then raise exception using errcode='22023',message='DOCUMENT_INPUT'; end if;
 if exists(select 1 from public.matricula_documento_archivo where matricula_documento_id=d.id and estado_tecnico='PREPARADO') then raise exception using errcode='PT409',message='DOCUMENT_RESERVATION_EXISTS'; end if;
 prior:=current_setting('perumar.document_command',true);perform set_config('perumar.document_command','RESERVE',true);
 insert into public.matricula_documento_archivo(matricula_documento_id,object_key,iniciado_por,plantilla_version,fuente_fingerprint,fuente_base_fingerprint,fecha_generacion,datos_generacion,version_esperada_documento)
 values(d.id,d.id::text||'/'||gen_random_uuid()::text,p_actor,p_plantilla_version,full_hash,case when d.origen='GENERADO' then base_fp end,
 case when d.origen='GENERADO' then clock_timestamp() end,normalized,d.updated_at) returning * into f;
 perform set_config('perumar.document_command',coalesce(prior,''),true);
 return to_jsonb(f)||jsonb_build_object('codigo',d.codigo,'origen',d.origen,'source',case when d.origen='GENERADO' then source_payload||jsonb_build_object('updated_at',m.updated_at,'source_fingerprint',base_fp) end);
end $$;

create function public.confirmar_archivo_expediente(p_actor uuid,p_archivo_id uuid,p_mime text,p_bytes integer,p_sha256 text) returns public.matricula_documento_archivo
language plpgsql security definer set search_path='' as $$
declare d public.matricula_documento; m public.matricula; c public.ciclo; f public.matricula_documento_archivo; previous public.matricula; base text; prior text; prior_actor text;
begin
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id join public.app_roles r on r.code=ur.role_code where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 select mx.* into previous from public.matricula mx join public.matricula_documento dx on dx.matricula_id=mx.id join public.matricula_documento_archivo fx on fx.matricula_documento_id=dx.id where fx.id=p_archivo_id;
 select * into c from public.ciclo where id=previous.ciclo_id for share;perform 1 from public.alumno where id=previous.alumno_id for share;
 select * into m from public.matricula where id=previous.id for update;
 select dx.* into d from public.matricula_documento dx join public.matricula_documento_archivo fx on fx.matricula_documento_id=dx.id where fx.id=p_archivo_id for update of dx;
 select * into f from public.matricula_documento_archivo where id=p_archivo_id for update;
 if f.id is null or f.iniciado_por<>p_actor then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id join public.app_roles r on r.code=ur.role_code where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 if f.estado_tecnico='CONFIRMADO' then
  if f.mime is distinct from p_mime or f.bytes is distinct from p_bytes or f.sha256 is distinct from p_sha256 then raise exception using errcode='PT409',message='DOCUMENT_OPERATION_CONFLICT'; end if;
  return f;
 end if;
 if m.ciclo_id is distinct from previous.ciclo_id or m.estado_codigo<>'ACTIVO' or c.estado_codigo not in ('PROGRAMADO','EN_CURSO','CERRADO') or not d.contexto_vigente or not d.activo or f.estado_tecnico<>'PREPARADO' or f.iniciado_at<clock_timestamp()-interval '5 minutes' then raise exception using errcode='PT409',message='DOCUMENT_STATE'; end if;
 perform private.require_version(d.updated_at,f.version_esperada_documento);
 if p_mime is null or p_mime not in ('application/pdf','image/jpeg','image/png') or p_bytes is null or p_bytes not between 1 and 5242880 or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' or (d.codigo='FOTO_PASAPORTE' and p_mime='application/pdf') or (d.origen='GENERADO' and (p_mime<>'application/pdf' or p_bytes>2097152)) then raise exception using errcode='22023',message='DOCUMENT_FILE_INVALID'; end if;
 if d.origen='GENERADO' then
  select source_fingerprint into base from public.matricula_ficha_fuente where id=m.id;
  if base is distinct from f.fuente_base_fingerprint or (select nombre from public.capitania where id=c.capitania_id) is distinct from f.datos_generacion->>'capitania_nombre' then raise exception using errcode='PT409',message='DOCUMENT_SOURCE_CHANGED'; end if;
  if d.codigo='CARTA_PODER' and not exists(select 1 from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where v.id=(f.datos_generacion->>'apoderado_tipo_di_id')::uuid and v.activo and cat.activo and cat.codigo='TIPO_DI' and v.nombre=f.datos_generacion->>'apoderado_tipo_di_etiqueta' and v.codigo=f.datos_generacion->>'apoderado_tipo_di_codigo') then raise exception using errcode='PT409',message='DOCUMENT_SOURCE_CHANGED'; end if;
 end if;
 prior_actor:=current_setting('request.jwt.claim.sub',true);perform set_config('request.jwt.claim.sub',p_actor::text,true);
 prior:=current_setting('perumar.document_command',true);perform set_config('perumar.document_command','CONFIRM',true);
 update public.matricula_documento_archivo set estado_tecnico='CONFIRMADO',confirmado_por=p_actor,confirmado_at=clock_timestamp(),mime=p_mime,bytes=p_bytes,sha256=p_sha256 where id=f.id returning * into f;
 update public.matricula_documento set estado=case when origen='SUBIDO' then 'CARGADO' else 'GENERADO' end,ultimo_archivo_confirmado_id=f.id where id=d.id;
 perform set_config('perumar.document_command',coalesce(prior,''),true);perform set_config('request.jwt.claim.sub',coalesce(prior_actor,''),true);return f;
end $$;

-- Compensates only a NEVER-confirmed reservation; not a business-state mutation or deletion.
create function public.abortar_reserva_expediente(p_actor uuid,p_archivo_id uuid) returns public.matricula_documento_archivo
language plpgsql security definer set search_path='' as $$
declare f public.matricula_documento_archivo; m public.matricula; d public.matricula_documento; prior text;
begin
 select mx.* into m from public.matricula mx join public.matricula_documento dx on dx.matricula_id=mx.id join public.matricula_documento_archivo fx on fx.matricula_documento_id=dx.id where fx.id=p_archivo_id;
 perform 1 from public.ciclo where id=m.ciclo_id for share;perform 1 from public.alumno where id=m.alumno_id for share;perform 1 from public.matricula where id=m.id and ciclo_id=m.ciclo_id for update;
 if not found then raise exception using errcode='PT409',message='DOCUMENT_CONTEXT_CHANGED'; end if;
 select dx.* into d from public.matricula_documento dx join public.matricula_documento_archivo fx on fx.matricula_documento_id=dx.id where fx.id=p_archivo_id for update of dx;
 select * into f from public.matricula_documento_archivo where id=p_archivo_id for update;
 if f.id is null or f.iniciado_por is distinct from p_actor then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 if f.estado_tecnico='CONFIRMADO' then raise exception using errcode='PT409',message='DOCUMENT_ALREADY_CONFIRMED'; end if;
 if f.estado_tecnico='ABORTADO' then return f; end if;
 prior:=current_setting('perumar.document_command',true);perform set_config('perumar.document_command','ABORT',true);
 update public.matricula_documento_archivo set estado_tecnico='ABORTADO' where id=f.id returning * into f;
 perform set_config('perumar.document_command',coalesce(prior,''),true);return f;
end $$;

create function public.registrar_descarga_expediente(p_actor uuid,p_documento_id uuid,p_archivo_id uuid,p_historico boolean,p_template_version text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.matricula_documento_archivo; d public.matricula_documento; m public.matricula; c public.ciclo; previous public.matricula; base text; historical boolean;
begin
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id join public.app_roles r on r.code=ur.role_code where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 select mx.* into previous from public.matricula mx join public.matricula_documento dx on dx.matricula_id=mx.id where dx.id=p_documento_id;
 select * into c from public.ciclo where id=previous.ciclo_id for share;perform 1 from public.alumno where id=previous.alumno_id for share;select * into m from public.matricula where id=previous.id for share;
 if m.ciclo_id is distinct from previous.ciclo_id then raise exception using errcode='PT409',message='DOCUMENT_CONTEXT_CHANGED'; end if;
 select * into d from public.matricula_documento where id=p_documento_id for share;
 select * into f from public.matricula_documento_archivo where id=p_archivo_id and matricula_documento_id=d.id for share;
 if f.id is null or f.estado_tecnico<>'CONFIRMADO' then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id join public.app_roles r on r.code=ur.role_code where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
 historical:=not d.contexto_vigente or not d.activo or m.estado_codigo<>'ACTIVO' or c.estado_codigo not in ('PROGRAMADO','EN_CURSO','CERRADO') or f.id is distinct from d.ultimo_archivo_confirmado_id;
 if not historical and d.origen='GENERADO' then
  select source_fingerprint into base from public.matricula_ficha_fuente where id=m.id;
  historical:=base is distinct from f.fuente_base_fingerprint or f.plantilla_version is distinct from p_template_version or (select nombre from public.capitania where id=c.capitania_id) is distinct from f.datos_generacion->>'capitania_nombre';
  if d.codigo='CARTA_PODER' and not exists(select 1 from public.catalogo_valor where id=(f.datos_generacion->>'apoderado_tipo_di_id')::uuid and nombre=f.datos_generacion->>'apoderado_tipo_di_etiqueta' and codigo=f.datos_generacion->>'apoderado_tipo_di_codigo') then historical:=true; end if;
 end if;
 if historical and not coalesce(p_historico,false) then raise exception using errcode='PT409',message='DOCUMENT_HISTORY_REQUIRED'; end if;
 insert into public.auditoria(entidad,registro_id,accion,actor,new_values) values('matricula_documento_archivo',f.id,'DOCUMENTO_DESCARGA_INICIADA',p_actor,jsonb_build_object('documento_id',d.id,'archivo_id',f.id,'historico',historical));
 return to_jsonb(f)||jsonb_build_object('historico',historical);
end $$;
revoke all on function public.preparar_archivo_expediente(uuid,uuid,timestamptz,text,jsonb),public.confirmar_archivo_expediente(uuid,uuid,text,integer,text),public.abortar_reserva_expediente(uuid,uuid),public.registrar_descarga_expediente(uuid,uuid,uuid,boolean,text) from public,anon,authenticated,service_role;
grant execute on function public.preparar_archivo_expediente(uuid,uuid,timestamptz,text,jsonb),public.confirmar_archivo_expediente(uuid,uuid,text,integer,text),public.abortar_reserva_expediente(uuid,uuid),public.registrar_descarga_expediente(uuid,uuid,uuid,boolean,text) to service_role;
