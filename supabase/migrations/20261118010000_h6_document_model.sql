-- H6 block 1: four approved relations, effective configuration and immutable file history.
-- No bucket, Edge deployment, human-data backfill or financial change.
create table public.tipo_documento (
 id uuid primary key default gen_random_uuid(), codigo text not null unique check(codigo=upper(btrim(codigo)) and codigo ~ '^[A-Z][A-Z0-9_]{0,39}$'),
 nombre text not null check(length(btrim(nombre)) between 1 and 150), descripcion text check(length(descripcion)<=500),
 origen text not null check(origen in ('SUBIDO','GENERADO')), activo boolean not null default true,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), unique(id,origen),
 check(origen='SUBIDO' or codigo in ('SOLICITUD','DECLARACION_JURADA','CARTA_PODER','FICHA_DATOS_PERSONALES','FICHA_MATRICULA'))
);
create table public.ciclo_documento (
 id uuid primary key default gen_random_uuid(), ciclo_id uuid not null references public.ciclo(id), tipo_documento_id uuid not null references public.tipo_documento(id),
 obligatorio boolean not null default false, activo boolean not null default true,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 unique(ciclo_id,tipo_documento_id),unique(id,tipo_documento_id)
);
create table public.matricula_documento (
 id uuid primary key default gen_random_uuid(), matricula_id uuid not null references public.matricula(id), ciclo_documento_id uuid not null,
 tipo_documento_id uuid not null, contexto_id uuid not null, contexto_vigente boolean not null default true,
 codigo text not null, nombre text not null, origen text not null, obligatorio boolean not null, activo boolean not null default true,
 estado text not null default 'PENDIENTE', ultimo_archivo_confirmado_id uuid,
 inactivado_por uuid, inactivado_at timestamptz, causa_inactivacion text, motivo_retiro text check(length(motivo_retiro)<=500),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 foreign key(ciclo_documento_id,tipo_documento_id) references public.ciclo_documento(id,tipo_documento_id),
 foreign key(tipo_documento_id,origen) references public.tipo_documento(id,origen),
 unique(matricula_id,contexto_id,ciclo_documento_id),
 check((origen='SUBIDO' and estado in ('PENDIENTE','CARGADO')) or (origen='GENERADO' and estado in ('PENDIENTE','GENERADO'))),
 check((estado='PENDIENTE')=(ultimo_archivo_confirmado_id is null)),check(not activo or contexto_vigente),
 check(activo or (inactivado_por is not null and inactivado_at is not null and causa_inactivacion in ('RETIRO_INDIVIDUAL','CONFIGURACION_DESACTIVADA','TRASLADO')))
);
create unique index matricula_documento_current on public.matricula_documento(matricula_id,ciclo_documento_id) where contexto_vigente;
create index matricula_documento_context on public.matricula_documento(matricula_id,contexto_id);
create table public.matricula_documento_archivo (
 id uuid primary key default gen_random_uuid(), matricula_documento_id uuid not null references public.matricula_documento(id),
 object_key text not null unique check(object_key ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'),
 estado_tecnico text not null default 'PREPARADO' check(estado_tecnico in ('PREPARADO','CONFIRMADO','ABORTADO')),
 iniciado_por uuid not null, iniciado_at timestamptz not null default clock_timestamp(), confirmado_por uuid, confirmado_at timestamptz,
 mime text check(mime in ('application/pdf','image/jpeg','image/png')), bytes integer check(bytes between 1 and 5242880),
 sha256 text check(sha256 ~ '^[0-9a-f]{64}$'), nombre_original text check(length(nombre_original)<=150 and nombre_original !~ '[[:cntrl:]]'),
 plantilla_version text check(length(plantilla_version)<=80), fuente_fingerprint text check(fuente_fingerprint ~ '^[0-9a-f]{64}$'),
 fuente_base_fingerprint text check(fuente_base_fingerprint ~ '^[0-9a-f]{64}$'), fecha_generacion timestamptz,
 datos_generacion jsonb not null default '{}' check(jsonb_typeof(datos_generacion)='object'), version_esperada_documento timestamptz not null,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), unique(id,matricula_documento_id),
 check(estado_tecnico<>'CONFIRMADO' or (mime is not null and bytes is not null and sha256 is not null and confirmado_por is not null and confirmado_at is not null))
);
create unique index expediente_one_reservation on public.matricula_documento_archivo(matricula_documento_id) where estado_tecnico='PREPARADO';
alter table public.matricula_documento add foreign key(ultimo_archivo_confirmado_id,id) references public.matricula_documento_archivo(id,matricula_documento_id);

