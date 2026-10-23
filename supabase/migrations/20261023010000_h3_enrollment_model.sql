-- H3 approved 551cd00: relational model, no product writes outside commands.
create table public.alumno (
 id uuid primary key default gen_random_uuid(),
 apellido_paterno text not null check(length(btrim(apellido_paterno)) between 1 and 150),
 apellido_materno text not null check(length(btrim(apellido_materno)) between 1 and 150),
 nombres text not null check(length(btrim(nombres)) between 1 and 150),
 tipo_di_id uuid not null references public.catalogo_valor(id), numero_di text not null,
 fecha_nacimiento date not null check(isfinite(fecha_nacimiento)), sexo_id uuid not null references public.catalogo_valor(id),
 estado_civil_id uuid references public.catalogo_valor(id),
 nacimiento_departamento_id uuid not null references public.departamento(id), nacimiento_provincia_id uuid not null, nacimiento_distrito_id uuid not null,
 celular text not null check(length(btrim(celular)) between 1 and 30 and celular ~ '^[+0-9 ()-]+$'),
 telefono_fijo text check(length(telefono_fijo)<=30 and telefono_fijo ~ '^[+0-9 ()-]+$'),
 email text check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 domicilio text not null check(length(btrim(domicilio)) between 1 and 500), numero_mz_lt text check(length(numero_mz_lt)<=100),
 domicilio_departamento_id uuid not null references public.departamento(id), domicilio_provincia_id uuid not null, domicilio_distrito_id uuid not null,
 grupo_sanguineo_id uuid references public.catalogo_valor(id), grado_instruccion_id uuid references public.catalogo_valor(id),
 color_ojos_id uuid references public.catalogo_valor(id), color_cabello_id uuid references public.catalogo_valor(id),
 estatura_cm numeric check(estatura_cm>0 and estatura_cm::text not in ('NaN','Infinity','-Infinity')),
 peso_kg numeric check(peso_kg>0 and peso_kg::text not in ('NaN','Infinity','-Infinity')),
 senas_particulares text check(length(senas_particulares)<=500), ocupacion text check(length(ocupacion)<=150),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 unique(tipo_di_id,numero_di),
 foreign key(nacimiento_provincia_id,nacimiento_departamento_id) references public.provincia(id,departamento_id),
 foreign key(nacimiento_distrito_id,nacimiento_provincia_id) references public.distrito(id,provincia_id),
 foreign key(domicilio_provincia_id,domicilio_departamento_id) references public.provincia(id,departamento_id),
 foreign key(domicilio_distrito_id,domicilio_provincia_id) references public.distrito(id,provincia_id)
);
create table public.alumno_contacto_emergencia (
 id uuid primary key default gen_random_uuid(), alumno_id uuid not null references public.alumno(id),
 apellido text not null check(length(btrim(apellido)) between 1 and 150), nombre text not null check(length(btrim(nombre)) between 1 and 150),
 parentesco_id uuid not null references public.catalogo_valor(id),
 celular text not null check(length(btrim(celular)) between 1 and 30 and celular ~ '^[+0-9 ()-]+$'), direccion text check(length(direccion)<=500), activo boolean not null default true,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);
create table public.empresa_patrocinadora (
 id uuid primary key default gen_random_uuid(), ruc text not null unique check(ruc ~ '^[0-9]{11}$'),
 razon_social text not null check(length(btrim(razon_social)) between 1 and 200), persona_contacto text check(length(persona_contacto)<=150),
 telefono text check(length(telefono)<=30 and telefono ~ '^[+0-9 ()-]+$'),
 email text check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);
create table public.tarifa (
 id uuid primary key default gen_random_uuid(), codigo text not null unique check(codigo=upper(btrim(codigo)) and length(codigo) between 1 and 30),
 nombre text not null check(length(btrim(nombre)) between 1 and 150), descripcion text check(length(descripcion)<=500),
 tipo text not null check(tipo in ('CARRERA','OTRO')), monto_por_defecto numeric(12,2) not null check(monto_por_defecto>=0 and monto_por_defecto::text<>'NaN'), activo boolean not null default true,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);
