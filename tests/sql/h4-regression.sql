begin;
set local lock_timeout='3s';
create function pg_temp.h4_fail() returns trigger language plpgsql as $$ begin raise exception using errcode='P0001',message='H4_SYNTHETIC_FAILURE'; end $$;
do $$ declare actor uuid:=gen_random_uuid(); coordinator uuid:=gen_random_uuid(); m public.materia; extra public.materia; career public.carrera; c public.ciclo; a public.alumno; p jsonb; t public.tarifa; e public.matricula; original jsonb; charges jsonb; old_version timestamptz; rel uuid; pay public.pago; replay public.pago; medium uuid; cargo_id uuid; payload jsonb; before_audit bigint; stage text; failures_before jsonb; second_pay public.pago; target_cycle public.ciclo; company public.empresa_patrocinadora; old_cargo uuid; option_id uuid; other_cargo uuid; response jsonb; invalid text; other_enrollment public.matricula; token text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); begin
 insert into auth.users(id) values(actor),(coordinator);
 insert into public.app_users(id) values(actor),(coordinator);
 insert into public.app_user_roles(user_id,role_code) values(actor,'DIRECTOR_ACADEMICO'),(coordinator,'COORDINADOR_ACADEMICO');
 perform set_config('request.jwt.claim.sub',actor::text,true);
 m:=public.guardar_materia(jsonb_build_object('nombre','CONFIRM SUBJECT '||token));
 extra:=public.guardar_materia(jsonb_build_object('nombre','CONFIRM EXTRA '||token));
 career:=public.guardar_carrera(jsonb_build_object('nombre','CONFIRM COURSE '||token,'sigla','Q'||token),array[m.id]);
 select jsonb_build_object('apellido_paterno','PRUEBA','apellido_materno','SINTETICA','nombres','OCUPACION','tipo_di_id',(select v.id from public.catalogo_valor v join public.catalogo catp on catp.id=v.catalogo_id where catp.codigo='TIPO_DI' and v.codigo='DNI'),'numero_di','98765432','fecha_nacimiento','2000-01-01','sexo_id',(select v.id from public.catalogo_valor v join public.catalogo catp on catp.id=v.catalogo_id where catp.codigo='SEXO' and v.codigo='F'),'celular','999111222','domicilio','SINTETICO','nacimiento_departamento_id',pr.departamento_id,'nacimiento_provincia_id',pr.id,'nacimiento_distrito_id',d.id,'domicilio_departamento_id',pr.departamento_id,'domicilio_provincia_id',pr.id,'domicilio_distrito_id',d.id,'contactos',jsonb_build_array(jsonb_build_object('apellido','CONTACTO','nombre','SINTETICO','celular','999111222','parentesco_id',(select v.id from public.catalogo_valor v join public.catalogo catp on catp.id=v.catalogo_id where catp.codigo='PARENTESCO' and v.codigo='PADRE')))) into strict p from public.distrito d join public.provincia pr on pr.id=d.provincia_id where d.active and pr.active limit 1;

 -- Unique synthetic CE avoids collisions with real test documents.
 p:=p||jsonb_build_object('numero_di',replace(gen_random_uuid()::text,'-',''),'tipo_di_id',(select v.id from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='TIPO_DI' and v.codigo='CARNET_EXTRANJERIA'));
 p:=p||jsonb_build_object('numero_di',left(p->>'numero_di',30));
 a:=public.guardar_alumno(p);

 c:=public.guardar_ciclo(jsonb_build_object('carrera_id',career.id,'fecha_inicio','2038-01-01','fecha_fin','2038-01-02',
 'departamento_id',p->>'domicilio_departamento_id','provincia_id',p->>'domicilio_provincia_id','distrito_id',p->>'domicilio_distrito_id','capitania_id',(select id from public.capitania where active limit 1)));
 t:=public.guardar_tarifa(jsonb_build_object('codigo','CONF'||token,'nombre','CONFIRM TARIFF '||token,'tipo','CARRERA','monto_por_defecto','100'));
 c:=public.guardar_ciclo_tarifas(c.id,c.updated_at,jsonb_build_array(jsonb_build_object('tarifa_id',t.id,'importe','100','obligatorio','true')));
 e:=public.registrar_matricula(jsonb_build_object('alumno_id',a.id,'expected_alumno_updated_at',a.updated_at,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at));


 select v.id into medium from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='MEDIO_PAGO' and v.codigo='EFECTIVO';
 select * into c from public.ciclo where id=c.id;
 t:=public.guardar_tarifa(jsonb_build_object('codigo','OPT'||token,'nombre','H4 OPTIONAL','tipo','OTRO','monto_por_defecto','20'));
 select jsonb_agg(jsonb_build_object('tarifa_id',tarifa_id,'importe',importe::text,'obligatorio',obligatorio::text)) into charges from public.ciclo_tarifa where ciclo_id=c.id;
 c:=public.guardar_ciclo_tarifas(c.id,c.updated_at,charges||jsonb_build_array(jsonb_build_object('tarifa_id',t.id,'importe','20','obligatorio','false')));
 select id into option_id from public.ciclo_tarifa where ciclo_id=c.id and tarifa_id=t.id;
 -- CHG-H4-002: no retroactive charges; all active tariffs included for a new pupil.
 if (select count(*) from public.matricula_cargo where matricula_id=e.id and activo)<>1 then raise exception 'Cycle configuration changed existing charges';end if;
 declare fresh public.alumno; enrolled public.matricula; begin
 fresh:=public.guardar_alumno(p||jsonb_build_object('numero_di',left(replace(gen_random_uuid()::text,'-',''),30)));
 enrolled:=public.registrar_matricula(jsonb_build_object('alumno_id',fresh.id,'expected_alumno_updated_at',fresh.updated_at,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at),'{}'::uuid[]);
 if not exists(select 1 from public.matricula_saldo where matricula_id=enrolled.id and base=120 and pendiente=120) then raise exception 'Default optional cargo missing from payment balance';end if;
 if (select count(*) from public.matricula_cargo_saldo where matricula_id=enrolled.id and activo)<>2 then raise exception 'Payment cargo list omitted default optional';end if;
 enrolled:=public.editar_matricula(jsonb_build_object('id',enrolled.id,'expected_updated_at',enrolled.updated_at,'expected_ciclo_updated_at',c.updated_at),'{}'::uuid[]);
 if not exists(select 1 from public.matricula_saldo where matricula_id=enrolled.id and base=100 and pendiente=100) then raise exception 'Individual optional retirement failed';end if;
 if (select count(*) from public.matricula_cargo where matricula_id=enrolled.id and activo and tipo='CARRERA')<>1 or (select count(*) from public.matricula_cargo where matricula_id=enrolled.id and not activo and tipo='OTRO')<>1 then raise exception 'Mandatory cargo or optional history lost';end if;
 end;

 e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'expected_ciclo_updated_at',c.updated_at),array[option_id]);
 select id into cargo_id from public.matricula_cargo where matricula_id=e.id and tipo='CARRERA' and activo;
 select id into old_cargo from public.matricula_cargo where matricula_id=e.id and tipo='OTRO' and activo;
 payload:=jsonb_build_object('matricula_id',e.id,'expected_matricula_updated_at',e.updated_at,'idempotency_key',gen_random_uuid(),'importe','80','medio_pago_id',medium,'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo_id,'importe','70'),jsonb_build_object('matricula_cargo_id',old_cargo,'importe','10')));
 foreach invalid in array array['0','-1','NaN','Infinity','10000000000','100.000','1e2','null'] loop
 begin perform public.registrar_pago(payload||jsonb_build_object('importe',invalid));raise exception 'Invalid amount accepted';exception when invalid_parameter_value then null;end;
 end loop;
 begin perform public.registrar_pago(payload||jsonb_build_object('aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo_id,'importe','40'),jsonb_build_object('matricula_cargo_id',cargo_id,'importe','40'))));raise exception 'Duplicate charge accepted';exception when invalid_parameter_value then null;end;
 begin perform public.registrar_pago(payload||jsonb_build_object('importe','21','aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',old_cargo,'importe','21'))));raise exception 'Individual overpayment accepted';exception when check_violation then if sqlerrm<>'PAYMENT_EXCEEDS_PENDING' then raise;end if;end;
 begin perform public.registrar_pago(payload||jsonb_build_object('medio_pago_id',a.tipo_di_id));raise exception 'Wrong catalog accepted';exception when check_violation then null;end;
 begin perform public.registrar_pago(payload||jsonb_build_object('observaciones',repeat('x',501)));raise exception 'Long observations accepted';exception when invalid_parameter_value then null;end;
 response:=public.registrar_pago(payload);
 select * into pay from jsonb_populate_record(null::public.pago,response);
 if jsonb_array_length(response->'aplicaciones')<>2 or (response->'saldo'->>'pendiente')::numeric<>40 or response->>'matricula_updated_at' is null or response->'aplicaciones'->0->>'concepto' is null then raise exception 'Incomplete command response';end if;
 begin perform public.cambiar_estado_ciclo(c.id,c.updated_at,'ANULADO','SYNTHETIC');raise exception 'Cycle with confirmed payment annulled';exception when check_violation then if sqlerrm<>'PAYMENT_PREVENTS_CYCLE_STATE' then raise;end if;end;
 t:=public.guardar_tarifa(jsonb_build_object('id',t.id,'expected_updated_at',t.updated_at,'codigo',t.codigo,'nombre',t.nombre,'tipo',t.tipo,'monto_por_defecto','999'));
 select jsonb_agg(jsonb_build_object('tarifa_id',tarifa_id,'importe',case when obligatorio then '999' else importe::text end,'obligatorio',obligatorio::text)) into charges from public.ciclo_tarifa where ciclo_id=c.id;
 c:=public.guardar_ciclo_tarifas(c.id,c.updated_at,charges);
 if not exists(select 1 from public.matricula_saldo where matricula_id=e.id and base=120 and abonado=80 and pendiente=40) or (select importe from public.pago where id=pay.id)<>80 then raise exception 'Catalog tariff repriced historical debt';end if;
 select * into replay from jsonb_populate_record(null::public.pago,public.registrar_pago(payload||jsonb_build_object('aplicaciones',jsonb_build_array(payload->'aplicaciones'->1,payload->'aplicaciones'->0))));
 if replay.id<>pay.id then raise exception 'Order affected idempotency';end if;
 select * into e from public.matricula where id=e.id;
 begin perform public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'expected_ciclo_updated_at',c.updated_at),'{}'::uuid[]);raise exception 'Paid optional retired';exception when check_violation then if sqlerrm<>'PAYMENT_PREVENTS_CARGO_RETIREMENT' then raise;end if;end;
 select * into pay from jsonb_populate_record(null::public.pago,public.anular_pago(pay.id,pay.updated_at,'CORRECTION'));
 select * into e from public.matricula where id=e.id;
 response:=public.registrar_pago(jsonb_build_object('matricula_id',e.id,'expected_matricula_updated_at',e.updated_at,'idempotency_key',gen_random_uuid(),'importe','5','medio_pago_id',medium,'observaciones','  ','aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',old_cargo,'importe','5'))));
 select * into second_pay from jsonb_populate_record(null::public.pago,response);
 if second_pay.observaciones is not null then raise exception 'Empty notes not normalized';end if;
 select * into e from public.matricula where id=e.id;
 begin perform public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'expected_ciclo_updated_at',c.updated_at),'{}'::uuid[]);raise exception 'Remaining confirmed application ignored';exception when check_violation then null;end;
 perform public.anular_pago(second_pay.id,second_pay.updated_at,'CORRECTION');
 select * into e from public.matricula where id=e.id;
 e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'expected_ciclo_updated_at',c.updated_at),'{}'::uuid[]);
 if not exists(select 1 from public.matricula_cargo where id=old_cargo and not activo) or (select count(*) from public.pago_aplicacion where matricula_cargo_id=old_cargo)<>2 then raise exception 'C-H4-001 lost history';end if;
 e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'expected_ciclo_updated_at',c.updated_at),array[option_id]);
 if not exists(select 1 from public.matricula_cargo where matricula_id=e.id and tipo='OTRO' and activo and id<>old_cargo) or exists(select 1 from public.pago_aplicacion where matricula_cargo_id<>old_cargo and pago_id=second_pay.id) then raise exception 'Cargo UUID history reassigned';end if;
 company:=public.guardar_empresa_patrocinadora(jsonb_build_object('ruc','20999999999','razon_social','H4 SYNTHETIC'));
 e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'empresa_patrocinadora_id',company.id));
 response:=public.registrar_pago(jsonb_build_object('matricula_id',e.id,'expected_matricula_updated_at',e.updated_at,'idempotency_key',gen_random_uuid(),'importe','1','medio_pago_id',medium,'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo_id,'importe','1'))));
 select * into second_pay from jsonb_populate_record(null::public.pago,response);
 select * into e from public.matricula where id=e.id;
 company:=public.guardar_empresa_patrocinadora(jsonb_build_object('ruc','20888888888','razon_social','H4 SYNTHETIC SECOND'));
 e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'empresa_patrocinadora_id',company.id));
 if (select matricula_id from public.pago where id=second_pay.id)<>e.id or (select matricula_cargo_id from public.pago_aplicacion where pago_id=second_pay.id)<>cargo_id then raise exception 'Sponsor edit reassigned financial history';end if;
 perform public.anular_pago(second_pay.id,second_pay.updated_at,'SYNTHETIC');
 select * into e from public.matricula where id=e.id;
 e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'empresa_patrocinadora_id',null));
 target_cycle:=public.guardar_ciclo(jsonb_build_object('carrera_id',career.id,'fecha_inicio','2038-02-01','fecha_fin','2038-02-02','departamento_id',p->>'domicilio_departamento_id','provincia_id',p->>'domicilio_provincia_id','distrito_id',p->>'domicilio_distrito_id','capitania_id',(select id from public.capitania where active limit 1)));
 target_cycle:=public.guardar_ciclo_tarifas(target_cycle.id,target_cycle.updated_at,jsonb_build_array(jsonb_build_object('tarifa_id',(select tarifa_id from public.matricula_cargo where id=cargo_id),'importe','100','obligatorio','true')));
 other_enrollment:=public.registrar_matricula(jsonb_build_object('alumno_id',a.id,'expected_alumno_updated_at',a.updated_at,'ciclo_id',target_cycle.id,'expected_ciclo_updated_at',target_cycle.updated_at));
 begin perform public.registrar_pago(payload||jsonb_build_object('matricula_id',other_enrollment.id));raise exception 'Global key reused for another enrollment';exception when unique_violation then if sqlerrm<>'PAYMENT_IDEMPOTENCY_CONFLICT' then raise;end if;end;
 begin perform public.registrar_pago(payload||jsonb_build_object('matricula_id',other_enrollment.id,'expected_matricula_updated_at',other_enrollment.updated_at,'idempotency_key',gen_random_uuid()));raise exception 'Foreign charge accepted';exception when check_violation then if sqlerrm<>'PAYMENT_CARGO_INVALID' then raise;end if;end;
 begin
 insert into public.pago(matricula_id,idempotency_key,importe,medio_pago_id,medio_codigo,medio_etiqueta,registrado_por) values(e.id,gen_random_uuid(),1,medium,'EFECTIVO','Efectivo',actor);
 set constraints all immediate;
 raise exception 'Payment without applications committed';
 exception when check_violation then if sqlerrm<>'PAYMENT_APPLICATIONS_INVALID' then raise;end if;end;
 begin perform public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'ciclo_id',target_cycle.id,'expected_ciclo_updated_at',target_cycle.updated_at),'{}'::uuid[]);raise exception 'Transfer after annulled payment accepted';exception when check_violation then if sqlerrm<>'PAYMENT_PREVENTS_CYCLE_TRANSFER' then raise;end if;end;
 target_cycle:=public.cambiar_estado_ciclo(target_cycle.id,target_cycle.updated_at,'DESIERTO','SYNTHETIC',(select v.id from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='MOTIVO_CICLO_DESIERTO' and v.activo limit 1));
 begin perform public.registrar_pago(jsonb_build_object('matricula_id',other_enrollment.id,'expected_matricula_updated_at',other_enrollment.updated_at,'idempotency_key',gen_random_uuid(),'importe','1','medio_pago_id',medium,'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',(select id from public.matricula_cargo where matricula_id=other_enrollment.id and activo),'importe','1'))));raise exception 'Deserted Cycle accepted payment';exception when check_violation then if sqlerrm<>'PAYMENT_CYCLE_INELIGIBLE' then raise;end if;end;
 -- Isolated defensive fixture only: H3 normally makes an enrolled ANULADO Cycle unreachable.
 -- Temporarily bypass its H3 guard only to prove registrar_pago independently rejects that DB state.
 alter table public.ciclo disable trigger ciclo_enrollment_guard;
 update public.ciclo set estado_codigo='ANULADO',motivo='SYNTHETIC DEFENSIVE FIXTURE',motivo_desierto_id=null where id=target_cycle.id;
 alter table public.ciclo enable trigger ciclo_enrollment_guard;
 begin perform public.registrar_pago(jsonb_build_object('matricula_id',other_enrollment.id,'expected_matricula_updated_at',other_enrollment.updated_at,'idempotency_key',gen_random_uuid(),'importe','1','medio_pago_id',medium,'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',(select id from public.matricula_cargo where matricula_id=other_enrollment.id and activo),'importe','1'))));raise exception 'Annulled Cycle accepted payment';exception when check_violation then if sqlerrm<>'PAYMENT_CYCLE_INELIGIBLE' then raise;end if;end;
 begin perform public.cambiar_estado_ciclo(c.id,c.updated_at,'ANULADO','SYNTHETIC');raise exception 'Cycle with only cancelled payments annulled';exception when check_violation then if sqlerrm<>'PAYMENT_PREVENTS_CYCLE_STATE' then raise;end if;end;
 begin perform public.cambiar_estado_ciclo(c.id,c.updated_at,'DESIERTO','SYNTHETIC',(select v.id from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='MOTIVO_CICLO_DESIERTO' and v.activo limit 1));raise exception 'Cycle with annulled payments deserted';exception when check_violation then if sqlerrm<>'PAYMENT_PREVENTS_CYCLE_STATE' then raise;end if;end;
 c:=public.cambiar_estado_ciclo(c.id,c.updated_at,'EN_CURSO');
 c:=public.cambiar_estado_ciclo(c.id,c.updated_at,'CERRADO');
 -- CHG-H5-002 capture advances enrollment version; H4 still accepts payments after an explicit reload.
 select * into e from public.matricula where id=e.id;
 response:=public.registrar_pago(jsonb_build_object('matricula_id',e.id,'expected_matricula_updated_at',e.updated_at,'idempotency_key',gen_random_uuid(),'importe','1','medio_pago_id',medium,'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo_id,'importe','1'))));
 select * into second_pay from jsonb_populate_record(null::public.pago,response);
 select * into e from public.matricula where id=e.id;
 e:=public.anular_matricula(e.id,e.updated_at,'TERMINAL');
 begin perform public.anular_pago(second_pay.id,second_pay.updated_at,'BLOCKED');raise exception 'Terminal payment annulled';exception when check_violation then if sqlerrm<>'PAYMENT_ENROLLMENT_INACTIVE' then raise;end if;end;
 select * into replay from jsonb_populate_record(null::public.pago,public.registrar_pago(payload));
 if replay.id<>pay.id or replay.estado_codigo<>'ANULADO' then raise exception 'Terminal replay failed';end if;
 set constraints all immediate;
end $$;
rollback;
