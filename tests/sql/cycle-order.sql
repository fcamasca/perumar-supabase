begin isolation level serializable;
set local lock_timeout='3s';
create function pg_temp.order_input(cycle_id uuid,company uuid,number_text text,amount text) returns jsonb language sql as $$
 select jsonb_build_object('empresa_patrocinadora_id',company,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at,
 'serie','TEST','correlativo',number_text,'fecha','2026-01-01','monto',amount) from public.ciclo c where c.id=cycle_id
$$;
create function pg_temp.order_sponsor(cycle_id uuid,company uuid) returns public.ciclo language sql as $$
 select public.guardar_ciclo(jsonb_build_object('id',c.id,'expected_updated_at',c.updated_at,'carrera_id',c.carrera_id,'fecha_inicio',c.fecha_inicio,'fecha_fin',c.fecha_fin,
 'nombre_promocion',c.nombre_promocion,'departamento_id',c.departamento_id,'provincia_id',c.provincia_id,'distrito_id',c.distrito_id,'capitania_id',c.capitania_id,'empresa_patrocinadora_id',company)) from public.ciclo c where c.id=cycle_id
$$;
do $$
declare ctx jsonb; c public.ciclo; e public.matricula; fresh public.matricula; company uuid; other uuid;
 first_os public.orden_servicio; second_os public.orden_servicio; third_os public.orden_servicio; historic jsonb; before_audit bigint; medium uuid; cargo uuid;
