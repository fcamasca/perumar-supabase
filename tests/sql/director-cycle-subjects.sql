begin;
set local lock_timeout='3s';
do $$ declare actor uuid:=gen_random_uuid(); coordinator uuid:=gen_random_uuid(); m public.materia; extra public.materia; career public.carrera; c public.ciclo; a public.alumno; p jsonb; t public.tarifa; e public.matricula; original jsonb; charges jsonb; old_version timestamptz; rel uuid; token text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); begin
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
 select * into c from public.ciclo where id=c.id;
 original:=to_jsonb(e);select jsonb_agg(to_jsonb(mc) order by mc.id) into charges from public.matricula_cargo mc where matricula_id=e.id;
 old_version:=c.updated_at;select id into rel from public.ciclo_materia where ciclo_id=c.id and materia_id=m.id;
 begin perform public.cambiar_materia_ciclo(c.id,m.id,c.updated_at,false);raise exception 'Unconfirmed Director accepted';exception when check_violation then if sqlerrm<>'Confirmación requerida para asignaturas con matrículas activas' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',coordinator::text,true);
 begin perform public.cambiar_materia_ciclo(c.id,m.id,c.updated_at,false,true);raise exception 'Coordinator forged confirmation';exception when insufficient_privilege then null;end;
 begin perform public.cambiar_materia_ciclo(c.id,m.id,c.updated_at,false);raise exception 'Coordinator accepted';exception when check_violation then null;end;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 c:=public.cambiar_materia_ciclo(c.id,m.id,c.updated_at,false,true);
 if not exists(select 1 from public.ciclo_materia where id=rel and not activo and motivo_inactivacion='RETIRO_MANUAL') then raise exception 'Retirement lost history';end if;
 begin perform public.cambiar_materia_ciclo(c.id,m.id,old_version,true,true);raise exception 'Stale confirmation accepted';exception when sqlstate 'PT409' then null;end;
 begin update public.ciclo_materia set activo=true,motivo_inactivacion=null where id=rel;raise exception 'Confirmation context leaked';exception when check_violation then null;end;
 c:=public.cambiar_materia_ciclo(c.id,m.id,c.updated_at,true,true);
 if not exists(select 1 from public.ciclo_materia where id=rel and activo and origen='HEREDADA') then raise exception 'Reactivation replaced history';end if;
 begin perform public.cambiar_materia_ciclo(c.id,extra.id,c.updated_at,true);raise exception 'Unconfirmed addition accepted';exception when check_violation then null;end;
 c:=public.cambiar_materia_ciclo(c.id,extra.id,c.updated_at,true,true);
 if not exists(select 1 from public.ciclo_materia where ciclo_id=c.id and materia_id=extra.id and activo and origen='ADICIONAL') then raise exception 'Additional missing';end if;
 begin update public.ciclo set carrera_id=(select id from public.carrera where id<>career.id limit 1) where id=c.id;raise exception 'Course restriction bypassed';exception when check_violation then null;end;
 if original is distinct from (select to_jsonb(x) from public.matricula x where id=e.id) or charges is distinct from (select jsonb_agg(to_jsonb(mc) order by mc.id) from public.matricula_cargo mc where matricula_id=e.id) then raise exception 'Enrollment history changed';end if;
 if (select count(*) from public.auditoria where registro_id in (select id from public.ciclo_materia where ciclo_id=c.id) and motivo='Director confirma cambio de asignaturas del Ciclo con matrículas activas')<>3 then raise exception 'Missing confirmed audit';end if;
 c:=public.cambiar_estado_ciclo(c.id,c.updated_at,'EN_CURSO');
 c:=public.cambiar_estado_ciclo(c.id,c.updated_at,'CERRADO');
 begin perform public.cambiar_materia_ciclo(c.id,m.id,c.updated_at,false,true);raise exception 'Terminal accepted';exception when sqlstate 'PT409' then null;end;
 set constraints all immediate;
end $$;
rollback;
