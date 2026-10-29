import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createFixtures, publicClient, checked } from './h2-fixtures.mjs'
import { inspectDatabase, assertSecurityInventory, securityInventory } from './local-platform.mjs'

let fixture
let current = 'preparation'
const passed = []
async function scenario(id, work) {
  current = id
  await work()
  passed.push(id)
  console.log(`${id}: PASSED (technical DB/API component)`)
}
const rejected = (result, label) => assert.ok(result.error, label)

try {
  fixture = await createFixtures()
  const clients = {}
  for (const [actor, entry] of Object.entries(fixture.entries)) {
    clients[actor] = publicClient(fixture.config)
    checked(await clients[actor].auth.signInWithPassword({ email: entry.email, password: entry.password }), 'login académico')
  }
  const { D, O, A } = clients
  const tag = randomUUID().slice(0, 8)
  const rpc = async (client, name, args) => checked(await client.rpc(name, args), name)
  const rows = async (client, table) => checked(await client.from(table).select('*'), `leer ${table}`)
  const byId = async (table, id) => checked(await D.from(table).select('*').eq('id', id).single(), `leer ${table}`)
  const fields = record => ({ id: record.id, expected_updated_at: record.updated_at })
  const materia = async suffix => rpc(D, 'guardar_materia', { p: { codigo: ` M${tag}${suffix} `, nombre: ` MATERIA ${tag} ${suffix} ` } })
  const mode = checked(await D.from('catalogo_valor').select('id').eq('codigo', 'CON_EXPERIENCIA').single(), 'modalidad')
  const motivos = await rows(D, 'catalogo_valor')
  const distrito = checked(await D.from('distrito').select('*').limit(1), 'distrito')[0]
  const provincia = await byId('provincia', distrito.provincia_id)
  const capitanias = await rows(D, 'capitania')
  const base = { fecha_inicio: '2037-01-01', fecha_fin: '2037-01-02', departamento_id: provincia.departamento_id, provincia_id: provincia.id, distrito_id: distrito.id, capitania_id: capitanias[0].id }
  let m1, m2, m3, m4, carrera, ciclo
  const carreraPayload = (c, change = {}) => ({ ...fields(c), codigo: c.codigo, nombre: c.nombre, descripcion: c.descripcion, sigla: c.sigla, modalidad_id: c.modalidad_id, ...change })
  const cicloPayload = (c, change = {}) => ({ ...fields(c), carrera_id: c.carrera_id, fecha_inicio: c.fecha_inicio, fecha_fin: c.fecha_fin, nombre_promocion: c.nombre_promocion, departamento_id: c.departamento_id, provincia_id: c.provincia_id, distrito_id: c.distrito_id, capitania_id: c.capitania_id, ...change })

  await scenario('TEST-H2-002/023 reference-reset-inventory', async () => {
    assertSecurityInventory(securityInventory())
    const sources = JSON.parse(readFileSync('supabase/reference/sources.json', 'utf8'))
    for (const source of sources.sources) assert.equal(createHash('sha256').update(readFileSync(`supabase/reference/${source.file}`)).digest('hex'), source.sha256)
    assert.equal(inspectDatabase('select count(*) from public.distrito;'), '1891')
    assert.equal(capitanias.length, 19)
    assert.equal((await rows(D, 'catalogo')).length, 11)
    assert.equal(motivos.length, 66)
  })
  await scenario('TEST-H2-003/024 normalization-uuid-uniqueness', async () => {
    m1 = await materia('1'); m2 = await materia('2'); m3 = await materia('3'); m4 = await materia('4')
    assert.equal(m1.codigo, `M${tag}1`.toUpperCase())
    assert.match(m1.id, /^[0-9a-f-]{36}$/)
    for (const p of [ { codigo: m1.codigo.toLowerCase(), nombre: 'DUPLICATE CODE' }, { codigo: 'OTHER', nombre: m1.nombre.toLowerCase() }, { codigo: 'A'.repeat(31), nombre: 'LONG' }, { codigo: 'VALID', nombre: 'N'.repeat(151) }, { codigo: 'VALID', nombre: 'VALID', descripcion: 'D'.repeat(501) }, { codigo: { bad: true }, nombre: 'BAD' }, { codigo: ' ', nombre: 'EMPTY' } ]) rejected(await D.rpc('guardar_materia', { p }), 'invalid input accepted')
    const beforeEdit = m1
    m1 = await rpc(D, 'guardar_materia', { p: { ...fields(m1), codigo: m1.codigo, nombre: `${m1.nombre} EDITADA`, descripcion: 'Updated with ordinary JWT' } })
    assert.ok(m1.nombre.endsWith(' EDITADA'))
    rejected(await D.rpc('guardar_materia', { p: { ...fields(beforeEdit), codigo: beforeEdit.codigo, nombre: beforeEdit.nombre } }), 'stale subject update')
    const boundary = await rpc(D, 'guardar_materia', { p: { codigo: tag.toUpperCase().padEnd(30, 'C'), nombre: tag.toUpperCase().padEnd(150, 'N'), descripcion: 'D'.repeat(500) } })
    assert.equal(boundary.codigo.length, 30); assert.equal(boundary.nombre.length, 150); assert.equal(boundary.descripcion.length, 500)
    const inert = await materia('I')
    const inactive = await rpc(D, 'cambiar_active_materia', { ...fields(inert), active: false, motivo: 'ensayo' })
    rejected(await D.rpc('guardar_materia', { p: { codigo: inactive.codigo, nombre: 'NO REUSE' } }), 'inactive code reused')
    await rpc(D, 'cambiar_active_materia', { ...fields(inactive), active: true })
  })
  await scenario('TEST-H2-004/031/032 career-catalog-and-minimum', async () => {
    const p = { codigo: `C${tag}`, nombre: `CARRERA ${tag}`, sigla: `A${tag.slice(0, 5)}`, modalidad_id: mode.id }
    rejected(await D.rpc('guardar_carrera', { p, materias: [] }), 'empty career')
    for (const sigla of ['A', 'A'.repeat(11), 'A-B']) rejected(await D.rpc('guardar_carrera', { p: { ...p, sigla }, materias: [m1.id] }), 'invalid sigla')
    const other = motivos.find(x => x.codigo === 'OTRO')
    rejected(await D.rpc('guardar_carrera', { p: { ...p, modalidad_id: other.id }, materias: [m1.id] }), 'wrong catalog')
    carrera = await rpc(D, 'guardar_carrera', { p, materias: [m1.id] })
    const occupied = new Set((await rows(D, 'carrera')).map(x => x.sigla))
    const shortSigla = [...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(x => `T${x}`).find(x => !occupied.has(x))
    assert.ok(shortSigla, 'reference fixture sigla available')
    for (const [suffix, sigla] of [['2', shortSigla], ['10', `Z${tag.toUpperCase()}0`]]) {
      const boundary = await rpc(D, 'guardar_carrera', { p: { ...p, codigo: `L${suffix}${tag}`, nombre: `LIMIT ${suffix} ${tag}`, sigla }, materias: [m4.id] })
      assert.equal(boundary.sigla.length, Number(suffix))
    }
    rejected(await D.rpc('guardar_carrera', { p: { ...p, codigo: `UNIQUE${tag}`, nombre: `UNIQUE ${tag}` }, materias: [m1.id] }), 'duplicate sigla')
    rejected(await D.rpc('cambiar_active_materia', { ...fields(m1), active: false, motivo: 'would break career' }), 'last active deactivated')
    rejected(await D.rpc('guardar_carrera', { p: carreraPayload(carrera), materias: [] }), 'last association removed')
  })
  await scenario('TEST-H2-005/006/008/034 cycle-roles-and-exclusion', async () => {
    for (const client of [O, A, clients.N, clients.F, clients.I]) rejected(await client.rpc('guardar_materia', { p: { codigo: 'FORBIDDEN', nombre: 'FORBIDDEN' } }), 'role bypass')
    assert.equal((await rows(A, 'materia')).length, 0)
    assert.ok((await rows(O, 'materia')).some(x => x.id === m1.id))
    ciclo = await rpc(O, 'guardar_ciclo', { p: { ...base, carrera_id: carrera.id } })
    assert.equal(ciclo.estado_codigo, 'PROGRAMADO')
    rejected(await O.rpc('guardar_ciclo', { p: { ...base, carrera_id: carrera.id, fecha_inicio: base.fecha_fin } }), 'inclusive overlap accepted')
    rejected(await O.rpc('guardar_ciclo', { p: { ...base, carrera_id: carrera.id, fecha_inicio: 'infinity' } }), 'non-calendar accepted')
    rejected(await O.rpc('guardar_ciclo', { p: { ...base, carrera_id: carrera.id, nombre_promocion: 'X'.repeat(151) } }), 'promotion limit')
    rejected(await O.rpc('guardar_ciclo', { p: { ...base, carrera_id: carrera.id, provincia_id: randomUUID() } }), 'hierarchy/FK bypass')
    await rpc(O, 'guardar_ciclo', { p: { ...base, carrera_id: carrera.id, capitania_id: capitanias[1].id } })
    assert.equal((await rows(A, 'app_users')).length, 7)
    assert.equal((await rows(D, 'app_users')).length, 1)
    assert.equal((await rows(O, 'app_users')).length, 1)
  })
  await scenario('TEST-H2-009/010/012/022 direct-bypass-denied', async () => {
    for (const table of ['materia', 'carrera', 'carrera_materia', 'ciclo', 'ciclo_materia', 'auditoria']) {
      rejected(await D.from(table).insert({ id: randomUUID() }), 'direct insert')
      rejected(await D.from(table).delete().eq('id', randomUUID()), 'direct delete')
    }
    for (const extra of [{ actor: fixture.entries.A.id }, { estado_codigo: 'CERRADO' }, { updated_at: new Date().toISOString() }]) rejected(await O.rpc('guardar_ciclo', { p: { ...base, carrera_id: carrera.id, ...extra } }), 'payload bypass')
    const calls = [
      ['guardar_materia', { p: { codigo: 'DENIED', nombre: 'DENIED' } }],
      ['guardar_carrera', { p: carreraPayload(carrera), materias: [m1.id] }],
      ['cambiar_active_materia', { ...fields(m1), active: false, motivo: 'DENIED' }],
      ['cambiar_active_carrera', { ...fields(carrera), active: false, motivo: 'DENIED' }],
      ['guardar_ciclo', { p: cicloPayload(ciclo) }],
      ['cambiar_materia_ciclo', { ciclo_id: ciclo.id, materia_id: m1.id, expected_updated_at: ciclo.updated_at, activo: false }],
      ['cambiar_estado_ciclo', { ...fields(ciclo), destino: 'EN_CURSO' }],
    ]
    for (const client of [A, clients.N, clients.F, clients.I, publicClient(fixture.config)]) {
      for (const [name, args] of calls) rejected(await client.rpc(name, args), 'direct RPC authorization bypass')
    }
    rejected(await fixture.admin.from('app_roles').insert({ code: 'ADMIN' }), 'legacy role remains functional')
    checked(await A.auth.updateUser({ data: { role: 'DIRECTOR_ACADEMICO' } }), 'metadata preparation')
    checked(await A.auth.refreshSession(), 'metadata renewal')
    rejected(await A.rpc('guardar_materia', { p: { codigo: 'META', nombre: 'METADATA' } }), 'metadata authorizes')
    assert.ok((await rows(A, 'auditoria')).length > 0)
    assert.equal((await rows(clients.N, 'auditoria')).length, 0)
  })
  await scenario('TEST-H2-026/029 atomic-sigla-and-stale-version', async () => {
    const old = carrera
    carrera = await rpc(D, 'guardar_carrera', { p: carreraPayload(carrera, { sigla: `B${tag.slice(0, 5)}` }), materias: [m1.id] })
    const updated = await byId('ciclo', ciclo.id)
    assert.equal(updated.anio, ciclo.anio); assert.equal(updated.correlativo, ciclo.correlativo)
    assert.ok(updated.codigo_ciclo.endsWith(`-${carrera.sigla}`))
    assert.notEqual(updated.updated_at, ciclo.updated_at)
    rejected(await O.rpc('guardar_ciclo', { p: cicloPayload(ciclo) }), 'stale cycle version')
    rejected(await D.rpc('guardar_carrera', { p: carreraPayload(old), materias: [m1.id] }), 'stale career version')
    ciclo = updated
  })
  await scenario('TEST-H2-027/033 additive-relations-and-career-change', async () => {
    ciclo = await rpc(O, 'guardar_ciclo', { p: cicloPayload(ciclo), adicionales: [m3.id] })
    carrera = await rpc(D, 'guardar_carrera', { p: carreraPayload(carrera), materias: [m1.id, m2.id, m3.id] })
    ciclo = await byId('ciclo', ciclo.id)
    let cm = checked(await O.from('ciclo_materia').select('*').eq('ciclo_id', ciclo.id), 'relations')
    assert.equal(cm.find(x => x.materia_id === m3.id).origen, 'ADICIONAL')
    ciclo = await rpc(O, 'cambiar_materia_ciclo', { ciclo_id: ciclo.id, materia_id: m1.id, expected_updated_at: ciclo.updated_at, activo: false })
    const retiredId = cm.find(x => x.materia_id === m1.id).id
    carrera = await rpc(D, 'guardar_carrera', { p: carreraPayload(carrera), materias: [m1.id, m2.id, m3.id] })
    cm = checked(await O.from('ciclo_materia').select('*').eq('ciclo_id', ciclo.id), 'retired relations')
    const retired = cm.find(x => x.materia_id === m1.id)
    assert.equal(retired.id, retiredId); assert.equal(retired.activo, false); assert.equal(retired.motivo_inactivacion, 'RETIRO_MANUAL')
    const nextCareer = await rpc(D, 'guardar_carrera', { p: { codigo: `N${tag}`, nombre: `NEW ${tag}`, sigla: `N${tag.slice(0, 5)}`, modalidad_id: mode.id }, materias: [m2.id, m4.id] })
    ciclo = await byId('ciclo', ciclo.id)
    ciclo = await rpc(O, 'guardar_ciclo', { p: cicloPayload(ciclo, { carrera_id: nextCareer.id }) })
    cm = checked(await O.from('ciclo_materia').select('*').eq('ciclo_id', ciclo.id), 'changed career')
    assert.equal(cm.find(x => x.materia_id === m2.id).motivo_inactivacion, 'CAMBIO_CARRERA')
    assert.equal(cm.find(x => x.materia_id === m3.id).activo, true)
    assert.equal(cm.find(x => x.materia_id === m4.id).activo, true)
    assert.equal(cm.length, 4)
    ciclo = await rpc(O, 'cambiar_materia_ciclo', { ciclo_id: ciclo.id, materia_id: m1.id, expected_updated_at: ciclo.updated_at, activo: true })
  })
  await scenario('TEST-H2-007/028/030/031 states-history-and-no-delete', async () => {
    rejected(await O.rpc('cambiar_estado_ciclo', { ...fields(ciclo), destino: 'EN_CURSO' }), 'coordinator transition')
    let running = await rpc(D, 'cambiar_estado_ciclo', { ...fields(ciclo), destino: 'EN_CURSO' })
    running = await rpc(O, 'guardar_ciclo', { p: cicloPayload(running, { nombre_promocion: 'COORDINADOR EN CURSO' }) })
    rejected(await D.rpc('cambiar_estado_ciclo', { ...fields(running), destino: 'ANULADO', motivo: 'forbidden origin' }), 'running annulled')
    const otro = motivos.find(x => x.codigo === 'OTRO')
    rejected(await D.rpc('cambiar_estado_ciclo', { ...fields(running), destino: 'DESIERTO', motivo_desierto_id: otro.id }), 'OTRO without detail')
    rejected(await D.rpc('cambiar_estado_ciclo', { ...fields(running), destino: 'DESIERTO', motivo_desierto_id: mode.id, motivo: 'wrong catalog' }), 'wrong reason catalog')
    ciclo = await rpc(D, 'cambiar_estado_ciclo', { ...fields(running), destino: 'DESIERTO', motivo_desierto_id: otro.id, motivo: 'Synthetic reason' })
    rejected(await O.rpc('guardar_ciclo', { p: cicloPayload(ciclo) }), 'terminal edited')
    rejected(await D.rpc('cambiar_estado_ciclo', { ...fields(ciclo), destino: 'PROGRAMADO' }), 'reopening')
    rejected(await D.from('ciclo').delete().eq('id', ciclo.id), 'persisted cycle deleted')
    const replacement = await rpc(O, 'guardar_ciclo', { p: { ...base, carrera_id: ciclo.carrera_id } })
    const runningAgain = await rpc(D, 'cambiar_estado_ciclo', { ...fields(replacement), destino: 'EN_CURSO' })
    const closed = await rpc(D, 'cambiar_estado_ciclo', { ...fields(runningAgain), destino: 'CERRADO' })
    rejected(await O.rpc('guardar_ciclo', { p: { ...base, carrera_id: closed.carrera_id } }), 'closed range released')
    const oldCode = closed.codigo_ciclo
    const nextCareer = await byId('carrera', closed.carrera_id)
    await rpc(D, 'guardar_carrera', { p: carreraPayload(nextCareer, { sigla: `T${tag.slice(0, 5)}` }), materias: [m2.id, m4.id] })
    assert.equal((await byId('ciclo', closed.id)).codigo_ciclo, oldCode)
    const programmed = await rpc(O, 'guardar_ciclo', { p: { ...base, carrera_id: closed.carrera_id, capitania_id: capitanias[12].id } })
    const deserted = await rpc(D, 'cambiar_estado_ciclo', { ...fields(programmed), destino: 'DESIERTO', motivo_desierto_id: motivos.find(x => x.codigo === 'FALTA_ALUMNOS').id })
    const programmedAgain = await rpc(O, 'guardar_ciclo', { p: { ...base, carrera_id: closed.carrera_id, capitania_id: capitanias[12].id } })
    rejected(await D.rpc('cambiar_estado_ciclo', { ...fields(programmedAgain), destino: 'ANULADO' }), 'annulment without reason')
    const annulled = await rpc(D, 'cambiar_estado_ciclo', { ...fields(programmedAgain), destino: 'ANULADO', motivo: 'Synthetic mistaken registration' })
    for (const terminal of [deserted, closed, annulled]) {
      rejected(await O.rpc('guardar_ciclo', { p: cicloPayload(terminal) }), 'terminal edited')
      rejected(await D.rpc('cambiar_estado_ciclo', { ...fields(terminal), destino: 'PROGRAMADO' }), 'terminal reopened')
      rejected(await D.from('ciclo').delete().eq('id', terminal.id), 'terminal deleted')
    }
  })
  await scenario('TEST-H2-007/023/031 inactive-history-and-new-selections', async () => {
    const fresh = await byId('materia', m1.id)
    const inactive = await rpc(D, 'cambiar_active_materia', { ...fields(fresh), active: false, motivo: 'Synthetic inactivation' })
    assert.equal(checked(await O.from('materia').select('active').eq('id', m1.id).single(), 'historical subject').active, false)
    const historical = checked(await O.from('ciclo_materia').select('id').eq('materia_id', m1.id), 'historical relations')
    assert.ok(historical.length > 0)
    rejected(await O.rpc('guardar_ciclo', { p: { ...base, carrera_id: carrera.id, capitania_id: capitanias[2].id }, adicionales: [m1.id] }), 'inactive added to new cycle')
    await rpc(D, 'cambiar_active_materia', { ...fields(inactive), active: true })
    const careerNow = await byId('carrera', carrera.id)
    const disabled = await rpc(D, 'cambiar_active_carrera', { ...fields(careerNow), active: false, motivo: 'Synthetic reason' })
    rejected(await O.rpc('guardar_ciclo', { p: { ...base, carrera_id: carrera.id, capitania_id: capitanias[2].id } }), 'inactive career selected')
    carrera = await rpc(D, 'cambiar_active_carrera', { ...fields(disabled), active: true })
    try {
      inspectDatabase("update public.catalogo_valor set activo=false where id=:'value'::uuid;", { value: mode.id })
      carrera = await rpc(D, 'guardar_carrera', { p: carreraPayload(carrera, { descripcion: 'Existing inactive reference retained' }), materias: [m1.id, m2.id, m3.id] })
      rejected(await D.rpc('guardar_carrera', { p: { codigo: `IN${tag}`, nombre: `INACTIVE MODE ${tag}`, sigla: `I${tag.slice(0, 5)}`, modalidad_id: mode.id }, materias: [m1.id] }), 'inactive modality selected for new career')
    } finally { inspectDatabase("update public.catalogo_valor set activo=true where id=:'value'::uuid;", { value: mode.id }) }
    const otro = motivos.find(x => x.codigo === 'OTRO')
    const candidate = await rpc(O, 'guardar_ciclo', { p: { ...base, carrera_id: carrera.id, capitania_id: capitanias[3].id } })
    try {
      inspectDatabase("update public.catalogo_valor set activo=false where id=:'value'::uuid;", { value: otro.id })
      assert.ok((await rows(O, 'catalogo_valor')).some(x => x.id === otro.id && !x.activo))
      rejected(await D.rpc('cambiar_estado_ciclo', { ...fields(candidate), destino: 'DESIERTO', motivo_desierto_id: otro.id, motivo: 'Detail' }), 'inactive reason selected')
      assert.ok((await rows(O, 'ciclo')).some(x => x.id === ciclo.id && x.motivo_desierto_id === otro.id))
    } finally { inspectDatabase("update public.catalogo_valor set activo=true where id=:'value'::uuid;", { value: otro.id }) }
  })
  await scenario('TEST-H2-011 audit-failure-rolls-back', async () => {
    const before = (await rows(D, 'materia')).length
    try {
      inspectDatabase(`create function private.h2_test_audit_failure() returns trigger language plpgsql as $$begin raise exception 'controlled audit failure'; end$$;
        create trigger h2_test_audit_failure before insert on public.auditoria for each row when (new.actor=:'actor'::uuid) execute function private.h2_test_audit_failure();`, { actor: fixture.entries.D.id })
      rejected(await D.rpc('guardar_materia', { p: { codigo: `FAIL${tag}`, nombre: 'MUST ROLLBACK' } }), 'audit failure ignored')
      assert.equal((await rows(D, 'materia')).length, before)
    } finally { inspectDatabase('drop trigger if exists h2_test_audit_failure on public.auditoria; drop function if exists private.h2_test_audit_failure();') }
    const audit = await rows(A, 'auditoria')
    assert.ok(audit.every(x => x.id && x.actor && x.fecha && x.registro_id))
    assert.ok(audit.some(x => x.accion === 'DESIERTO' && x.motivo?.includes('OTRO')))
  })
  await scenario('TEST-H2-006/025/032 concurrent-invariants', async () => {
    for (let i = 0; i < 8; i++) {
      const m = await materia(`R${i}`)
      await Promise.all([D.rpc('guardar_carrera', { p: { codigo: `R${tag}${i}`, nombre: `RACE ${tag} ${i}`, sigla: `R${tag.slice(0, 3)}${i}`, modalidad_id: mode.id }, materias: [m.id] }), D.rpc('cambiar_active_materia', { ...fields(m), active: false, motivo: 'concurrent test' })])
      const rel = checked(await D.from('carrera_materia').select('id').eq('materia_id', m.id), 'race reference')
      assert.ok(!rel.length || (await byId('materia', m.id)).active)
    }
    const concurrent = await Promise.all(capitanias.slice(4, 10).map(cap => O.rpc('guardar_ciclo', { p: { ...base, carrera_id: carrera.id, capitania_id: cap.id, fecha_inicio: '2039-01-01', fecha_fin: '2039-01-01' } })))
    const successful = concurrent.filter(result => !result.error).map(result => result.data)
    assert.ok(successful.length > 0)
    assert.ok(concurrent.every(result => !result.error || result.error.code === '40001'))
    assert.equal(new Set(successful.map(c => c.correlativo)).size, successful.length)
    inspectDatabase("update private.ciclo_correlativo set ultimo=greatest(ultimo,998) where anio=extract(year from clock_timestamp() at time zone 'America/Lima');")
    for (const cap of capitanias.slice(10, 12)) {
      const large = await rpc(O, 'guardar_ciclo', { p: { ...base, carrera_id: carrera.id, capitania_id: cap.id, fecha_inicio: '2040-01-01', fecha_fin: '2040-01-01' } })
      assert.ok(large.correlativo >= 999)
      assert.equal(large.codigo_ciclo.split('-')[1], String(large.correlativo).padStart(3, '0'))
    }
    const all = await rows(D, 'ciclo')
    assert.equal(new Set(all.map(x => `${x.anio}-${x.correlativo}`)).size, all.length)
    assert.ok(all.every(x => x.codigo_ciclo.split('-')[1].length >= 3))
    assert.equal(inspectDatabase("select extract(year from timestamptz '2027-01-01 02:00:00+00' at time zone 'America/Lima');"), '2026')
    assert.equal(inspectDatabase("select lpad('1000',greatest(3,length('1000')),'0');"), '1000')
  })
  console.log(JSON.stringify({ academicTechnicalGroups: passed.length, result: 'PASSED', humanTests: 'PENDING', futureEnrollmentBillingChecks: 'DEFERRED' }))
} catch (error) {
  console.error(`FAILED ${current}: ${error instanceof assert.AssertionError ? error.message : 'contenido interno omitido'}`)
  process.exitCode = 1
} finally {
  if (fixture) { try { await fixture.cleanup() } catch { console.error('Cleanup incompleto'); process.exitCode = 1 } }
}
