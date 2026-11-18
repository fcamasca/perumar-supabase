-- H5: derived, temporary artifacts only. No business model or financial changes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fichas-matricula','fichas-matricula',false,2097152,array['application/pdf']);
-- No client object policies: anon/authenticated cannot list/read/write/sign this bucket.

-- One server-only, closed audit command; no arbitrary payload or PII argument.
create function public.registrar_evento_ficha_pdf(
 p_actor uuid,p_matricula_id uuid,p_artefacto_id uuid,p_evento text,
 p_source_version timestamptz,p_generated_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.matricula; cycle_state text; event_time timestamptz:=clock_timestamp(); manifest jsonb;
begin
 if not exists(select 1 from public.app_users u join public.app_user_roles ur on ur.user_id=u.id
   join public.app_roles r on r.code=ur.role_code
   where u.id=p_actor and u.active and r.active and r.code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO')) then
   raise exception using errcode='42501',message='Acceso denegado';
 end if;
 select * into m from public.matricula where id=p_matricula_id;
 select estado_codigo into cycle_state from public.ciclo where id=m.ciclo_id;
 if m.id is null then raise exception using errcode='P0002',message='Ficha no disponible'; end if;
 if m.estado_codigo<>'ACTIVO' or cycle_state not in ('PROGRAMADO','EN_CURSO','CERRADO')
   or m.updated_at is distinct from p_source_version then
   raise exception using errcode='PT409',message='Contexto de ficha cambiado';
 end if;
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
     'expires_at',p_generated_at+interval '24 hours','source_version',p_source_version,'template_version','h5-1');
 elsif p_evento='FICHA_PDF_DESCARGA_INICIADA' then
   select new_values into manifest from public.auditoria where entidad='ficha_pdf' and registro_id=p_matricula_id
     and accion='FICHA_PDF_GENERADA' and new_values->>'artefacto_id'=p_artefacto_id::text
     and (new_values->>'generated_at')::timestamptz=p_generated_at
     and (new_values->>'expires_at')::timestamptz>event_time;
   if manifest is null then raise exception using errcode='P0002',message='Artefacto no disponible'; end if;
 else raise exception using errcode='22023',message='Evento no permitido';
 end if;
 insert into public.auditoria(entidad,registro_id,accion,actor,fecha,new_values)
 values('ficha_pdf',p_matricula_id,p_evento,p_actor,event_time,manifest);
 return manifest;
end; $$;
revoke all on function public.registrar_evento_ficha_pdf(uuid,uuid,uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.registrar_evento_ficha_pdf(uuid,uuid,uuid,text,timestamptz,timestamptz) to service_role;
notify pgrst,'reload schema';
