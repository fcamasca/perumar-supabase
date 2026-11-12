-- H4 Gate 1: 15f5e80. No stored debt or client financial DML.
create table public.pago (
 id uuid primary key default gen_random_uuid(),
 matricula_id uuid not null references public.matricula(id),
 idempotency_key uuid not null unique,
 importe numeric(12,2) not null check(importe>0 and importe::text not in ('NaN','Infinity','-Infinity')),
 medio_pago_id uuid not null references public.catalogo_valor(id),
 medio_codigo text not null, medio_etiqueta text not null,
 observaciones text check(observaciones is null or (length(observaciones) between 1 and 500 and observaciones=btrim(observaciones))),
 estado_codigo text not null default 'CONFIRMADO' check(estado_codigo in ('CONFIRMADO','ANULADO')),
 registrado_por uuid not null,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 motivo_anulacion text, anulado_por uuid, anulado_at timestamptz,
 check((estado_codigo='CONFIRMADO' and motivo_anulacion is null and anulado_por is null and anulado_at is null)
 or (estado_codigo='ANULADO' and coalesce(length(btrim(motivo_anulacion)),0) between 1 and 500 and anulado_por is not null and anulado_at is not null))
);
create table public.pago_aplicacion (
 id uuid primary key default gen_random_uuid(), pago_id uuid not null references public.pago(id),
 matricula_cargo_id uuid not null references public.matricula_cargo(id),
 importe numeric(12,2) not null check(importe>0 and importe::text not in ('NaN','Infinity','-Infinity')),
 unique(pago_id,matricula_cargo_id)
);
create index pago_matricula_fecha on public.pago(matricula_id,created_at desc,id);
create index pago_aplicacion_cargo on public.pago_aplicacion(matricula_cargo_id,pago_id);
alter table public.pago enable row level security;
alter table public.pago_aplicacion enable row level security;
revoke all on public.pago,public.pago_aplicacion from public,anon,authenticated;
grant select on public.pago,public.pago_aplicacion to authenticated;
create policy payment_read on public.pago for select to authenticated using(private.academic_user());
create policy payment_read on public.pago_aplicacion for select to authenticated using(private.academic_user());

insert into public.catalogo(codigo,nombre) values('MEDIO_PAGO','Medio de pago');
insert into public.catalogo_valor(catalogo_id,codigo,nombre)
select c.id,v.codigo,v.nombre from public.catalogo c cross join (values
 ('EFECTIVO','Efectivo'),('YAPE','Yape'),('PLIN','Plin'),
 ('TRANSFERENCIA_BANCARIA','Transferencia bancaria'),('TARJETA','Tarjeta')) v(codigo,nombre)
where c.codigo='MEDIO_PAGO';

-- Invoker views use the SAME complete D/O read scope for charges and payments.
-- Charge projection supports manual allocation; enrollment projection is independent of pagination.
create view public.matricula_cargo_saldo with(security_invoker=true) as
select c.id,c.matricula_id,c.nombre,c.tipo,c.activo,c.importe_final,
 coalesce(a.abonado,0::numeric) as abonado,
 c.importe_final-coalesce(a.abonado,0::numeric) as pendiente
from public.matricula_cargo c left join lateral (
 select sum(pa.importe) abonado from public.pago_aplicacion pa join public.pago p on p.id=pa.pago_id
 where pa.matricula_cargo_id=c.id and p.estado_codigo='CONFIRMADO'
) a on true;
create view public.matricula_saldo with(security_invoker=true) as
select m.id as matricula_id,coalesce(sum(c.importe_final),0::numeric) base,
 coalesce(sum(c.abonado),0::numeric) abonado,coalesce(sum(c.pendiente),0::numeric) pendiente
from public.matricula m left join public.matricula_cargo_saldo c on c.matricula_id=m.id and c.activo group by m.id;
revoke all on public.matricula_cargo_saldo,public.matricula_saldo from public,anon,authenticated;
grant select on public.matricula_cargo_saldo,public.matricula_saldo to authenticated;

-- Deferred aggregate invariant: a payment and its applications commit together.
-- No caller-selected table, SQL, state machine or alternate write API.
create function private.validate_payment_applications() returns trigger
language plpgsql set search_path='' as $$
declare payment public.pago; subject uuid;
begin
 if tg_table_name='pago' then subject:=new.id; else subject:=new.pago_id; end if;
 select * into strict payment from public.pago where id=subject;
 if payment.importe is distinct from (select sum(importe) from public.pago_aplicacion where pago_id=subject)
 or exists(select 1 from public.pago_aplicacion a join public.matricula_cargo c on c.id=a.matricula_cargo_id
 where a.pago_id=subject and c.matricula_id<>payment.matricula_id) then
 raise exception using errcode='23514',message='PAYMENT_APPLICATIONS_INVALID'; end if;
 if exists(select 1 from public.matricula_cargo c where c.id in(select matricula_cargo_id from public.pago_aplicacion where pago_id=subject)
 and (select coalesce(sum(a.importe),0) from public.pago_aplicacion a join public.pago p on p.id=a.pago_id where a.matricula_cargo_id=c.id and p.estado_codigo='CONFIRMADO')
 >case when c.activo then c.importe_final else 0 end) then
 raise exception using errcode='23514',message='PAYMENT_EXCEEDS_PENDING'; end if;
 return null;
end $$;
revoke all on function private.validate_payment_applications() from public,anon,authenticated;
create constraint trigger pago_applications_valid after insert or update on public.pago deferrable initially deferred
for each row execute function private.validate_payment_applications();
create constraint trigger pago_aplicacion_valid after insert on public.pago_aplicacion deferrable initially deferred
for each row execute function private.validate_payment_applications();

-- Dedicated immutable-history guard, not an API. Existing stamp helper reused.
create function private.guard_payment_history() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' or tg_table_name='pago_aplicacion' then
 raise exception using errcode='23514',message='PAYMENT_HISTORY_IMMUTABLE'; end if;
 if old.estado_codigo<>'CONFIRMADO' or new.estado_codigo<>'ANULADO'
 or (to_jsonb(new)-array['estado_codigo','updated_at','motivo_anulacion','anulado_por','anulado_at'])
 is distinct from (to_jsonb(old)-array['estado_codigo','updated_at','motivo_anulacion','anulado_por','anulado_at']) then
 raise exception using errcode='23514',message='PAYMENT_HISTORY_IMMUTABLE'; end if;
 if not exists(select 1 from public.matricula where id=old.matricula_id and estado_codigo='ACTIVO') then
 raise exception using errcode='23514',message='PAYMENT_ENROLLMENT_INACTIVE'; end if;
 return new;
end $$;
revoke all on function private.guard_payment_history() from public,anon,authenticated;
create trigger pago_history before update or delete on public.pago for each row execute function private.guard_payment_history();
create trigger pago_aplicacion_history before update or delete on public.pago_aplicacion for each row execute function private.guard_payment_history();
create trigger pago_stamp before update on public.pago for each row execute function private.stamp_update();
notify pgrst,'reload schema';
