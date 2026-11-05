-- Verify repeat load preserves customization, inactive subjects, links and Cycle history.
begin;
set local lock_timeout='3s';
alter table public.carrera disable trigger carrera_audit;
alter table public.materia disable trigger materia_audit;
update public.carrera set descripcion='PERSONALIZADO',resolucion_autorizacion_centro='REFERENCIA CONSERVADA',url_resolucion_malla='https://example.org/Conservar.pdf'
where codigo_curso_dicapi='MAM-037';
update public.materia set active=false where nombre='MAQUINARIAS Y HERRAMIENTAS';
set constraints all immediate;
alter table public.carrera enable trigger carrera_audit;
alter table public.materia enable trigger materia_audit;
create temp table expected_dicapi as select 'carrera' entity,to_jsonb(c) row from public.carrera c
union all select 'materia',to_jsonb(m) from public.materia m
union all select 'links',to_jsonb(cm) from public.carrera_materia cm
union all select 'ciclos',to_jsonb(c) from public.ciclo c
union all select 'ciclo_materia',to_jsonb(cm) from public.ciclo_materia cm
union all select 'audit',to_jsonb(a) from public.auditoria a;
-- REPEAT_AUTHORIZED_LOAD
do $$ begin
 if exists(
  (select * from expected_dicapi except
   (select 'carrera',to_jsonb(c) from public.carrera c union all select 'materia',to_jsonb(m) from public.materia m
    union all select 'links',to_jsonb(cm) from public.carrera_materia cm union all select 'ciclos',to_jsonb(c) from public.ciclo c
    union all select 'ciclo_materia',to_jsonb(cm) from public.ciclo_materia cm union all select 'audit',to_jsonb(a) from public.auditoria a))
  union all
  ((select 'carrera',to_jsonb(c) from public.carrera c union all select 'materia',to_jsonb(m) from public.materia m
    union all select 'links',to_jsonb(cm) from public.carrera_materia cm union all select 'ciclos',to_jsonb(c) from public.ciclo c
    union all select 'ciclo_materia',to_jsonb(cm) from public.ciclo_materia cm union all select 'audit',to_jsonb(a) from public.auditoria a)
   except select * from expected_dicapi)
 ) then raise exception 'Repeat load changed existing data'; end if;
 if exists(select 1 from pg_trigger where tgname in ('carrera_audit','materia_audit','carrera_materia_audit') and tgenabled<>'O') then raise exception 'Audit trigger left disabled'; end if;
end $$;
rollback;
