-- Incremental regression against existing local human fixtures; all changes roll back.
begin;
set local lock_timeout='3s';
do $$
declare a public.alumno; result public.alumno; occupation uuid; other uuid; wrong uuid; p jsonb; shot jsonb; actor uuid;
begin
 select ur.user_id into strict actor from public.app_user_roles ur join public.app_users u on u.id=ur.user_id join public.app_roles r on r.code=ur.role_code where ur.role_code='DIRECTOR_ACADEMICO' and u.active and r.active limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 select jsonb_build_object('apellido_paterno','PRUEBA','apellido_materno','SINTETICA','nombres','OCUPACION','tipo_di_id',(select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='TIPO_DI' and v.codigo='DNI'),'numero_di','98765432','fecha_nacimiento','2000-01-01','sexo_id',(select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='SEXO' and v.codigo='F'),'celular','999111222','domicilio','SINTETICO','nacimiento_departamento_id',pr.departamento_id,'nacimiento_provincia_id',pr.id,'nacimiento_distrito_id',d.id,'domicilio_departamento_id',pr.departamento_id,'domicilio_provincia_id',pr.id,'domicilio_distrito_id',d.id,'contactos',jsonb_build_array(jsonb_build_object('apellido','CONTACTO','nombre','SINTETICO','celular','999111222','parentesco_id',(select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='PARENTESCO' and v.codigo='PADRE')))) into strict p from public.distrito d join public.provincia pr on pr.id=d.provincia_id where d.active and pr.active limit 1;
 a:=public.guardar_alumno(p);
 select v.id into strict occupation from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='OCUPACION' and v.codigo='MECANICO';
 select v.id into strict other from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='OCUPACION' and v.codigo='OTROS';
 wrong:=a.sexo_id;
 select jsonb_object_agg(key,case when value='null'::jsonb then value else to_jsonb(value#>>'{}') end) into p from jsonb_each(to_jsonb(a)-'created_at'-'updated_at');
 p:=p||jsonb_build_object('expected_updated_at',a.updated_at::text,'ocupacion_id',occupation::text,'ocupacion','FORGED');
 result:=public.guardar_alumno(p);
 if result.ocupacion<>'MECÁNICO' then raise exception 'Catalog label not canonicalized'; end if;
 shot:=private.enrollment_snapshot(a.id);
 if shot#>>'{catalogos,OCUPACION,id}'<>occupation::text or shot#>>'{catalogos,OCUPACION,etiqueta}'<>'MECÁNICO' then raise exception 'Snapshot missing occupation identity/label'; end if;
 p:=p||jsonb_build_object('expected_updated_at',result.updated_at::text,'ocupacion_id',other::text,'ocupacion','soldador naval');
 result:=public.guardar_alumno(p);
 if result.ocupacion<>'SOLDADOR NAVAL' then raise exception 'Custom occupation not normalized'; end if;
 if private.enrollment_snapshot(a.id)#>>'{alumno,ocupacion}'<>'SOLDADOR NAVAL' then raise exception 'Snapshot missing custom detail'; end if;
 p:=p||jsonb_build_object('expected_updated_at',result.updated_at::text);
 begin perform public.guardar_alumno(p||jsonb_build_object('ocupacion',' ')); raise exception 'Blank OTROS accepted'; exception when check_violation then null; end;
 begin perform public.guardar_alumno(p||jsonb_build_object('ocupacion_id',wrong::text)); raise exception 'Wrong catalog accepted'; exception when check_violation then null; end;
 begin perform public.guardar_alumno(p||jsonb_build_object('ocupacion',repeat('X',151))); raise exception 'Long detail accepted'; exception when check_violation then null; end;
 update public.catalogo_valor set activo=false where id=occupation;
 begin perform public.guardar_alumno(p||jsonb_build_object('ocupacion_id',occupation::text)); raise exception 'Inactive value accepted'; exception when check_violation then null; end;
end $$;
rollback;
