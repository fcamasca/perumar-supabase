-- Human amendment: preserve entered OS digits; never pad or rewrite existing references.
-- Same authorization, locks, coverage, history and numeric duplicate guard.
begin;
create or replace function public.registrar_orden_servicio(p jsonb) returns public.orden_servicio
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.orden_servicio; c public.ciclo; ids uuid[]; students uuid[];
 company uuid; amount numeric; cycle_total numeric; covered numeric; number_text text; series_text text;
begin
 perform private.authorize(false);
 -- No client-supplied enrollment selection or commercial totals.
 perform private.assert_fields(p,array['empresa_patrocinadora_id','ciclo_id','expected_ciclo_updated_at','serie','correlativo','fecha','monto','observacion']);
 if coalesce(p->>'monto','') !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
 or coalesce(p->>'fecha','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or coalesce(btrim(p->>'correlativo'),'') !~ '^[0-9]{1,20}$' then
 raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 amount:=(p->>'monto')::numeric; company:=(p->>'empresa_patrocinadora_id')::uuid;
 number_text:=btrim(p->>'correlativo');series_text:=upper(btrim(p->>'serie'));
 select * into c from public.ciclo where id=(p->>'ciclo_id')::uuid for update;
 perform private.require_version(c.updated_at,(p->>'expected_ciclo_updated_at')::timestamptz);
 if c.estado_codigo not in ('PROGRAMADO','EN_CURSO','CERRADO') then
 raise exception using errcode='23514',message='H7_CYCLE_INELIGIBLE'; end if;
 if company is null or c.empresa_patrocinadora_id is distinct from company then
 raise exception using errcode='23514',message='H7_CYCLE_SPONSOR_MISMATCH'; end if;
 select array_agg(id order by id),array_agg(distinct alumno_id order by alumno_id)
 into ids,students from public.matricula where ciclo_id=c.id and estado_codigo='ACTIVO';
 if coalesce(cardinality(ids),0)=0 then raise exception using errcode='23514',message='H7_CYCLE_NO_ENROLLMENTS';end if;
 -- Same consolidated lock order, including the entire active roster.
 perform 1 from public.alumno where id=any(students) order by id for update;
 perform 1 from public.matricula where id=any(ids) order by id for update;
 if exists(select 1 from public.matricula where id=any(ids) and empresa_patrocinadora_id is distinct from company) then
 raise exception using errcode='PT409',message='H7_SELECTION_CONTEXT_CHANGED';end if;
 perform 1 from public.empresa_patrocinadora where id=company for update;
 if not found then raise exception using errcode='22023',message='H7_SPONSOR_INVALID';end if;
 -- Read exact H4 charge totals after academic locks; never use private payments
 -- or H7 invoice payments as OS coverage. No per-student monetary allocation.
 select coalesce(sum(base),0) into cycle_total from public.matricula_saldo where matricula_id=any(ids);
 select coalesce(sum(monto),0) into covered from public.orden_servicio where ciclo_id=c.id and estado_codigo='VIGENTE';
 if amount<=0 or amount>cycle_total-covered then
 raise exception using errcode='23514',message='H7_OS_EXCEEDS_CYCLE_BALANCE';end if;
 -- Preserve old references, but prevent issuing their numeric equivalent again
 -- with different zero padding. The existing company lock serializes issuance.
 if exists(select 1 from public.orden_servicio where empresa_patrocinadora_id=company
 and serie=series_text and ltrim(correlativo,'0')=ltrim(number_text,'0')) then
 raise exception using errcode='23505',message='H7_OS_REFERENCE_EXISTS';end if;
 insert into public.orden_servicio(empresa_patrocinadora_id,ciclo_id,serie,correlativo,fecha,monto,observacion,registrado_por)
 values(company,c.id,series_text,number_text,(p->>'fecha')::date,amount,nullif(btrim(p->>'observacion'),''),auth.uid()) returning * into r;
 insert into public.orden_servicio_matricula select r.id,x from unnest(ids) x;
 return r;
end $$;
notify pgrst,'reload schema';
commit;
