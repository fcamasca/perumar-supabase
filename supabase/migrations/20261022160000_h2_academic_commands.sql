-- H2 product access: explicit functional roles, no legacy role translation.
drop policy app_users_self_read on public.app_users;
drop policy app_users_admin_read on public.app_users;
drop policy app_user_roles_self_read on public.app_user_roles;
drop policy app_user_roles_admin_read on public.app_user_roles;
drop policy app_roles_active_read on public.app_roles;
drop policy app_roles_admin_read on public.app_roles;

create function private.functional_user() returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_active_role('DIRECTOR_ACADEMICO')
 or private.has_active_role('COORDINADOR_ACADEMICO')
 or private.has_active_role('ADMIN_SISTEMA');
$$;
create function private.academic_user() returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_active_role('DIRECTOR_ACADEMICO')
 or private.has_active_role('COORDINADOR_ACADEMICO');
$$;
revoke all on function private.functional_user(),private.academic_user() from public,anon,authenticated;
grant execute on function private.functional_user(),private.academic_user() to authenticated;

create policy app_users_self_read on public.app_users for select to authenticated
 using(id=auth.uid() and private.functional_user());
create policy app_users_admin_read on public.app_users for select to authenticated
 using(private.has_active_role('ADMIN_SISTEMA'));
create policy app_user_roles_self_read on public.app_user_roles for select to authenticated
 using(user_id=auth.uid() and private.functional_user());
create policy app_user_roles_admin_read on public.app_user_roles for select to authenticated
 using(private.has_active_role('ADMIN_SISTEMA'));
create policy app_roles_active_read on public.app_roles for select to authenticated
 using(active and private.functional_user());
create policy app_roles_admin_read on public.app_roles for select to authenticated
 using(private.has_active_role('ADMIN_SISTEMA'));

grant select on public.catalogo,public.catalogo_valor,public.departamento,public.provincia,
 public.distrito,public.capitania,public.materia,public.carrera,public.carrera_materia,
 public.ciclo,public.ciclo_materia,public.auditoria to authenticated;
create policy academic_read on public.catalogo for select to authenticated using(private.academic_user());
create policy academic_read on public.catalogo_valor for select to authenticated using(private.academic_user());
create policy academic_read on public.departamento for select to authenticated using(private.academic_user());
create policy academic_read on public.provincia for select to authenticated using(private.academic_user());
create policy academic_read on public.distrito for select to authenticated using(private.academic_user());
create policy academic_read on public.capitania for select to authenticated using(private.academic_user());
create policy academic_read on public.materia for select to authenticated using(private.academic_user());
create policy academic_read on public.carrera for select to authenticated using(private.academic_user());
create policy academic_read on public.carrera_materia for select to authenticated using(private.academic_user());
create policy academic_read on public.ciclo for select to authenticated using(private.academic_user());
create policy academic_read on public.ciclo_materia for select to authenticated using(private.academic_user());
create policy audit_read on public.auditoria for select to authenticated using(private.functional_user());

create function private.assert_fields(p jsonb,allowed text[]) returns void
language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(p) is distinct from 'object' or exists
  (select 1 from jsonb_object_keys(p) k where not(k=any(allowed))) or exists
  (select 1 from jsonb_each(p) entry where jsonb_typeof(entry.value) not in ('string','null')) then
  raise exception using errcode='22023',message='Datos de entrada no válidos';
 end if;
end; $$;
create function private.authorize(director_only boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.has_active_role('DIRECTOR_ACADEMICO') and
  (director_only or not private.has_active_role('COORDINADOR_ACADEMICO')) then
  raise exception using errcode='42501',message='Operación no autorizada';
 end if;
end; $$;
create function private.require_version(actual timestamptz,expected timestamptz) returns void
language plpgsql set search_path='' as $$
begin
 if expected is null or actual is distinct from expected then
  raise exception using errcode='40001',message='El registro fue modificado por otro usuario. Actualiza la información antes de volver a guardar.';
 end if;
end; $$;
create function private.require_catalog(value_id uuid,catalog_code text) returns void
language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id
  where v.id=value_id and v.activo and c.activo and c.codigo=catalog_code) then
  raise exception using errcode='23514',message='Valor de catálogo no válido o inactivo';
 end if;