begin
 select value into ctx from public.order_test_context;
 perform set_config('request.jwt.claim.sub',ctx->>'actor',true);
 company:=(public.guardar_empresa_patrocinadora('{"ruc":"20711111111","razon_social":"OS TEST"}')).id;
 other:=(public.guardar_empresa_patrocinadora('{"ruc":"20722222222","razon_social":"OTHER OS TEST"}')).id;
 select * into c from public.ciclo where id=(ctx->>'cycle')::uuid;
 select * into e from public.matricula where id=(ctx->>'second_enrollment')::uuid;
 e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at));
 c:=pg_temp.order_sponsor(c.id,company);
 -- Synthetic pre-amendment reference: preserve it, including short zero padding.
 insert into public.orden_servicio(empresa_patrocinadora_id,ciclo_id,serie,correlativo,fecha,monto,registrado_por,estado_codigo,motivo_anulacion,anulado_por,anulado_at)
 values(company,c.id,'TEST','42','2026-01-01',1,auth.uid(),'ANULADA','LEGACY SYNTHETIC',auth.uid(),clock_timestamp());
 begin perform public.registrar_orden_servicio(pg_temp.order_input(c.id,company,'0000000042','1'));raise exception 'Legacy equivalent reference accepted';exception when unique_violation then null;end;
 if not exists(select 1 from public.orden_servicio where empresa_patrocinadora_id=company and correlativo='42') then raise exception 'Legacy reference rewritten';end if;
 if not exists(select 1 from public.ciclo_orden_servicio_saldo where id=c.id and total_matriculas=200 and cubierto_os=0 and saldo_por_cubrir=200 and matriculas_activas=2) then raise exception 'Initial projection wrong';end if;
 -- Client cannot select a subset or supply authoritative totals.
 begin perform public.registrar_orden_servicio(pg_temp.order_input(c.id,company,'1','60')||jsonb_build_object('matriculas','[]'::jsonb));raise exception 'Client roster accepted';exception when invalid_parameter_value then null;end;
 begin perform public.registrar_orden_servicio(pg_temp.order_input(c.id,other,'1','60'));raise exception 'Foreign sponsor accepted';exception when check_violation then if sqlerrm<>'H7_CYCLE_SPONSOR_MISMATCH' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',ctx->>'coordinator',true);
 first_os:=public.registrar_orden_servicio(pg_temp.order_input(c.id,company,'1','60'));
 if first_os.correlativo<>'1' or first_os.monto<>60 or (select count(*) from public.orden_servicio_matricula where orden_servicio_id=first_os.id)<>2 then raise exception 'Automatic roster or entered reference wrong';end if;
 if not exists(select 1 from public.ciclo_orden_servicio_saldo where id=c.id and cubierto_os=60 and saldo_por_cubrir=140) then raise exception 'Coverage not derived';end if;
 -- Bounds and input precision; a rejected call leaves no order/audit residue.
 select count(*) into before_audit from public.auditoria;
 begin perform public.registrar_orden_servicio(pg_temp.order_input(c.id,company,'2','140.01'));raise exception 'Overcoverage accepted';exception when check_violation then if sqlerrm<>'H7_OS_EXCEEDS_CYCLE_BALANCE' then raise;end if;end;
 if (select count(*) from public.auditoria)<>before_audit then raise exception 'Rejected order leaked audit';end if;
 begin perform public.registrar_orden_servicio(pg_temp.order_input(c.id,company,'0000000001','1'));raise exception 'Equivalent reference accepted';exception when unique_violation then null;end;
 begin perform public.registrar_orden_servicio(pg_temp.order_input(c.id,company,'123456789012345678901','1'));raise exception 'Long reference accepted';exception when invalid_parameter_value then null;end;
 second_os:=public.registrar_orden_servicio(pg_temp.order_input(c.id,company,'0002','140'));
 if second_os.correlativo<>'0002' then raise exception 'Entered leading zeros were changed';end if;
 if not exists(select 1 from public.ciclo_orden_servicio_saldo where id=c.id and saldo_por_cubrir=0) then raise exception 'Full coverage not zero';end if;
 begin perform public.registrar_orden_servicio(pg_temp.order_input(c.id,company,'3','1'));raise exception 'Zero-balance order accepted';exception when check_violation then null;end;
 perform set_config('request.jwt.claim.sub',ctx->>'actor',true);
 perform public.anular_orden_servicio(first_os.id,first_os.updated_at,'SYNTHETIC');
 if not exists(select 1 from public.ciclo_orden_servicio_saldo where id=c.id and cubierto_os=140 and saldo_por_cubrir=60) then raise exception 'Annulment did not release coverage';end if;
 select jsonb_build_object('order',to_jsonb(o),'links',(select jsonb_agg(to_jsonb(x) order by matricula_id) from public.orden_servicio_matricula x where orden_servicio_id=o.id)) into historic from public.orden_servicio o where id=second_os.id;
 c:=pg_temp.order_sponsor(c.id,other);
 -- Prior sponsor OS still covers this same Cycle. History is never reassigned.
 begin perform public.registrar_orden_servicio(pg_temp.order_input(c.id,other,'3','61'));raise exception 'Former sponsor coverage ignored';exception when check_violation then null;end;
 third_os:=public.registrar_orden_servicio(pg_temp.order_input(c.id,other,'3','60'));
 if historic is distinct from (select jsonb_build_object('order',to_jsonb(o),'links',(select jsonb_agg(to_jsonb(x) order by matricula_id) from public.orden_servicio_matricula x where orden_servicio_id=o.id)) from public.orden_servicio o where id=second_os.id) then raise exception 'Historical order changed';end if;
 -- Annulled enrollments leave the current total but historical associations stay.
 select * into e from public.matricula where id=e.id;
 perform public.anular_matricula(e.id,e.updated_at,'SYNTHETIC');
 if not exists(select 1 from public.ciclo_orden_servicio_saldo where id=c.id and total_matriculas=100 and saldo_por_cubrir=0 and matriculas_activas=1) then raise exception 'Active enrollment total wrong';end if;
 fresh:=public.registrar_matricula(jsonb_build_object('ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at,'alumno_id',ctx->>'third_student','expected_alumno_updated_at',(select updated_at from public.alumno where id=(ctx->>'third_student')::uuid)));
 if exists(select 1 from public.orden_servicio_matricula where matricula_id=fresh.id) or (select count(*) from public.orden_servicio_matricula where orden_servicio_id=third_os.id)<>2 then raise exception 'Old roster expanded';end if;
 -- Payments do not count as OS coverage or reduce total charges.
 perform public.anular_orden_servicio(third_os.id,third_os.updated_at,'SYNTHETIC');
 c:=pg_temp.order_sponsor(c.id,null);
 select id into medium from public.catalogo_valor where catalogo_id=(select id from public.catalogo where codigo='MEDIO_PAGO') and codigo='EFECTIVO';
 select id into cargo from public.matricula_cargo where matricula_id=fresh.id and activo limit 1;
 select * into fresh from public.matricula where id=fresh.id;
 perform public.registrar_pago(jsonb_build_object('matricula_id',fresh.id,'expected_matricula_updated_at',fresh.updated_at,'idempotency_key',gen_random_uuid(),'importe','1','medio_pago_id',medium,'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo,'importe','1'))));
 if not exists(select 1 from public.ciclo_orden_servicio_saldo where id=c.id and total_matriculas=200 and cubierto_os=140 and saldo_por_cubrir=60) then raise exception 'Private payment mixed with OS coverage';end if;
 if not exists(select 1 from pg_class where oid='public.ciclo_orden_servicio_saldo'::regclass and reloptions @> array['security_invoker=true']) then raise exception 'View must respect RLS';end if;
 raise notice 'Focused Cycle OS checks PASSED';
end $$;
rollback;
