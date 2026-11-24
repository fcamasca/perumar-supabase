-- MVP amendment: one optional sponsor per Cycle; enrollments inherit it.
-- No financial/history rewrite. Existing RPC signatures and ACLs remain unchanged.
begin;
set local lock_timeout='5s';
lock table public.ciclo, public.alumno, public.matricula in access exclusive mode;

-- Refuse ambiguity BEFORE changing existing data. Include annulled enrollments
-- as a conservative safeguard against overwriting a former company.
do $$
declare conflicts text;
begin
 select string_agg(c.codigo_ciclo, ', ' order by c.codigo_ciclo) into conflicts
 from public.ciclo c where c.id in (
  select ciclo_id from public.matricula group by ciclo_id
  having count(distinct empresa_patrocinadora_id)>1
 );
 if conflicts is not null then
  raise exception using errcode='23514',message='CYCLE_SPONSOR_BACKFILL_AMBIGUOUS',detail=conflicts,
   hint='Reconcile these Cycles explicitly before rerunning. No company selected automatically.';
 end if;
end $$;

alter table public.ciclo add column empresa_patrocinadora_id uuid
 references public.empresa_patrocinadora(id);
create index ciclo_empresa_patrocinadora on public.ciclo(empresa_patrocinadora_id);

-- Atomic owner-only normalization. No permanent product bypass.
alter table public.ciclo disable trigger ciclo_enrollment_guard;
alter table public.matricula disable trigger matricula_history;
-- Migration runs as database owner, without an application actor. Do not invent
-- one. Administrative normalization is traced by this versioned migration;
-- normal RPC changes below retain their existing actor/audit triggers.
alter table public.ciclo disable trigger ciclo_audit;
alter table public.matricula disable trigger matricula_audit;
select set_config('perumar.audit_reason','MVP_CYCLE_SPONSOR_BACKFILL',true);
update public.ciclo c set empresa_patrocinadora_id=x.company
from (select ciclo_id,(array_agg(distinct empresa_patrocinadora_id)
 filter(where empresa_patrocinadora_id is not null))[1] company
 from public.matricula group by ciclo_id) x
where c.id=x.ciclo_id and x.company is not null;
update public.matricula m set empresa_patrocinadora_id=c.empresa_patrocinadora_id
from public.ciclo c where c.id=m.ciclo_id
and m.empresa_patrocinadora_id is distinct from c.empresa_patrocinadora_id;
alter table public.matricula enable trigger matricula_history;
alter table public.ciclo enable trigger ciclo_enrollment_guard;
alter table public.matricula enable trigger matricula_audit;
alter table public.ciclo enable trigger ciclo_audit;

