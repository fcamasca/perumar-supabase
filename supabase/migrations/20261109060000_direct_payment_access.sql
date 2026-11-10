-- CHG-H4-001: specific read-only projection, justified in the approved UX amendment.
-- Reuses the authoritative balance; no new financial calculation or write contract.
create view public.matricula_pago_listado with(security_invoker=true) as
select m.id as matricula_id,m.alumno_id,m.ciclo_id,m.codigo_matricula,
 m.estado_codigo as matricula_estado,m.updated_at as matricula_updated_at,m.created_at as matricula_created_at,
 a.codigo_alumno,a.apellido_paterno,a.apellido_materno,a.nombres,a.numero_di,
 c.codigo_ciclo,c.estado_codigo as ciclo_estado,c.fecha_inicio as ciclo_fecha_inicio,
 course.nombre as curso_nombre,s.base,s.abonado,s.pendiente
from public.matricula m
join public.alumno a on a.id=m.alumno_id
join public.ciclo c on c.id=m.ciclo_id
join public.carrera course on course.id=c.carrera_id
join public.matricula_saldo s on s.matricula_id=m.id;
revoke all on public.matricula_pago_listado from public,anon,authenticated;
grant select on public.matricula_pago_listado to authenticated;
notify pgrst,'reload schema';
