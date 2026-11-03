-- Real commands with synthetic data only; all writes are rolled back.
begin;
set local lock_timeout='3s';
do $$
declare actor uuid; m public.materia; c public.carrera; mode_id uuid; wrong_id uuid; p jsonb; token text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
begin
 select ur.user_id into strict actor from public.app_user_roles ur join public.app_users u on u.id=ur.user_id join public.app_roles r on r.code=ur.role_code where ur.role_code='DIRECTOR_ACADEMICO' and u.active and r.active limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 if (select attnotnull from pg_attribute where attrelid='public.carrera'::regclass and attname='modalidad_id') then raise exception 'Modality still mandatory'; end if;
 if not exists(select 1 from pg_proc where oid='public.guardar_carrera(jsonb,uuid[])'::regprocedure and proconfig @> array['default_transaction_isolation=serializable']) then raise exception 'Isolation configuration changed'; end if;
 m:=public.guardar_materia(jsonb_build_object('nombre','SYNTHETIC MODALITY '||token));
 p:=jsonb_build_object('nombre','SYNTHETIC CAREER '||token,'sigla','S'||token);
 c:=public.guardar_carrera(p,array[m.id]);
 if c.modalidad_id is null or c.con_experiencia then raise exception 'Career defaults not applied'; end if;
 select v.id into strict mode_id from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='MODALIDAD_CARRERA' and cat.activo and v.activo limit 1;
 select v.id into strict wrong_id from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo<>'MODALIDAD_CARRERA' limit 1;
 p:=p||jsonb_build_object('id',c.id,'expected_updated_at',c.updated_at::text,'modalidad_id',mode_id);
 c:=public.guardar_carrera(p,array[m.id]);
 if c.modalidad_id is distinct from mode_id then raise exception 'Valid modality rejected'; end if;
 begin perform public.guardar_carrera(p,array[m.id]); raise exception 'Stale version accepted'; exception when serialization_failure then null; end;
 p:=p||jsonb_build_object('expected_updated_at',c.updated_at::text,'modalidad_id',null);
 c:=public.guardar_carrera(p,array[m.id]);
 if c.modalidad_id is not null then raise exception 'Null modality rejected'; end if;
 p:=p||jsonb_build_object('expected_updated_at',c.updated_at::text,'modalidad_id',' ');
 c:=public.guardar_carrera(p,array[m.id]);
 if c.modalidad_id is not null then raise exception 'Blank modality not normalized'; end if;
 p:=p||jsonb_build_object('expected_updated_at',c.updated_at::text);
 begin perform public.guardar_carrera(p||jsonb_build_object('modalidad_id',wrong_id),array[m.id]); raise exception 'Wrong catalog accepted'; exception when check_violation then null; end;
 begin perform public.guardar_carrera(p,array[]::uuid[]); raise exception 'No active subject accepted'; exception when check_violation then null; end;
 begin perform public.guardar_carrera(p||jsonb_build_object('sigla','!'),array[m.id]); raise exception 'Invalid sigla accepted'; exception when check_violation then null; end;
 c:=public.guardar_carrera(p||jsonb_build_object('modalidad_id',mode_id),array[m.id]);
 update public.catalogo_valor set activo=false where id=mode_id;
 c:=public.guardar_carrera(p||jsonb_build_object('modalidad_id',mode_id,'expected_updated_at',c.updated_at::text),array[m.id]);
 if c.modalidad_id is distinct from mode_id then raise exception 'Existing inactive reference lost'; end if;
 begin perform public.guardar_carrera(jsonb_build_object('nombre','NEW INACTIVE '||token,'sigla','N'||token,'modalidad_id',mode_id),array[m.id]); raise exception 'Inactive modality accepted for new career'; exception when check_violation then null; end;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform public.guardar_carrera(p,array[m.id]); raise exception 'Unauthorized command accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
