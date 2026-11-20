-- H6.1: one bounded-purpose read projection; H4/H6 remain authoritative.
create view public.matricula_reporte_ciclo with (security_invoker=true) as
select p.matricula_id,p.ciclo_id,p.codigo_alumno,p.apellido_paterno,p.apellido_materno,
 p.nombres,p.numero_di,p.codigo_matricula,p.matricula_estado,
 p.base,p.abonado,p.pendiente,r.aplicables,r.completados,r.pendientes,
 coalesce(d.faltantes,array[]::text[]) as faltantes
from public.matricula_pago_listado p
join public.matricula_expediente_resumen r on r.matricula_id=p.matricula_id
left join lateral (
 select array_agg(doc.nombre order by doc.nombre,doc.id) as faltantes
 from public.matricula_documento doc
 where doc.matricula_id=p.matricula_id and doc.contexto_vigente and doc.activo
 and doc.estado='PENDIENTE'
) d on true;
revoke all on public.matricula_reporte_ciclo from public,anon,authenticated,service_role;
grant select on public.matricula_reporte_ciclo to authenticated;
notify pgrst,'reload schema';
