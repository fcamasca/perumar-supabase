-- Focused sponsorship behavior only. Disposable schema + synthetic fixtures.
begin isolation level serializable;
set local lock_timeout='3s';
create function pg_temp.save_sponsor(cycle_id uuid,company uuid) returns public.ciclo
language plpgsql as $$
declare c public.ciclo;
begin
 select * into c from public.ciclo where id=cycle_id;
 return public.guardar_ciclo(jsonb_build_object('id',c.id,'expected_updated_at',c.updated_at,
 'carrera_id',c.carrera_id,'fecha_inicio',c.fecha_inicio,'fecha_fin',c.fecha_fin,'nombre_promocion',c.nombre_promocion,
 'departamento_id',c.departamento_id,'provincia_id',c.provincia_id,'distrito_id',c.distrito_id,'capitania_id',c.capitania_id,
 'empresa_patrocinadora_id',company));
end $$;
create function pg_temp.test_enroll(cycle_id uuid,student uuid,forged uuid) returns public.matricula
language sql as $$
 select public.registrar_matricula(jsonb_build_object('ciclo_id',cycle_id,'expected_ciclo_updated_at',(select updated_at from public.ciclo where id=cycle_id),
 'alumno_id',student,'expected_alumno_updated_at',(select updated_at from public.alumno where id=student),'empresa_patrocinadora_id',forged))
$$;
create function pg_temp.fail_sponsor() returns trigger language plpgsql as $$begin raise exception 'SPONSOR_ROLLBACK_TEST'; end $$;
do $$
declare ctx jsonb; actor uuid; student uuid; company uuid; other uuid; c public.ciclo; target public.ciclo;
 e public.matricula; moved public.matricula; fresh public.matricula; os public.orden_servicio; paid jsonb; payment_input jsonb;
 baseline jsonb; historic jsonb; medium uuid; cargo uuid; count_audit bigint;
