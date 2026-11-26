-- Operación manual posterior: psql -X -v ON_ERROR_STOP=1 -f este_archivo.
-- Solo primera carga en destino vacío, después de las 41 migraciones.
-- Verificar externamente host/project-ref; este SQL no autentica el destino remoto.
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '10s';
set local statement_timeout = '120s';
-- Impide dos cargas concurrentes; no modifica las migraciones históricas.
select pg_advisory_xact_lock(173604, 1);
do $$ begin
 if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations)
    is distinct from array['20261022041000','20261022150000','20261022160000','20261023010000','20261023020000','20261023030000','20261028190000','20261028200000','20261102010000','20261102020000','20261104010000','20261104020000','20261104030000','20261104040000','20261109010000','20261109020000','20261109030000','20261109040000','20261109050000','20261109060000','20261110010000','20261112010000','20261113010000','20261118010000','20261118020000','20261118030000','20261119010000','20261119020000','20261119030000','20261123010000','20261123020000','20261123030000','20261123040000','20261123050000','20261125010000','20261125020000','20261125030000','20261125040000','20261125050000','20261125060000','20261125070000']::text[] then
  raise exception 'Se requiere el historial exacto de 41 migraciones aprobado';
 end if;
 if exists(select 1 from auth.users) or exists(select 1 from public.app_users)
    or exists(select 1 from public.alumno) or exists(select 1 from public.ciclo)
    or exists(select 1 from public.empresa_patrocinadora)
    or exists(select 1 from public.departamento) or exists(select 1 from public.provincia)
    or exists(select 1 from public.distrito) or exists(select 1 from public.capitania)
    or exists(select 1 from public.carrera) or exists(select 1 from public.materia)
    or exists(select 1 from public.catalogo where codigo in ('MODALIDAD_CARRERA','MOTIVO_CICLO_DESIERTO')) then
  raise exception 'Destino no vacío o catálogos ya cargados; no repetir ni limpiar automáticamente';
 end if;
end $$;
\ir ../seed.sql
set constraints all deferred;
\ir ../migrations/20261104020000_initial_dicapi_fishing_courses.sql
\ir dicapi-course-links.sql
-- The prior reference blocks flush constraints; each course load needs its own deferred scope.
set constraints all deferred;
\ir ../migrations/20261104040000_initial_authorized_dicapi_courses.sql
do $$ begin
 if (select count(*) from public.departamento) <> 25
    or (select count(*) from public.provincia) <> 196
    or (select count(*) from public.distrito) <> 1891
    or (select count(*) from public.capitania) <> 19
    or (select count(*) from public.carrera) <> 6
    or (select count(*) from public.carrera where codigo_curso_dicapi in ('MAM-009','MAM-010','MAM-037','MAM-038','MAM-039','MAM-048') and url_resolucion_malla is not null) <> 6
    or exists(select 1 from public.carrera c where not exists(select 1 from public.carrera_materia m where m.carrera_id=c.id)) then
  raise exception 'Carga de referencias incompleta; transacción cancelada';
 end if;
end $$;
commit;
