-- Human request 2026-11-02: career modality is optional; supplied references keep catalog validation.
alter table public.carrera alter column modalidad_id drop not null;

create or replace function public.guardar_carrera(p jsonb,materias uuid[]) returns public.carrera
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare result public.carrera; previous_sigla text; expected timestamptz;
begin
 perform private.authorize(true);
 perform private.assert_fields(p,array['id','expected_updated_at','codigo','nombre','descripcion','sigla','modalidad_id']);
 perform set_config('perumar.audit_reason','',true);
 if nullif(btrim(p->>'modalidad_id'),'') is not null and not exists(select 1 from public.carrera where id=(p->>'id')::uuid and modalidad_id=nullif(btrim(p->>'modalidad_id'),'')::uuid) then
  perform private.require_catalog(nullif(btrim(p->>'modalidad_id'),'')::uuid,'MODALIDAD_CARRERA');
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
  values(upper(btrim(p->>'codigo')),upper(btrim(p->>'nombre')),p->>'descripcion',upper(btrim(p->>'sigla')),nullif(btrim(p->>'modalidad_id'),'')::uuid)
  returning * into result;
 else
  select sigla into previous_sigla from public.carrera where id=(p->>'id')::uuid;
  expected:=(p->>'expected_updated_at')::timestamptz;
  update public.carrera set codigo=upper(btrim(p->>'codigo')),nombre=upper(btrim(p->>'nombre')),
   descripcion=p->>'descripcion',sigla=upper(btrim(p->>'sigla')),modalidad_id=nullif(btrim(p->>'modalidad_id'),'')::uuid
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

notify pgrst,'reload schema';