begin
 select value into ctx from public.sponsor_test_context;
 actor:=(ctx->>'actor')::uuid; student:=(ctx->>'student')::uuid;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 select * into c from public.ciclo where id=(ctx->>'cycle')::uuid;
 select * into e from public.matricula where id=(ctx->>'enrollment')::uuid;
 company:=e.empresa_patrocinadora_id;
 select id into other from public.empresa_patrocinadora where id<>company limit 1;
 if c.empresa_patrocinadora_id is distinct from company or company is null then raise exception 'Unambiguous backfill failed';end if;
 if exists(select 1 from public.matricula m join public.ciclo cy on cy.id=m.ciclo_id where m.empresa_patrocinadora_id is distinct from cy.empresa_patrocinadora_id) then raise exception 'Backfill did not normalize NULL enrollments';end if;

 -- 1/2: creation and maintenance with/without a Cycle sponsor.
 target:=public.guardar_ciclo(jsonb_build_object('carrera_id',c.carrera_id,'fecha_inicio','2039-01-01','fecha_fin','2039-01-02',
 'departamento_id',c.departamento_id,'provincia_id',c.provincia_id,'distrito_id',c.distrito_id,'capitania_id',c.capitania_id,
 'empresa_patrocinadora_id',other));
 if target.empresa_patrocinadora_id<>other then raise exception 'Create sponsored Cycle';end if;
 target:=pg_temp.save_sponsor(target.id,null);
 if target.empresa_patrocinadora_id is not null then raise exception 'Save unsponsored Cycle';end if;
 target:=pg_temp.save_sponsor(target.id,other);
 -- Reuse only tariff configuration; no document or PDF execution.
 target:=public.guardar_ciclo_tarifas(target.id,target.updated_at,(select jsonb_agg(jsonb_build_object('tarifa_id',tarifa_id,'importe',importe::text,'obligatorio',obligatorio::text)) from public.ciclo_tarifa where ciclo_id=c.id and activo));

 -- 3/4/8: authoritative inheritance, even with forged legacy input.
 fresh:=pg_temp.test_enroll(target.id,student,company);
 if fresh.empresa_patrocinadora_id<>other then raise exception 'Enrollment did not inherit Cycle';end if;
 fresh:=public.editar_matricula(jsonb_build_object('id',fresh.id,'expected_updated_at',fresh.updated_at,'empresa_patrocinadora_id',company));
 if fresh.empresa_patrocinadora_id<>other then raise exception 'Legacy edit overrode Cycle';end if;
 begin
  update public.matricula set empresa_patrocinadora_id=company where id=fresh.id;
  raise exception 'Direct contradiction accepted';
 exception when check_violation then if sqlerrm<>'ENROLLMENT_SPONSOR_DEFINED_BY_CYCLE' then raise;end if;end;

 -- 9: H4 rejects a NEW payment on the inherited sponsored enrollment.
 select v.id into medium from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='MEDIO_PAGO' and v.codigo='EFECTIVO';
 select id into cargo from public.matricula_cargo where matricula_id=fresh.id and activo limit 1;
 begin
  perform public.registrar_pago(jsonb_build_object('matricula_id',fresh.id,'expected_matricula_updated_at',fresh.updated_at,'idempotency_key',gen_random_uuid(),'importe','1','medio_pago_id',medium,'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo,'importe','1'))));
  raise exception 'Sponsored H4 payment accepted';
 exception when check_violation then if sqlerrm<>'PAYMENT_ENROLLMENT_SPONSORED' then raise;end if;end;

 -- 11: new OS accepts only the current Cycle sponsor, server-side.
 begin
  perform public.registrar_orden_servicio(jsonb_build_object('empresa_patrocinadora_id',company,'ciclo_id',target.id,'expected_ciclo_updated_at',target.updated_at,
  'serie','TEST','correlativo','0001','fecha','2026-01-01','monto','100','matriculas',jsonb_build_array(jsonb_build_object('id',fresh.id,'expected_updated_at',fresh.updated_at))));
  raise exception 'Foreign company Cycle accepted';
 exception when check_violation then if sqlerrm<>'H7_CYCLE_SPONSOR_MISMATCH' then raise;end if;end;
 os:=public.registrar_orden_servicio(jsonb_build_object('empresa_patrocinadora_id',other,'ciclo_id',target.id,'expected_ciclo_updated_at',target.updated_at,
 'serie','TEST','correlativo','0001','fecha','2026-01-01','monto','100','matriculas',jsonb_build_array(jsonb_build_object('id',fresh.id,'expected_updated_at',fresh.updated_at))));
 select jsonb_build_object('order',to_jsonb(o),'enrollments',(select jsonb_agg(to_jsonb(x)) from public.orden_servicio_matricula x where orden_servicio_id=o.id)) into historic from public.orden_servicio o where id=os.id;

 -- 6/7/12: Cycle synchronization never edits OS history or original snapshots.
 select to_jsonb(m)-array['updated_at','empresa_patrocinadora_id'] into baseline from public.matricula m where id=fresh.id;
 target:=pg_temp.save_sponsor(target.id,company);
 if exists(select 1 from public.matricula where ciclo_id=target.id and empresa_patrocinadora_id is distinct from company) then raise exception 'Sponsor sync failed';end if;
 if baseline is distinct from (select to_jsonb(m)-array['updated_at','empresa_patrocinadora_id'] from public.matricula m where id=fresh.id) then raise exception 'Sync edited other enrollment fields';end if;
 target:=pg_temp.save_sponsor(target.id,null);
 if exists(select 1 from public.matricula where ciclo_id=target.id and empresa_patrocinadora_id is not null) then raise exception 'NULL sync failed';end if;
 if historic is distinct from (select jsonb_build_object('order',to_jsonb(o),'enrollments',(select jsonb_agg(to_jsonb(x)) from public.orden_servicio_matricula x where orden_servicio_id=o.id)) from public.orden_servicio o where id=os.id) then raise exception 'Historical OS changed';end if;

 -- 5: transfer inherits destination sponsor and can also clear it.
 target:=pg_temp.save_sponsor(target.id,other);
 select * into e from public.matricula where id=(ctx->>'ambiguous')::uuid;
 moved:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'ciclo_id',target.id,'expected_ciclo_updated_at',target.updated_at,'empresa_patrocinadora_id',company));
 if moved.empresa_patrocinadora_id<>other then raise exception 'Transfer sponsor inheritance failed';end if;
 select * into c from public.ciclo where id=c.id;
 c:=pg_temp.save_sponsor(c.id,null);
 moved:=public.editar_matricula(jsonb_build_object('id',moved.id,'expected_updated_at',moved.updated_at,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at));
 if moved.empresa_patrocinadora_id is not null then raise exception 'Transfer did not clear sponsor';end if;

 -- Annulled enrollment only synchronizes the derived reference; nothing else.
 select * into fresh from public.matricula where id=fresh.id;
 fresh:=public.anular_matricula(fresh.id,fresh.updated_at,'SYNTHETIC');
 baseline:=to_jsonb(fresh)-array['updated_at','empresa_patrocinadora_id'];
 target:=pg_temp.save_sponsor(target.id,company);
 if baseline is distinct from (select to_jsonb(m)-array['updated_at','empresa_patrocinadora_id'] from public.matricula m where id=fresh.id)
 or (select empresa_patrocinadora_id from public.matricula where id=fresh.id) is distinct from company then raise exception 'Annulled history changed';end if;

 -- 4/10: new enrollment with NULL sponsor, normal H4 payment, history intact.
 target:=public.guardar_ciclo(jsonb_build_object('carrera_id',c.carrera_id,'fecha_inicio','2040-01-01','fecha_fin','2040-01-02',
 'departamento_id',c.departamento_id,'provincia_id',c.provincia_id,'distrito_id',c.distrito_id,'capitania_id',c.capitania_id));
 target:=public.guardar_ciclo_tarifas(target.id,target.updated_at,(select jsonb_agg(jsonb_build_object('tarifa_id',tarifa_id,'importe',importe::text,'obligatorio',obligatorio::text)) from public.ciclo_tarifa where ciclo_id=c.id and activo));
 fresh:=pg_temp.test_enroll(target.id,student,company);
 if fresh.empresa_patrocinadora_id is not null then raise exception 'New NULL inheritance failed';end if;
 select id into cargo from public.matricula_cargo where matricula_id=fresh.id and activo limit 1;
 payment_input:=jsonb_build_object('matricula_id',fresh.id,'expected_matricula_updated_at',fresh.updated_at,'idempotency_key',gen_random_uuid(),'importe','1','medio_pago_id',medium,'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo,'importe','1')));
 paid:=public.registrar_pago(payment_input);
 select to_jsonb(p) into paid from public.pago p where p.id=(paid->>'id')::uuid;
 target:=pg_temp.save_sponsor(target.id,company);
 if paid is distinct from (select to_jsonb(p) from public.pago p where p.id=(paid->>'id')::uuid) then raise exception 'Historical H4 payment changed';end if;
 if (public.registrar_pago(payment_input)->>'id') is distinct from paid->>'id' then raise exception 'Historical idempotent payment recovery changed';end if;

 -- A failing child update rolls back Cycle, enrollment synchronization and audit.
 baseline:=to_jsonb(target);
 select count(*) into count_audit from public.auditoria;
 execute 'create trigger sponsor_failure before update on public.matricula for each row execute function pg_temp.fail_sponsor()';
 begin
  perform pg_temp.save_sponsor(target.id,other);
  raise exception 'Injected sync failure did not fire';
 exception when raise_exception then if sqlerrm<>'SPONSOR_ROLLBACK_TEST' then raise;end if;end;
 execute 'drop trigger sponsor_failure on public.matricula';
 if baseline is distinct from (select to_jsonb(cy) from public.ciclo cy where id=target.id)
 or (select count(*) from public.auditoria)<>count_audit
 or exists(select 1 from public.matricula m join public.ciclo cy on cy.id=m.ciclo_id where m.empresa_patrocinadora_id is distinct from cy.empresa_patrocinadora_id) then raise exception 'Partial synchronization escaped rollback';end if;
 raise notice 'Sponsorship scenarios 1-12, legacy input, annulled history and full synchronization rollback PASSED';
end $$;
rollback;
