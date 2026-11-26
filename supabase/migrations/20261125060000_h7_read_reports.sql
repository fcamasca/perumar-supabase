-- TASK-H7-007: one root row per commercial document, ordinary JWT/RLS only.
-- Never aggregate money over the many-to-many beneficiary/OS links.
create view public.facturacion_reporte with(security_invoker=true) as
with documentos as (
 select 'order'::text tipo,o.id,o.empresa_patrocinadora_id,o.serie||'-'||o.correlativo documento,
 o.fecha,o.estado_codigo estado,o.estado_codigo estado_operativo,null::text estado_financiero,
 o.monto importe,null::numeric abonado,null::numeric pendiente,null::date vencimiento,
 null::text banco,null::text referencia,o.estado_codigo='ANULADA' anulado
 from public.orden_servicio o
 union all
 select 'invoice',f.id,f.empresa_patrocinadora_id,f.serie||'-'||f.correlativo,
 f.fecha_emision,case when f.anulado_at is not null then 'ANULADA' else f.estado_codigo end,
 f.estado_codigo,f.estado_financiero,f.importe,f.abonado,f.pendiente,f.fecha_vencimiento,
 null,null,f.anulado_at is not null from public.factura_patrocinador_saldo f
 union all
 select 'payment',p.id,p.empresa_patrocinadora_id,null,p.fecha_efectiva,p.estado_codigo,
 p.estado_codigo,null,p.importe,null,null,null,p.banco,p.referencia_operacion,p.estado_codigo='ANULADO'
 from public.pago_patrocinador p
), vinculos as not materialized (
 select 'order'::text tipo,o.id documento_id,o.id orden_id,null::uuid factura_id,null::numeric aplicado from public.orden_servicio o
 union all
 select 'invoice',fo.factura_id,fo.orden_servicio_id,fo.factura_id,null from public.factura_orden_servicio fo
 union all
 select 'payment',pa.pago_id,fo.orden_servicio_id,pa.factura_id,pa.importe
 from public.pago_patrocinador_aplicacion pa join public.factura_orden_servicio fo on fo.factura_id=pa.factura_id
)
select d.*,e.ruc,e.razon_social,
 coalesce((select array_agg(distinct o.ciclo_id order by o.ciclo_id) from vinculos v join public.orden_servicio o on o.id=v.orden_id where v.tipo=d.tipo and v.documento_id=d.id),'{}'::uuid[]) ciclo_ids,
 coalesce((select array_agg(distinct c.codigo_ciclo order by c.codigo_ciclo) from vinculos v join public.orden_servicio o on o.id=v.orden_id join public.ciclo c on c.id=o.ciclo_id where v.tipo=d.tipo and v.documento_id=d.id),'{}'::text[]) ciclo_codigos,
 coalesce((select jsonb_agg(x.item order by x.item->>'referencia',x.item->>'id') from (
  select distinct jsonb_build_object('id',o.id,'referencia',o.serie||'-'||o.correlativo,'ciclo_id',o.ciclo_id,'ciclo',c.codigo_ciclo) item
  from vinculos v join public.orden_servicio o on o.id=v.orden_id join public.ciclo c on c.id=o.ciclo_id where v.tipo=d.tipo and v.documento_id=d.id
 ) x),'[]'::jsonb) ordenes,
 coalesce((select jsonb_agg(x.item order by x.item->>'referencia',x.item->>'id') from (
  select distinct jsonb_build_object('id',f.id,'referencia',f.serie||'-'||f.correlativo,'aplicado',v.aplicado::text) item
  from vinculos v join public.factura_patrocinador f on f.id=v.factura_id where v.tipo=d.tipo and v.documento_id=d.id
 ) x),'[]'::jsonb) facturas,
 coalesce((select jsonb_agg(x.item order by x.item->>'nombre',x.item->>'ciclo_id',x.item->>'matricula_id') from (
  select distinct jsonb_build_object('alumno_id',m.alumno_id,'matricula_id',m.id,'codigo_matricula',m.codigo_matricula,
   'ciclo_id',o.ciclo_id,'ciclo',c.codigo_ciclo,
   'nombre',concat_ws(' ',m.alumno_snapshot#>>'{alumno,apellido_paterno}',m.alumno_snapshot#>>'{alumno,apellido_materno}')||', '||(m.alumno_snapshot#>>'{alumno,nombres}')) item
  from vinculos v join public.orden_servicio o on o.id=v.orden_id join public.ciclo c on c.id=o.ciclo_id
  join public.orden_servicio_matricula om on om.orden_servicio_id=o.id join public.matricula m on m.id=om.matricula_id
  where v.tipo=d.tipo and v.documento_id=d.id
 ) x),'[]'::jsonb) beneficiarios
from documentos d join public.empresa_patrocinadora e on e.id=d.empresa_patrocinadora_id;
revoke all on public.facturacion_reporte from public,anon,authenticated;
grant select on public.facturacion_reporte to authenticated;
comment on view public.facturacion_reporte is 'H7 read projection; RLS caller; OS membership and enrollment initial identity; monetary roots never multiplied. No H4 debt.';
