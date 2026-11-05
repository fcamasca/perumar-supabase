-- Source URL from RD 1052-2024; repeatable, never overwrites an existing link.
do $$ begin
 lock table public.carrera in share row exclusive mode;
 alter table public.carrera disable trigger carrera_audit;
 update public.carrera set url_resolucion_malla='https://www.dicapi.mil.pe/storage/regulatory-framework/Zm1HLYB41736522114.pdf'
 where codigo_curso_dicapi in ('MAM-009','MAM-010') and resolucion_malla_curricular='1052-2024 MGP/DICAPI' and url_resolucion_malla is null;
 set constraints all immediate;
 alter table public.carrera enable trigger carrera_audit;
end $$;
