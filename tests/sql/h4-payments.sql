begin;
set local lock_timeout='3s';
create function pg_temp.h4_fail() returns trigger language plpgsql as $$ begin raise exception using errcode='P0001',message='H4_SYNTHETIC_FAILURE'; end $$;
do $$ declare actor uuid:=gen_random_uuid(); coordinator uuid:=gen_random_uuid(); m public.materia; extra public.materia; career public.carrera; c public.ciclo; a public.alumno; p jsonb; t public.tarifa; e public.matricula; original jsonb; charges jsonb; old_version timestamptz; rel uuid; pay public.pago; replay public.pago; medium uuid; cargo_id uuid; payload jsonb; before_audit bigint; field text; stage text; failures_before jsonb; token text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); begin
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
 select id into cargo_id from public.matricula_cargo where matricula_id=e.id and activo;
 if not exists(select 1 from public.matricula_saldo where matricula_id=e.id and base=100 and abonado=0 and pendiente=100) then raise exception 'Initial balance incorrect';end if;
 payload:=jsonb_build_object('matricula_id',e.id,'expected_matricula_updated_at',e.updated_at,'idempotency_key',gen_random_uuid(),'importe','70.00','medio_pago_id',medium,'observaciones','  Nota Mixta  ','aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo_id,'importe','70')));
 begin perform public.registrar_pago(payload||jsonb_build_object('importe','70.000'));raise exception 'Precision accepted';exception when invalid_parameter_value then null;end;
 begin perform public.registrar_pago(payload||jsonb_build_object('importe','0'));raise exception 'Zero accepted';exception when invalid_parameter_value then null;end;
 begin perform public.registrar_pago(payload||jsonb_build_object('fecha_operacion','2030-01-01'));raise exception 'Date accepted';exception when invalid_parameter_value then null;end;
 begin perform public.registrar_pago(payload||jsonb_build_object('importe','100.01','aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',cargo_id,'importe','100.01'))));raise exception 'Overpayment accepted';exception when check_violation then if sqlerrm<>'PAYMENT_EXCEEDS_PENDING' then raise;end if;end;
 foreach field in array array['created_at','registrado_por','estado_codigo','saldo','descuento','concepto','moneda'] loop
 begin perform public.registrar_pago(payload||jsonb_build_object(field,'FORGED'));raise exception 'Forged field accepted';exception when invalid_parameter_value then null;end;
 end loop;
 -- H4_FAULT_REGISTER_BEGIN
 -- Forced failures after each stage must roll back data, parent version, key and audit together.
 foreach stage in array array['pago','pago_aplicacion','matricula','auditoria'] loop
 select jsonb_build_object('version',updated_at,'payments',(select count(*) from public.pago),'applications',(select count(*) from public.pago_aplicacion),'audit',(select count(*) from public.auditoria)) into failures_before from public.matricula where id=e.id;
 execute format('create trigger h4_failure after %s on public.%I for each row execute function pg_temp.h4_fail()',case when stage='matricula' then 'update' else 'insert' end,stage);
 begin perform public.registrar_pago(payload);raise exception 'Injected failure did not fire';exception when raise_exception then if sqlerrm<>'H4_SYNTHETIC_FAILURE' then raise;end if;end;
 execute format('drop trigger h4_failure on public.%I',stage);
 if failures_before is distinct from (select jsonb_build_object('version',updated_at,'payments',(select count(*) from public.pago),'applications',(select count(*) from public.pago_aplicacion),'audit',(select count(*) from public.auditoria)) from public.matricula where id=e.id) then raise exception 'Partial payment escaped rollback';end if;
 end loop;
 -- H4_FAULT_REGISTER_END
 select * into pay from jsonb_populate_record(null::public.pago,public.registrar_pago(payload));
 if pay.observaciones<>'Nota Mixta' or pay.registrado_por<>actor or pay.estado_codigo<>'CONFIRMADO' then raise exception 'Payment metadata invalid';end if;
 if not exists(select 1 from public.matricula_saldo where matricula_id=e.id and base=100 and abonado=70 and pendiente=30) then raise exception 'Balance mismatch';end if;
 select * into e from public.matricula where id=e.id;
 old_version:=e.updated_at;
 select count(*) into before_audit from public.auditoria;
 select * into replay from jsonb_populate_record(null::public.pago,public.registrar_pago(payload||jsonb_build_object('importe','70.0','observaciones','Nota Mixta')));
 if replay.id<>pay.id or (select updated_at from public.matricula where id=e.id)<>old_version or (select count(*) from public.auditoria)<>before_audit then raise exception 'Replay produced effects';end if;
 begin perform public.registrar_pago(payload||jsonb_build_object('observaciones','different'));raise exception 'Key mutation accepted';exception when unique_violation then if sqlerrm<>'PAYMENT_IDEMPOTENCY_CONFLICT' then raise;end if;end;
 begin perform public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'descuento','31','motivo_descuento','EXCESS'));raise exception 'Discount below paid accepted';exception when check_violation then if sqlerrm<>'PAYMENT_DISCOUNT_BELOW_PAID' then raise;end if;end;
 e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'descuento','30','motivo_descuento','EQUALITY'));
 if not exists(select 1 from public.matricula_saldo where matricula_id=e.id and pendiente=0) then raise exception 'Equality balance mismatch';end if;
 begin update public.matricula_cargo set activo=false,motivo_inactivacion='TEST' where id=cargo_id;raise exception 'Paid cargo retired';exception when check_violation then if sqlerrm<>'PAYMENT_PREVENTS_CARGO_RETIREMENT' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',coordinator::text,true);
 begin perform public.anular_pago(pay.id,pay.updated_at,'Reason');raise exception 'Coordinator annulled';exception when insufficient_privilege then null;end;
 select * into replay from jsonb_populate_record(null::public.pago,public.registrar_pago(payload));
 if replay.id<>pay.id then raise exception 'Coordinator replay denied';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 begin perform public.anular_pago(pay.id,pay.updated_at,' ');raise exception 'Blank reason accepted';exception when invalid_parameter_value then null;end;
 -- H4_FAULT_CANCEL_BEGIN
 foreach stage in array array['pago','matricula','auditoria'] loop
 select jsonb_build_object('payment',to_jsonb(pay),'version',updated_at,'audit',(select count(*) from public.auditoria)) into failures_before from public.matricula where id=e.id;
 execute format('create trigger h4_failure after %s on public.%I for each row execute function pg_temp.h4_fail()',case when stage='auditoria' then 'insert' else 'update' end,stage);
 begin perform public.anular_pago(pay.id,pay.updated_at,'Correction');raise exception 'Injected cancellation failure did not fire';exception when raise_exception then if sqlerrm<>'H4_SYNTHETIC_FAILURE' then raise;end if;end;
 execute format('drop trigger h4_failure on public.%I',stage);
 if failures_before is distinct from (select jsonb_build_object('payment',(select to_jsonb(pp) from public.pago pp where id=pay.id),'version',updated_at,'audit',(select count(*) from public.auditoria)) from public.matricula where id=e.id) then raise exception 'Partial cancellation escaped rollback';end if;
 end loop;
 -- H4_FAULT_CANCEL_END
 select * into pay from jsonb_populate_record(null::public.pago,public.anular_pago(pay.id,pay.updated_at,'Correction'));
 if not exists(select 1 from public.matricula_saldo where matricula_id=e.id and abonado=0 and pendiente=70) then raise exception 'Annulment balance mismatch';end if;
 if (select count(*) from public.pago_aplicacion where pago_id=pay.id)<>1 then raise exception 'Applications lost';end if;
 begin perform public.anular_pago(pay.id,pay.updated_at,'Again');raise exception 'Double annulment accepted';exception when check_violation then if sqlerrm<>'PAYMENT_ALREADY_CANCELLED' then raise;end if;end;
 update public.catalogo_valor set activo=false,nombre='NEW LABEL' where id=medium;
 select * into e from public.matricula where id=e.id;
 begin perform public.registrar_pago(payload||jsonb_build_object('idempotency_key',gen_random_uuid(),'expected_matricula_updated_at',e.updated_at));raise exception 'Inactive medium accepted for new payment';exception when check_violation then null;end;
 select * into replay from jsonb_populate_record(null::public.pago,public.registrar_pago(payload));
 if replay.id<>pay.id or replay.estado_codigo<>'ANULADO' or replay.medio_etiqueta<>pay.medio_etiqueta then raise exception 'Inactive catalog replay resurrected or denied';end if;
 update public.matricula_cargo set activo=false,motivo_inactivacion='NO VIGENTE APPLICATIONS' where id=cargo_id;
 if not exists(select 1 from public.pago_aplicacion where matricula_cargo_id=cargo_id) then raise exception 'Historical reference lost';end if;
 begin delete from public.pago where id=pay.id;raise exception 'Payment deleted';exception when check_violation then null;end;
 begin update public.pago_aplicacion set importe=1 where pago_id=pay.id;raise exception 'Application edited';exception when check_violation then null;end;
 if exists(select 1 from public.auditoria where entidad='pago' and registro_id=pay.id and (new_values - array['pago_id','matricula_id'] <> '{}'::jsonb or old_values is not null)) then raise exception 'Financial audit leaked payload';end if;
 if (select count(*) from public.auditoria where entidad='pago' and registro_id=pay.id)<>2 then raise exception 'Audit duplicates';end if;
 set constraints all immediate;
end $$;
rollback;