end; $$;
create function private.stamp_update() returns trigger
language plpgsql set search_path='' as $$
begin
 new.created_at:=old.created_at;
 new.updated_at:=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');
 return new;
end; $$;
create trigger materia_stamp before update on public.materia for each row execute function private.stamp_update();
create trigger carrera_stamp before update on public.carrera for each row execute function private.stamp_update();
create trigger ciclo_stamp before update on public.ciclo for each row execute function private.stamp_update();
create trigger ciclo_materia_stamp before update on public.ciclo_materia for each row execute function private.stamp_update();

create function private.audit_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare prev jsonb; nextval jsonb; action text;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Actor requerido'; end if;
 if tg_op<>'INSERT' then prev:=to_jsonb(old)-'updated_at'; end if;
 if tg_op<>'DELETE' then nextval:=to_jsonb(new)-'updated_at'; end if;
 if prev is not distinct from nextval then return null; end if;
 action:=case when tg_op='INSERT' then 'CREATE' when tg_op='DELETE' then 'ASOCIACION_RETIRADA'
  when tg_table_name='ciclo' and prev->>'estado_codigo' is distinct from nextval->>'estado_codigo'
   then nextval->>'estado_codigo'
  when prev->>'active' is distinct from nextval->>'active'
   then case when (nextval->>'active')::boolean then 'REACTIVATE' else 'INACTIVATE' end
  else 'UPDATE' end;
 insert into public.auditoria(entidad,registro_id,accion,actor,motivo,old_values,new_values)
 values(tg_table_name,coalesce(nextval->>'id',prev->>'id')::uuid,action,auth.uid(),
  nullif(current_setting('perumar.audit_reason',true),''),prev,nextval);
 return null;
end; $$;
create trigger materia_audit after insert or update or delete on public.materia for each row execute function private.audit_change();
create trigger carrera_audit after insert or update or delete on public.carrera for each row execute function private.audit_change();
create trigger carrera_materia_audit after insert or delete on public.carrera_materia for each row execute function private.audit_change();
create trigger ciclo_audit after insert or update or delete on public.ciclo for each row execute function private.audit_change();
create trigger ciclo_materia_audit after insert or update or delete on public.ciclo_materia for each row execute function private.audit_change();

-- Deferred checks see the final aggregate, never require a temporarily empty
-- aggregate during the individual statements of its atomic save command.
create function private.carrera_minimum() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.carrera c where not exists(
  select 1 from public.carrera_materia cm join public.materia m on m.id=cm.materia_id
  where cm.carrera_id=c.id and m.active)) then
  raise exception using errcode='23514',message='Cada Carrera requiere al menos una Materia activa';
 end if;
 return null;
end; $$;
create constraint trigger carrera_minimum after insert or update on public.carrera
 deferrable initially deferred for each row execute function private.carrera_minimum();
create constraint trigger materia_minimum after update on public.materia
 deferrable initially deferred for each row execute function private.carrera_minimum();
create constraint trigger asociacion_minimum after insert or delete on public.carrera_materia
 deferrable initially deferred for each row execute function private.carrera_minimum();

create function private.sync_missing(target_carrera uuid) returns void
language plpgsql set search_path='' as $$
begin
 with added as (
  insert into public.ciclo_materia(ciclo_id,materia_id,origen)
  select c.id,cm.materia_id,'HEREDADA' from public.ciclo c
  join public.carrera_materia cm on cm.carrera_id=c.carrera_id
  join public.materia m on m.id=cm.materia_id and m.active
  where c.carrera_id=target_carrera and c.estado_codigo in ('PROGRAMADO','EN_CURSO')
  on conflict(ciclo_id,materia_id) do nothing returning ciclo_id
 ) update public.ciclo set updated_at=clock_timestamp() where id in(select ciclo_id from added);
end; $$;

