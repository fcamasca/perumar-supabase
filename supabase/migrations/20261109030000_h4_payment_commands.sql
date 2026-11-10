-- Concrete payment commands. Values are validated as text BEFORE numeric(12,2) casts.
create function public.registrar_pago(p jsonb) returns jsonb
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare prior public.matricula; enrollment public.matricula; result public.pago;
 cycle public.ciclo; medium public.catalogo_valor; item jsonb; normalized jsonb:='[]';
 amount numeric; total numeric:=0; cargo public.matricula_cargo; applied numeric;
 operation_key uuid; enrollment_id uuid; notes text;
begin
 perform private.authorize(false);
 -- assert_fields handles scalar values; applications have their own bounded whitelist.
 if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'aplicaciones') is distinct from 'array'
 or jsonb_array_length(p->'aplicaciones')<1 then
 raise exception using errcode='22023',message='PAYMENT_INPUT_INVALID'; end if;
 perform private.assert_fields(p-'aplicaciones',array['matricula_id','idempotency_key','importe','medio_pago_id','observaciones','expected_matricula_updated_at']);
 if coalesce(p->>'importe','') !~ '^[0-9]{1,10}([.][0-9]{1,2})?$' then
 raise exception using errcode='22023',message='PAYMENT_PRECISION_INVALID'; end if;
 amount:=(p->>'importe')::numeric;
 if amount<=0 then raise exception using errcode='22023',message='PAYMENT_AMOUNT_POSITIVE'; end if;
 notes:=nullif(btrim(p->>'observaciones'),'');
 if length(notes)>500 then raise exception using errcode='22023',message='PAYMENT_NOTES_TOO_LONG'; end if;
 operation_key:=(p->>'idempotency_key')::uuid; enrollment_id:=(p->>'matricula_id')::uuid;
 if operation_key is null or enrollment_id is null or nullif(p->>'medio_pago_id','') is null then
 raise exception using errcode='22023',message='PAYMENT_INPUT_INVALID'; end if;
 for item in select value from jsonb_array_elements(p->'aplicaciones') loop
 perform private.assert_fields(item,array['matricula_cargo_id','importe']);
 if nullif(item->>'matricula_cargo_id','') is null or coalesce(item->>'importe','') !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
 or (item->>'importe')::numeric<=0 then raise exception using errcode='22023',message='PAYMENT_APPLICATION_AMOUNT_INVALID'; end if;
 normalized:=normalized||jsonb_build_array(jsonb_build_object('matricula_cargo_id',(item->>'matricula_cargo_id')::uuid,'importe',(item->>'importe')::numeric));
 total:=total+(item->>'importe')::numeric;
 end loop;
 if total<>amount or exists(select 1 from jsonb_array_elements(normalized) x group by x->>'matricula_cargo_id' having count(*)>1) then
 raise exception using errcode='22023',message='PAYMENT_APPLICATIONS_INVALID'; end if;
 select jsonb_agg(x order by x->>'matricula_cargo_id') into normalized from jsonb_array_elements(normalized) x;
 select * into prior from public.matricula where id=enrollment_id;
 if prior.id is null then raise exception using errcode='22023',message='PAYMENT_ENROLLMENT_NOT_FOUND'; end if;
 -- Same coordination as editar/anular_matricula: Cycle -> Student -> Enrollment -> Charges -> Payments.
 select * into cycle from public.ciclo where id=prior.ciclo_id for update;
 perform 1 from public.alumno where id=prior.alumno_id for update;
 select * into enrollment from public.matricula where id=prior.id for update;
 if enrollment.ciclo_id<>prior.ciclo_id or enrollment.alumno_id<>prior.alumno_id then
 raise exception using errcode='40001',message='PAYMENT_VERSION_CONFLICT'; end if;
 perform 1 from public.matricula_cargo where matricula_id=enrollment.id order by id for update;
 select * into result from public.pago where idempotency_key=operation_key for update;
 -- Recovery precedes current version/state/catalog eligibility. Authorization always precedes recovery.
 if result.id is not null then
 if result.matricula_id<>enrollment.id or result.importe<>amount or result.medio_pago_id<>(p->>'medio_pago_id')::uuid
 or result.observaciones is distinct from notes or normalized is distinct from
 (select jsonb_agg(jsonb_build_object('matricula_cargo_id',a.matricula_cargo_id,'importe',a.importe) order by a.matricula_cargo_id::text)
 from public.pago_aplicacion a where a.pago_id=result.id) then
 raise exception using errcode='23505',message='PAYMENT_IDEMPOTENCY_CONFLICT'; end if;
 return to_jsonb(result)||jsonb_build_object('aplicaciones',(select jsonb_agg(to_jsonb(a)||jsonb_build_object('concepto',(select c.nombre from public.matricula_cargo c where c.id=a.matricula_cargo_id)) order by a.matricula_cargo_id) from public.pago_aplicacion a where a.pago_id=result.id),'saldo',(select to_jsonb(s) from public.matricula_saldo s where s.matricula_id=result.matricula_id),'matricula_updated_at',(select m.updated_at from public.matricula m where m.id=result.matricula_id));
 end if;
 perform private.require_version(enrollment.updated_at,(p->>'expected_matricula_updated_at')::timestamptz);
 if enrollment.estado_codigo<>'ACTIVO' then raise exception using errcode='23514',message='PAYMENT_ENROLLMENT_INACTIVE'; end if;
 if cycle.estado_codigo not in ('PROGRAMADO','EN_CURSO','CERRADO') then
 raise exception using errcode='23514',message='PAYMENT_CYCLE_INELIGIBLE'; end if;
 perform private.require_catalog((p->>'medio_pago_id')::uuid,'MEDIO_PAGO');
 select * into strict medium from public.catalogo_valor where id=(p->>'medio_pago_id')::uuid for share;
 perform 1 from public.catalogo where id=medium.catalogo_id for share;
 perform private.require_catalog(medium.id,'MEDIO_PAGO');
 for item in select value from jsonb_array_elements(normalized) loop
 select * into cargo from public.matricula_cargo where id=(item->>'matricula_cargo_id')::uuid;
 if cargo.id is null or cargo.matricula_id<>enrollment.id or not cargo.activo then
 raise exception using errcode='23514',message='PAYMENT_CARGO_INVALID'; end if;
 select coalesce(sum(a.importe),0) into applied from public.pago_aplicacion a join public.pago pay on pay.id=a.pago_id
 where a.matricula_cargo_id=cargo.id and pay.estado_codigo='CONFIRMADO';
 if (item->>'importe')::numeric>cargo.importe_final-applied then
 raise exception using errcode='23514',message='PAYMENT_EXCEEDS_PENDING'; end if;
 end loop;
 insert into public.pago(matricula_id,idempotency_key,importe,medio_pago_id,medio_codigo,medio_etiqueta,observaciones,registrado_por)
 values(enrollment.id,operation_key,amount,medium.id,medium.codigo,medium.nombre,notes,auth.uid()) returning * into result;
 insert into public.pago_aplicacion(pago_id,matricula_cargo_id,importe)
 select result.id,(x->>'matricula_cargo_id')::uuid,(x->>'importe')::numeric from jsonb_array_elements(normalized) x;
 update public.matricula set updated_at=clock_timestamp() where id=enrollment.id;
 insert into public.auditoria(entidad,registro_id,accion,actor,new_values)
 values('pago',result.id,'REGISTRADO',auth.uid(),jsonb_build_object('pago_id',result.id,'matricula_id',enrollment.id));
 return to_jsonb(result)||jsonb_build_object('aplicaciones',(select jsonb_agg(to_jsonb(a)||jsonb_build_object('concepto',(select c.nombre from public.matricula_cargo c where c.id=a.matricula_cargo_id)) order by a.matricula_cargo_id) from public.pago_aplicacion a where a.pago_id=result.id),'saldo',(select to_jsonb(s) from public.matricula_saldo s where s.matricula_id=result.matricula_id),'matricula_updated_at',(select m.updated_at from public.matricula m where m.id=result.matricula_id));
