-- H6 block 1: purpose-specific commands. No arbitrary table/path/state/actor from React.
create function public.guardar_tipo_documento(p jsonb) returns public.tipo_documento
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.tipo_documento; prior text;
begin
 perform private.authorize(false);
 perform private.assert_fields(p,array['id','expected_updated_at','codigo','nombre','descripcion','origen','activo']);
 if coalesce(p->>'activo','true') not in ('true','false') then raise exception using errcode='22023',message='DOCUMENT_INPUT'; end if;
 prior:=current_setting('perumar.document_command',true);perform set_config('perumar.document_command','TYPE',true);
 if nullif(p->>'id','') is null then
  insert into public.tipo_documento(codigo,nombre,descripcion,origen,activo)
  values(upper(btrim(p->>'codigo')),upper(btrim(p->>'nombre')),nullif(btrim(p->>'descripcion'),''),p->>'origen',coalesce((p->>'activo')::boolean,true)) returning * into r;
 else
  select * into r from public.tipo_documento where id=(p->>'id')::uuid for update;
  perform private.require_version(r.updated_at,(p->>'expected_updated_at')::timestamptz);perform private.authorize(false);
  update public.tipo_documento set codigo=case when p?'codigo' then upper(btrim(p->>'codigo')) else r.codigo end,
  nombre=case when p?'nombre' then upper(btrim(p->>'nombre')) else r.nombre end,descripcion=case when p?'descripcion' then nullif(btrim(p->>'descripcion'),'') else r.descripcion end,
  origen=coalesce(p->>'origen',r.origen),activo=coalesce((p->>'activo')::boolean,r.activo) where id=r.id returning * into r;
 end if;
 perform set_config('perumar.document_command',coalesce(prior,''),true);return r;
end $$;

create function public.guardar_documentos_ciclo(p_ciclo_id uuid,p_expected_updated_at timestamptz,p_expected_config jsonb,p_documentos jsonb) returns jsonb
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare c public.ciclo; item jsonb; actual jsonb; expected jsonb; conf public.ciclo_documento; m public.matricula; t public.tipo_documento; seen uuid[]:='{}';reactivated uuid[]:='{}';prior text;
begin
 perform private.authorize(false);
 if jsonb_typeof(p_expected_config) is distinct from 'array' or jsonb_typeof(p_documentos) is distinct from 'array' then raise exception using errcode='22023',message='DOCUMENT_INPUT'; end if;
 select * into c from public.ciclo where id=p_ciclo_id for update;
 perform private.require_version(c.updated_at,p_expected_updated_at);
 if c.estado_codigo not in ('PROGRAMADO','EN_CURSO','CERRADO') then raise exception using errcode='23514',message='DOCUMENT_STATE'; end if;
 perform 1 from public.alumno a where a.id in(select alumno_id from public.matricula where ciclo_id=c.id and estado_codigo='ACTIVO') order by a.id for update;
 perform 1 from public.matricula where ciclo_id=c.id and estado_codigo='ACTIVO' order by id for update;
 perform 1 from public.ciclo_documento where ciclo_id=c.id order by id for update;
 perform private.authorize(false);
 for item in select value from jsonb_array_elements(p_expected_config) loop perform private.assert_fields(item,array['id','updated_at']); end loop;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'updated_at',updated_at) order by id),'[]') into actual from public.ciclo_documento where ciclo_id=c.id;
 select coalesce(jsonb_agg(jsonb_build_object('id',(x->>'id')::uuid,'updated_at',(x->>'updated_at')::timestamptz) order by (x->>'id')::uuid),'[]') into expected from jsonb_array_elements(p_expected_config) x;
 if actual is distinct from expected then raise exception using errcode='PT409',message='DOCUMENT_CONFIG_CHANGED'; end if;
 prior:=current_setting('perumar.document_command',true);perform set_config('perumar.document_command','CONFIG',true);
 -- Lock all referenced types in UUID order before changing configuration.
 perform 1 from public.tipo_documento where id in(select (x->>'tipo_documento_id')::uuid from jsonb_array_elements(p_documentos) x) order by id for share;
 for item in select value from jsonb_array_elements(p_documentos) loop
  perform private.assert_fields(item,array['tipo_documento_id','obligatorio','activo']);
  if coalesce(item->>'obligatorio','') not in ('true','false') or coalesce(item->>'activo','') not in ('true','false') then raise exception using errcode='22023',message='DOCUMENT_INPUT'; end if;
  select * into t from public.tipo_documento where id=(item->>'tipo_documento_id')::uuid;
  if t.id is null or (item->>'activo')::boolean and not t.activo or t.id=any(seen) then raise exception using errcode='23514',message='DOCUMENT_TYPE_INVALID'; end if;
  seen:=array_append(seen,t.id);
  select * into conf from public.ciclo_documento where ciclo_id=c.id and tipo_documento_id=t.id;
  if conf.id is null then
   insert into public.ciclo_documento(ciclo_id,tipo_documento_id,obligatorio,activo) values(c.id,t.id,(item->>'obligatorio')::boolean,(item->>'activo')::boolean);
  else
   if not conf.activo and (item->>'activo')::boolean then reactivated:=array_append(reactivated,conf.id); end if;
   if conf.activo is distinct from (item->>'activo')::boolean or conf.obligatorio is distinct from (item->>'obligatorio')::boolean then
    update public.ciclo_documento set activo=(item->>'activo')::boolean,obligatorio=(item->>'obligatorio')::boolean where id=conf.id;
   end if;
  end if;
 end loop;
 update public.ciclo_documento set activo=false where ciclo_id=c.id and activo and not(tipo_documento_id=any(seen));
 for m in select * from public.matricula where ciclo_id=c.id and estado_codigo='ACTIVO' order by id loop perform private.sync_document_context(m.id,false,reactivated); end loop;
 perform set_config('perumar.document_command',coalesce(prior,''),true);
 return jsonb_build_object('ciclo_id',c.id,'documentos',(select coalesce(jsonb_agg(to_jsonb(d) order by id),'[]') from public.ciclo_documento d where ciclo_id=c.id));