insert into public.tipo_documento(codigo,nombre,origen) values
 ('DOCUMENTO_IDENTIDAD','Documento de identidad','SUBIDO'),('FOTO_PASAPORTE','Foto pasaporte','SUBIDO'),
 ('CERTIFICADO_PSICOFISICO','Certificado psicofísico','SUBIDO'),('CERTIFICADO_ESTUDIOS','Certificado de estudios','SUBIDO'),
 ('SOLICITUD','Solicitud de inscripción y obtención de Libreta de Embarco / Carné','GENERADO'),
 ('DECLARACION_JURADA','Declaración jurada','GENERADO'),('CARTA_PODER','Carta poder','GENERADO'),
 ('FICHA_DATOS_PERSONALES','Ficha de datos personales','GENERADO'),('FICHA_MATRICULA','Ficha de matrícula','GENERADO');

-- One narrowly scoped application/synchronization helper; parent locks belong to its callers.
create function private.sync_document_context(enrollment_id uuid,new_context boolean default false,reactivated uuid[] default '{}') returns void
language plpgsql set search_path='' as $$
declare m public.matricula; c public.ciclo_documento; t public.tipo_documento; d public.matricula_documento; ctx uuid; desired boolean; prior text;
begin
 perform private.authorize(false);
 select * into strict m from public.matricula where id=enrollment_id;
 if m.estado_codigo<>'ACTIVO' then return; end if;
 prior:=current_setting('perumar.document_command',true);perform set_config('perumar.document_command','SYNC',true);
 if new_context then
  update public.matricula_documento set contexto_vigente=false,activo=false,inactivado_por=auth.uid(),inactivado_at=clock_timestamp(),causa_inactivacion='TRASLADO'
  where matricula_id=m.id and contexto_vigente;
 end if;
 select contexto_id into ctx from public.matricula_documento where matricula_id=m.id and contexto_vigente limit 1;
 ctx:=coalesce(ctx,gen_random_uuid());
 for c in select * from public.ciclo_documento where ciclo_id=m.ciclo_id order by id for update loop
  select * into strict t from public.tipo_documento where id=c.tipo_documento_id for share;
  if c.activo and not t.activo then raise exception using errcode='23514',message='DOCUMENT_TYPE_INACTIVE'; end if;
  select * into d from public.matricula_documento where matricula_id=m.id and ciclo_documento_id=c.id and contexto_vigente for update;
  if d.id is null then
   if c.activo then
    insert into public.matricula_documento(matricula_id,ciclo_documento_id,tipo_documento_id,contexto_id,codigo,nombre,origen,obligatorio)
    values(m.id,c.id,t.id,ctx,t.codigo,t.nombre,t.origen,c.obligatorio);
   end if;
  else
   desired:=c.activo and (d.activo or c.obligatorio or c.id=any(reactivated));
   if d.obligatorio is distinct from c.obligatorio or d.activo is distinct from desired then
    update public.matricula_documento set obligatorio=c.obligatorio,activo=desired,
     inactivado_por=case when not desired then auth.uid() else d.inactivado_por end,
     inactivado_at=case when not desired then clock_timestamp() else d.inactivado_at end,
     causa_inactivacion=case when not desired then case when not c.activo then 'CONFIGURACION_DESACTIVADA' else d.causa_inactivacion end else d.causa_inactivacion end
    where id=d.id;
   end if;
  end if;
 end loop;
 perform set_config('perumar.document_command',coalesce(prior,''),true);
end $$;

