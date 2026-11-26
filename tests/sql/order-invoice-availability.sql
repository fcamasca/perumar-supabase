
begin isolation level serializable;
do $$
declare ctx jsonb; company uuid; c public.ciclo; o public.orden_servicio; second_os public.orden_servicio; f public.factura_patrocinador; replacement public.factura_patrocinador; payload jsonb; before_count bigint;
begin
 select value into ctx from public.order_test_context;
 perform set_config('request.jwt.claim.sub',ctx->>'actor',true);
 company:=(public.guardar_empresa_patrocinadora('{"ruc":"20711111111","razon_social":"INVOICE TEST"}')).id;
 select * into c from public.ciclo where id=(ctx->>'cycle')::uuid;
 c:=public.guardar_ciclo(jsonb_build_object('id',c.id,'expected_updated_at',c.updated_at,'carrera_id',c.carrera_id,'fecha_inicio',c.fecha_inicio,'fecha_fin',c.fecha_fin,'nombre_promocion',c.nombre_promocion,'departamento_id',c.departamento_id,'provincia_id',c.provincia_id,'distrito_id',c.distrito_id,'capitania_id',c.capitania_id,'empresa_patrocinadora_id',company));
 o:=public.registrar_orden_servicio(jsonb_build_object('empresa_patrocinadora_id',company,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at,'serie','OS','correlativo','1','fecha','2026-01-01','monto','20'));
 second_os:=public.registrar_orden_servicio(jsonb_build_object('empresa_patrocinadora_id',company,'ciclo_id',c.id,'expected_ciclo_updated_at',c.updated_at,'serie','OS','correlativo','2','fecha','2026-01-01','monto','30'));
 payload:=jsonb_build_object('empresa_patrocinadora_id',company,'serie','F','correlativo','1','importe','20','fecha_emision','2026-01-01','fecha_vencimiento','2026-02-01','ordenes',jsonb_build_array(jsonb_build_object('id',o.id,'expected_updated_at',o.updated_at)));
 f:=public.registrar_factura_patrocinador(payload);
 if not exists(select 1 from public.orden_servicio_resumen where id=o.id and facturas_vigentes=1 and facturas_relacionadas=1) then raise exception 'Live invoice missing from projection'; end if;
 select count(*) into before_count from public.factura_patrocinador;
 begin
  perform public.registrar_factura_patrocinador(payload||jsonb_build_object('correlativo','2','importe','50','ordenes',jsonb_build_array(jsonb_build_object('id',second_os.id,'expected_updated_at',second_os.updated_at),jsonb_build_object('id',o.id,'expected_updated_at',o.updated_at))));
  raise exception 'Duplicate OS accepted';
 exception when check_violation then
  if sqlerrm<>'H7_OS_ALREADY_INVOICED' then raise; end if;
 end;
 if (select count(*) from public.factura_patrocinador)<>before_count or (select facturas_vigentes from public.orden_servicio_resumen where id=second_os.id)<>0 then raise exception 'Rejected invoice left partial writes';end if;
 perform public.anular_factura_patrocinador(f.id,f.updated_at,'Corrección de prueba');
 if not exists(select 1 from public.orden_servicio_resumen where id=o.id and facturas_vigentes=0 and facturas_relacionadas=1) then raise exception 'Annulled invoice still reserves OS or history lost';end if;
 replacement:=public.registrar_factura_patrocinador(payload||jsonb_build_object('correlativo','3'));
 if not exists(select 1 from public.orden_servicio_resumen where id=o.id and facturas_vigentes=1 and facturas_relacionadas=2) then raise exception 'Replacement invoice not available with history';end if;
 if not exists(select 1 from public.factura_orden_servicio where factura_id=f.id and orden_servicio_id=o.id) then raise exception 'Historical link removed';end if;
 update public.order_test_context set value=value||jsonb_build_object('invoice_payload',payload||jsonb_build_object('correlativo','4','importe','30','ordenes',jsonb_build_array(jsonb_build_object('id',second_os.id,'expected_updated_at',second_os.updated_at))));
end $$;
commit;
