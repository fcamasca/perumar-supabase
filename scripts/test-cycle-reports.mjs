// Runs only inside the existing random, disposable H6 DB/API harness. No human data or Storage IO.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
export async function testCycleReports({ sql, api, fixture, actorSql, admin }) {
  const f = fixture(), other = fixture()
  assert.equal(sql("select reloptions::text from pg_class where oid='public.matricula_reporte_ciclo'::regclass"), '{security_invoker=true}')
  const path = (cycle, extra = {}) => '/matricula_reporte_ciclo?' + new URLSearchParams({
    select: 'matricula_id,codigo_alumno,apellido_paterno,apellido_materno,nombres,numero_di,codigo_matricula,matricula_estado,base::text,abonado::text,pendiente::text,aplicables,completados,pendientes,faltantes,documentos',
    ciclo_id: `eq.${cycle}`, matricula_estado: 'eq.ACTIVO', order: 'apellido_paterno,apellido_materno,nombres,matricula_id', ...extra,
  })
  const read = async (actor = f.actor, extra = {}) => {
    const r = await api(path(f.cycle, extra), actor); assert.equal(r.status, 200); return r.data
  }
  const initial = (await read())[0]
  assert.deepEqual(initial.documentos, []); assert.equal(initial.aplicables, 0); assert.deepEqual(initial.faltantes, []); assert.equal(initial.pendientes, 0)
  assert.equal(Number(initial.base), 100); assert.equal(Number(initial.abonado), 0); assert.equal(Number(initial.pendiente), 100)
  sql(actorSql(f.actor, `
  select public.guardar_documentos_ciclo('${f.cycle}','${f.cycleVersion}','[]',
    (select jsonb_agg(jsonb_build_object('tipo_documento_id',id,'activo','true','obligatorio',(codigo='DOCUMENTO_IDENTIDAD')::text))
     from public.tipo_documento where codigo in('DOCUMENTO_IDENTIDAD','CERTIFICADO_ESTUDIOS','CERTIFICADO_PSICOFISICO','FOTO_ALUMNO','DECLARACION_JURADA','CARTA_PODER','SOLICITUD')));
  select public.guardar_documentos_ciclo('${f.cycle}','${f.cycleVersion}',
    (select jsonb_agg(jsonb_build_object('id',id,'updated_at',updated_at) order by id) from public.ciclo_documento where ciclo_id='${f.cycle}'),
    (select jsonb_agg(jsonb_build_object('tipo_documento_id',tipo_documento_id,'activo',(t.codigo<>'SOLICITUD')::text,'obligatorio',obligatorio::text)) from public.ciclo_documento c join public.tipo_documento t on t.id=c.tipo_documento_id where ciclo_id='${f.cycle}'));
  select public.retirar_documentos_opcionales('${f.cycle}',
    (select jsonb_agg(jsonb_build_object('id',id,'expected_updated_at',updated_at)) from public.matricula_documento where matricula_id='${f.enrollment}' and codigo='CERTIFICADO_PSICOFISICO'),'SYNTHETIC REPORT');
  do $$ declare d public.matricula_documento; r jsonb;begin
    for d in select * from public.matricula_documento where matricula_id='${f.enrollment}' and codigo in('FOTO_ALUMNO','DECLARACION_JURADA') loop
      r:=public.preparar_archivo_expediente('${f.actor}',d.id,d.updated_at,case when d.origen='GENERADO' then 'h6-2' end);
      perform public.confirmar_archivo_expediente('${f.actor}',(r->>'id')::uuid,case when d.origen='SUBIDO' then 'image/png' else 'application/pdf' end,64,repeat('a',64));
    end loop;
  end $$;
  select set_config('perumar.document_command','SYNC',true);
  update public.matricula_documento set contexto_vigente=false,activo=false,inactivado_por='${f.actor}',inactivado_at=clock_timestamp(),causa_inactivacion='TRASLADO' where matricula_id='${f.enrollment}' and codigo='CARTA_PODER';
  `))
  const docs = (await read())[0]
  assert.equal(docs.aplicables, 4); assert.equal(docs.completados, 2); assert.equal(docs.pendientes, 2)
  const expectedNames = JSON.parse(sql(`select json_agg(nombre order by nombre,id) from public.matricula_documento where matricula_id='${f.enrollment}' and activo and contexto_vigente and estado='PENDIENTE'`))
  assert.deepEqual(docs.faltantes, expectedNames)
  const cells = Object.fromEntries(docs.documentos.map(d => [d.codigo, d.estado]))
  assert.equal(cells.DOCUMENTO_IDENTIDAD, 'PENDIENTE'); assert.equal(cells.CERTIFICADO_ESTUDIOS, 'PENDIENTE')
  assert.equal(cells.FOTO_ALUMNO, 'CARGADO'); assert.equal(cells.DECLARACION_JURADA, 'GENERADO')
  assert.equal(cells.CERTIFICADO_PSICOFISICO, null); assert.equal(cells.CARTA_PODER, null)
  assert.ok(!Object.hasOwn(cells, 'SOLICITUD'), 'Inactive configuration is not a matrix column')
  for (const cell of docs.documentos) assert.deepEqual(Object.keys(cell).sort(), ['codigo', 'estado', 'nombre'])
  assert.equal(sql(`select row(r.aplicables,r.completados,r.pendientes) = row(h.aplicables,h.completados,h.pendientes) from public.matricula_reporte_ciclo r join public.matricula_expediente_resumen h using(matricula_id) where matricula_id='${f.enrollment}'`), 't')
  // Complete remaining documents using H6 commands, not a persisted COMPLETE flag.
  sql(actorSql(f.actor, `do $$ declare d public.matricula_documento; r jsonb;begin
   for d in select * from public.matricula_documento where matricula_id='${f.enrollment}' and activo and contexto_vigente and estado='PENDIENTE' loop
    r:=public.preparar_archivo_expediente('${f.actor}',d.id,d.updated_at,case when d.origen='GENERADO' then 'h6-2' end);
    perform public.confirmar_archivo_expediente('${f.actor}',(r->>'id')::uuid,'image/png',64,repeat('b',64));
   end loop;end $$;`))
  assert.equal((await read())[0].pendientes, 0); assert.deepEqual((await read())[0].faltantes, [])
  assert.ok((await read())[0].documentos.every(d => d.estado === null || ['CARGADO', 'GENERADO'].includes(d.estado)))
  sql(actorSql(f.actor, `select public.retirar_documentos_opcionales('${f.cycle}',
    (select jsonb_agg(jsonb_build_object('id',id,'expected_updated_at',updated_at)) from public.matricula_documento where matricula_id='${f.enrollment}' and codigo='FOTO_ALUMNO'),'SYNTHETIC MATRIX')`))
  assert.equal((await read())[0].documentos.find(d => d.codigo === 'FOTO_ALUMNO').estado, null, 'A retired loaded file is not applicable, not complete')
  assert.equal(sql(`select estado from public.matricula_documento where matricula_id='${f.enrollment}' and codigo='FOTO_ALUMNO'`), 'CARGADO', 'Matrix introduces no persisted state')
  // Authoritative H4 equality, actual payment commands and decimal text transport.
  for (const amount of [70, 30]) {
    sql(actorSql(f.actor, `select public.registrar_pago(jsonb_build_object('matricula_id','${f.enrollment}','expected_matricula_updated_at',(select updated_at from public.matricula where id='${f.enrollment}'),'idempotency_key','${randomUUID()}','importe','${amount}','medio_pago_id',(select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='MEDIO_PAGO' and v.codigo='EFECTIVO'),'aplicaciones',jsonb_build_array(jsonb_build_object('matricula_cargo_id',(select id from public.matricula_cargo where matricula_id='${f.enrollment}' and activo),'importe','${amount}'))))`))
    const report = (await read())[0]
    const source = JSON.parse(sql(`select row_to_json(s) from public.matricula_saldo s where matricula_id='${f.enrollment}'`))
    for (const field of ['base', 'abonado', 'pendiente']) assert.equal(Number(report[field]), source[field])
    assert.equal(Number(report.pendiente), amount === 70 ? 30 : 0)
  }
  for (const actor of [f.actor, f.coordinator]) {
    assert.equal((await read(actor)).length, 1)
    for (const [field, value] of [['nombres', 'OCUPACION'], ['apellido_paterno', 'PRUEBA'], ['numero_di', docs.numero_di]]) {
      assert.equal((await read(actor, { or: `(${field}.ilike.${JSON.stringify(`%${value}%`)})` })).length, 1)
    }
    const wrong = await api(path(randomUUID()), actor); assert.equal(wrong.status, 200); assert.deepEqual(wrong.data, [])
    const otherCycle = await api(path(other.cycle), actor); assert.equal(otherCycle.data.length, 1, 'Academic scope is global; no invented per-Cycle assignment')
  }
  const none = randomUUID()
  sql(`insert into auth.users(id) values('${none}');insert into public.app_users(id) values('${none}')`)
  for (const actor of [admin, none]) {
    assert.deepEqual(await read(actor), [])
    assert.deepEqual((await api(path(other.cycle), actor)).data, [], 'Cross-Cycle IDOR does not bypass RLS')
    assert.deepEqual((await api('/matricula_reporte_ciclo?select=*', actor)).data, [], 'Removing client filters does not grant access')
  }
  const configPath = '/ciclo_documento?' + new URLSearchParams({ select: 'tipo_documento!inner(codigo,nombre)', ciclo_id: `eq.${f.cycle}`, activo: 'eq.true', order: 'tipo_documento_id' })
  for (const actor of [f.actor, f.coordinator]) {
    const headers = await api(configPath, actor); assert.equal(headers.status, 200)
    assert.deepEqual(headers.data.map(d => d.tipo_documento.codigo).sort(), docs.documentos.map(d => d.codigo).sort())
  }
  for (const actor of [admin, none]) assert.deepEqual((await api(configPath, actor)).data, [])
  const badId = await api(path('not-a-uuid'), f.actor); assert.equal(badId.status, 400)
  const fields = await api('/matricula_reporte_ciclo?select=object_key,sha256', f.actor); assert.equal(fields.status, 400)
  const injection = await read(f.actor, { or: '(nombres.ilike."%x).or(id.neq.null)%")' }); assert.deepEqual(injection, [])
  const dml = await api('/matricula_reporte_ciclo', f.actor, { nombres: 'ATTACK' }, 'PATCH'); assert.ok(dml.status >= 400)
  // A second enrollment of another student in the same Cycle proves real API page boundaries.
  const otherStudent = sql(`select alumno_id from public.matricula where id='${other.enrollment}'`)
  sql(actorSql(f.actor, `select public.registrar_matricula(jsonb_build_object('alumno_id','${otherStudent}','expected_alumno_updated_at',(select updated_at from public.alumno where id='${otherStudent}'),'ciclo_id','${f.cycle}','expected_ciclo_updated_at',(select updated_at from public.ciclo where id='${f.cycle}')))`))
  const first = await read(f.actor, { limit: '1', offset: '0' }), second = await read(f.actor, { limit: '1', offset: '1' })
  assert.equal(first.length, 1); assert.equal(second.length, 1); assert.notEqual(first[0].matricula_id, second[0].matricula_id)
  sql(actorSql(f.actor, `select public.anular_matricula('${f.enrollment}',(select updated_at from public.matricula where id='${f.enrollment}'),'SYNTHETIC REPORT')`))
  assert.equal((await read()).length, 1)
  const all = await api(path(f.cycle, { matricula_estado: 'in.(ACTIVO,ANULADO)' }), f.actor)
  assert.equal(all.data.length, 2); assert.ok(all.data.some(r => r.matricula_estado === 'ANULADO'))
  console.log('H6.1 matrix and reports PASSED real DB/API: active/cancelled, filters/pages, H6 missing/complete/zero + excluded retired/inactive/historical/loaded/generated; H4 no/partial/full payment source equality; Director/Coordinator allowed, Admin/no-role/IDOR/DML denied. Synthetic metadata only, no human DB writes.')
}
