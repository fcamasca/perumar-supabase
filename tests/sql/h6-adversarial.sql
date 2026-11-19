-- Appended to the synthetic H4 fixture DO block in a disposable DB transaction.
 declare identity_type uuid; photo_type uuid; generated_type uuid; config jsonb; expected jsonb; d public.matricula_documento; d2 public.matricula_documento; app_before jsonb; counts_before jsonb; audit_count bigint; row_count bigint; c2 public.ciclo; empty_student public.alumno; second public.matricula; version_id uuid; x text; begin
 select id into identity_type from public.tipo_documento where codigo='DOCUMENTO_IDENTIDAD';
 select id into photo_type from public.tipo_documento where codigo='FOTO_PASAPORTE';
 select id into generated_type from public.tipo_documento where codigo='SOLICITUD';
 if exists(select 1 from public.matricula_documento where matricula_id=e.id) then raise exception 'Zero configuration unexpectedly applied documents';end if;
 -- Master validation and referenced code/origin stability.
 begin perform public.guardar_tipo_documento(jsonb_build_object('codigo','DOCUMENTO_IDENTIDAD','nombre','DUPLICATE','origen','SUBIDO'));raise exception 'Duplicate accepted';exception when unique_violation then null;end;
 begin perform public.guardar_tipo_documento(jsonb_build_object('codigo','INVALID','nombre','INVALID','origen','VALIDADO'));raise exception 'Invalid origin accepted';exception when check_violation then null;end;
 config:=jsonb_build_array(jsonb_build_object('tipo_documento_id',identity_type,'activo','true','obligatorio','true'),jsonb_build_object('tipo_documento_id',photo_type,'activo','true','obligatorio','false'));
 perform public.guardar_documentos_ciclo(c.id,c.updated_at,'[]',config);
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'updated_at',updated_at) order by id),'[]') into expected from public.ciclo_documento where ciclo_id=c.id;
 begin perform public.guardar_tipo_documento(jsonb_build_object('id',identity_type,'expected_updated_at',(select updated_at from public.tipo_documento where id=identity_type),'codigo','CHANGED','origen','GENERADO'));raise exception 'Referenced identity changed';exception when check_violation then null;end;
 begin perform public.guardar_tipo_documento(jsonb_build_object('id',identity_type,'expected_updated_at',(select updated_at from public.tipo_documento where id=identity_type),'activo','false'));raise exception 'Active type inactivated';exception when check_violation then null;end;
 begin perform public.guardar_documentos_ciclo(c.id,c.updated_at,expected,config||jsonb_build_array(config->0));raise exception 'Duplicate config accepted';exception when invalid_parameter_value or unique_violation or check_violation then null;end;
 select * into d from public.matricula_documento where matricula_id=e.id and tipo_documento_id=identity_type;
 select * into d2 from public.matricula_documento where matricula_id=e.id and tipo_documento_id=photo_type;
 select jsonb_agg(to_jsonb(q) order by id) into app_before from public.matricula_documento q where matricula_id=e.id;
 select count(*) into audit_count from public.auditoria;
 -- A mixed optional/mandatory batch is entirely rolled back.
 begin perform public.retirar_documentos_opcionales(c.id,jsonb_build_array(jsonb_build_object('id',d2.id,'expected_updated_at',d2.updated_at),jsonb_build_object('id',d.id,'expected_updated_at',d.updated_at)),'SYNTHETIC');raise exception 'Mandatory batch accepted';exception when check_violation then null;end;
 if app_before is distinct from (select jsonb_agg(to_jsonb(q) order by id) from public.matricula_documento q where matricula_id=e.id) or audit_count<>(select count(*) from public.auditoria) then raise exception 'Partial mixed retirement';end if;
 begin perform public.retirar_documentos_opcionales(c.id,jsonb_build_array(jsonb_build_object('id',d2.id,'expected_updated_at',d2.updated_at),jsonb_build_object('id',d2.id,'expected_updated_at',d2.updated_at)),'SYNTHETIC');raise exception 'Duplicate retirement accepted';exception when invalid_parameter_value then null;end;
 begin perform public.retirar_documentos_opcionales(c.id,(select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'expected_updated_at',d2.updated_at)) from generate_series(1,51)),'SYNTHETIC');raise exception 'Oversized retirement accepted';exception when invalid_parameter_value then null;end;
 begin perform public.retirar_documentos_opcionales(c.id,jsonb_build_array(jsonb_build_object('id',d2.id,'expected_updated_at','2000-01-01')),'SYNTHETIC');raise exception 'Stale retirement accepted';exception when sqlstate 'PT409' then null;end;
 -- Independent configuration for another Cycle of the same Course.
 c2:=public.guardar_ciclo(jsonb_build_object('carrera_id',career.id,'fecha_inicio','2039-01-01','fecha_fin','2039-02-01','departamento_id',p->>'domicilio_departamento_id','provincia_id',p->>'domicilio_provincia_id','distrito_id',p->>'domicilio_distrito_id','capitania_id',c.capitania_id));
 perform public.guardar_tipo_documento(jsonb_build_object('id',generated_type,'expected_updated_at',(select updated_at from public.tipo_documento where id=generated_type),'activo','false'));
 begin perform public.guardar_documentos_ciclo(c2.id,c2.updated_at,'[]',jsonb_build_array(jsonb_build_object('tipo_documento_id',generated_type,'activo','true','obligatorio','false')));raise exception 'Inactive type applied';exception when check_violation then null;end;
 perform public.guardar_tipo_documento(jsonb_build_object('id',generated_type,'expected_updated_at',(select updated_at from public.tipo_documento where id=generated_type),'activo','true'));
 perform public.guardar_documentos_ciclo(c2.id,c2.updated_at,'[]',jsonb_build_array(jsonb_build_object('tipo_documento_id',generated_type,'activo','true','obligatorio','false')));
 if exists(select 1 from public.ciclo_documento where ciclo_id=c2.id and tipo_documento_id=identity_type) then raise exception 'Cross Cycle configuration';end if;
 -- Failure of an application audit rolls back registration, charges, snapshots and every document.
 empty_student:=public.guardar_alumno(p||jsonb_build_object('numero_di',left(replace(gen_random_uuid()::text,'-',''),30),'nombres','H6 ROLLBACK'));
 select jsonb_build_object('enrollments',(select count(*) from public.matricula),'charges',(select count(*) from public.matricula_cargo),'docs',(select count(*) from public.matricula_documento),'audit',(select count(*) from public.auditoria)) into counts_before;
 execute 'create trigger z_h6_apply_failure before insert on public.matricula_documento for each row execute function pg_temp.h4_fail()';
 begin perform public.registrar_matricula(jsonb_build_object('alumno_id',empty_student.id,'expected_alumno_updated_at',empty_student.updated_at,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at));raise exception 'Application failure did not fire';exception when raise_exception then if sqlerrm<>'H4_SYNTHETIC_FAILURE' then raise;end if;end;
 execute 'drop trigger z_h6_apply_failure on public.matricula_documento';
 if counts_before is distinct from jsonb_build_object('enrollments',(select count(*) from public.matricula),'charges',(select count(*) from public.matricula_cargo),'docs',(select count(*) from public.matricula_documento),'audit',(select count(*) from public.auditoria)) then raise exception 'Registration partially committed';end if;
 -- File immutability and direct mutation protection under every command mode.
 foreach x in array array['TYPE','CONFIG','SYNC','RETIRE','RESERVE','CONFIRM','ABORT'] loop
  perform set_config('perumar.document_command',x,true);
  begin delete from public.matricula_documento where id=d2.id;raise exception 'History DELETE accepted';exception when insufficient_privilege or check_violation then null;end;
 end loop;
 perform set_config('perumar.document_command','',true);
 -- Positive multi-pupil withdrawal: exactly the two selected applications of one optional config.
 second:=public.registrar_matricula(jsonb_build_object('alumno_id',empty_student.id,'expected_alumno_updated_at',empty_student.updated_at,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at));
 select jsonb_build_array(jsonb_build_object('id',id,'expected_updated_at',updated_at)) into payload from public.matricula_documento where matricula_id=second.id and tipo_documento_id=photo_type and contexto_vigente;
 empty_student:=public.guardar_alumno(p||jsonb_build_object('numero_di',left(replace(gen_random_uuid()::text,'-',''),30),'nombres','H6 SEGUNDO SELECCIONADO'));
 second:=public.registrar_matricula(jsonb_build_object('alumno_id',empty_student.id,'expected_alumno_updated_at',empty_student.updated_at,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at));
 select payload||jsonb_build_array(jsonb_build_object('id',id,'expected_updated_at',updated_at)) into payload from public.matricula_documento where matricula_id=second.id and tipo_documento_id=photo_type and contexto_vigente;
 if public.retirar_documentos_opcionales(c.id,payload,'SYNTHETIC TWO PUPILS')<>2 then raise exception 'Multi-pupil count incorrect';end if;
 if (select count(*) from public.matricula_documento where id in(select (value->>'id')::uuid from jsonb_array_elements(payload)) and not activo)<>2 or not(select activo from public.matricula_documento where id=d2.id) then raise exception 'Multi-pupil scope incorrect';end if;
 -- Regularization failure must roll back its audit and every application's mutation.
 perform public.retirar_documentos_opcionales(c.id,jsonb_build_array(jsonb_build_object('id',d2.id,'expected_updated_at',d2.updated_at)),'SYNTHETIC');
 perform public.regularizar_expedientes_ciclo(c.id,c.updated_at,expected);
 if (select activo from public.matricula_documento where id=d2.id) then raise exception 'Regularization reset individual withdrawal';end if;
 select count(*) into audit_count from public.auditoria;
 execute 'create trigger z_h6_regularize_failure before insert on public.auditoria for each row execute function pg_temp.h4_fail()';
 begin perform public.regularizar_expedientes_ciclo(c.id,c.updated_at,expected);raise exception 'Regularization audit failure did not fire';exception when raise_exception then if sqlerrm<>'H4_SYNTHETIC_FAILURE' then raise;end if;end;
 execute 'drop trigger z_h6_regularize_failure on public.auditoria';
 if audit_count<>(select count(*) from public.auditoria) then raise exception 'Regularization success partially audited';end if;
 end;
end $$;
rollback;
