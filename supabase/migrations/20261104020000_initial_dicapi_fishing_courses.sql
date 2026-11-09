-- CHG-H3-008 initial data; source: RD 1052-2024 Annex A pp.7-8 and PERU MAR RD 072-26.
-- Repeating this file fills only missing metadata/links; never deletes or reactivates history.
do $$
declare course record; subject text; career_id uuid; subject_id uuid; candidates integer; presencial uuid;
begin
 select v.id into presencial from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='MODALIDAD_CARRERA' and v.codigo='PRESENCIAL' and v.activo;
 -- On a fresh reset, catalog reference rows arrive in seed.sql. The same bounded file runs again afterwards.
 if presencial is null then return; end if;
 lock table public.materia,public.carrera,public.carrera_materia in share row exclusive mode;
alter table public.materia disable trigger materia_audit;
alter table public.carrera disable trigger carrera_audit;
alter table public.carrera_materia disable trigger carrera_materia_audit;

 for course in select * from (values
 ('MAM-009','MARINERO DE PESCA CALIFICADO',array['ARTES DE PESCA Y TALLER','BIOLOGÍA PESQUERA GENERAL','MANIOBRA DE BUQUE PESQUERO','NAVEGACIÓN BÁSICA','PREVENCIÓN DE LA CONTAMINACIÓN','REGLAMENTACIONES MARÍTIMAS','RELACIONES HUMANAS A BORDO','SEGURIDAD A BORDO Y MARÍTIMA','SISTEMA DE PESCA EN CUBIERTA','TERMINOLOGÍA NÁUTICA Y PESQUERA']::text[]),
 ('MAM-010','MARINERO DE PESCA ARTESANAL',array['NOCIONES DE BIOLOGÍA MARINA Y ARTES DE PESCA','PRINCIPIOS DE NAVEGACIÓN','REGLAMENTACIONES','SEGURIDAD A BORDO','TERMINOLOGÍA NÁUTICA BÁSICA','MANIOBRA CON EMBARCACIONES MENORES','PREVENCIÓN DE LA CONTAMINACIÓN']::text[])
 ) as x(code,name,subjects) loop
  select count(*),(array_agg(id order by id))[1] into candidates,career_id from public.carrera where codigo_curso_dicapi=course.code or nombre=course.name;
  if candidates>1 then raise exception 'Carga DICAPI ambigua: %; revisar Carreras antes de continuar',course.code; end if;
  if candidates=1 and exists(select 1 from public.carrera where id=career_id and codigo_curso_dicapi is not null and codigo_curso_dicapi<>course.code) then raise exception 'Código DICAPI existente incompatible'; end if;
  if candidates=0 then
   insert into public.carrera(nombre,sigla,modalidad_id,codigo_curso_dicapi,resolucion_malla_curricular,fecha_resolucion_malla,resolucion_autorizacion_centro)
   values(course.name,replace(course.code,'-',''),presencial,course.code,'1052-2024 MGP/DICAPI',date '2024-12-27','072-26 MGP/DICAPI') returning id into career_id;
  else
   update public.carrera set codigo_curso_dicapi=coalesce(codigo_curso_dicapi,course.code),
    resolucion_malla_curricular=coalesce(resolucion_malla_curricular,'1052-2024 MGP/DICAPI'),fecha_resolucion_malla=coalesce(fecha_resolucion_malla,date '2024-12-27'),
    resolucion_autorizacion_centro=coalesce(resolucion_autorizacion_centro,'072-26 MGP/DICAPI')
    where id=career_id and (codigo_curso_dicapi is null or resolucion_malla_curricular is null or fecha_resolucion_malla is null or resolucion_autorizacion_centro is null);
  end if;
  foreach subject in array course.subjects loop
   insert into public.materia(nombre) values(subject) on conflict(nombre) do nothing;
   select id into strict subject_id from public.materia where nombre=subject;
   insert into public.carrera_materia(carrera_id,materia_id) values(career_id,subject_id) on conflict(carrera_id,materia_id) do nothing;
  end loop;
 end loop;
set constraints all immediate;
alter table public.materia enable trigger materia_audit;
alter table public.carrera enable trigger carrera_audit;
alter table public.carrera_materia enable trigger carrera_materia_audit;
end $$;
-- No sync_missing here: existing Ciclos keep their own assigned/history rows.