-- Specific guards and minimal audit only. No row-wide PII audit copying.
create function private.guard_document_history() returns trigger language plpgsql set search_path='' as $$
declare cmd text:=current_setting('perumar.document_command',true); meta jsonb; m public.matricula; conf public.ciclo_documento;
begin
 if tg_table_name='matricula' then
  if current_user<>'postgres' then raise exception using errcode='42501',message='DOCUMENT_ACCESS'; end if;
  if tg_op='INSERT' then perform private.sync_document_context(new.id);
  elsif new.ciclo_id<>old.ciclo_id then perform private.sync_document_context(new.id,true); end if;
  return new;
 end if;
 if tg_op='DELETE' then raise exception using errcode='23514',message='DOCUMENT_HISTORY_IMMUTABLE'; end if;
 if current_user<>'postgres' or coalesce(cmd,'') not in ('TYPE','CONFIG','SYNC','RETIRE','RESERVE','CONFIRM','ABORT') then
  raise exception using errcode='42501',message='DOCUMENT_COMMAND_REQUIRED'; end if;
 if tg_table_name='tipo_documento' then
  if cmd<>'TYPE' then raise exception using errcode='42501',message='DOCUMENT_COMMAND_REQUIRED'; end if;
  if tg_op='UPDATE' and (new.codigo<>old.codigo or new.origen<>old.origen) and exists(select 1 from public.ciclo_documento where tipo_documento_id=old.id) then
   raise exception using errcode='23514',message='DOCUMENT_TYPE_HISTORY_IMMUTABLE'; end if;
  if not new.activo and exists(select 1 from public.ciclo_documento where tipo_documento_id=new.id and activo) then raise exception using errcode='23514',message='DOCUMENT_TYPE_CONFIGURED'; end if;
  meta:=jsonb_build_object('activo',new.activo,'origen',new.origen);
 elsif tg_table_name='ciclo_documento' then
  if cmd<>'CONFIG' then raise exception using errcode='42501',message='DOCUMENT_COMMAND_REQUIRED'; end if;
  if tg_op='UPDATE' and (new.ciclo_id<>old.ciclo_id or new.tipo_documento_id<>old.tipo_documento_id) then raise exception using errcode='23514',message='DOCUMENT_CONFIG_HISTORY_IMMUTABLE'; end if;
  meta:=jsonb_build_object('ciclo_id',new.ciclo_id,'tipo_documento_id',new.tipo_documento_id,'activo',new.activo,'obligatorio',new.obligatorio);
 elsif tg_table_name='matricula_documento' then
  if cmd not in ('SYNC','RETIRE','CONFIRM') then raise exception using errcode='42501',message='DOCUMENT_COMMAND_REQUIRED'; end if;
  if tg_op='UPDATE' then
   if not old.contexto_vigente or (to_jsonb(new)-array['activo','obligatorio','contexto_vigente','estado','ultimo_archivo_confirmado_id','inactivado_por','inactivado_at','causa_inactivacion','motivo_retiro','updated_at']) is distinct from
    (to_jsonb(old)-array['activo','obligatorio','contexto_vigente','estado','ultimo_archivo_confirmado_id','inactivado_por','inactivado_at','causa_inactivacion','motivo_retiro','updated_at']) then raise exception using errcode='23514',message='DOCUMENT_HISTORY_IMMUTABLE'; end if;
   if cmd='RETIRE' and (old.obligatorio or new.activo or new.obligatorio<>old.obligatorio or new.contexto_vigente<>old.contexto_vigente or new.estado<>old.estado or new.ultimo_archivo_confirmado_id is distinct from old.ultimo_archivo_confirmado_id) then raise exception using errcode='23514',message='DOCUMENT_REQUIRED'; end if;
   if cmd='SYNC' and (new.estado<>old.estado or new.ultimo_archivo_confirmado_id is distinct from old.ultimo_archivo_confirmado_id) then raise exception using errcode='23514',message='DOCUMENT_FILE_IMMUTABLE'; end if;
   if cmd='CONFIRM' and (to_jsonb(new)-array['estado','ultimo_archivo_confirmado_id','updated_at']) is distinct from (to_jsonb(old)-array['estado','ultimo_archivo_confirmado_id','updated_at']) then raise exception using errcode='23514',message='DOCUMENT_HISTORY_IMMUTABLE'; end if;
  end if;
  select * into strict m from public.matricula where id=new.matricula_id;
  select * into strict conf from public.ciclo_documento where id=new.ciclo_documento_id;
  if new.contexto_vigente and conf.ciclo_id<>m.ciclo_id then raise exception using errcode='23514',message='DOCUMENT_CONTEXT_INVALID'; end if;
  if exists(select 1 from public.matricula_documento x where x.matricula_id=new.matricula_id and x.contexto_vigente and x.id<>new.id and new.contexto_vigente and x.contexto_id<>new.contexto_id) then raise exception using errcode='23514',message='DOCUMENT_CONTEXT_INVALID'; end if;
  if new.ultimo_archivo_confirmado_id is not null and not exists(select 1 from public.matricula_documento_archivo f where f.id=new.ultimo_archivo_confirmado_id and f.matricula_documento_id=new.id and f.estado_tecnico='CONFIRMADO') then raise exception using errcode='23514',message='DOCUMENT_FILE_UNCONFIRMED'; end if;
  meta:=jsonb_build_object('matricula_id',new.matricula_id,'contexto_id',new.contexto_id,'ciclo_documento_id',new.ciclo_documento_id,'contexto_vigente',new.contexto_vigente,'activo',new.activo,'obligatorio',new.obligatorio,'estado',new.estado,'causa',new.causa_inactivacion);
 elsif tg_table_name='matricula_documento_archivo' then
  if tg_op='INSERT' and (cmd<>'RESERVE' or new.estado_tecnico<>'PREPARADO') then raise exception using errcode='42501',message='DOCUMENT_COMMAND_REQUIRED'; end if;
  if tg_op='UPDATE' and (old.estado_tecnico<>'PREPARADO' or cmd not in ('CONFIRM','ABORT') or new.estado_tecnico<>case when cmd='CONFIRM' then 'CONFIRMADO' else 'ABORTADO' end
   or (to_jsonb(new)-array['estado_tecnico','confirmado_por','confirmado_at','mime','bytes','sha256','nombre_original','updated_at']) is distinct from
    (to_jsonb(old)-array['estado_tecnico','confirmado_por','confirmado_at','mime','bytes','sha256','nombre_original','updated_at'])) then raise exception using errcode='23514',message='DOCUMENT_FILE_IMMUTABLE'; end if;
  meta:=jsonb_build_object('documento_id',new.matricula_documento_id,'estado_tecnico',new.estado_tecnico);
 else raise exception using errcode='42501',message='DOCUMENT_ACCESS';
 end if;
 insert into public.auditoria(entidad,registro_id,accion,actor,new_values,old_values)
 values(tg_table_name,new.id,case when tg_op='INSERT' then 'DOCUMENTO_CREADO' else 'DOCUMENTO_ACTUALIZADO' end,
 coalesce(auth.uid(),case when tg_table_name='matricula_documento_archivo' then (to_jsonb(new)->>'iniciado_por')::uuid end),meta,
 case when tg_op='UPDATE' then jsonb_build_object('version',old.updated_at,'activo',to_jsonb(old)->'activo','obligatorio',to_jsonb(old)->'obligatorio','estado',to_jsonb(old)->'estado','contexto_vigente',to_jsonb(old)->'contexto_vigente') end);
 return new;
