-- Human amendment: identify the student's photo independently of passport/card print sizes.
-- One-time metadata correction. Keep IDs, files, states, contexts, grants and normal guards intact.
do $$
declare photo_id uuid; conflicting_id uuid; definition text;
begin
 perform set_config('lock_timeout','5s',true);
 -- Quiesce normal academic/file commands in the established parent order.
 lock table public.ciclo,public.alumno,public.matricula,public.tipo_documento,public.ciclo_documento,public.matricula_documento in access exclusive mode;
 select id into photo_id from public.tipo_documento where codigo='FOTO_PASAPORTE';
 select id into conflicting_id from public.tipo_documento where codigo='FOTO_ALUMNO';
 if photo_id is not null and conflicting_id is not null then
  raise exception 'FOTO_ALUMNO already exists: explicit reconciliation required; no rows merged';
 end if;
 if photo_id is not null then
  -- These two guards prohibit referenced-code changes during ordinary operation.
  -- Disable only inside this atomic owner migration, never add a product bypass.
  alter table public.tipo_documento disable trigger b_history;
  alter table public.matricula_documento disable trigger b_history;
  update public.tipo_documento set codigo='FOTO_ALUMNO',nombre='Foto del alumno' where id=photo_id;
  update public.matricula_documento set codigo='FOTO_ALUMNO',nombre='Foto del alumno'
   where tipo_documento_id=photo_id and codigo='FOTO_PASAPORTE';
  alter table public.matricula_documento enable trigger b_history;
  alter table public.tipo_documento enable trigger b_history;
 end if;
 -- Preserve the exact existing RPC body/locks/ACL, changing only the fixed photo code.
 definition:=pg_get_functiondef('public.confirmar_archivo_expediente(uuid,uuid,text,integer,text)'::regprocedure);
 if position('''FOTO_PASAPORTE''' in definition)>0 then
  execute replace(definition,'''FOTO_PASAPORTE''','''FOTO_ALUMNO''');
 elsif position('''FOTO_ALUMNO''' in definition)=0 then
  raise exception 'Unexpected photo validation contract; migration aborted';
 end if;
end $$;