-- Preserve installed H3/H4/H5/H6 rules, SQLSTATE handling and ACLs.
-- Abort rather than replace an unexpected contract.
do $$
declare definition text; needle text;
begin
 definition:=pg_get_functiondef('public.registrar_matricula(jsonb,uuid[])'::regprocedure);
 needle:='values(a.id,c.id,nullif(p->>''empresa_patrocinadora_id'','''')::uuid,';
 if position(needle in definition)=0 then raise exception 'Unexpected registrar_matricula contract'; end if;
 execute replace(definition,needle,'values(a.id,c.id,c.empresa_patrocinadora_id,');

 definition:=pg_get_functiondef('public.editar_matricula(jsonb,uuid[])'::regprocedure);
 needle:='empresa_patrocinadora_id=case when p ? ''empresa_patrocinadora_id'' then nullif(p->>''empresa_patrocinadora_id'','''')::uuid else result.empresa_patrocinadora_id end,';
 if position(needle in definition)=0 then raise exception 'Unexpected editar_matricula contract'; end if;
 execute replace(definition,needle,'empresa_patrocinadora_id=(select c.empresa_patrocinadora_id from public.ciclo c where c.id=target),');

 definition:=pg_get_functiondef('public.guardar_ciclo(jsonb,uuid[])'::regprocedure);
 needle:='''departamento_id'',''provincia_id'',''distrito_id'',''capitania_id'']);';
 if position(needle in definition)=0 then raise exception 'Unexpected guardar_ciclo fields'; end if;
 definition:=replace(definition,needle,'''departamento_id'',''provincia_id'',''distrito_id'',''capitania_id'',''empresa_patrocinadora_id'']);');
 needle:='if p->>''id'' is not null then select * into previous_cycle from public.ciclo where id=(p->>''id'')::uuid; end if;';
 if position(needle in definition)=0 then raise exception 'Unexpected guardar_ciclo locks'; end if;
 definition:=replace(definition,needle,$patch$
 if p->>'id' is not null then
  select * into previous_cycle from public.ciclo where id=(p->>'id')::uuid for update;
  perform private.require_version(previous_cycle.updated_at,(p->>'expected_updated_at')::timestamptz);
  if p ? 'empresa_patrocinadora_id' and previous_cycle.empresa_patrocinadora_id is distinct from nullif(p->>'empresa_patrocinadora_id','')::uuid then
   -- Consolidated parent order: Cycle -> Students UUID -> Enrollments UUID.
   perform 1 from public.alumno where id in(select alumno_id from public.matricula where ciclo_id=previous_cycle.id) order by id for update;
   perform 1 from public.matricula where ciclo_id=previous_cycle.id order by id for update;
  end if;
 end if;
 $patch$);
 needle:='insert into public.ciclo(carrera_id,anio,correlativo,codigo_ciclo,fecha_inicio,fecha_fin,nombre_promocion,departamento_id,provincia_id,distrito_id,capitania_id)';
 if position(needle in definition)=0 then raise exception 'Unexpected guardar_ciclo insert'; end if;
 definition:=replace(definition,needle,replace(needle,'capitania_id)','capitania_id,empresa_patrocinadora_id)'));
 needle:='(p->>''provincia_id'')::uuid,(p->>''distrito_id'')::uuid,(p->>''capitania_id'')::uuid) returning * into result;';
 if position(needle in definition)=0 then raise exception 'Unexpected guardar_ciclo values'; end if;
 definition:=replace(definition,needle,'(p->>''provincia_id'')::uuid,(p->>''distrito_id'')::uuid,(p->>''capitania_id'')::uuid,nullif(p->>''empresa_patrocinadora_id'','''')::uuid) returning * into result;');
 needle:='distrito_id=(p->>''distrito_id'')::uuid,capitania_id=(p->>''capitania_id'')::uuid,';
 if position(needle in definition)=0 then raise exception 'Unexpected guardar_ciclo update'; end if;
 definition:=replace(definition,needle,needle||$patch$
   empresa_patrocinadora_id=case when p ? 'empresa_patrocinadora_id' then nullif(p->>'empresa_patrocinadora_id','')::uuid else c.empresa_patrocinadora_id end,
 $patch$);
 needle:=' return result;';
 if position(needle in definition)=0 then raise exception 'Unexpected guardar_ciclo return'; end if;
 definition:=replace(definition,needle,$patch$
 if previous_cycle.id is not null and previous_cycle.empresa_patrocinadora_id is distinct from result.empresa_patrocinadora_id then
  perform set_config('perumar.audit_reason','CAMBIO_PATROCINADOR_CICLO',true);
  update public.matricula set empresa_patrocinadora_id=result.empresa_patrocinadora_id
  where ciclo_id=result.id and empresa_patrocinadora_id is distinct from result.empresa_patrocinadora_id;
 end if;
 return result;
 $patch$);
 execute definition;

 definition:=pg_get_functiondef('private.guard_enrollment_history()'::regprocedure);
 needle:='if tg_table_name=''matricula'' then';
 if position(needle in definition)=0 then raise exception 'Unexpected enrollment guard'; end if;
 definition:=replace(definition,needle,needle||$patch$
 if new.empresa_patrocinadora_id is distinct from (select c.empresa_patrocinadora_id from public.ciclo c where c.id=new.ciclo_id) then
  raise exception using errcode='23514',message='ENROLLMENT_SPONSOR_DEFINED_BY_CYCLE';
 end if;
 -- An annulled enrollment may ONLY synchronize its derived company reference.
 if tg_op='UPDATE' and old.estado_codigo='ANULADO'
  and (to_jsonb(new)-array['updated_at','empresa_patrocinadora_id']) is not distinct from (to_jsonb(old)-array['updated_at','empresa_patrocinadora_id'])
  and new.empresa_patrocinadora_id is distinct from old.empresa_patrocinadora_id then return new; end if;
 $patch$);
 needle:='array[''updated_at'',''nombre_promocion'',''fecha_inicio'',''fecha_fin'',''codigo_ciclo'',''estado_codigo'',''motivo'',''motivo_desierto_id'']';
 if position(needle in definition)=0 then raise exception 'Unexpected active Cycle guard'; end if;
 definition:=replace(definition,needle,replace(needle,'''motivo_desierto_id'']','''motivo_desierto_id'',''empresa_patrocinadora_id'']'));
 execute definition;

 definition:=pg_get_functiondef('public.registrar_orden_servicio(jsonb)'::regprocedure);
 needle:='if c.estado_codigo not in (''PROGRAMADO'',''EN_CURSO'',''CERRADO'') then raise exception using errcode=''23514'',message=''H7_CYCLE_INELIGIBLE''; end if;';
 if position(needle in definition)=0 then raise exception 'Unexpected OS eligibility'; end if;
 execute replace(definition,needle,needle||$patch$
 if c.empresa_patrocinadora_id is distinct from company then raise exception using errcode='23514',message='H7_CYCLE_SPONSOR_MISMATCH'; end if;
 $patch$);
end $$;

-- Legacy enrollment sponsor input is ignored; only Cycle is authoritative.
-- No new RPC, domain table, permissive policy or financial command.
notify pgrst,'reload schema';
commit;
