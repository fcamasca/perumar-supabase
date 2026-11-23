-- Specific H7 commands. No byte endpoints, reports or client DML.
create function public.registrar_orden_servicio(p jsonb) returns public.orden_servicio
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.orden_servicio; c public.ciclo; m public.matricula; item jsonb; ids uuid[]; students uuid[]; company uuid; total numeric;
begin
 perform private.authorize(false);
 if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'matriculas') is distinct from 'array' then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 perform private.assert_fields(p-'matriculas',array['empresa_patrocinadora_id','ciclo_id','expected_ciclo_updated_at','serie','correlativo','fecha','monto','observacion']);
 if jsonb_array_length(p->'matriculas')<1 or coalesce(p->>'monto','') !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
 or coalesce(p->>'fecha','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 total:=(p->>'monto')::numeric; company:=(p->>'empresa_patrocinadora_id')::uuid;
 for item in select value from jsonb_array_elements(p->'matriculas') loop
 perform private.assert_fields(item,array['id','expected_updated_at']);
 if nullif(item->>'id','') is null or nullif(item->>'expected_updated_at','') is null then raise exception using errcode='22023',message='H7_SELECTION_INVALID'; end if;
 ids:=array_append(ids,(item->>'id')::uuid);
 end loop;
 if cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception using errcode='22023',message='H7_SELECTION_DUPLICATED'; end if;
 select * into c from public.ciclo where id=(p->>'ciclo_id')::uuid for update;
 perform private.require_version(c.updated_at,(p->>'expected_ciclo_updated_at')::timestamptz);
 if c.estado_codigo not in ('PROGRAMADO','EN_CURSO','CERRADO') then raise exception using errcode='23514',message='H7_CYCLE_INELIGIBLE'; end if;
 select array_agg(distinct alumno_id order by alumno_id) into students from public.matricula where id=any(ids);
 perform 1 from public.alumno where id=any(students) order by id for update;
 perform 1 from public.matricula where id=any(ids) order by id for update;
 for item in select value from jsonb_array_elements(p->'matriculas') loop
 select * into m from public.matricula where id=(item->>'id')::uuid;
 perform private.require_version(m.updated_at,(item->>'expected_updated_at')::timestamptz);
 if m.ciclo_id<>c.id or not(m.alumno_id=any(students)) then raise exception using errcode='PT409',message='H7_SELECTION_CONTEXT_CHANGED'; end if;
 if m.estado_codigo<>'ACTIVO' or m.empresa_patrocinadora_id is distinct from company then raise exception using errcode='23514',message='H7_SELECTION_INELIGIBLE'; end if;
 end loop;
 perform 1 from public.empresa_patrocinadora where id=company for update;
 if not found then raise exception using errcode='22023',message='H7_SPONSOR_INVALID'; end if;
 insert into public.orden_servicio(empresa_patrocinadora_id,ciclo_id,serie,correlativo,fecha,monto,observacion,registrado_por)
 values(company,c.id,upper(btrim(p->>'serie')),btrim(p->>'correlativo'),(p->>'fecha')::date,total,nullif(btrim(p->>'observacion'),''),auth.uid()) returning * into r;
 insert into public.orden_servicio_matricula select r.id,x from unnest(ids) x;
 return r;
end $$;

create function public.registrar_factura_patrocinador(p jsonb) returns public.factura_patrocinador
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.factura_patrocinador; o public.orden_servicio; item jsonb; ids uuid[]; company uuid; amount numeric; suggested numeric:=0;
begin
 perform private.authorize(false);
 if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'ordenes') is distinct from 'array' then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 perform private.assert_fields(p-'ordenes',array['empresa_patrocinadora_id','serie','correlativo','importe','fecha_emision','fecha_vencimiento','observacion','confirmar_diferencia']);
 if jsonb_array_length(p->'ordenes')<1 or coalesce(p->>'importe','') !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
 or coalesce(p->>'fecha_emision','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or coalesce(p->>'fecha_vencimiento','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or (p->>'fecha_emision')::date>(now() at time zone 'America/Lima')::date then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 company:=(p->>'empresa_patrocinadora_id')::uuid; amount:=(p->>'importe')::numeric;
 for item in select value from jsonb_array_elements(p->'ordenes') loop
 perform private.assert_fields(item,array['id','expected_updated_at']);
 if nullif(item->>'id','') is null or nullif(item->>'expected_updated_at','') is null then raise exception using errcode='22023',message='H7_SELECTION_INVALID'; end if;
 ids:=array_append(ids,(item->>'id')::uuid);
 end loop;
 if cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception using errcode='22023',message='H7_SELECTION_DUPLICATED'; end if;
 perform 1 from public.empresa_patrocinadora where id=company for update;
 if not found then raise exception using errcode='22023',message='H7_SPONSOR_INVALID'; end if;
 perform 1 from public.orden_servicio where id=any(ids) order by id for update;
 for item in select value from jsonb_array_elements(p->'ordenes') loop
 select * into o from public.orden_servicio where id=(item->>'id')::uuid;
 perform private.require_version(o.updated_at,(item->>'expected_updated_at')::timestamptz);
 if o.empresa_patrocinadora_id<>company or o.estado_codigo<>'VIGENTE' then raise exception using errcode='23514',message='H7_OS_INELIGIBLE'; end if;
 suggested:=suggested+o.monto;
 end loop;
 if amount<>suggested and (p->>'confirmar_diferencia') is distinct from 'true' then raise exception using errcode='23514',message='H7_DIFFERENCE_CONFIRMATION_REQUIRED'; end if;
 insert into public.factura_patrocinador(empresa_patrocinadora_id,serie,correlativo,importe,fecha_emision,fecha_vencimiento,observacion,registrado_por)
 values(company,upper(btrim(p->>'serie')),btrim(p->>'correlativo'),amount,(p->>'fecha_emision')::date,(p->>'fecha_vencimiento')::date,nullif(btrim(p->>'observacion'),''),auth.uid()) returning * into r;
 insert into public.factura_orden_servicio select r.id,x from unnest(ids) x;
 return r;
end $$;

create function public.avanzar_factura_patrocinador(id uuid,expected_updated_at timestamptz,destino text,fecha date)
returns public.factura_patrocinador language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.factura_patrocinador; company uuid; next_state text; prior_date date;
begin
 perform private.authorize(false);
 select f.empresa_patrocinadora_id into company from public.factura_patrocinador f where f.id=avanzar_factura_patrocinador.id;
 perform 1 from public.empresa_patrocinadora e where e.id=company for update;
 select * into r from public.factura_patrocinador f where f.id=avanzar_factura_patrocinador.id for update;
 perform private.require_version(r.updated_at,expected_updated_at);
 next_state:=case r.estado_codigo when 'EMITIDA' then 'REGISTRADA_PATROCINADOR' when 'REGISTRADA_PATROCINADOR' then 'APROBADA' when 'APROBADA' then 'PENDIENTE_DESEMBOLSO' end;
 prior_date:=coalesce(r.fecha_aprobada,r.fecha_registrada_patrocinador,r.fecha_emision);
 if destino is distinct from next_state or next_state is null or r.anulado_at is not null or fecha is null or fecha<prior_date or fecha>(now() at time zone 'America/Lima')::date then
 raise exception using errcode='23514',message='H7_WORKFLOW_INVALID'; end if;
 update public.factura_patrocinador f set estado_codigo=destino,
 fecha_registrada_patrocinador=case when destino='REGISTRADA_PATROCINADOR' then fecha else f.fecha_registrada_patrocinador end,
 fecha_aprobada=case when destino='APROBADA' then fecha else f.fecha_aprobada end,
 fecha_pendiente_desembolso=case when destino='PENDIENTE_DESEMBOLSO' then fecha else f.fecha_pendiente_desembolso end
 where f.id=r.id returning * into r;
 return r;
end $$;

create function public.registrar_pago_patrocinador(p jsonb) returns jsonb
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.pago_patrocinador; f public.factura_patrocinador; item jsonb; apps jsonb:='[]'; ids uuid[]; company uuid; op uuid;
 amount numeric; total numeric:=0; paid numeric; bank text; reference text; notes text; effective date;
begin
 perform private.authorize(false);
 if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'aplicaciones') is distinct from 'array' then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 perform private.assert_fields(p-'aplicaciones',array['empresa_patrocinadora_id','idempotency_key','importe','fecha_efectiva','banco','referencia_operacion','observacion']);
 if jsonb_array_length(p->'aplicaciones')<1 or coalesce(p->>'importe','') !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
 or coalesce(p->>'fecha_efectiva','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 company:=(p->>'empresa_patrocinadora_id')::uuid; op:=(p->>'idempotency_key')::uuid;
 bank:=btrim(p->>'banco'); reference:=nullif(btrim(p->>'referencia_operacion'),''); notes:=nullif(btrim(p->>'observacion'),'');
 effective:=(p->>'fecha_efectiva')::date; amount:=(p->>'importe')::numeric;
 if company is null or op is null or amount<=0 or coalesce(length(bank),0) not between 1 and 150 or length(reference)>150 or length(notes)>500 then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 for item in select value from jsonb_array_elements(p->'aplicaciones') loop
 perform private.assert_fields(item,array['factura_id','importe','expected_updated_at']);
 if nullif(item->>'factura_id','') is null or coalesce(item->>'importe','') !~ '^[0-9]{1,10}([.][0-9]{1,2})?$' or (item->>'importe')::numeric<=0 then raise exception using errcode='22023',message='H7_APPLICATION_INVALID'; end if;
 ids:=array_append(ids,(item->>'factura_id')::uuid);
 apps:=apps||jsonb_build_array(jsonb_build_object('factura_id',(item->>'factura_id')::uuid,'importe',(item->>'importe')::numeric));
 total:=total+(item->>'importe')::numeric;
 end loop;
 if total<>amount or cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception using errcode='22023',message='H7_APPLICATION_INVALID'; end if;
 select jsonb_agg(x order by x->>'factura_id') into apps from jsonb_array_elements(apps) x;
 perform 1 from public.empresa_patrocinadora where id=company for update;
 if not found then raise exception using errcode='22023',message='H7_SPONSOR_INVALID'; end if;
 -- Recovery has the same Company -> Invoice -> Payment order and no business eligibility recheck.
 perform 1 from public.factura_patrocinador where id=any(ids) order by id for update;
 select * into r from public.pago_patrocinador where idempotency_key=op for update;
 if r.id is not null then
 if r.empresa_patrocinadora_id<>company or r.importe<>amount or r.fecha_efectiva<>effective or r.banco<>bank
 or r.referencia_operacion is distinct from reference or r.observacion is distinct from notes or apps is distinct from
 (select jsonb_agg(jsonb_build_object('factura_id',a.factura_id,'importe',a.importe) order by a.factura_id::text) from public.pago_patrocinador_aplicacion a where a.pago_id=r.id) then
 raise exception using errcode='PT409',message='H7_IDEMPOTENCY_CONFLICT'; end if;
 return to_jsonb(r)||jsonb_build_object('aplicaciones',apps);
 end if;
 if effective>(now() at time zone 'America/Lima')::date then raise exception using errcode='23514',message='H7_PAYMENT_DATE_INVALID'; end if;
 for item in select value from jsonb_array_elements(apps) loop
 select * into f from public.factura_patrocinador where id=(item->>'factura_id')::uuid;
 if f.id is null or f.empresa_patrocinadora_id<>company or f.anulado_at is not null or f.estado_codigo<>'PENDIENTE_DESEMBOLSO' then raise exception using errcode='23514',message='H7_INVOICE_INELIGIBLE'; end if;
 perform private.require_version(f.updated_at,(select (x->>'expected_updated_at')::timestamptz from jsonb_array_elements(p->'aplicaciones') x where (x->>'factura_id')::uuid=f.id));
 if effective<f.fecha_emision then raise exception using errcode='23514',message='H7_PAYMENT_DATE_INVALID'; end if;
 select coalesce(sum(a.importe),0) into paid from public.pago_patrocinador_aplicacion a join public.pago_patrocinador pay on pay.id=a.pago_id where a.factura_id=f.id and pay.estado_codigo='CONFIRMADO';
 if (item->>'importe')::numeric>f.importe-paid then raise exception using errcode='23514',message='H7_EXCEEDS_PENDING'; end if;
 end loop;
 begin
 insert into public.pago_patrocinador(empresa_patrocinadora_id,idempotency_key,importe,fecha_efectiva,banco,referencia_operacion,observacion,registrado_por)
 values(company,op,amount,effective,bank,reference,notes,auth.uid()) returning * into r;
 exception when unique_violation then raise exception using errcode='PT409',message='H7_IDEMPOTENCY_CONFLICT'; end;
 insert into public.pago_patrocinador_aplicacion select r.id,(x->>'factura_id')::uuid,(x->>'importe')::numeric from jsonb_array_elements(apps) x;
 update public.factura_patrocinador set updated_at=clock_timestamp() where id=any(ids);
 return to_jsonb(r)||jsonb_build_object('aplicaciones',apps);
end $$;

create function public.anular_orden_servicio(id uuid,expected_updated_at timestamptz,motivo text) returns public.orden_servicio
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.orden_servicio; company uuid;
begin
 perform private.authorize(true);
 if coalesce(length(btrim(motivo)),0) not between 1 and 500 then raise exception using errcode='22023',message='H7_REASON_REQUIRED'; end if;
 select o.empresa_patrocinadora_id into company from public.orden_servicio o where o.id=anular_orden_servicio.id;
 perform 1 from public.empresa_patrocinadora e where e.id=company for update;
 select * into r from public.orden_servicio o where o.id=anular_orden_servicio.id for update;
 perform private.require_version(r.updated_at,expected_updated_at);
 if r.estado_codigo<>'VIGENTE' then raise exception using errcode='23514',message='H7_ALREADY_CANCELLED'; end if;
 update public.orden_servicio o set estado_codigo='ANULADA',motivo_anulacion=btrim(motivo),anulado_por=auth.uid(),anulado_at=clock_timestamp() where o.id=r.id returning * into r;
 return r;
end $$;

create function public.anular_factura_patrocinador(id uuid,expected_updated_at timestamptz,motivo text) returns public.factura_patrocinador
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.factura_patrocinador; company uuid;
begin
 perform private.authorize(true);
 if coalesce(length(btrim(motivo)),0) not between 1 and 500 then raise exception using errcode='22023',message='H7_REASON_REQUIRED'; end if;
 select f.empresa_patrocinadora_id into company from public.factura_patrocinador f where f.id=anular_factura_patrocinador.id;
 perform 1 from public.empresa_patrocinadora e where e.id=company for update;
 select * into r from public.factura_patrocinador f where f.id=anular_factura_patrocinador.id for update;
 perform private.require_version(r.updated_at,expected_updated_at);
 if r.anulado_at is not null then raise exception using errcode='23514',message='H7_ALREADY_CANCELLED'; end if;
 update public.factura_patrocinador f set motivo_anulacion=btrim(motivo),anulado_por=auth.uid(),anulado_at=clock_timestamp() where f.id=r.id returning * into r;
 return r;
end $$;

create function public.anular_pago_patrocinador(id uuid,expected_updated_at timestamptz,motivo text) returns public.pago_patrocinador
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.pago_patrocinador; company uuid; ids uuid[];
begin
 perform private.authorize(true);
 if coalesce(length(btrim(motivo)),0) not between 1 and 500 then raise exception using errcode='22023',message='H7_REASON_REQUIRED'; end if;
 select pay.empresa_patrocinadora_id into company from public.pago_patrocinador pay where pay.id=anular_pago_patrocinador.id;
 select array_agg(a.factura_id order by a.factura_id) into ids from public.pago_patrocinador_aplicacion a where a.pago_id=anular_pago_patrocinador.id;
 perform 1 from public.empresa_patrocinadora e where e.id=company for update;
 perform 1 from public.factura_patrocinador where factura_patrocinador.id=any(ids) order by factura_patrocinador.id for update;
 select * into r from public.pago_patrocinador pay where pay.id=anular_pago_patrocinador.id for update;
 perform private.require_version(r.updated_at,expected_updated_at);
 if r.estado_codigo<>'CONFIRMADO' then raise exception using errcode='23514',message='H7_ALREADY_CANCELLED'; end if;
 update public.pago_patrocinador pay set estado_codigo='ANULADO',motivo_anulacion=btrim(motivo),anulado_por=auth.uid(),anulado_at=clock_timestamp() where pay.id=r.id returning * into r;
 update public.factura_patrocinador set updated_at=clock_timestamp() where factura_patrocinador.id=any(ids);
 return r;
end $$;

revoke all on function public.registrar_orden_servicio(jsonb),public.registrar_factura_patrocinador(jsonb),public.registrar_pago_patrocinador(jsonb),
 public.avanzar_factura_patrocinador(uuid,timestamptz,text,date),public.anular_orden_servicio(uuid,timestamptz,text),
 public.anular_factura_patrocinador(uuid,timestamptz,text),public.anular_pago_patrocinador(uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.registrar_orden_servicio(jsonb),public.registrar_factura_patrocinador(jsonb),public.registrar_pago_patrocinador(jsonb),
 public.avanzar_factura_patrocinador(uuid,timestamptz,text,date),public.anular_orden_servicio(uuid,timestamptz,text),
 public.anular_factura_patrocinador(uuid,timestamptz,text),public.anular_pago_patrocinador(uuid,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
