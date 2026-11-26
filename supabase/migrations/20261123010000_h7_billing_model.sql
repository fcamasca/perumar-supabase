-- H7 core only. Approved Spec 08d8a7a6e3279ff8f36344247de4c270b44f19f0.
create table public.orden_servicio (
 id uuid primary key default gen_random_uuid(),
 empresa_patrocinadora_id uuid not null references public.empresa_patrocinadora,
 ciclo_id uuid not null references public.ciclo,
 serie text not null check(serie ~ '^[A-Z0-9]{1,20}$'),
 correlativo text not null check(correlativo ~ '^[0-9]{1,20}$'),
 fecha date not null, monto numeric(12,2) not null check(monto>0 and monto::text not in ('NaN','Infinity','-Infinity')),
 observacion text check(length(observacion) between 1 and 500 and observacion=btrim(observacion)),
 estado_codigo text not null default 'VIGENTE' check(estado_codigo in ('VIGENTE','ANULADA')),
 registrado_por uuid not null, created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 motivo_anulacion text, anulado_por uuid, anulado_at timestamptz,
 unique(empresa_patrocinadora_id,serie,correlativo),
 check((estado_codigo='VIGENTE' and motivo_anulacion is null and anulado_por is null and anulado_at is null)
 or (estado_codigo='ANULADA' and length(btrim(motivo_anulacion)) between 1 and 500 and motivo_anulacion is not null and anulado_por is not null and anulado_at is not null))
);
create table public.orden_servicio_matricula (
 orden_servicio_id uuid not null references public.orden_servicio,
 matricula_id uuid not null references public.matricula,
 primary key(orden_servicio_id,matricula_id)
);
create table public.factura_patrocinador (
 id uuid primary key default gen_random_uuid(),
 empresa_patrocinadora_id uuid not null references public.empresa_patrocinadora,
 serie text not null check(serie ~ '^[A-Z0-9]{1,20}$'),
 correlativo text not null check(correlativo ~ '^[0-9]{1,20}$'),
 importe numeric(12,2) not null check(importe>0 and importe::text not in ('NaN','Infinity','-Infinity')),
 fecha_emision date not null, fecha_vencimiento date not null check(fecha_vencimiento>=fecha_emision),
 observacion text check(length(observacion) between 1 and 500 and observacion=btrim(observacion)),
 estado_codigo text not null default 'EMITIDA' check(estado_codigo in ('EMITIDA','REGISTRADA_PATROCINADOR','APROBADA','PENDIENTE_DESEMBOLSO')),
 fecha_registrada_patrocinador date, fecha_aprobada date, fecha_pendiente_desembolso date,
 registrado_por uuid not null, created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 motivo_anulacion text, anulado_por uuid, anulado_at timestamptz,
 unique(serie,correlativo),
 check((anulado_at is null and anulado_por is null and motivo_anulacion is null)
 or (anulado_at is not null and anulado_por is not null and motivo_anulacion is not null and length(btrim(motivo_anulacion)) between 1 and 500)),
 check((estado_codigo='EMITIDA' and fecha_registrada_patrocinador is null and fecha_aprobada is null and fecha_pendiente_desembolso is null)
 or (estado_codigo='REGISTRADA_PATROCINADOR' and fecha_registrada_patrocinador is not null and fecha_aprobada is null and fecha_pendiente_desembolso is null)
 or (estado_codigo='APROBADA' and fecha_registrada_patrocinador is not null and fecha_aprobada is not null and fecha_pendiente_desembolso is null)
 or (estado_codigo='PENDIENTE_DESEMBOLSO' and fecha_registrada_patrocinador is not null and fecha_aprobada is not null and fecha_pendiente_desembolso is not null)),
 check(fecha_registrada_patrocinador>=fecha_emision and fecha_aprobada>=fecha_registrada_patrocinador and fecha_pendiente_desembolso>=fecha_aprobada)
);
create table public.factura_orden_servicio (
 factura_id uuid not null references public.factura_patrocinador,
 orden_servicio_id uuid not null references public.orden_servicio,
 primary key(factura_id,orden_servicio_id)
);
create table public.pago_patrocinador (
 id uuid primary key default gen_random_uuid(),
 empresa_patrocinadora_id uuid not null references public.empresa_patrocinadora,
 idempotency_key uuid not null unique,
 importe numeric(12,2) not null check(importe>0 and importe::text not in ('NaN','Infinity','-Infinity')),
 fecha_efectiva date not null,
 banco text not null check(length(btrim(banco)) between 1 and 150 and banco=btrim(banco)),
 referencia_operacion text check(length(referencia_operacion) between 1 and 150 and referencia_operacion=btrim(referencia_operacion)),
 observacion text check(length(observacion) between 1 and 500 and observacion=btrim(observacion)),
 estado_codigo text not null default 'CONFIRMADO' check(estado_codigo in ('CONFIRMADO','ANULADO')),
 registrado_por uuid not null, created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 motivo_anulacion text, anulado_por uuid, anulado_at timestamptz,
 check((estado_codigo='CONFIRMADO' and motivo_anulacion is null and anulado_por is null and anulado_at is null)
 or (estado_codigo='ANULADO' and motivo_anulacion is not null and length(btrim(motivo_anulacion)) between 1 and 500 and anulado_por is not null and anulado_at is not null))
);
create table public.pago_patrocinador_aplicacion (
 pago_id uuid not null references public.pago_patrocinador,
 factura_id uuid not null references public.factura_patrocinador,
 importe numeric(12,2) not null check(importe>0 and importe::text not in ('NaN','Infinity','-Infinity')),
 primary key(pago_id,factura_id)
);
-- Model only: no bucket, Storage policy or byte/RPC endpoint in this core block.
create table public.orden_servicio_archivo (
 id uuid primary key default gen_random_uuid(),
 orden_servicio_id uuid not null references public.orden_servicio,
 numero_version bigint not null check(numero_version>0),
 object_key text not null unique check(object_key ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]pdf$'),
 estado_tecnico text not null default 'PREPARADO' check(estado_tecnico in ('PREPARADO','CONFIRMADO','ABORTADO')),
 os_updated_at_esperado timestamptz not null, base_archivo_id uuid references public.orden_servicio_archivo,
 mime text, bytes bigint, sha256 text,
 iniciado_por uuid not null, iniciado_at timestamptz not null default clock_timestamp(),
 confirmado_por uuid, confirmado_at timestamptz,
 unique(orden_servicio_id,numero_version),
 unique(id,orden_servicio_id),
 foreign key(base_archivo_id,orden_servicio_id) references public.orden_servicio_archivo(id,orden_servicio_id),
 check(object_key=orden_servicio_id::text||'/'||id::text||'.pdf'),
 check((estado_tecnico='CONFIRMADO' and mime='application/pdf' and bytes between 1 and 5242880 and sha256 ~ '^[a-f0-9]{64}$'
 and mime is not null and bytes is not null and sha256 is not null and confirmado_por is not null and confirmado_at is not null)
 or (estado_tecnico in ('PREPARADO','ABORTADO') and confirmado_por is null and confirmado_at is null))
);
create unique index orden_servicio_archivo_reserva on public.orden_servicio_archivo(orden_servicio_id) where estado_tecnico='PREPARADO';
create index orden_servicio_ciclo on public.orden_servicio(ciclo_id,id);
create index orden_servicio_empresa_fecha on public.orden_servicio(empresa_patrocinadora_id,fecha desc,id);
create index orden_servicio_matricula_inversa on public.orden_servicio_matricula(matricula_id,orden_servicio_id);
create index factura_os_inversa on public.factura_orden_servicio(orden_servicio_id,factura_id);
create index factura_empresa_fecha on public.factura_patrocinador(empresa_patrocinadora_id,fecha_emision desc,id);
create index pago_empresa_fecha on public.pago_patrocinador(empresa_patrocinadora_id,fecha_efectiva desc,id);
create index pago_aplicacion_factura on public.pago_patrocinador_aplicacion(factura_id,pago_id);