create function public.guardar_materia(p jsonb) returns public.materia
language plpgsql security definer set search_path='' as $$
declare result public.materia; expected timestamptz;
begin
 perform private.authorize(true);
 perform private.assert_fields(p,array['id','expected_updated_at','codigo','nombre','descripcion']);
 perform set_config('perumar.audit_reason','',true);
 if p->>'id' is null then
  insert into public.materia(codigo,nombre,descripcion)
  values(upper(btrim(p->>'codigo')),upper(btrim(p->>'nombre')),p->>'descripcion') returning * into result;
 else
  expected:=(p->>'expected_updated_at')::timestamptz;
  update public.materia set codigo=upper(btrim(p->>'codigo')),nombre=upper(btrim(p->>'nombre')),descripcion=p->>'descripcion'
   where id=(p->>'id')::uuid and updated_at=expected returning * into result;
  if not found then perform private.require_version(null,expected); end if;
 end if;
 return result;
end; $$;

create function public.guardar_carrera(p jsonb,materias uuid[]) returns public.carrera
language plpgsql security definer set search_path='' as $$
declare result public.carrera; previous_sigla text; expected timestamptz;
begin
 perform private.authorize(true);
 perform private.assert_fields(p,array['id','expected_updated_at','codigo','nombre','descripcion','sigla','modalidad_id']);
 perform set_config('perumar.audit_reason','',true);
 if not exists(select 1 from public.carrera where id=(p->>'id')::uuid and modalidad_id=(p->>'modalidad_id')::uuid) then
  perform private.require_catalog((p->>'modalidad_id')::uuid,'MODALIDAD_CARRERA');
 end if;
 if materias is null or cardinality(materias)=0 or
  (select count(distinct x) from unnest(materias) x)<>cardinality(materias) then
  raise exception using errcode='23514',message='Seleccione Materias sin duplicados';
 end if;
 if exists(select 1 from unnest(materias) x left join public.materia m on m.id=x
 where m.id is null or (not m.active and not exists(select 1 from public.carrera_materia cm
 where cm.carrera_id=(p->>'id')::uuid and cm.materia_id=x))) then
  raise exception using errcode='23514',message='No puede agregar Materias inactivas';
 end if;
 if not exists(select 1 from public.materia where id=any(materias) and active) then
  raise exception using errcode='23514',message='Seleccione al menos una Materia activa';
 end if;
 if p->>'id' is null then
  insert into public.carrera(codigo,nombre,descripcion,sigla,modalidad_id)
  values(upper(btrim(p->>'codigo')),upper(btrim(p->>'nombre')),p->>'descripcion',upper(btrim(p->>'sigla')),(p->>'modalidad_id')::uuid)
  returning * into result;
 else
  select sigla into previous_sigla from public.carrera where id=(p->>'id')::uuid;
  expected:=(p->>'expected_updated_at')::timestamptz;
  update public.carrera set codigo=upper(btrim(p->>'codigo')),nombre=upper(btrim(p->>'nombre')),
   descripcion=p->>'descripcion',sigla=upper(btrim(p->>'sigla')),modalidad_id=(p->>'modalidad_id')::uuid
   where id=(p->>'id')::uuid and updated_at=expected returning * into result;
  if not found then perform private.require_version(null,expected); end if;
 end if;
 delete from public.carrera_materia where carrera_id=result.id and not(materia_id=any(materias));
 insert into public.carrera_materia(carrera_id,materia_id) select result.id,x from unnest(materias) x
  on conflict(carrera_id,materia_id) do nothing;
 perform private.sync_missing(result.id);
 if previous_sigla is distinct from result.sigla then
  update public.ciclo set codigo_ciclo=anio::text||'-'||lpad(correlativo::text,greatest(3,length(correlativo::text)),'0')||'-'||result.sigla
   where carrera_id=result.id and estado_codigo in ('PROGRAMADO','EN_CURSO');
 end if;
 return result;
end; $$;

create function public.cambiar_active_materia(id uuid,expected_updated_at timestamptz,active boolean,motivo text default null)
returns public.materia language plpgsql security definer set search_path='' as $$
declare result public.materia;
begin
 perform private.authorize(true);
 if active is null or (not active and coalesce(length(btrim(motivo)),0)=0) then
  raise exception using errcode='23514',message='Motivo obligatorio para inactivar'; end if;
 perform set_config('perumar.audit_reason',case when active then '' else motivo end,true);
 update public.materia m set active=cambiar_active_materia.active
  where m.id=cambiar_active_materia.id and m.updated_at=expected_updated_at returning * into result;
 if not found then perform private.require_version(null,expected_updated_at); end if;
 -- Touch affected aggregate versions as part of the same transaction.
 update public.carrera set updated_at=clock_timestamp() where public.carrera.id in
  (select carrera_id from public.carrera_materia where materia_id=result.id);
 return result;
