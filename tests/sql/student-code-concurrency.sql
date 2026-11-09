begin isolation level serializable;
set local lock_timeout='5s';
do $$ declare actor uuid; a public.alumno; p jsonb; begin
 select ur.user_id into strict actor from public.app_user_roles ur join public.app_users u on u.id=ur.user_id join public.app_roles r on r.code=ur.role_code where ur.role_code='DIRECTOR_ACADEMICO' and u.active and r.active limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 select jsonb_build_object('apellido_paterno','PRUEBA','apellido_materno','SINTETICA','nombres','OCUPACION','tipo_di_id',(select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='TIPO_DI' and v.codigo='DNI'),'numero_di','98765432','fecha_nacimiento','2000-01-01','sexo_id',(select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='SEXO' and v.codigo='F'),'celular','999111222','domicilio','SINTETICO','nacimiento_departamento_id',pr.departamento_id,'nacimiento_provincia_id',pr.id,'nacimiento_distrito_id',d.id,'domicilio_departamento_id',pr.departamento_id,'domicilio_provincia_id',pr.id,'domicilio_distrito_id',d.id,'contactos',jsonb_build_array(jsonb_build_object('apellido','CONTACTO','nombre','SINTETICO','celular','999111222','parentesco_id',(select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='PARENTESCO' and v.codigo='PADRE')))) into strict p from public.distrito d join public.provincia pr on pr.id=d.provincia_id where d.active and pr.active limit 1;
 p:=p||jsonb_build_object('numero_di',left(replace(gen_random_uuid()::text,'-',''),30),'tipo_di_id',(select v.id from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='TIPO_DI' and v.codigo='CARNET_EXTRANJERIA'));
 a:=public.guardar_alumno(p);
 perform pg_sleep(0.2);
 raise notice 'GENERATED_CODE:%',a.codigo_alumno;
end $$;
rollback;
