-- Human UI request 2026-10-28: readable sex labels; stable F/M codes and IDs.
-- Historical alumno_snapshot values remain unchanged.
update public.catalogo_valor v
set nombre=case v.codigo when 'F' then 'FEMENINO' when 'M' then 'MASCULINO' end,
 updated_at=clock_timestamp()
from public.catalogo c
where c.id=v.catalogo_id and c.codigo='SEXO' and v.codigo in ('F','M');
