-- H7: private, versioned OS PDFs. No financial changes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('h7-os','h7-os',false,5242880,array['application/pdf']);

create function private.require_os_file_actor(p_actor uuid) returns void
language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id join public.app_roles r on r.code=ur.role_code where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then raise exception using errcode='42501',message='DOCUMENT_ACCESS';end if;
end $$;

-- Only the closed service RPCs can change technical state. Confirmed bytes/metadata are immutable.
create function private.guard_os_file() returns trigger language plpgsql set search_path='' as $$
declare command text:=current_setting('perumar.os_file_command',true);
begin
 if tg_op='INSERT' and command='RESERVE' and new.estado_tecnico='PREPARADO' and new.mime is null and new.bytes is null and new.sha256 is null then return new;end if;
 if tg_op='UPDATE' and old.estado_tecnico='PREPARADO' then
  if command='ABORT' and new.estado_tecnico='ABORTADO' and to_jsonb(new)-'estado_tecnico'=to_jsonb(old)-'estado_tecnico' then return new;end if;
  if command='CONFIRM' and new.estado_tecnico='CONFIRMADO'
   and to_jsonb(new)-array['estado_tecnico','mime','bytes','sha256','confirmado_por','confirmado_at']=to_jsonb(old)-array['estado_tecnico','mime','bytes','sha256','confirmado_por','confirmado_at'] then return new;end if;
 end if;
 raise exception using errcode='23514',message='DOCUMENT_HISTORY_IMMUTABLE';
end $$;
drop trigger h7_history on public.orden_servicio_archivo;
create trigger h7_os_file_history before insert or update or delete on public.orden_servicio_archivo for each row execute function private.guard_os_file();
revoke all on public.orden_servicio_archivo from public,anon,authenticated,service_role;
grant select(id,orden_servicio_id,numero_version,estado_tecnico,confirmado_at,bytes,mime) on public.orden_servicio_archivo to authenticated;
create policy h7_os_file_read on public.orden_servicio_archivo for select to authenticated using(private.academic_user() and estado_tecnico='CONFIRMADO' and exists(select 1 from public.orden_servicio o where o.id=orden_servicio_id));

create function public.preparar_archivo_os(p_actor uuid,p_os_id uuid,p_expected_updated_at timestamptz) returns public.orden_servicio_archivo
language plpgsql security definer set search_path='' as $$
declare o public.orden_servicio; f public.orden_servicio_archivo; company uuid; file_id uuid:=gen_random_uuid(); base uuid; prior text;
begin
 perform private.require_os_file_actor(p_actor);
 select empresa_patrocinadora_id into company from public.orden_servicio where id=p_os_id;
 perform 1 from public.empresa_patrocinadora where id=company for update;
 select * into o from public.orden_servicio where id=p_os_id for update;
 if o.id is null then raise exception using errcode='42501',message='DOCUMENT_ACCESS';end if;
 perform private.require_os_file_actor(p_actor);
 perform private.require_version(o.updated_at,p_expected_updated_at);
 if o.estado_codigo<>'VIGENTE' then raise exception using errcode='PT409',message='DOCUMENT_STATE';end if;
 if exists(select 1 from public.orden_servicio_archivo where orden_servicio_id=o.id and estado_tecnico='PREPARADO') then raise exception using errcode='PT409',message='DOCUMENT_RESERVATION_EXISTS';end if;
 select id into base from public.orden_servicio_archivo where orden_servicio_id=o.id and estado_tecnico='CONFIRMADO' order by numero_version desc limit 1;
 prior:=current_setting('perumar.os_file_command',true);perform set_config('perumar.os_file_command','RESERVE',true);
 insert into public.orden_servicio_archivo(id,orden_servicio_id,numero_version,object_key,os_updated_at_esperado,base_archivo_id,iniciado_por)
 values(file_id,o.id,coalesce((select max(numero_version) from public.orden_servicio_archivo where orden_servicio_id=o.id),0)+1,o.id::text||'/'||file_id::text||'.pdf',o.updated_at,base,p_actor) returning * into f;
 perform set_config('perumar.os_file_command',coalesce(prior,''),true);return f;
end $$;