end $$;

create function public.regularizar_expedientes_ciclo(p_ciclo_id uuid,p_expected_updated_at timestamptz,p_expected_config jsonb) returns jsonb
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare c public.ciclo; items jsonb; r jsonb;
begin
 perform private.authorize(false);
 select * into c from public.ciclo where id=p_ciclo_id for update;
 perform private.require_version(c.updated_at,p_expected_updated_at);
 select coalesce(jsonb_agg(jsonb_build_object('tipo_documento_id',tipo_documento_id::text,'obligatorio',obligatorio::text,'activo',activo::text) order by id),'[]') into items from public.ciclo_documento where ciclo_id=c.id;
 r:=public.guardar_documentos_ciclo(c.id,c.updated_at,p_expected_config,items);
 insert into public.auditoria(entidad,registro_id,accion,actor,new_values) values('ciclo',c.id,'EXPEDIENTES_REGULARIZADOS',auth.uid(),jsonb_build_object('ciclo_id',c.id));
 return r;
end $$;

create function public.retirar_documentos_opcionales(p_ciclo_id uuid,p_documentos jsonb,p_motivo text) returns integer
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare item jsonb; d public.matricula_documento; m public.matricula; c public.ciclo; ids uuid[]:='{}'; config uuid; prior text;
begin
 perform private.authorize(false);
 if jsonb_typeof(p_documentos) is distinct from 'array' or jsonb_array_length(p_documentos) not between 1 and 50 or coalesce(length(btrim(p_motivo)),0) not between 1 and 500 then raise exception using errcode='22023',message='DOCUMENT_INPUT'; end if;
 select * into c from public.ciclo where id=p_ciclo_id for update;
 if c.id is null or c.estado_codigo not in ('PROGRAMADO','EN_CURSO','CERRADO') then raise exception using errcode='23514',message='DOCUMENT_STATE'; end if;
 for item in select value from jsonb_array_elements(p_documentos) loop
  perform private.assert_fields(item,array['id','expected_updated_at']);
  if (item->>'id')::uuid=any(ids) then raise exception using errcode='22023',message='DOCUMENT_DUPLICATE'; end if;
  ids:=array_append(ids,(item->>'id')::uuid);
 end loop;
 if (select count(*) from public.matricula_documento dx join public.matricula mx on mx.id=dx.matricula_id where dx.id=any(ids) and mx.ciclo_id=c.id)<>cardinality(ids) then raise exception using errcode='23514',message='DOCUMENT_CONTEXT_INVALID'; end if;
 perform 1 from public.alumno a where a.id in(select mx.alumno_id from public.matricula mx join public.matricula_documento x on x.matricula_id=mx.id where x.id=any(ids)) order by a.id for update;
 perform 1 from public.matricula where id in(select matricula_id from public.matricula_documento where id=any(ids)) order by id for update;
 perform 1 from public.matricula_documento where id=any(ids) order by id for update;
 perform private.authorize(false);
 prior:=current_setting('perumar.document_command',true);perform set_config('perumar.document_command','RETIRE',true);
 for item in select value from jsonb_array_elements(p_documentos) loop
  select * into d from public.matricula_documento where id=(item->>'id')::uuid;
  perform private.require_version(d.updated_at,(item->>'expected_updated_at')::timestamptz);
  select * into m from public.matricula where id=d.matricula_id;
  if m.ciclo_id<>c.id or m.estado_codigo<>'ACTIVO' or not d.contexto_vigente or not d.activo or d.obligatorio or (config is not null and config<>d.ciclo_documento_id) then raise exception using errcode='23514',message='DOCUMENT_NOT_OPTIONAL'; end if;
  config:=d.ciclo_documento_id;
  update public.matricula_documento set activo=false,inactivado_por=auth.uid(),inactivado_at=clock_timestamp(),causa_inactivacion='RETIRO_INDIVIDUAL',motivo_retiro=btrim(p_motivo) where id=d.id;
 end loop;
 perform set_config('perumar.document_command',coalesce(prior,''),true);return cardinality(ids);
end $$;
revoke all on function public.guardar_tipo_documento(jsonb),public.guardar_documentos_ciclo(uuid,timestamptz,jsonb,jsonb),public.regularizar_expedientes_ciclo(uuid,timestamptz,jsonb),public.retirar_documentos_opcionales(uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.guardar_tipo_documento(jsonb),public.guardar_documentos_ciclo(uuid,timestamptz,jsonb,jsonb),public.regularizar_expedientes_ciclo(uuid,timestamptz,jsonb),public.retirar_documentos_opcionales(uuid,jsonb,text) to authenticated;
