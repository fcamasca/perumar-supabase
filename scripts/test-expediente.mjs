import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
import { createFixtures, publicClient, checked } from './h2-fixtures.mjs'
import { inspectDatabase, assertSecurityInventory, securityInventory } from './local-platform.mjs'
if (process.env.CI !== 'true' || process.env.GITHUB_ACTIONS !== 'true')
  throw Error(
    'H6 real Auth/Storage probes require the disposable CI stack, never the human database.',
  )
let fixture
const documentIds = []
try {
  fixture = await createFixtures()
  assertSecurityInventory(securityInventory())
  const clients = {},
    tokens = {}
  for (const [actor, e] of Object.entries(fixture.entries)) {
    const c = publicClient(fixture.config)
    checked(
      await c.auth.signInWithPassword({ email: e.email, password: e.password }),
      'H6 fixture login',
    )
    clients[actor] = c
    tokens[actor] = (await c.auth.getSession()).data.session.access_token
  }
  const { D, O } = clients,
    tag = randomUUID().slice(0, 8).toUpperCase(),
    rpc = async (c, n, p) => {const result=await c.rpc(n,p);if(result.error)console.error('H6 RPC '+n+' code='+result.error.code);return checked(result,n)}
  const rows = async (table) => checked(await D.from(table).select('*'), table),
    one = async (table, id) => checked(await D.from(table).select('*').eq('id', id).single(), table)
  const cats = await rows('catalogo'),
    values = await rows('catalogo_valor'),
    value = (c, v) =>
      values.find((x) => x.catalogo_id === cats.find((k) => k.codigo === c).id && x.codigo === v).id
  const district = (await rows('distrito'))[0],
    province = await one('provincia', district.provincia_id),
    geo = {
      departamento_id: province.departamento_id,
      provincia_id: province.id,
      distrito_id: district.id,
    }
  const subject = await rpc(D, 'guardar_materia', { p: { nombre: 'H6 ASIGNATURA ' + tag } }),
    course = await rpc(D, 'guardar_carrera', {
      p: { nombre: 'H6 CURSO ' + tag, sigla: 'E' + tag },
      materias: [subject.id],
    })
  let cycle = await rpc(D, 'guardar_ciclo', {
    p: {
      ...geo,
      carrera_id: course.id,
      capitania_id: (await rows('capitania'))[0].id,
      fecha_inicio: '2048-01-01',
      fecha_fin: '2048-02-01',
    },
  })
  const tariff = await rpc(D, 'guardar_tarifa', {
    p: { codigo: 'DOC' + tag, nombre: 'H6 SINTETICO', tipo: 'CARRERA', monto_por_defecto: '100' },
  })
  cycle = await rpc(D, 'guardar_ciclo_tarifas', {
    ciclo_id: cycle.id,
    expected_updated_at: cycle.updated_at,
    configuracion: [{ tarifa_id: tariff.id, importe: '100', obligatorio: 'true' }],
  })
  const initial = {
    apellido_paterno: 'MUÑOZ',
    apellido_materno: 'QUIÑONES',
    nombres: 'ÁNGELA',
    tipo_di_id: value('TIPO_DI', 'CARNET_EXTRANJERIA'),
    numero_di: randomUUID().replaceAll('-', '').slice(0, 30),
    fecha_nacimiento: '2000-01-01',
    sexo_id: value('SEXO', 'F'),
    celular: '999111222',
    domicilio: 'H6 SINTÉTICO',
    ...Object.fromEntries(Object.entries(geo).map(([k, v]) => ['nacimiento_' + k, v])),
    ...Object.fromEntries(Object.entries(geo).map(([k, v]) => ['domicilio_' + k, v])),
    contactos: [
      {
        apellido: 'CONTACTO',
        nombre: 'SINTÉTICO',
        parentesco_id: value('PARENTESCO', 'PADRE'),
        celular: '999111222',
      },
    ],
  }
  let student = await rpc(O, 'guardar_alumno', { p: initial })
  const types = await rows('tipo_documento'),
    config = types
      .filter((t) => t.activo)
      .map((t) => ({
        tipo_documento_id: t.id,
        activo: 'true',
        obligatorio: t.codigo === 'DOCUMENTO_IDENTIDAD' ? 'true' : 'false',
      }))
  await rpc(O, 'guardar_documentos_ciclo', {
    p_ciclo_id: cycle.id,
    p_expected_updated_at: cycle.updated_at,
    p_expected_config: [],
    p_documentos: config,
  })
  let enrollment = await rpc(O, 'registrar_matricula', {
    p: {
      alumno_id: student.id,
      expected_alumno_updated_at: student.updated_at,
      ciclo_id: cycle.id,
      expected_ciclo_updated_at: cycle.updated_at,
    },
  })
  const docs = async () =>
      checked(
        await D.from('matricula_documento')
          .select('*')
          .eq('matricula_id', enrollment.id)
          .eq('contexto_vigente', true),
        'H6 applications',
      ),
    doc = async (code) => (await docs()).find((d) => d.codigo === code)
  documentIds.push(...(await docs()).map((d) => d.id))
  assert.equal(documentIds.length, types.filter((t) => t.activo).length)
  assert.ok((await docs()).every((d) => d.activo && d.estado === 'PENDIENTE'))
  const invoke = (kind, payload, actor = 'D', origin) =>
    fetch(fixture.config.url + '/functions/v1/expediente-' + kind, {
      method: 'POST',
      headers: {
        apikey: fixture.config.key,
        ...(actor ? { Authorization: 'Bearer ' + tokens[actor] } : {}),
        ...(payload instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(origin ? { Origin: origin } : {}),
      },
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    })
  const input = async (code) => {
    const d = await doc(code)
    return {
      documento_id: d.id,
      expected_updated_at: d.updated_at,
      datos_generacion:
        code === 'CARTA_PODER'
          ? {
              apoderado_nombre: 'APODERADO SINTÉTICO',
              apoderado_tipo_di_id: value('TIPO_DI', 'DNI'),
              apoderado_numero_di: '00000001',
            }
          : {},
    }
  }
  const versions = async (id) =>
    checked(
      await D.from('matricula_documento_archivo')
        .select('*')
        .eq('matricula_documento_id', id)
        .order('iniciado_at'),
      'H6 versions',
    )
  const download = (d, id, historico = false, actor = 'D') =>
    invoke('descargar', { documento_id: d.id, archivo_id: id, historico }, actor)
  const pdf = await PDFDocument.create()
  pdf.addPage()
  const safePdf = await pdf.save({ useObjectStreams: false })
  const png = PNG.sync.write(
      Object.assign(new PNG({ width: 1, height: 1 }), { data: Buffer.from([255, 0, 0, 255]) }),
    ),
    jpg = jpeg.encode({ width: 1, height: 1, data: Buffer.from([255, 0, 0, 255]) }).data
  // A valid ancillary PNG text chunk exercises exact byte limits without inflating pixels.
  const pngAtSize = (size) => {
    const chunk = Buffer.alloc(size - png.length),
      dataLength = chunk.length - 12
    chunk.writeUInt32BE(dataLength, 0)
    chunk.write('tEXt', 4)
    chunk.write('synthetic\0', 8)
    chunk.fill(120, 18, chunk.length - 4)
    let crc = 0xffffffff
    for (const b of chunk.subarray(4, -4)) {
      crc ^= b
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
    chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4)
    return Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12)])
  }
  const upload = async (code, bytes, mime, name, actor = 'D') => {
    const d = await doc(code),
      f = new FormData()
    f.set('documento_id', d.id)
    f.set('expected_updated_at', d.updated_at)
    f.set('archivo', new Blob([bytes], { type: mime }), name)
    return invoke('cargar', f, actor)
  }
  for (const actor of ['A', 'B', 'N', 'F', 'I'])
    assert.equal((await invoke('generar', await input('SOLICITUD'), actor)).status, 403)
  assert.equal((await invoke('generar', await input('SOLICITUD'), null)).status, 401)
  assert.equal(
    (await invoke('generar', await input('SOLICITUD'), 'D', 'https://evil.invalid')).status,
    403,
  )
  for (const key of [
    'actor',
    'object_key',
    'bucket',
    'hash',
    'url',
    'sql',
    'plantilla',
    'service_role',
  ])
    assert.equal(
      (await invoke('generar', { ...(await input('SOLICITUD')), [key]: 'FORGED' })).status,
      422,
    )
  assert.equal(
    (await invoke('generar', { ...(await input('SOLICITUD')), documento_id: randomUUID() })).status,
    403,
  )
  for (const [code, bytes, mime, name] of [
    ['DOCUMENTO_IDENTIDAD', safePdf, 'application/pdf', 'documento.pdf'],
    ['FOTO_PASAPORTE', png, 'image/png', 'foto.png'],
    ['FOTO_PASAPORTE', jpg, 'image/jpeg', 'foto.jpg'],
  ]) {
    const r = await upload(code, bytes, mime, name, 'O')
    assert.equal(r.status, 200, 'real ' + mime + ' upload/decoder')
    const result = await r.json()
    assert.equal(result.estado_tecnico, 'CONFIRMADO')
    const d = await doc(code),
      dl = await download(d, result.archivo_id)
    assert.equal(dl.status, 200)
    assert.equal(dl.headers.get('cache-control'), 'private, no-store')
    assert.equal(dl.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(
      createHash('sha256')
        .update(Buffer.from(await dl.arrayBuffer()))
        .digest('hex'),
      createHash('sha256').update(bytes).digest('hex'),
    )
  }
  const bad = await PDFDocument.create()
  bad.addPage()
  bad.catalog.set(PDFName.of('OpenAction'), PDFDict.withContext(bad.context))
  const beforeInvalid = (await versions((await doc('FOTO_PASAPORTE')).id)).length
  for (const [bytes, mime, name] of [
    [safePdf, 'application/pdf', 'foto.pdf'],
    [png, 'image/jpeg', 'foto.jpg'],
    [png, 'image/png', 'foto.exe.png'],
    [new Uint8Array(5242881), 'image/png', 'foto.png'],
    [await bad.save({ useObjectStreams: false }), 'application/pdf', 'foto.pdf'],
  ])
    assert.ok([413, 422].includes((await upload('FOTO_PASAPORTE', bytes, mime, name)).status))
  assert.equal(
    (await versions((await doc('FOTO_PASAPORTE')).id)).length,
    beforeInvalid,
    'invalid content creates no reservation',
  )
  const exact = pngAtSize(5242880)
  assert.equal(PNG.sync.read(exact).width, 1)
  assert.equal(
    (await upload('FOTO_PASAPORTE', exact, 'image/png', 'foto.png')).status,
    200,
    'valid exact 5MiB boundary',
  )
  assert.equal(
    (await upload('FOTO_PASAPORTE', new Uint8Array(), 'image/png', 'foto.png')).status,
    413,
    'empty file',
  )
  const largeForm = new FormData(),
    largeDoc = await doc('FOTO_PASAPORTE')
  largeForm.set('documento_id', largeDoc.id)
  largeForm.set('expected_updated_at', largeDoc.updated_at)
  largeForm.set(
    'archivo',
    new Blob([new Uint8Array(5242880 + 32768)], { type: 'image/png' }),
    'foto.png',
  )
  const encoded = new Request('http://fixture.invalid', { method: 'POST', body: largeForm }),
    raw = new Uint8Array(await encoded.arrayBuffer())
  const streamed = await fetch(fixture.config.url + '/functions/v1/expediente-cargar', {
    method: 'POST',
    headers: {
      apikey: fixture.config.key,
      Authorization: 'Bearer ' + tokens.D,
      'Content-Type': encoded.headers.get('Content-Type'),
    },
    body: new ReadableStream({
      start(controller) {
        for (let i = 0; i < raw.length; i += 65536) controller.enqueue(raw.subarray(i, i + 65536))
        controller.close()
      },
    }),
    duplex: 'half',
  })
  assert.equal(streamed.status, 413, 'Actual streamed bytes are bounded without Content-Length')
  // Real post-upload audit failure rolls back confirmation and compensates NEVER-confirmed bytes.
  const target = await doc('DOCUMENTO_IDENTIDAD'),
    priorPointer = target.ultimo_archivo_confirmado_id
  inspectDatabase(
    "create function private.h6_test_failure() returns trigger language plpgsql set search_path='' as $$begin raise exception using errcode='P0001',message='H6_SYNTHETIC_CONFIRM_FAILURE';end$$; revoke all on function private.h6_test_failure() from public,anon,authenticated; create trigger z_h6_test_failure before insert on public.auditoria for each row when(new.entidad='matricula_documento_archivo' and new.new_values->>'estado_tecnico'='CONFIRMADO') execute function private.h6_test_failure();",
  )
  try {
    assert.equal(
      (await upload('DOCUMENTO_IDENTIDAD', safePdf, 'application/pdf', 'documento.pdf')).status,
      503,
    )
  } finally {
    inspectDatabase(
      'drop trigger z_h6_test_failure on public.auditoria;drop function private.h6_test_failure();',
    )
  }
  assert.equal((await doc('DOCUMENTO_IDENTIDAD')).ultimo_archivo_confirmado_id, priorPointer)
  const failed = (await versions(target.id)).at(-1)
  assert.equal(failed.estado_tecnico, 'ABORTADO')
  assert.ok((await fixture.admin.storage.from('h6-expediente').download(failed.object_key)).error)
  mkdirSync('.cache/h6-results', { recursive: true })
  const metrics = []
  for (const code of [
    'SOLICITUD',
    'DECLARACION_JURADA',
    'CARTA_PODER',
    'FICHA_DATOS_PERSONALES',
    'FICHA_MATRICULA',
  ]) {
    const start = performance.now(),
      r = await invoke('generar', await input(code), 'O')
    const manifest = await r.json()
    assert.equal(
      r.status,
      200,
      'real fixed renderer ' +
        code +
        ' HTTP ' +
        r.status +
        ' ' +
        String(manifest.code ?? 'unknown'),
    )
    const d = await doc(code)
    assert.equal(d.estado, 'GENERADO')
    const dl = await download(d, manifest.archivo_id)
    assert.equal(dl.status, 200)
    const bytes = Buffer.from(await dl.arrayBuffer())
    assert.equal((await PDFDocument.load(bytes)).getPageCount() > 0, true)
    writeFileSync('.cache/h6-results/' + code + '.pdf', bytes)
    metrics.push({ code, ms: performance.now() - start, pdfBytes: bytes.length })
  }
  const crossFile = (await doc('DOCUMENTO_IDENTIDAD')).ultimo_archivo_confirmado_id
  assert.equal(
    (await download(await doc('FOTO_PASAPORTE'), crossFile, true)).status,
    403,
    'Confirmed bytes cannot cross document ownership',
  )
  // Explicit concurrent generations for the same version: at most one confirmed new version, no retry.
  const request = await input('SOLICITUD'),
    prior = (await versions(request.documento_id)).length,
    pair = await Promise.all([invoke('generar', request), invoke('generar', request)])
  assert.deepEqual(pair.map((r) => r.status).sort(), [200, 409])
  const afterPair = await versions(request.documento_id)
  assert.equal(afterPair.length, prior + 1)
  const current = await doc('SOLICITUD'),
    latest = current.ultimo_archivo_confirmado_id
  student = await rpc(O, 'guardar_alumno', {
    p: {
      ...initial,
      contactos: [],
      id: student.id,
      expected_updated_at: student.updated_at,
      domicilio: 'H6 CORREGIDO',
    },
  })
  assert.equal((await download(current, latest)).status, 409)
  assert.equal(
    (await download(current, latest, true)).status,
    200,
    'stale persistent file is explicit history, not erased',
  )
  // Same operation matrix in open and closed Cycles; closure freezes H5/H6 source transactionally.
  cycle = await rpc(D, 'cambiar_estado_ciclo', {
    id: cycle.id,
    expected_updated_at: cycle.updated_at,
    destino: 'EN_CURSO',
  })
  assert.equal(
    (await invoke('generar', await input('SOLICITUD'))).status,
    200,
    'Solicitud in EN_CURSO without a grade rule',
  )
  cycle = await rpc(D, 'cambiar_estado_ciclo', {
    id: cycle.id,
    expected_updated_at: cycle.updated_at,
    destino: 'CERRADO',
  })
  enrollment = await one('matricula', enrollment.id)
  const frozen = enrollment.alumno_snapshot_cierre
  assert.ok(frozen)
  assert.equal(frozen.alumno.domicilio, 'H6 CORREGIDO')
  for (const code of [
    'SOLICITUD',
    'DECLARACION_JURADA',
    'CARTA_PODER',
    'FICHA_DATOS_PERSONALES',
    'FICHA_MATRICULA',
  ])
    assert.equal(
      (await invoke('generar', await input(code), 'O')).status,
      200,
      'ACTIVO/CERRADO ' + code,
    )
  assert.equal(
    (await upload('FOTO_PASAPORTE', png, 'image/png', 'foto.png', 'O')).status,
    200,
    'SUBIDO in CERRADO',
  )
  // Retirement of each business state preserves its bytes/state and does not change Cycle config.
  const configBeforeRetire = checked(
    await D.from('ciclo_documento').select('*').eq('ciclo_id', cycle.id).order('id'),
    'config before retire',
  )
  for (const code of ['CERTIFICADO_PSICOFISICO', 'FOTO_PASAPORTE', 'CARTA_PODER']) {
    const d = await doc(code)
    assert.ok(d, 'seeded document ' + code)
    await rpc(O, 'retirar_documentos_opcionales', {
      p_ciclo_id: cycle.id,
      p_documentos: [{ id: d.id, expected_updated_at: d.updated_at }],
      p_motivo: 'H6 SINTÉTICO',
    })
    const retired = await doc(code)
    assert.equal(retired.activo, false)
    assert.equal(retired.estado, d.estado)
    assert.equal(retired.ultimo_archivo_confirmado_id, d.ultimo_archivo_confirmado_id)
    if (d.ultimo_archivo_confirmado_id)
      assert.equal((await download(retired, d.ultimo_archivo_confirmado_id, true)).status, 200)
  }
  assert.deepEqual(
    checked(
      await D.from('ciclo_documento').select('*').eq('ciclo_id', cycle.id).order('id'),
      'config after retire',
    ),
    configBeforeRetire,
  )
  const beforeClosed = (await versions((await doc('FICHA_MATRICULA')).id)).at(-1)
  student = await rpc(O, 'guardar_alumno', {
    p: {
      ...initial,
      contactos: [],
      id: student.id,
      expected_updated_at: student.updated_at,
      domicilio: 'H6 POSTERIOR AL CIERRE',
    },
  })
  assert.equal((await invoke('generar', await input('FICHA_MATRICULA'))).status, 200)
  const afterClosed = (await versions((await doc('FICHA_MATRICULA')).id)).at(-1)
  assert.equal(afterClosed.fuente_base_fingerprint, beforeClosed.fuente_base_fingerprint)
  assert.deepEqual((await one('matricula', enrollment.id)).alumno_snapshot_cierre, frozen)
  // H6 persistent Ficha does not depend on a temporary H5 object for the same enrollment.
  const temporary = await fetch(fixture.config.url + '/functions/v1/ficha-matricula', {
    method: 'POST',
    headers: {
      apikey: fixture.config.key,
      Authorization: 'Bearer ' + tokens.D,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      matricula_id: enrollment.id,
      expected_updated_at: enrollment.updated_at,
    }),
  })
  assert.equal(temporary.status, 200)
  const h5 = await temporary.json()
  assert.equal(Date.parse(h5.expires_at) - Date.parse(h5.generated_at), 86400000)
  checked(
    await fixture.admin.storage
      .from('fichas-matricula')
      .remove([enrollment.id + '/' + h5.artefacto_id + '.pdf']),
    'cleanup own synthetic H5 temporary',
  )
  assert.equal(
    (await download(await doc('FICHA_MATRICULA'), afterClosed.id)).status,
    200,
    'Persistent own H6 object survives temporary H5 cleanup',
  )
  // Operator cleanup is dry-run by default; synthetic clock fixture only in disposable CI.
  checked(
    await fixture.admin.storage
      .from('h6-expediente')
      .upload(failed.object_key, new Blob([safePdf], { type: 'application/pdf' })),
    'synthetic private orphan',
  )
  inspectDatabase(
    "alter table public.matricula_documento_archivo disable trigger b_history;update public.matricula_documento_archivo set iniciado_at=clock_timestamp()-interval '48 hours',confirmado_at=case when estado_tecnico='CONFIRMADO' then clock_timestamp()-interval '47 hours' else confirmado_at end where id in (:'failed_id'::uuid,:'confirmed_id'::uuid);alter table public.matricula_documento_archivo enable trigger b_history;",
    { failed_id: failed.id, confirmed_id: priorPointer },
  )
  const cleanup = (execute) => {
    const r = spawnSync(
      process.execPath,
      ['scripts/cleanup-expediente.mjs', ...(execute ? ['--execute'] : [])],
      { encoding: 'utf8', windowsHide: true },
    )
    assert.equal(r.status, 0, 'bounded operator cleanup')
    return JSON.parse(r.stdout.trim().split('\n').at(-1))
  }
  const dry = cleanup(false)
  assert.equal(dry.mode, 'DRY RUN')
  assert.ok(dry.candidates >= 1)
  assert.ok((await fixture.admin.storage.from('h6-expediente').download(failed.object_key)).data)
  cleanup(true)
  assert.ok((await fixture.admin.storage.from('h6-expediente').download(failed.object_key)).error)
  assert.equal(
    (await download(target, priorPointer)).status,
    200,
    'Confirmed file remains downloadable after 24h and cleanup',
  )
  // Private Storage is unavailable to every browser/JWT, including authorized academics.
  for (const actor of ['A', 'B', 'N', 'F', 'I']) {
    assert.equal(
      (await download(target, priorPointer, true, actor)).status,
      403,
      'Non-academic Edge download denied',
    )
    assert.equal(
      (await upload('FOTO_PASAPORTE', png, 'image/png', 'foto.png', actor)).status,
      403,
      'Non-academic Edge upload denied',
    )
  }
  const key = (await versions(target.id)).find((f) => f.estado_tecnico === 'CONFIRMADO').object_key
  assert.ok(
    (await fetch(fixture.config.url + '/storage/v1/object/public/h6-expediente/' + key)).status >=
      400,
    'No public URL serves private bytes',
  )
  for (const c of [D, O, clients.A, publicClient(fixture.config)]) {
    assert.ok((await c.storage.from('h6-expediente').download(key)).error)
    assert.ok((await c.storage.from('h6-expediente').createSignedUrl(key, 60)).error)
    assert.ok(
      (
        await c.storage
          .from('h6-expediente')
          .upload(key, new Blob([png]), { contentType: 'image/png' })
      ).error,
    )
    const list = await c.storage.from('h6-expediente').list(target.id)
    assert.ok(list.error || list.data.length === 0)
    assert.ok(
      (
        await c.rpc('abortar_reserva_expediente', {
          p_actor: fixture.entries.D.id,
          p_archivo_id: latest,
        })
      ).error,
    )
  }
  const historyBefore = await versions(target.id)
  enrollment = await rpc(D, 'anular_matricula', {
    id: enrollment.id,
    expected_updated_at: enrollment.updated_at,
    motivo: 'H6 SINTÉTICO',
  })
  assert.equal(
    (await upload('DOCUMENTO_IDENTIDAD', safePdf, 'application/pdf', 'documento.pdf')).status,
    409,
  )
  assert.equal((await download(target, priorPointer)).status, 409)
  assert.equal((await download(target, priorPointer, true, 'O')).status, 200)
  assert.deepEqual(
    await versions(target.id),
    historyBefore,
    'annulment preserves every file version',
  )
  console.log('H6 actual Edge: five formats, 5MiB/stream limits, CERRADO final source, three-state retirement, H5 independence and dry-run cleanup PASSED')
  // Distinct terminal Cycle contexts keep historical access for an ACTIVO enrollment.
  for (const destination of ['DESIERTO', 'ANULADO']) {
    let terminal = await rpc(D, 'guardar_ciclo', {
      p: {
        ...geo,
        carrera_id: course.id,
        capitania_id: cycle.capitania_id,
        fecha_inicio: '2049-01-01',
        fecha_fin: '2049-02-01',
      },
    })
    terminal = await rpc(D, 'guardar_ciclo_tarifas', {
      ciclo_id: terminal.id,
      expected_updated_at: terminal.updated_at,
      configuracion: [{ tarifa_id: tariff.id, importe: '100', obligatorio: 'true' }],
    })
    await rpc(O, 'guardar_documentos_ciclo', {
      p_ciclo_id: terminal.id,
      p_expected_updated_at: terminal.updated_at,
      p_expected_config: [],
      p_documentos: config,
    })
    const te = await rpc(O, 'registrar_matricula', {
      p: {
        alumno_id: student.id,
        expected_alumno_updated_at: student.updated_at,
        ciclo_id: terminal.id,
        expected_ciclo_updated_at: terminal.updated_at,
      },
    })
    const td = checked(
      await D.from('matricula_documento').select('*').eq('matricula_id', te.id),
      'terminal fixture docs',
    )
    documentIds.push(...td.map((d) => d.id))
    const request = (d) => ({
      documento_id: d.id,
      expected_updated_at: d.updated_at,
      datos_generacion:
        d.codigo === 'CARTA_PODER'
          ? {
              apoderado_nombre: 'APODERADO SINTÉTICO',
              apoderado_tipo_di_id: value('TIPO_DI', 'DNI'),
              apoderado_numero_di: '00000001',
            }
          : {},
    })
    const sol = td.find((d) => d.codigo === 'SOLICITUD'),
      created = await invoke('generar', request(sol))
    assert.equal(created.status, 200)
    const manifest = await created.json()
    const transition={id:terminal.id,expected_updated_at:terminal.updated_at,destino:destination,motivo:'H6 SINTÉTICO',...(destination==='DESIERTO'?{motivo_desierto_id:value('MOTIVO_CICLO_DESIERTO','OTRO')}:{})}
    if(destination==='ANULADO'){
      const protectedTransition=await D.rpc('cambiar_estado_ciclo',transition)
      assert.equal(protectedTransition.error?.code,'23514','H4 still forbids annulling a Cycle with enrollments')
      // Defense-in-depth state fixture only: unreachable through H4's normal command.
      // Do not relax financial/academic rules to manufacture this matrix case.
      inspectDatabase("begin;select set_config('request.jwt.claim.sub',:'actor',true);alter table public.ciclo disable trigger ciclo_enrollment_guard;update public.ciclo set estado_codigo='ANULADO',motivo='H6 DEFENSIVE FIXTURE ONLY' where id=:'cycle'::uuid;alter table public.ciclo enable trigger ciclo_enrollment_guard;commit;",{actor:fixture.entries.D.id,cycle:terminal.id})
    }else terminal=await rpc(D,'cambiar_estado_ciclo',transition)
    for(const d of td.filter(d=>d.origen==='GENERADO')){
      const currentDoc=await one('matricula_documento',d.id)
      assert.equal((await invoke('generar',request(currentDoc))).status,409,destination+' blocks '+d.codigo)
    }
    const photo = td.find((d) => d.codigo === 'FOTO_PASAPORTE'),
      f = new FormData()
    f.set('documento_id', photo.id)
    f.set('expected_updated_at', photo.updated_at)
    f.set('archivo', new Blob([png], { type: 'image/png' }), 'foto.png')
    assert.equal((await invoke('cargar', f)).status, 409)
    assert.equal((await download(sol, manifest.archivo_id)).status, 409)
    assert.equal(
      (await download(sol, manifest.archivo_id, true, 'O')).status,
      200,
      destination + ' authorized history',
    )
  }
  checked(
    await fixture.admin.from('app_user_roles').delete().eq('user_id', fixture.entries.O.id),
    'revoke H6 synthetic role',
  )
  assert.equal((await download(target, priorPointer, true, 'O')).status, 403)
  const audit = checked(
    await D.from('auditoria')
      .select('actor,new_values,old_values')
      .in('entidad', ['matricula_documento', 'matricula_documento_archivo'])
      .in('registro_id', [...documentIds, ...(await versions(target.id)).map((f) => f.id)]),
    'H6 audit',
  )
  assert.ok(
    audit.length > 0 &&
      audit.every(
        (a) =>
          a.actor &&
          !/MUÑOZ|APODERADO|object_key|sha256|numero_di|domicilio/.test(
            JSON.stringify([a.new_values, a.old_values]),
          ),
      ),
  )
  assertSecurityInventory(securityInventory())
  writeFileSync(
    '.cache/h6-results/metrics.json',
    JSON.stringify(
      {
        runtime: 'local Edge',
        samples: metrics,
        cpu: 'NOT MEASURED',
        memory: 'NOT MEASURED',
        hosted: 'NOT EXECUTED',
      },
      null,
      2,
    ),
  )
  console.log(
    'H6 real Auth/Edge/Storage: all 5 renderers, PDF/JPEG/PNG validation, private bytes, role/IDOR/tampering, actual audit-fault compensation, same-document race, stale/annulled history, revoke and PII-free audit PASSED. Hosted/CPU/memory not measured.',
  )
} catch (error) {
  console.error(
    'H6 Edge FAILED ' +
      (error instanceof assert.AssertionError || /^Falló /.test(error.message)
        ? error.message
        : 'sensitive detail omitted'),
  )
  console.error(
    error.stack?.split('\n').find((l) => l.includes('test-expediente.mjs:')) ?? error.name,
  )
  process.exitCode = 1
} finally {
  if (fixture) {
    if (documentIds.length) {
      const files = checked(
        await fixture.admin
          .from('matricula_documento_archivo')
          .select('object_key')
          .in('matricula_documento_id', documentIds),
        'synthetic H6 cleanup listing',
      )
      if (files.length)
        checked(
          await fixture.admin.storage.from('h6-expediente').remove(files.map((f) => f.object_key)),
          'synthetic disposable CI bytes cleanup',
        )
    }
    await fixture.cleanup()
  }
}
