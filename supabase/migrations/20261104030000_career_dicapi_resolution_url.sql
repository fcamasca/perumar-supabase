-- CHG-H3-008 follow-up: optional source URL, preserving case of the PDF path.
alter table public.carrera add column url_resolucion_malla text
 check(url_resolucion_malla is null or (url_resolucion_malla=btrim(url_resolucion_malla) and length(url_resolucion_malla)<=2048 and url_resolucion_malla ~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'));

create or replace function public.guardar_carrera(p jsonb,materias uuid[]) returns public.carrera
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.carrera; previous_sigla text; expected timestamptz; delivery uuid;
begin
 perform private.authorize(true);
 perform private.assert_fields(p-'con_experiencia',array['id','expected_updated_at','nombre','descripcion','sigla','modalidad_id','codigo_curso_dicapi','resolucion_malla_curricular','fecha_resolucion_malla','resolucion_autorizacion_centro','observaciones_normativas','url_resolucion_malla']);
 if p ? 'con_experiencia' and jsonb_typeof(p->'con_experiencia') is distinct from 'boolean' then
  raise exception using errcode='22023',message='Con experiencia debe ser booleano';
 end if;
 perform set_config('perumar.audit_reason','',true);
 if not(p ? 'modalidad_id') then
  select v.id into delivery from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id
   where c.codigo='MODALIDAD_CARRERA' and v.codigo='PRESENCIAL';
 else delivery:=nullif(btrim(p->>'modalidad_id'),'')::uuid; end if;
 if delivery is not null then
  if not exists(select 1 from public.carrera where id=(p->>'id')::uuid and modalidad_id=delivery) then
   perform private.require_catalog(delivery,'MODALIDAD_CARRERA');
  end if;
  if not exists(select 1 from public.catalogo_valor where id=delivery and codigo in ('PRESENCIAL','SEMIPRESENCIAL','A_DISTANCIA')) then
   raise exception using errcode='23514',message='Modalidad no válida';
  end if;
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
  insert into public.carrera(nombre,descripcion,sigla,modalidad_id,con_experiencia,codigo_curso_dicapi,resolucion_malla_curricular,fecha_resolucion_malla,resolucion_autorizacion_centro,observaciones_normativas,url_resolucion_malla)
  values(upper(btrim(p->>'nombre')),p->>'descripcion',upper(btrim(p->>'sigla')),delivery,coalesce((p->>'con_experiencia')::boolean,false),nullif(upper(btrim(p->>'codigo_curso_dicapi')),''),nullif(upper(btrim(p->>'resolucion_malla_curricular')),''),nullif(p->>'fecha_resolucion_malla','')::date,nullif(upper(btrim(p->>'resolucion_autorizacion_centro')),''),nullif(btrim(p->>'observaciones_normativas'),''),nullif(btrim(p->>'url_resolucion_malla'),''))
  returning * into result;
 else
  select sigla into previous_sigla from public.carrera where id=(p->>'id')::uuid;
  expected:=(p->>'expected_updated_at')::timestamptz;
  update public.carrera set nombre=upper(btrim(p->>'nombre')),
   descripcion=p->>'descripcion',sigla=upper(btrim(p->>'sigla')),modalidad_id=delivery,con_experiencia=coalesce((p->>'con_experiencia')::boolean,con_experiencia),
   codigo_curso_dicapi=case when p ? 'codigo_curso_dicapi' then nullif(upper(btrim(p->>'codigo_curso_dicapi')),'') else codigo_curso_dicapi end,
   resolucion_malla_curricular=case when p ? 'resolucion_malla_curricular' then nullif(upper(btrim(p->>'resolucion_malla_curricular')),'') else resolucion_malla_curricular end,
   fecha_resolucion_malla=case when p ? 'fecha_resolucion_malla' then nullif(p->>'fecha_resolucion_malla','')::date else fecha_resolucion_malla end,
   resolucion_autorizacion_centro=case when p ? 'resolucion_autorizacion_centro' then nullif(upper(btrim(p->>'resolucion_autorizacion_centro')),'') else resolucion_autorizacion_centro end,
   observaciones_normativas=case when p ? 'observaciones_normativas' then nullif(btrim(p->>'observaciones_normativas'),'') else observaciones_normativas end,
   url_resolucion_malla=case when p ? 'url_resolucion_malla' then nullif(btrim(p->>'url_resolucion_malla'),'') else url_resolucion_malla end
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

-- Source URL from RD 1052-2024; repeatable, never overwrites an existing link.
do $$ begin
 lock table public.carrera in share row exclusive mode;
 alter table public.carrera disable trigger carrera_audit;
 update public.carrera set url_resolucion_malla='https://www.dicapi.mil.pe/storage/regulatory-framework/Zm1HLYB41736522114.pdf'
 where codigo_curso_dicapi in ('MAM-009','MAM-010') and resolucion_malla_curricular='1052-2024 MGP/DICAPI' and url_resolucion_malla is null;
 set constraints all immediate;
 alter table public.carrera enable trigger carrera_audit;
end $$;
