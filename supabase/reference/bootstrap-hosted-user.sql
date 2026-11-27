-- Después de crear/confirmar la identidad mediante Auth Admin en entorno seguro.
-- Parámetros psql públicos: auth_user_id (UUID), role_code (un rol vigente).
-- No crea contraseñas, no activa perfiles bloqueados ni elimina roles existentes.
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '10s';
create temporary table bootstrap_identity(id uuid, role_code text) on commit drop;
insert into bootstrap_identity values (:'auth_user_id'::uuid, :'role_code');
do $$ declare target uuid; requested text; begin
 select id,role_code into strict target,requested from bootstrap_identity;
 if requested not in ('ADMIN_SISTEMA','DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO') then
  raise exception 'Rol no permitido';
 end if;
 perform 1 from auth.users where id=target and email_confirmed_at is not null
   and (banned_until is null or banned_until < now()) for update;
 if not found then raise exception 'Identidad no confirmada, ausente o bloqueada'; end if;
 if exists(select 1 from public.app_users where id=target and not active) then
  raise exception 'Perfil inactivo; requiere revisión independiente';
 end if;
 if not exists(select 1 from public.app_roles where code=requested and active) then
  raise exception 'Rol ausente o inactivo';
 end if;
 insert into public.app_users(id) values(target) on conflict(id) do nothing;
 insert into public.app_user_roles(user_id,role_code) values(target,requested) on conflict do nothing;
end $$;
commit;
