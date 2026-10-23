-- H2 approved model. Product writes remain denied until the command migration.
create extension if not exists btree_gist with schema extensions;

-- No assignment is translated into a functional role. Existing users remain,
-- but require a later explicit assignment; historical migration H1 is untouched.
delete from public.app_user_roles where role_code in ('ADMIN','OPERADOR');
delete from public.app_roles where code in ('ADMIN','OPERADOR');
alter table public.app_roles drop constraint app_roles_code_check;
alter table public.app_roles add constraint app_roles_code_check
  check (code in ('DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO','ADMIN_SISTEMA'));
insert into public.app_roles(code) values
 ('DIRECTOR_ACADEMICO'),('COORDINADOR_ACADEMICO'),('ADMIN_SISTEMA');

create table public.catalogo (
 id uuid primary key default gen_random_uuid(), codigo text not null unique,
 nombre text not null, activo boolean not null default true,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table public.catalogo_valor (
 id uuid primary key default gen_random_uuid(), catalogo_id uuid not null references public.catalogo(id),
 codigo text not null, nombre text not null, activo boolean not null default true, orden integer,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(), unique(catalogo_id,codigo)
);
create table public.departamento (
 id uuid primary key default gen_random_uuid(), codigo text not null unique, nombre text not null,
 active boolean not null default true
);
create table public.provincia (
 id uuid primary key default gen_random_uuid(), codigo text not null unique, nombre text not null,
 departamento_id uuid not null references public.departamento(id), active boolean not null default true,
 unique(id,departamento_id)
);
create table public.distrito (
 id uuid primary key default gen_random_uuid(), codigo text not null unique, nombre text not null,
 provincia_id uuid not null references public.provincia(id), active boolean not null default true,
 unique(id,provincia_id)
);
create table public.capitania (
 id uuid primary key default gen_random_uuid(), codigo text not null unique,
 nombre text not null, active boolean not null default true
);
create table public.materia (
 id uuid primary key default gen_random_uuid(),
 codigo text not null unique check(codigo=upper(btrim(codigo)) and length(codigo) between 1 and 30),
 nombre text not null unique check(nombre=upper(btrim(nombre)) and length(nombre) between 1 and 150),
 descripcion text check(length(descripcion)<=500), active boolean not null default true,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table public.carrera (
 id uuid primary key default gen_random_uuid(),
 codigo text not null unique check(codigo=upper(btrim(codigo)) and length(codigo) between 1 and 30),
 nombre text not null unique check(nombre=upper(btrim(nombre)) and length(nombre) between 1 and 150),
 descripcion text check(length(descripcion)<=500), active boolean not null default true,
 sigla text not null unique check(sigla=upper(btrim(sigla)) and sigla ~ '^[A-Z0-9]{2,10}$'),
 modalidad_id uuid not null references public.catalogo_valor(id),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table public.carrera_materia (
 id uuid primary key default gen_random_uuid(), carrera_id uuid not null references public.carrera(id),
 materia_id uuid not null references public.materia(id), unique(carrera_id,materia_id)
);
create table private.ciclo_correlativo (
 anio integer primary key, ultimo bigint not null check(ultimo>0)
);
revoke all on private.ciclo_correlativo from public,anon,authenticated;
create table public.ciclo (
 id uuid primary key default gen_random_uuid(), carrera_id uuid not null references public.carrera(id),
 anio integer not null, correlativo bigint not null check(correlativo>0), codigo_ciclo text not null unique,
 fecha_inicio date not null, fecha_fin date not null check(fecha_fin>=fecha_inicio),
 nombre_promocion text check(length(nombre_promocion)<=150),
 departamento_id uuid not null references public.departamento(id),
 provincia_id uuid not null, distrito_id uuid not null,
 capitania_id uuid not null references public.capitania(id),
 estado_codigo text not null default 'PROGRAMADO'
  check(estado_codigo in ('PROGRAMADO','EN_CURSO','CERRADO','DESIERTO','ANULADO')),
 motivo_desierto_id uuid references public.catalogo_valor(id), motivo text,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 foreign key(provincia_id,departamento_id) references public.provincia(id,departamento_id),
 foreign key(distrito_id,provincia_id) references public.distrito(id,provincia_id),
 unique(anio,correlativo),
 check(estado_codigo<>'DESIERTO' or motivo_desierto_id is not null),
 check(estado_codigo<>'ANULADO' or coalesce(length(btrim(motivo)),0)>0),
 exclude using gist (carrera_id with =,capitania_id with =,
  daterange(fecha_inicio,fecha_fin,'[]') with &&)
  where (estado_codigo in ('PROGRAMADO','EN_CURSO','CERRADO'))
);
create table public.ciclo_materia (
 id uuid primary key default gen_random_uuid(), ciclo_id uuid not null references public.ciclo(id),
 materia_id uuid not null references public.materia(id), activo boolean not null default true,
 origen text not null check(origen in ('HEREDADA','ADICIONAL')),
 motivo_inactivacion text check(motivo_inactivacion in ('RETIRO_MANUAL','CAMBIO_CARRERA')),
 observacion text check(length(observacion)<=500),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(ciclo_id,materia_id),
 check((activo and motivo_inactivacion is null) or (not activo and motivo_inactivacion is not null))
);
create table public.auditoria (
 id uuid primary key default gen_random_uuid(), entidad text not null,
 registro_id uuid not null, accion text not null, actor uuid not null,
 fecha timestamptz not null default clock_timestamp(), motivo text,
 old_values jsonb, new_values jsonb
);
create index auditoria_fecha on public.auditoria(fecha desc);
create index auditoria_actor on public.auditoria(actor);
create index auditoria_entidad_accion on public.auditoria(entidad,accion);
create index catalogo_valor_catalogo on public.catalogo_valor(catalogo_id);
create index provincia_departamento on public.provincia(departamento_id);
create index distrito_provincia on public.distrito(provincia_id);
create index carrera_materia_materia on public.carrera_materia(materia_id);
create index ciclo_materia_materia on public.ciclo_materia(materia_id);

-- Explicit closed inventory: no dynamic input, public policies or product grants.
alter table public.catalogo enable row level security;
alter table public.catalogo_valor enable row level security;
alter table public.departamento enable row level security;
alter table public.provincia enable row level security;
alter table public.distrito enable row level security;
alter table public.capitania enable row level security;
alter table public.materia enable row level security;
alter table public.carrera enable row level security;
alter table public.carrera_materia enable row level security;
alter table public.ciclo enable row level security;
alter table public.ciclo_materia enable row level security;
alter table public.auditoria enable row level security;
revoke all on public.catalogo,public.catalogo_valor,public.departamento,public.provincia,
 public.distrito,public.capitania,public.materia,public.carrera,public.carrera_materia,
 public.ciclo,public.ciclo_materia,public.auditoria from public,anon,authenticated;
