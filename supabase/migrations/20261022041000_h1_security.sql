-- H1 only: application identity and validation roles; no Auth accounts or passwords.
create table public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.app_roles (
  code text primary key check (code in ('ADMIN', 'OPERADOR')),
  active boolean not null default true
);

create table public.app_user_roles (
  user_id uuid not null references public.app_users(id) on delete cascade,
  role_code text not null references public.app_roles(code),
  created_at timestamptz not null default now(),
  primary key (user_id, role_code)
);

insert into public.app_roles(code) values ('ADMIN'), ('OPERADOR');

alter table public.app_users enable row level security;
alter table public.app_roles enable row level security;
alter table public.app_user_roles enable row level security;

revoke all on public.app_users, public.app_roles, public.app_user_roles from public, anon, authenticated;
grant select on public.app_users, public.app_roles, public.app_user_roles to authenticated;
-- Only the explicit local fixture process uses this administrative platform role.
grant select, insert, update, delete on public.app_users, public.app_roles, public.app_user_roles to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.has_active_role(role_code text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_users as u
    join public.app_user_roles as ur on ur.user_id = u.id
    join public.app_roles as r on r.code = ur.role_code
    where u.id = (select auth.uid())
      and u.active
      and r.active
      and r.code = $1
  );
$$;
alter function private.has_active_role(text) owner to postgres;
revoke all on function private.has_active_role(text) from public, anon, authenticated;
grant execute on function private.has_active_role(text) to authenticated;

create policy app_users_self_read on public.app_users
for select to authenticated
using (id = (select auth.uid()) and (
  (select private.has_active_role('ADMIN')) or (select private.has_active_role('OPERADOR'))
));
create policy app_users_admin_read on public.app_users
for select to authenticated using ((select private.has_active_role('ADMIN')));

create policy app_user_roles_self_read on public.app_user_roles
for select to authenticated
using (user_id = (select auth.uid()) and (
  (select private.has_active_role('ADMIN')) or (select private.has_active_role('OPERADOR'))
));
create policy app_user_roles_admin_read on public.app_user_roles
for select to authenticated using ((select private.has_active_role('ADMIN')));

create policy app_roles_active_read on public.app_roles
for select to authenticated
using (active and (
  (select private.has_active_role('ADMIN')) or (select private.has_active_role('OPERADOR'))
));
create policy app_roles_admin_read on public.app_roles
for select to authenticated using ((select private.has_active_role('ADMIN')));