end; $$;
create function public.cambiar_active_carrera(id uuid,expected_updated_at timestamptz,active boolean,motivo text default null)
returns public.carrera language plpgsql security definer set search_path='' as $$
declare result public.carrera;
begin
 perform private.authorize(true);
 if active is null or (not active and coalesce(length(btrim(motivo)),0)=0) then
  raise exception using errcode='23514',message='Motivo obligatorio para inactivar'; end if;
 perform set_config('perumar.audit_reason',case when active then '' else motivo end,true);
 update public.carrera c set active=cambiar_active_carrera.active
  where c.id=cambiar_active_carrera.id and c.updated_at=expected_updated_at returning * into result;
 if not found then perform private.require_version(null,expected_updated_at); end if;
 return result;
end; $$;

create function public.guardar_ciclo(p jsonb,adicionales uuid[] default '{}') returns public.ciclo
language plpgsql security definer set search_path='' as $$
declare result public.ciclo; carrera public.carrera; expected timestamptz; next_number bigint; year_number integer;
 previous_carrera uuid; previous_cycle public.ciclo;
begin
 perform private.authorize(false);
 perform private.assert_fields(p,array['id','expected_updated_at','carrera_id','fecha_inicio','fecha_fin','nombre_promocion',
  'departamento_id','provincia_id','distrito_id','capitania_id']);
 perform set_config('perumar.audit_reason','',true);
 if coalesce(p->>'fecha_inicio','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p->>'fecha_fin','') !~ '^\d{4}-\d{2}-\d{2}$' then
  raise exception using errcode='22023',message='Fechas de calendario requeridas'; end if;
 select * into carrera from public.carrera where id=(p->>'carrera_id')::uuid;
 if carrera.id is null then raise exception using errcode='23514',message='Carrera no válida'; end if;
 if p->>'id' is not null then select * into previous_cycle from public.ciclo where id=(p->>'id')::uuid; end if;
 if (previous_cycle.id is null or previous_cycle.carrera_id is distinct from carrera.id) and not carrera.active then
  raise exception using errcode='23514',message='Carrera inactiva'; end if;
 if ((previous_cycle.id is null or previous_cycle.capitania_id is distinct from (p->>'capitania_id')::uuid)
   and not exists(select 1 from public.capitania where id=(p->>'capitania_id')::uuid and active))
 or ((previous_cycle.id is null or previous_cycle.departamento_id is distinct from (p->>'departamento_id')::uuid)
   and not exists(select 1 from public.departamento where id=(p->>'departamento_id')::uuid and active))
 or ((previous_cycle.id is null or previous_cycle.provincia_id is distinct from (p->>'provincia_id')::uuid)
   and not exists(select 1 from public.provincia where id=(p->>'provincia_id')::uuid and active))
 or ((previous_cycle.id is null or previous_cycle.distrito_id is distinct from (p->>'distrito_id')::uuid)
   and not exists(select 1 from public.distrito where id=(p->>'distrito_id')::uuid and active)) then
  raise exception using errcode='23514',message='Referencia geográfica inactiva'; end if;
 if adicionales is null or (select count(distinct x) from unnest(adicionales) x)<>cardinality(adicionales)
  or exists(select 1 from unnest(adicionales) x left join public.materia m on m.id=x where m.id is null or not m.active) then
  raise exception using errcode='23514',message='Materias adicionales no válidas'; end if;
 if p->>'id' is null then
  if not carrera.active or not exists(select 1 from public.capitania where id=(p->>'capitania_id')::uuid and active) then
   raise exception using errcode='23514',message='Referencia inactiva'; end if;
  year_number:=extract(year from clock_timestamp() at time zone 'America/Lima');
  insert into private.ciclo_correlativo(anio,ultimo) values(year_number,1)
   on conflict(anio) do update set ultimo=private.ciclo_correlativo.ultimo+1 returning ultimo into next_number;
  insert into public.ciclo(carrera_id,anio,correlativo,codigo_ciclo,fecha_inicio,fecha_fin,nombre_promocion,departamento_id,provincia_id,distrito_id,capitania_id)
  values(carrera.id,year_number,next_number,year_number::text||'-'||lpad(next_number::text,greatest(3,length(next_number::text)),'0')||'-'||carrera.sigla,
   (p->>'fecha_inicio')::date,(p->>'fecha_fin')::date,p->>'nombre_promocion',(p->>'departamento_id')::uuid,
   (p->>'provincia_id')::uuid,(p->>'distrito_id')::uuid,(p->>'capitania_id')::uuid) returning * into result;
 else
  select carrera_id into previous_carrera from public.ciclo where id=(p->>'id')::uuid;
  expected:=(p->>'expected_updated_at')::timestamptz;
  update public.ciclo c set carrera_id=carrera.id,fecha_inicio=(p->>'fecha_inicio')::date,
   fecha_fin=(p->>'fecha_fin')::date,nombre_promocion=p->>'nombre_promocion',
   departamento_id=(p->>'departamento_id')::uuid,provincia_id=(p->>'provincia_id')::uuid,
   distrito_id=(p->>'distrito_id')::uuid,capitania_id=(p->>'capitania_id')::uuid,
   codigo_ciclo=c.anio::text||'-'||lpad(c.correlativo::text,greatest(3,length(c.correlativo::text)),'0')||'-'||carrera.sigla
   where c.id=(p->>'id')::uuid and c.updated_at=expected and c.estado_codigo in ('PROGRAMADO','EN_CURSO') returning * into result;
  if not found then perform private.require_version(null,expected); end if;
  if previous_carrera is distinct from carrera.id then
   update public.ciclo_materia set activo=false,motivo_inactivacion='CAMBIO_CARRERA'
    where ciclo_id=result.id and activo and origen='HEREDADA';
  end if;
 end if;
 insert into public.ciclo_materia(ciclo_id,materia_id,origen)
 select result.id,cm.materia_id,'HEREDADA' from public.carrera_materia cm
 join public.materia m on m.id=cm.materia_id and m.active where cm.carrera_id=carrera.id
 on conflict(ciclo_id,materia_id) do nothing;
 insert into public.ciclo_materia(ciclo_id,materia_id,origen)
 select result.id,x,'ADICIONAL' from unnest(adicionales) x on conflict(ciclo_id,materia_id) do nothing;
 if p->>'id' is null and not exists(select 1 from public.ciclo_materia cm join public.materia m on m.id=cm.materia_id
  where cm.ciclo_id=result.id and cm.activo and m.active) then
  raise exception using errcode='23514',message='El Ciclo requiere una Materia activa'; end if;
 return result;
end; $$;

create function public.cambiar_materia_ciclo(ciclo_id uuid,materia_id uuid,expected_updated_at timestamptz,activo boolean)
returns public.ciclo language plpgsql security definer set search_path='' as $$
declare result public.ciclo;
begin
 perform private.authorize(false);
 if activo is null then raise exception using errcode='22023',message='Estado requerido'; end if;
 perform set_config('perumar.audit_reason','',true);
 update public.ciclo c set updated_at=clock_timestamp()
  where c.id=ciclo_id and c.updated_at=expected_updated_at and c.estado_codigo in ('PROGRAMADO','EN_CURSO') returning * into result;
 if not found then perform private.require_version(null,expected_updated_at); end if;
 update public.ciclo_materia cm set activo=cambiar_materia_ciclo.activo,
  motivo_inactivacion=case when cambiar_materia_ciclo.activo then null else 'RETIRO_MANUAL' end
  where cm.ciclo_id=cambiar_materia_ciclo.ciclo_id and cm.materia_id=cambiar_materia_ciclo.materia_id;
 if not found then raise exception using errcode='22023',message='Relación no existente'; end if;
 return result;
end; $$;

create function public.cambiar_estado_ciclo(id uuid,expected_updated_at timestamptz,destino text,
 motivo text default null,motivo_desierto_id uuid default null)
returns public.ciclo language plpgsql security definer set search_path='' as $$
declare result public.ciclo; label text; audit_reason text;
begin
 perform private.authorize(true);
 if destino='DESIERTO' then
  perform private.require_catalog(motivo_desierto_id,'MOTIVO_CICLO_DESIERTO');
  select codigo into label from public.catalogo_valor where public.catalogo_valor.id=motivo_desierto_id;
  if label='OTRO' and coalesce(length(btrim(motivo)),0)=0 then raise exception using errcode='23514',message='Detalle obligatorio para OTRO'; end if;
  audit_reason:=label||coalesce(': '||nullif(btrim(motivo),''),'');
 elsif destino='ANULADO' then
  if coalesce(length(btrim(motivo)),0)=0 then raise exception using errcode='23514',message='Motivo obligatorio'; end if;
  audit_reason:=motivo;
 end if;
 perform set_config('perumar.audit_reason',coalesce(audit_reason,''),true);
 update public.ciclo c set estado_codigo=destino,motivo=cambiar_estado_ciclo.motivo,
  motivo_desierto_id=case when destino='DESIERTO' then cambiar_estado_ciclo.motivo_desierto_id else null end
 where c.id=cambiar_estado_ciclo.id and c.updated_at=expected_updated_at and (
  (c.estado_codigo='PROGRAMADO' and destino in ('EN_CURSO','DESIERTO','ANULADO')) or
  (c.estado_codigo='EN_CURSO' and destino in ('CERRADO','DESIERTO'))) returning * into result;
 if not found then raise exception using errcode='40001',message='Transición no permitida o versión desactualizada'; end if;
 return result;
end; $$;

revoke all on function private.assert_fields(jsonb,text[]),private.authorize(boolean),
 private.require_version(timestamptz,timestamptz),private.require_catalog(uuid,text),private.stamp_update(),
 private.audit_change(),private.carrera_minimum(),private.sync_missing(uuid) from public,anon,authenticated;
revoke all on function public.guardar_materia(jsonb),public.guardar_carrera(jsonb,uuid[]),
 public.cambiar_active_materia(uuid,timestamptz,boolean,text),public.cambiar_active_carrera(uuid,timestamptz,boolean,text),
 public.guardar_ciclo(jsonb,uuid[]),public.cambiar_materia_ciclo(uuid,uuid,timestamptz,boolean),
 public.cambiar_estado_ciclo(uuid,timestamptz,text,text,uuid) from public,anon,authenticated;
grant execute on function public.guardar_materia(jsonb),public.guardar_carrera(jsonb,uuid[]),
 public.cambiar_active_materia(uuid,timestamptz,boolean,text),public.cambiar_active_carrera(uuid,timestamptz,boolean,text),
 public.guardar_ciclo(jsonb,uuid[]),public.cambiar_materia_ciclo(uuid,uuid,timestamptz,boolean),
 public.cambiar_estado_ciclo(uuid,timestamptz,text,text,uuid) to authenticated;

-- PostgREST hoists this function setting to the request transaction isolation.
-- SSI protects cross-row minimum/association predicates without form locks or
-- automatic retries with a new user version. A serialization failure is 40001.
-- https://docs.postgrest.org/en/stable/references/transactions.html#isolation-level
alter function public.guardar_materia(jsonb) set default_transaction_isolation='serializable';
alter function public.guardar_carrera(jsonb,uuid[]) set default_transaction_isolation='serializable';
alter function public.cambiar_active_materia(uuid,timestamptz,boolean,text) set default_transaction_isolation='serializable';
alter function public.cambiar_active_carrera(uuid,timestamptz,boolean,text) set default_transaction_isolation='serializable';
alter function public.guardar_ciclo(jsonb,uuid[]) set default_transaction_isolation='serializable';
alter function public.cambiar_materia_ciclo(uuid,uuid,timestamptz,boolean) set default_transaction_isolation='serializable';
alter function public.cambiar_estado_ciclo(uuid,timestamptz,text,text,uuid) set default_transaction_isolation='serializable';
notify pgrst,'reload schema';