create table public.ciclo_tarifa (
 id uuid primary key default gen_random_uuid(), ciclo_id uuid not null references public.ciclo(id), tarifa_id uuid not null references public.tarifa(id),
 importe numeric(12,2) not null check(importe>=0 and importe::text<>'NaN'), obligatorio boolean not null, activo boolean not null default true,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), unique(ciclo_id,tarifa_id)
);
create table private.matricula_correlativo (
 anio integer not null, sigla text not null, ultimo bigint not null check(ultimo>0), primary key(anio,sigla)
);
revoke all on private.matricula_correlativo from public,anon,authenticated;
create table public.matricula (
 id uuid primary key default gen_random_uuid(), alumno_id uuid not null references public.alumno(id), ciclo_id uuid not null references public.ciclo(id),
 empresa_patrocinadora_id uuid references public.empresa_patrocinadora(id), estado_codigo text not null default 'ACTIVO' check(estado_codigo in ('ACTIVO','ANULADO')),
 codigo_matricula text not null unique check(codigo_matricula=upper(btrim(codigo_matricula)) and codigo_matricula ~ '^[0-9]{4}-[A-Z0-9]{2,10}-[0-9]{3,}$'),
 codigo_generado_original text not null, anio_generacion integer not null, sigla_generacion text not null, correlativo bigint not null,
 alumno_snapshot jsonb not null, motivo_anulacion text check(length(motivo_anulacion)<=500), anulado_por uuid, anulado_at timestamptz,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), unique(alumno_id,ciclo_id),
 check(estado_codigo<>'ANULADO' or (coalesce(length(btrim(motivo_anulacion)),0)>0 and anulado_por is not null and anulado_at is not null))
);
create table public.matricula_cargo (
 id uuid primary key default gen_random_uuid(), matricula_id uuid not null references public.matricula(id), ciclo_tarifa_id uuid not null references public.ciclo_tarifa(id),
 tarifa_id uuid not null references public.tarifa(id), codigo text not null, nombre text not null, tipo text not null check(tipo in ('CARRERA','OTRO')),
 importe_original numeric(12,2) not null check(importe_original>=0 and importe_original::text<>'NaN'),
 descuento numeric(12,2) not null default 0 check(descuento>=0 and descuento::text<>'NaN'), motivo_descuento text check(length(motivo_descuento)<=500),
 importe_final numeric(12,2) generated always as (importe_original-descuento) stored,
 activo boolean not null default true, motivo_inactivacion text check(length(motivo_inactivacion)<=500),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 check(descuento<=importe_original and (tipo='CARRERA' or descuento=0)),
 check(descuento=0 or coalesce(length(btrim(motivo_descuento)),0)>0), check(activo or coalesce(length(btrim(motivo_inactivacion)),0)>0)
);
create unique index matricula_cargo_vigente on public.matricula_cargo(matricula_id,ciclo_tarifa_id) where activo;
create index alumno_nombre on public.alumno(apellido_paterno,nombres);
create index contacto_alumno on public.alumno_contacto_emergencia(alumno_id);
create index matricula_ciclo_activa on public.matricula(ciclo_id) where estado_codigo='ACTIVO';
create index matricula_empresa on public.matricula(empresa_patrocinadora_id);
create index cargo_matricula on public.matricula_cargo(matricula_id);
create index ciclo_tarifa_tarifa on public.ciclo_tarifa(tarifa_id);
alter table public.alumno enable row level security;
revoke all on public.alumno from public,anon,authenticated;
grant select on public.alumno to authenticated;
create policy academic_read on public.alumno for select to authenticated using(private.academic_user());
create trigger alumno_stamp before update on public.alumno for each row execute function private.stamp_update();
alter table public.alumno_contacto_emergencia enable row level security;
revoke all on public.alumno_contacto_emergencia from public,anon,authenticated;
grant select on public.alumno_contacto_emergencia to authenticated;
create policy academic_read on public.alumno_contacto_emergencia for select to authenticated using(private.academic_user());
create trigger alumno_contacto_emergencia_stamp before update on public.alumno_contacto_emergencia for each row execute function private.stamp_update();
alter table public.empresa_patrocinadora enable row level security;
revoke all on public.empresa_patrocinadora from public,anon,authenticated;
grant select on public.empresa_patrocinadora to authenticated;
create policy academic_read on public.empresa_patrocinadora for select to authenticated using(private.academic_user());
create trigger empresa_patrocinadora_stamp before update on public.empresa_patrocinadora for each row execute function private.stamp_update();
alter table public.tarifa enable row level security;
revoke all on public.tarifa from public,anon,authenticated;
grant select on public.tarifa to authenticated;
create policy academic_read on public.tarifa for select to authenticated using(private.academic_user());
create trigger tarifa_stamp before update on public.tarifa for each row execute function private.stamp_update();
alter table public.ciclo_tarifa enable row level security;
revoke all on public.ciclo_tarifa from public,anon,authenticated;
grant select on public.ciclo_tarifa to authenticated;
create policy academic_read on public.ciclo_tarifa for select to authenticated using(private.academic_user());
create trigger ciclo_tarifa_stamp before update on public.ciclo_tarifa for each row execute function private.stamp_update();
alter table public.matricula enable row level security;
revoke all on public.matricula from public,anon,authenticated;
grant select on public.matricula to authenticated;
create policy academic_read on public.matricula for select to authenticated using(private.academic_user());
create trigger matricula_stamp before update on public.matricula for each row execute function private.stamp_update();
alter table public.matricula_cargo enable row level security;
revoke all on public.matricula_cargo from public,anon,authenticated;
grant select on public.matricula_cargo to authenticated;
create policy academic_read on public.matricula_cargo for select to authenticated using(private.academic_user());
create trigger matricula_cargo_stamp before update on public.matricula_cargo for each row execute function private.stamp_update();
insert into public.catalogo(codigo,nombre) values ('TIPO_DI','TIPO DI');
insert into public.catalogo_valor(catalogo_id,codigo,nombre) select id,'DNI','DNI' from public.catalogo where codigo='TIPO_DI';
insert into public.catalogo_valor(catalogo_id,codigo,nombre) select id,'CARNET_EXTRANJERIA','Carné de extranjería' from public.catalogo where codigo='TIPO_DI';
insert into public.catalogo(codigo,nombre) values ('SEXO','SEXO');
insert into public.catalogo(codigo,nombre) values ('ESTADO_CIVIL','ESTADO CIVIL');
insert into public.catalogo(codigo,nombre) values ('GRUPO_SANGUINEO','GRUPO SANGUINEO');
insert into public.catalogo(codigo,nombre) values ('GRADO_INSTRUCCION','GRADO INSTRUCCION');
insert into public.catalogo(codigo,nombre) values ('COLOR_OJOS','COLOR OJOS');
insert into public.catalogo(codigo,nombre) values ('COLOR_CABELLO','COLOR CABELLO');
insert into public.catalogo(codigo,nombre) values ('PARENTESCO','PARENTESCO');
