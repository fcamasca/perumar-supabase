-- Availability is a read projection. Preserve the historical invoice count.
create or replace view public.orden_servicio_resumen with(security_invoker=true) as
select o.*,
 (select count(*) from public.orden_servicio_matricula m where m.orden_servicio_id=o.id) matriculas_cubiertas,
 (select count(*) from public.factura_orden_servicio fo where fo.orden_servicio_id=o.id) facturas_relacionadas,
 (select count(*) from public.factura_orden_servicio fo join public.factura_patrocinador f on f.id=fo.factura_id
  where fo.orden_servicio_id=o.id and f.anulado_at is null) facturas_vigentes
from public.orden_servicio o;

-- Keep authorization, company -> sorted OS locks, versions and original amount rules.
-- Check after locking; a live invoice reserves every included OS.
create or replace function public.registrar_factura_patrocinador(p jsonb) returns public.factura_patrocinador
language plpgsql security definer set search_path='' set default_transaction_isolation='serializable' as $$
declare r public.factura_patrocinador; o public.orden_servicio; item jsonb; ids uuid[]; company uuid; amount numeric; suggested numeric:=0;
begin
 perform private.authorize(false);
 if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'ordenes') is distinct from 'array' then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 perform private.assert_fields(p-'ordenes',array['empresa_patrocinadora_id','serie','correlativo','importe','fecha_emision','fecha_vencimiento','observacion','confirmar_diferencia']);
 if jsonb_array_length(p->'ordenes')<1 or coalesce(p->>'importe','') !~ '^[0-9]{1,10}([.][0-9]{1,2})?$'
 or coalesce(p->>'fecha_emision','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or coalesce(p->>'fecha_vencimiento','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or (p->>'fecha_emision')::date>(now() at time zone 'America/Lima')::date then raise exception using errcode='22023',message='H7_INPUT_INVALID'; end if;
 company:=(p->>'empresa_patrocinadora_id')::uuid; amount:=(p->>'importe')::numeric;
 for item in select value from jsonb_array_elements(p->'ordenes') loop
 perform private.assert_fields(item,array['id','expected_updated_at']);
 if nullif(item->>'id','') is null or nullif(item->>'expected_updated_at','') is null then raise exception using errcode='22023',message='H7_SELECTION_INVALID'; end if;
 ids:=array_append(ids,(item->>'id')::uuid);
 end loop;
 if cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception using errcode='22023',message='H7_SELECTION_DUPLICATED'; end if;
 perform 1 from public.empresa_patrocinadora where id=company for update;
 if not found then raise exception using errcode='22023',message='H7_SPONSOR_INVALID'; end if;
 perform 1 from public.orden_servicio where id=any(ids) order by id for update;
 for item in select value from jsonb_array_elements(p->'ordenes') loop
 select * into o from public.orden_servicio where id=(item->>'id')::uuid;
 perform private.require_version(o.updated_at,(item->>'expected_updated_at')::timestamptz);
 if o.empresa_patrocinadora_id<>company or o.estado_codigo<>'VIGENTE' then raise exception using errcode='23514',message='H7_OS_INELIGIBLE'; end if;
 if exists(select 1 from public.factura_orden_servicio fo
 join public.factura_patrocinador f on f.id=fo.factura_id
 where fo.orden_servicio_id=o.id and f.anulado_at is null) then
 raise exception using errcode='23514',message='H7_OS_ALREADY_INVOICED'; end if;
 suggested:=suggested+o.monto;
 end loop;
 if amount<>suggested and (p->>'confirmar_diferencia') is distinct from 'true' then raise exception using errcode='23514',message='H7_DIFFERENCE_CONFIRMATION_REQUIRED'; end if;
 insert into public.factura_patrocinador(empresa_patrocinadora_id,serie,correlativo,importe,fecha_emision,fecha_vencimiento,observacion,registrado_por)
 values(company,upper(btrim(p->>'serie')),btrim(p->>'correlativo'),amount,(p->>'fecha_emision')::date,(p->>'fecha_vencimiento')::date,nullif(btrim(p->>'observacion'),''),auth.uid()) returning * into r;
 insert into public.factura_orden_servicio select r.id,x from unnest(ids) x;
 return r;
end $$;