end $$;

create function public.anular_pago(id uuid,expected_updated_at timestamptz,motivo text) returns jsonb
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare payment public.pago; prior public.matricula; enrollment public.matricula;
begin
 perform private.authorize(true);
 if coalesce(length(btrim(motivo)),0) not between 1 and 500 then
 raise exception using errcode='22023',message='PAYMENT_CANCELLATION_REASON_REQUIRED'; end if;
 select * into payment from public.pago pay where pay.id=anular_pago.id;
 if payment.id is null then raise exception using errcode='22023',message='PAYMENT_NOT_FOUND'; end if;
 select * into prior from public.matricula where public.matricula.id=payment.matricula_id;
 perform 1 from public.ciclo where public.ciclo.id=prior.ciclo_id for update;
 perform 1 from public.alumno where public.alumno.id=prior.alumno_id for update;
 select * into enrollment from public.matricula where public.matricula.id=prior.id for update;
 if enrollment.ciclo_id<>prior.ciclo_id or enrollment.alumno_id<>prior.alumno_id then
 raise exception using errcode='40001',message='PAYMENT_VERSION_CONFLICT'; end if;
 perform 1 from public.matricula_cargo where matricula_id=enrollment.id order by public.matricula_cargo.id for update;
 select * into payment from public.pago pay where pay.id=anular_pago.id for update;
 perform private.require_version(payment.updated_at,expected_updated_at);
 if payment.estado_codigo<>'CONFIRMADO' then raise exception using errcode='23514',message='PAYMENT_ALREADY_CANCELLED'; end if;
 if enrollment.estado_codigo<>'ACTIVO' then raise exception using errcode='23514',message='PAYMENT_ENROLLMENT_INACTIVE'; end if;
 update public.pago pay set estado_codigo='ANULADO',motivo_anulacion=btrim(motivo),anulado_por=auth.uid(),anulado_at=clock_timestamp()
 where pay.id=payment.id returning * into payment;
 update public.matricula set updated_at=clock_timestamp() where public.matricula.id=enrollment.id;
 insert into public.auditoria(entidad,registro_id,accion,actor,motivo,new_values)
 values('pago',payment.id,'ANULADO',auth.uid(),btrim(motivo),jsonb_build_object('pago_id',payment.id,'matricula_id',enrollment.id));
 return to_jsonb(payment)||jsonb_build_object('aplicaciones',(select jsonb_agg(to_jsonb(a)||jsonb_build_object('concepto',(select c.nombre from public.matricula_cargo c where c.id=a.matricula_cargo_id)) order by a.matricula_cargo_id) from public.pago_aplicacion a where a.pago_id=payment.id),'saldo',(select to_jsonb(s) from public.matricula_saldo s where s.matricula_id=payment.matricula_id),'matricula_updated_at',(select m.updated_at from public.matricula m where m.id=payment.matricula_id));
end $$;
revoke all on function public.registrar_pago(jsonb),public.anular_pago(uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.registrar_pago(jsonb),public.anular_pago(uuid,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