create function public.confirmar_archivo_os(p_actor uuid,p_os_id uuid,p_archivo_id uuid,p_bytes integer,p_sha256 text) returns public.orden_servicio_archivo
language plpgsql security definer set search_path='' as $$
declare o public.orden_servicio; f public.orden_servicio_archivo; company uuid; base uuid; prior text;
begin
 perform private.require_os_file_actor(p_actor);
 select empresa_patrocinadora_id into company from public.orden_servicio where id=p_os_id;
 perform 1 from public.empresa_patrocinadora where id=company for update;
 select * into o from public.orden_servicio where id=p_os_id for update;
 select * into f from public.orden_servicio_archivo where id=p_archivo_id and orden_servicio_id=p_os_id for update;
 if o.id is null or f.id is null or f.iniciado_por<>p_actor then raise exception using errcode='42501',message='DOCUMENT_ACCESS';end if;
 perform private.require_os_file_actor(p_actor);
 if f.estado_tecnico='CONFIRMADO' then
  if f.bytes is distinct from p_bytes or f.sha256 is distinct from p_sha256 then raise exception using errcode='PT409',message='DOCUMENT_OPERATION_CONFLICT';end if;
  return f;
 end if;
 if o.estado_codigo<>'VIGENTE' or f.estado_tecnico<>'PREPARADO' or f.iniciado_at<clock_timestamp()-interval '5 minutes' then raise exception using errcode='PT409',message='DOCUMENT_STATE';end if;
 perform private.require_version(o.updated_at,f.os_updated_at_esperado);
 select id into base from public.orden_servicio_archivo where orden_servicio_id=o.id and estado_tecnico='CONFIRMADO' order by numero_version desc limit 1;
 if base is distinct from f.base_archivo_id then raise exception using errcode='PT409',message='DOCUMENT_VERSION';end if;
 if p_bytes is null or p_bytes not between 1 and 5242880 or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$' then raise exception using errcode='22023',message='DOCUMENT_FILE_INVALID';end if;
 prior:=current_setting('perumar.os_file_command',true);perform set_config('perumar.os_file_command','CONFIRM',true);
 update public.orden_servicio_archivo set estado_tecnico='CONFIRMADO',mime='application/pdf',bytes=p_bytes,sha256=p_sha256,confirmado_por=p_actor,confirmado_at=clock_timestamp() where id=f.id returning * into f;
 perform set_config('perumar.os_file_command',coalesce(prior,''),true);
 insert into public.auditoria(entidad,registro_id,accion,actor,new_values) values('orden_servicio_archivo',f.id,'OS_DOCUMENTO_ADJUNTADO',p_actor,jsonb_build_object('orden_servicio_id',o.id,'numero_version',f.numero_version));
 return f;
end $$;

create function public.abortar_archivo_os(p_actor uuid,p_os_id uuid,p_archivo_id uuid) returns public.orden_servicio_archivo
language plpgsql security definer set search_path='' as $$
declare f public.orden_servicio_archivo; company uuid; prior text;
begin
 perform private.require_os_file_actor(p_actor);
 select empresa_patrocinadora_id into company from public.orden_servicio where id=p_os_id;
 perform 1 from public.empresa_patrocinadora where id=company for update;
 perform 1 from public.orden_servicio where id=p_os_id for update;
 select * into f from public.orden_servicio_archivo where id=p_archivo_id and orden_servicio_id=p_os_id for update;
 if f.id is null or f.iniciado_por<>p_actor then raise exception using errcode='42501',message='DOCUMENT_ACCESS';end if;
 if f.estado_tecnico='CONFIRMADO' then raise exception using errcode='PT409',message='DOCUMENT_ALREADY_CONFIRMED';end if;
 if f.estado_tecnico='ABORTADO' then return f;end if;
 prior:=current_setting('perumar.os_file_command',true);perform set_config('perumar.os_file_command','ABORT',true);
 update public.orden_servicio_archivo set estado_tecnico='ABORTADO' where id=f.id returning * into f;
 perform set_config('perumar.os_file_command',coalesce(prior,''),true);return f;
end $$;

create function public.consultar_archivo_os(p_actor uuid,p_os_id uuid,p_archivo_id uuid,p_registrar boolean default false) returns public.orden_servicio_archivo
language plpgsql security definer set search_path='' as $$
declare f public.orden_servicio_archivo;
begin
 perform private.require_os_file_actor(p_actor);
 perform 1 from public.orden_servicio where id=p_os_id for share;
 if not found then raise exception using errcode='42501',message='DOCUMENT_ACCESS';end if;
 select * into f from public.orden_servicio_archivo where id=p_archivo_id and orden_servicio_id=p_os_id and estado_tecnico='CONFIRMADO' for share;
 if f.id is null then raise exception using errcode='42501',message='DOCUMENT_ACCESS';end if;
 perform private.require_os_file_actor(p_actor);
 if p_registrar then insert into public.auditoria(entidad,registro_id,accion,actor,new_values) values('orden_servicio_archivo',f.id,'OS_DOCUMENTO_DESCARGA',p_actor,jsonb_build_object('orden_servicio_id',p_os_id,'numero_version',f.numero_version));end if;
 return f;
end $$;
revoke all on function private.require_os_file_actor(uuid),private.guard_os_file() from public,anon,authenticated,service_role;
revoke all on function public.preparar_archivo_os(uuid,uuid,timestamptz),public.confirmar_archivo_os(uuid,uuid,uuid,integer,text),public.abortar_archivo_os(uuid,uuid,uuid),public.consultar_archivo_os(uuid,uuid,uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.preparar_archivo_os(uuid,uuid,timestamptz),public.confirmar_archivo_os(uuid,uuid,uuid,integer,text),public.abortar_archivo_os(uuid,uuid,uuid),public.consultar_archivo_os(uuid,uuid,uuid,boolean) to service_role;