create view public.factura_patrocinador_saldo with(security_invoker=true) as
select f.*,coalesce(a.abonado,0::numeric) abonado,
 f.importe-coalesce(a.abonado,0::numeric) pendiente,
 case when coalesce(a.abonado,0)=0 then 'SIN_DESEMBOLSO'
 when a.abonado=f.importe then 'DESEMBOLSADA' else 'PARCIAL' end estado_financiero
from public.factura_patrocinador f left join lateral(
 select sum(pa.importe) abonado from public.pago_patrocinador_aplicacion pa join public.pago_patrocinador p on p.id=pa.pago_id
 where pa.factura_id=f.id and p.estado_codigo='CONFIRMADO'
) a on true;
create view public.orden_servicio_resumen with(security_invoker=true) as
select o.*, (select count(*) from public.orden_servicio_matricula m where m.orden_servicio_id=o.id) matriculas_cubiertas,
 (select count(*) from public.factura_orden_servicio f where f.orden_servicio_id=o.id) facturas_relacionadas
from public.orden_servicio o;

do $$ declare t text; begin
 foreach t in array array['orden_servicio','orden_servicio_matricula','factura_patrocinador','factura_orden_servicio','pago_patrocinador','pago_patrocinador_aplicacion','orden_servicio_archivo'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 -- No client key/path access: the technical file table is locked until byte protocol is built.
 if t<>'orden_servicio_archivo' then
 execute format('create policy h7_read on public.%I for select to authenticated using(private.academic_user())',t);
 end if;
 end loop;
end $$;
revoke all on public.factura_patrocinador_saldo,public.orden_servicio_resumen from public,anon,authenticated;
grant select on public.factura_patrocinador_saldo,public.orden_servicio_resumen to authenticated;

-- Guard commercial history even against accidental future DML paths.
create function private.guard_h7_history() returns trigger language plpgsql set search_path='' as $$
declare n jsonb:=to_jsonb(new); o jsonb:=to_jsonb(old); next_state text;
begin
 if tg_op='DELETE' then raise exception using errcode='23514',message='H7_HISTORY_IMMUTABLE'; end if;
 if tg_table_name in ('orden_servicio_matricula','factura_orden_servicio','pago_patrocinador_aplicacion') then
 raise exception using errcode='23514',message='H7_HISTORY_IMMUTABLE'; end if;
 if tg_table_name='orden_servicio_archivo' then
 raise exception using errcode='23514',message='H7_FILE_PROTOCOL_NOT_ENABLED'; end if;
 if n-'updated_at'=o-'updated_at' then return new; end if;
 if tg_table_name='factura_patrocinador' and new.anulado_at is null and old.anulado_at is null then
 next_state:=case old.estado_codigo when 'EMITIDA' then 'REGISTRADA_PATROCINADOR' when 'REGISTRADA_PATROCINADOR' then 'APROBADA' when 'APROBADA' then 'PENDIENTE_DESEMBOLSO' end;
 if new.estado_codigo is distinct from next_state
 or (n-array['updated_at','estado_codigo','fecha_registrada_patrocinador','fecha_aprobada','fecha_pendiente_desembolso'])
 is distinct from (o-array['updated_at','estado_codigo','fecha_registrada_patrocinador','fecha_aprobada','fecha_pendiente_desembolso'])
 or (old.fecha_registrada_patrocinador is not null and new.fecha_registrada_patrocinador is distinct from old.fecha_registrada_patrocinador)
 or (old.fecha_aprobada is not null and new.fecha_aprobada is distinct from old.fecha_aprobada) then
 raise exception using errcode='23514',message='H7_WORKFLOW_INVALID'; end if;
 return new;
 end if;
 perform private.authorize(true);
 if (n-array['updated_at','estado_codigo','motivo_anulacion','anulado_por','anulado_at'])
 is distinct from (o-array['updated_at','estado_codigo','motivo_anulacion','anulado_por','anulado_at'])
 or old.anulado_at is not null or new.anulado_at is null or new.anulado_por is distinct from auth.uid()
 or (tg_table_name='factura_patrocinador' and new.estado_codigo is distinct from old.estado_codigo)
 or (tg_table_name='orden_servicio' and new.estado_codigo<>'ANULADA')
 or (tg_table_name='pago_patrocinador' and new.estado_codigo<>'ANULADO') then
 raise exception using errcode='23514',message='H7_HISTORY_IMMUTABLE'; end if;
 if tg_table_name='orden_servicio' and exists(select 1 from public.factura_orden_servicio fo join public.factura_patrocinador f on f.id=fo.factura_id where fo.orden_servicio_id=old.id and f.anulado_at is null) then
 raise exception using errcode='23514',message='H7_OS_HAS_LIVE_INVOICE'; end if;
 if tg_table_name='factura_patrocinador' and exists(select 1 from public.pago_patrocinador_aplicacion a join public.pago_patrocinador p on p.id=a.pago_id where a.factura_id=old.id and p.estado_codigo='CONFIRMADO') then
 raise exception using errcode='23514',message='H7_INVOICE_HAS_LIVE_PAYMENT'; end if;
 return new;
end $$;
-- Deferred aggregate invariants complement RPC validation; no financial write endpoint.
create function private.validate_h7_integrity() returns trigger language plpgsql set search_path='' as $$
declare os_id uuid; invoice_id uuid; payment_id uuid; row_data jsonb:=to_jsonb(new);
begin
 os_id:=(case tg_table_name when 'orden_servicio' then row_data->>'id' when 'orden_servicio_matricula' then row_data->>'orden_servicio_id' else null end)::uuid;
 invoice_id:=(case tg_table_name when 'factura_patrocinador' then row_data->>'id' when 'factura_orden_servicio' then row_data->>'factura_id' when 'pago_patrocinador_aplicacion' then row_data->>'factura_id' else null end)::uuid;
 payment_id:=(case tg_table_name when 'pago_patrocinador' then row_data->>'id' when 'pago_patrocinador_aplicacion' then row_data->>'pago_id' else null end)::uuid;
 -- Check only roots affected by this row, not the entire commercial database.
 if (os_id is not null and not exists(select 1 from public.orden_servicio_matricula m where m.orden_servicio_id=os_id))
 or (invoice_id is not null and not exists(select 1 from public.factura_orden_servicio fo where fo.factura_id=invoice_id))
 or exists(select 1 from public.factura_orden_servicio fo join public.factura_patrocinador f on f.id=fo.factura_id join public.orden_servicio o on o.id=fo.orden_servicio_id where f.id=invoice_id and f.empresa_patrocinadora_id<>o.empresa_patrocinadora_id)
 or exists(select 1 from public.pago_patrocinador p where p.id=payment_id and p.importe is distinct from(select sum(a.importe) from public.pago_patrocinador_aplicacion a where a.pago_id=p.id))
 or exists(select 1 from public.pago_patrocinador_aplicacion a join public.pago_patrocinador p on p.id=a.pago_id join public.factura_patrocinador f on f.id=a.factura_id
 where (a.pago_id=payment_id or a.factura_id=invoice_id) and (f.empresa_patrocinadora_id<>p.empresa_patrocinadora_id or (p.estado_codigo='CONFIRMADO' and (f.anulado_at is not null or f.estado_codigo<>'PENDIENTE_DESEMBOLSO' or p.fecha_efectiva<f.fecha_emision))))
 or exists(select 1 from public.factura_patrocinador_saldo s where (s.id=invoice_id or s.id in(select a.factura_id from public.pago_patrocinador_aplicacion a where a.pago_id=payment_id)) and s.pendiente<0) then
 raise exception using errcode='23514',message='H7_RELATION_OR_BALANCE_INVALID'; end if;
 return null;
end $$;
create function private.audit_h7() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.auditoria(entidad,registro_id,accion,actor,motivo,new_values)
 values(tg_table_name,new.id,case when tg_op='INSERT' then 'H7_REGISTRADO' when new.anulado_at is not null then 'H7_ANULADO' else 'H7_ACTUALIZADO' end,auth.uid(),new.motivo_anulacion,
 jsonb_build_object('id',new.id,'estado_codigo',new.estado_codigo,'importe',coalesce(to_jsonb(new)->'importe',to_jsonb(new)->'monto')));
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['orden_servicio','orden_servicio_matricula','factura_patrocinador','factura_orden_servicio','pago_patrocinador','pago_patrocinador_aplicacion','orden_servicio_archivo'] loop
 execute format('create trigger h7_history before update or delete on public.%I for each row execute function private.guard_h7_history()',t);
 if t<>'orden_servicio_archivo' then
 execute format('create constraint trigger h7_integrity after insert or update on public.%I deferrable initially deferred for each row execute function private.validate_h7_integrity()',t);
 end if;
 if t in ('orden_servicio','factura_patrocinador','pago_patrocinador') then
 execute format('create trigger h7_stamp before update on public.%I for each row execute function private.stamp_update()',t);
 execute format('create trigger h7_audit after insert or update on public.%I for each row execute function private.audit_h7()',t);
 end if;
 end loop;
end $$;
revoke all on function private.guard_h7_history(),private.validate_h7_integrity(),private.audit_h7() from public,anon,authenticated;
