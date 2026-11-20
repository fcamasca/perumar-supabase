-- H6.1 human UX amendment: extend the SAME invoker view with the current Cycle document matrix.
create or replace view public.matricula_reporte_ciclo with (security_invoker=true) as
select p.matricula_id,p.ciclo_id,p.codigo_alumno,p.apellido_paterno,p.apellido_materno,
 p.nombres,p.numero_di,p.codigo_matricula,p.matricula_estado,
 p.base,p.abonado,p.pendiente,r.aplicables,r.completados,r.pendientes,
 coalesce(d.faltantes,array[]::text[]) as faltantes,coalesce(matrix.documentos,'[]'::jsonb) as documentos
from public.matricula_pago_listado p
join public.matricula_expediente_resumen r on r.matricula_id=p.matricula_id
left join lateral (
 select array_agg(doc.nombre order by doc.nombre,doc.id) as faltantes
 from public.matricula_documento doc
 where doc.matricula_id=p.matricula_id and doc.contexto_vigente and doc.activo
 and doc.estado='PENDIENTE'
) d on true
left join lateral (
 select jsonb_agg(jsonb_build_object('codigo',t.codigo,'nombre',t.nombre,
   'estado',case when doc.activo then doc.estado else null end) order by t.nombre,t.codigo) as documentos
 from public.ciclo_documento config
 join public.tipo_documento t on t.id=config.tipo_documento_id
 left join public.matricula_documento doc on doc.ciclo_documento_id=config.id
   and doc.matricula_id=p.matricula_id and doc.contexto_vigente
 where config.ciclo_id=p.ciclo_id and config.activo
) matrix on true;
revoke all on public.matricula_reporte_ciclo from public,anon,authenticated,service_role;
grant select on public.matricula_reporte_ciclo to authenticated;
notify pgrst,'reload schema';
