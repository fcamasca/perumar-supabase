-- CHG-H3-010: remaining PERU MAR courses, RD 072-26 art.1.
-- MAM-037/038/039: RD 1052-2024 Annex A pp.18-19; MAM-048: RD 855-2021.
-- Repeatable missing-only load. Existing records, inactive subjects and Ciclos stay intact.
do $$
declare course record; subject text; career_id uuid; subject_id uuid; candidates integer; presencial uuid;
begin
 select v.id into presencial from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='MODALIDAD_CARRERA' and v.codigo='PRESENCIAL' and v.activo;
 -- On a fresh reset, catalog reference rows arrive in seed.sql. The same bounded file runs again afterwards.
 if presencial is null then
  if exists(select 1 from public.catalogo where codigo='MODALIDAD_CARRERA') then raise exception 'Carga DICAPI requiere modalidad Presencial activa'; end if;
  return;
 end if;
 lock table public.materia,public.carrera,public.carrera_materia in share row exclusive mode;
alter table public.materia disable trigger materia_audit;
alter table public.carrera disable trigger carrera_audit;
alter table public.carrera_materia disable trigger carrera_materia_audit;

 for course in select * from (values
 ('MAM-037','PATRÓN DE BAHÍA',array['REGLAMENTO DE DECRETO LEGISLATIVO N° 1147 E INFRACCIONES','SEGURIDAD A BORDO','PRIMEROS AUXILIOS A BORDO','NAVEGACIÓN BÁSICA','PREVENCIÓN DE LA CONTAMINACIÓN','TERMINOLOGÍA MARÍTIMA','PRINCIPIOS BÁSICOS DE MOTORES','MAQUINARIAS Y HERRAMIENTAS','PRÁCTICA A BORDO']::text[],'1052-2024 MGP/DICAPI','2024-12-27'::date,'https://www.dicapi.mil.pe/storage/regulatory-framework/Zm1HLYB41736522114.pdf'),
 ('MAM-038','MARINERO DE BAHÍA',array['REGLAMENTO DE DECRETO LEGISLATIVO N° 1147 E INFRACCIONES','SEGURIDAD A BORDO','PRIMEROS AUXILIOS A BORDO','MANIOBRAS DE NAVES Y CABULLERÍA','PRÁCTICA A BORDO']::text[],'1052-2024 MGP/DICAPI','2024-12-27'::date,'https://www.dicapi.mil.pe/storage/regulatory-framework/Zm1HLYB41736522114.pdf'),
 ('MAM-039','MARINERO DE ARTEFACTO NAVAL',array['REGLAMENTO DE DECRETO LEGISLATIVO N° 1147 E INFRACCIONES','SEGURIDAD A BORDO','PRIMEROS AUXILIOS A BORDO','MANIOBRAS DE NAVES Y CABULLERÍA','PRÁCTICA A BORDO']::text[],'1052-2024 MGP/DICAPI','2024-12-27'::date,'https://www.dicapi.mil.pe/storage/regulatory-framework/Zm1HLYB41736522114.pdf'),
 ('MAM-048','PATRÓN DE YATE / VELERO',array['NAVEGACIÓN PLANA','MANIOBRAS','COMUNICACIONES MARÍTIMAS','SEGURIDAD MARÍTIMA','REGLAMENTO DEL DECRETO LEGISLATIVO N° 1147','METEOROLOGÍA','CONVENIO INTERNACIONAL PARA LA SEGURIDAD DE LA VIDA HUMANA EN EL MAR, 1974','SEGURIDAD Y SALUD A BORDO']::text[],'855-2021 MGP/DICAPI','2021-12-15'::date,'https://busquedas.elperuano.pe/dispositivo/NL/2023424-1')
 ) as x(code,name,subjects,resolution,resolution_date,source) loop
  select count(*),(array_agg(id order by id))[1] into candidates,career_id from public.carrera where codigo_curso_dicapi=course.code or nombre=course.name;
  if candidates>1 then raise exception 'Carga DICAPI ambigua: %; revisar Cursos antes de continuar',course.code; end if;
  if candidates=1 and exists(select 1 from public.carrera where id=career_id and codigo_curso_dicapi is not null and codigo_curso_dicapi<>course.code) then raise exception 'Código DICAPI existente incompatible'; end if;
  if candidates=0 then
   insert into public.carrera(nombre,sigla,modalidad_id,codigo_curso_dicapi,resolucion_malla_curricular,fecha_resolucion_malla,resolucion_autorizacion_centro,url_resolucion_malla)
   values(course.name,replace(course.code,'-',''),presencial,course.code,course.resolution,course.resolution_date,'072-26 MGP/DICAPI',course.source) returning id into career_id;
  else
   update public.carrera set codigo_curso_dicapi=coalesce(codigo_curso_dicapi,course.code),
    resolucion_malla_curricular=coalesce(resolucion_malla_curricular,course.resolution),fecha_resolucion_malla=coalesce(fecha_resolucion_malla,course.resolution_date),
    resolucion_autorizacion_centro=coalesce(resolucion_autorizacion_centro,'072-26 MGP/DICAPI'),
    url_resolucion_malla=case when url_resolucion_malla is null and coalesce(resolucion_malla_curricular,course.resolution)=course.resolution then course.source else url_resolucion_malla end
    where id=career_id and (codigo_curso_dicapi is null or resolucion_malla_curricular is null or fecha_resolucion_malla is null or resolucion_autorizacion_centro is null or (url_resolucion_malla is null and coalesce(resolucion_malla_curricular,course.resolution)=course.resolution));
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