end $$;
revoke all on function private.sync_document_context(uuid,boolean,uuid[]),private.guard_document_history() from public,anon,authenticated,service_role;
create trigger expediente_insert after insert on public.matricula for each row execute function private.guard_document_history();
create trigger expediente_transfer after update of ciclo_id on public.matricula for each row when(old.ciclo_id is distinct from new.ciclo_id) execute function private.guard_document_history();
-- Explicit definitions keep the inventory reviewable, without a dynamic policy/command engine.
create trigger a_stamp before update on public.tipo_documento for each row execute function private.stamp_update();
create trigger b_history before insert or update or delete on public.tipo_documento for each row execute function private.guard_document_history();
create trigger a_stamp before update on public.ciclo_documento for each row execute function private.stamp_update();
create trigger b_history before insert or update or delete on public.ciclo_documento for each row execute function private.guard_document_history();
create trigger a_stamp before update on public.matricula_documento for each row execute function private.stamp_update();
create trigger b_history before insert or update or delete on public.matricula_documento for each row execute function private.guard_document_history();
create trigger a_stamp before update on public.matricula_documento_archivo for each row execute function private.stamp_update();
create trigger b_history before insert or update or delete on public.matricula_documento_archivo for each row execute function private.guard_document_history();
alter table public.tipo_documento enable row level security;
alter table public.ciclo_documento enable row level security;
alter table public.matricula_documento enable row level security;
alter table public.matricula_documento_archivo enable row level security;
revoke all on public.tipo_documento,public.ciclo_documento,public.matricula_documento,public.matricula_documento_archivo from public,anon,authenticated,service_role;
grant select on public.tipo_documento,public.ciclo_documento,public.matricula_documento,public.matricula_documento_archivo to authenticated,service_role;
create policy document_read on public.tipo_documento for select to authenticated using(private.academic_user());
create policy document_read on public.ciclo_documento for select to authenticated using(private.academic_user());
create policy document_read on public.matricula_documento for select to authenticated using(private.academic_user());
create policy document_read on public.matricula_documento_archivo for select to authenticated using(private.academic_user());
create view public.matricula_expediente_resumen with(security_invoker=true) as
 select m.id as matricula_id,m.ciclo_id,m.alumno_id,
 count(d.id) filter(where d.contexto_vigente and d.activo)::integer as aplicables,
 count(d.id) filter(where d.contexto_vigente and d.activo and d.estado<>'PENDIENTE')::integer as completados,
 count(d.id) filter(where d.contexto_vigente and d.activo and d.estado='PENDIENTE')::integer as pendientes
 from public.matricula m left join public.matricula_documento d on d.matricula_id=m.id group by m.id;
revoke all on public.matricula_expediente_resumen from public,anon,authenticated,service_role;
grant select on public.matricula_expediente_resumen to authenticated,service_role;
