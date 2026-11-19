import assert from 'node:assert/strict'
import { randomUUID, randomBytes, createHmac } from 'node:crypto'
import { spawnSync, spawn } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { assertLocalProject, runLocal } from './local-platform.mjs'
assertLocalProject()
const id = randomUUID().replaceAll('-', ''),
  database = 'h6_test_' + id,
  container = 'supabase_db_perumar-supabase',
  login = 'h6_api_' + id,
  rest = 'h6_rest_' + id
const password = randomBytes(24).toString('hex'),
  secret = randomBytes(32).toString('hex')
let created = false,
  roleCreated = false,
  restStarted = false
const docker = (args, input, timeout = 120000) => runLocal('docker', args, input, timeout)
const sql = (statement, db = database) => {
  const r = spawnSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', db, '-At', '-v', 'ON_ERROR_STOP=1'],
    {
      input: statement,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 30 * 1024 * 1024,
    },
  )
  if (r.status !== 0)
    throw Error(
      'Isolated H6 SQL: ' +
        r.stderr
          ?.split('\n')
          .filter((l) => /ERROR:|DETAIL:|CONTEXT:/.test(l))
          .slice(0, 3)
          .join(' '),
    )
  return r.stdout.trim()
}
const actorSql = (actor, text) =>
  `begin;select set_config('request.jwt.claim.sub','${actor}',true);${text};commit;`
try {
  docker(['exec', container, 'createdb', '-U', 'postgres', database])
  created = true
  const schema = docker([
    'exec',
    container,
    'pg_dump',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '--schema-only',
    '--schema=public',
    '--schema=private',
    '--schema=auth',
    '--schema=storage',
    '--no-owner',
    '--no-publications',
    '--no-subscriptions',
  ])
  sql(
    'drop schema public cascade;create schema extensions;create extension btree_gist with schema extensions;',
  )
  // Restore object ACLs; foreign-role default privileges cannot be changed by local postgres.
  sql(schema.replace(/^ALTER DEFAULT PRIVILEGES[\s\S]*?;/gm, ''))
  const refs = [
    'app_roles',
    'catalogo',
    'catalogo_valor',
    'departamento',
    'provincia',
    'distrito',
    'capitania',
  ]
  sql(
    docker([
      'exec',
      container,
      'pg_dump',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '--data-only',
      ...refs.flatMap((t) => ['--table', `public.${t}`]),
    ]),
  )
  for (const file of readdirSync('supabase/migrations')
    .filter((n) => /^20261118.*\.sql$/.test(n))
    .sort()) {
    const marker = file.includes('010000')
      ? "select to_regclass('public.tipo_documento') is not null"
      : file.includes('020000')
        ? "select to_regproc('public.guardar_documentos_ciclo') is not null"
        : "select to_regproc('public.preparar_archivo_expediente') is not null"
    if (sql(marker) !== 't') sql(readFileSync('supabase/migrations/' + file, 'utf8'))
  }
  // Exercise the same empty-reference state produced by CI schema-only cloning.
  // This TRUNCATE is exclusively in the random disposable DB, before fixture creation.
  sql('truncate public.tipo_documento cascade')
  console.log(
    'H6 additive model/commands: loaded into disposable schema/reference-only database (no human rows)',
  )
  const base = readFileSync('tests/sql/h4-payments.sql', 'utf8'),
    start = base.indexOf('do $$'),
    end = base.indexOf(' select v.id into medium')
  const setup = base.slice(start, end)
  const fixture = () =>
    JSON.parse(
      sql(`create temporary table h6_fixture_result(value jsonb);${setup}
 insert into h6_fixture_result values(jsonb_build_object('actor',actor,'coordinator',coordinator,'student',a.id,'cycle',c.id,'cycleVersion',c.updated_at,'enrollment',e.id,'version',e.updated_at));end $$;select value from h6_fixture_result;`)
        .split('\n')
        .find((l) => l.startsWith('{')),
    )
  const f = fixture()
  const snapshot = () =>
    JSON.parse(
      sql(
        `select coalesce(jsonb_agg(jsonb_build_object('id',id,'updated_at',updated_at) order by id),'[]') from public.ciclo_documento where ciclo_id='${f.cycle}'`,
      ),
    )
  if (sql('select count(*) from public.tipo_documento') === '0') {
    sql(actorSql(f.actor,"select public.guardar_tipo_documento(jsonb_build_object('codigo','SOLICITUD','nombre','SOLICITUD','origen','GENERADO'))"))
    const seed = readFileSync(
      'supabase/migrations/20261118010000_h6_document_model.sql',
      'utf8',
    ).match(/insert into public.tipo_documento[\s\S]*?;/)[0].replace(/\('SOLICITUD','[^']*','GENERADO'\),\s*/, '')
    sql(actorSql(f.actor, "select set_config('perumar.document_command','TYPE',true);" + seed))
  }
  const types = JSON.parse(sql('select json_object_agg(codigo,id) from public.tipo_documento'))
  const config = (items, expected = snapshot()) =>
    `select public.guardar_documentos_ciclo('${f.cycle}','${f.cycleVersion}','${JSON.stringify(expected)}','${JSON.stringify(items)}')`
  const items = [
    { tipo_documento_id: types.DOCUMENTO_IDENTIDAD, obligatorio: 'true', activo: 'true' },
    { tipo_documento_id: types.CARTA_PODER, obligatorio: 'false', activo: 'true' },
  ]
  sql(actorSql(f.actor, config(items)))
  const docs = () =>
    JSON.parse(
      sql(
        `select jsonb_agg(to_jsonb(d) order by codigo) from public.matricula_documento d where matricula_id='${f.enrollment}' and contexto_vigente`,
      ),
    )
  assert.equal(docs().length, 2)
  assert.ok(docs().every((d) => d.activo && d.estado === 'PENDIENTE'))
  const optional = () => docs().find((d) => !d.obligatorio)
  const retire = (d) =>
    `select public.retirar_documentos_opcionales('${f.cycle}','${JSON.stringify([{ id: d.id, expected_updated_at: d.updated_at }])}','SYNTHETIC')`
  sql(actorSql(f.coordinator, retire(optional())))
  assert.equal(optional().activo, false)
  sql(actorSql(f.actor, config(items)))
  assert.equal(
    optional().activo,
    false,
    'Unchanged config must preserve optional individual withdrawal',
  )
  sql(actorSql(f.actor, config([{ ...items[0] }, { ...items[1], obligatorio: 'true' }])))
  assert.ok(docs().every((d) => d.activo && d.obligatorio))
  sql(actorSql(f.actor, config(items)))
  sql(actorSql(f.coordinator, retire(optional())))
  sql(actorSql(f.actor, config([{ ...items[0] }, { ...items[1], activo: 'false' }])))
  sql(actorSql(f.actor, config(items)))
  assert.ok(optional().activo, 'Explicit config reactivation reapplies optional')
  const counts = JSON.parse(
    sql(
      `select row_to_json(s) from public.matricula_expediente_resumen s where matricula_id='${f.enrollment}'`,
    ),
  )
  assert.equal(counts.aplicables, 2)
  assert.equal(counts.pendientes, 2)
  sql(
    actorSql(
      f.actor,
      `select public.regularizar_expedientes_ciclo('${f.cycle}','${f.cycleVersion}','${JSON.stringify(snapshot())}')`,
    ),
  )
  assert.equal(docs().length, 2)

  // New registration applies both mandatory and optional configuration atomically.
  const other = fixture()
  const newEnrollment = JSON.parse(
    sql(
      actorSql(
        f.actor,
        `select to_jsonb(public.registrar_matricula(jsonb_build_object('alumno_id','${other.student}','expected_alumno_updated_at',(select updated_at from public.alumno where id='${other.student}'),'ciclo_id','${f.cycle}','expected_ciclo_updated_at','${f.cycleVersion}')))`,
      ),
    )
      .split('\n')
      .find((l) => l.startsWith('{')),
  )
  assert.equal(
    sql(
      `select count(*) from public.matricula_documento where matricula_id='${newEnrollment.id}' and activo and estado='PENDIENTE'`,
    ),
    '2',
  )
  // A confirmed metadata fixture tests preservation; it deliberately does NOT create Storage bytes.
  const generated = optional(),
    file = randomUUID(),
    key = randomUUID() + '/' + randomUUID()
  sql(
    actorSql(
      f.actor,
      `select set_config('perumar.document_command','RESERVE',true);
 insert into public.matricula_documento_archivo(id,matricula_documento_id,object_key,iniciado_por,version_esperada_documento) values('${file}','${generated.id}','${key}','${f.actor}','${generated.updated_at}');
 select set_config('perumar.document_command','CONFIRM',true);
 update public.matricula_documento_archivo set estado_tecnico='CONFIRMADO',confirmado_por='${f.actor}',confirmado_at=clock_timestamp(),mime='application/pdf',bytes=128,sha256=repeat('a',64) where id='${file}';
 update public.matricula_documento set estado='GENERADO',ultimo_archivo_confirmado_id='${file}' where id='${generated.id}'`,
    ),
  )
  const versionBefore = sql(
    `select row_to_json(x) from public.matricula_documento_archivo x where id='${file}'`,
  )
  sql(actorSql(f.actor, retire(optional())))
  sql(actorSql(f.actor, config([{ ...items[0] }, { ...items[1], obligatorio: 'true' }])))
  assert.equal(docs().find((d) => d.id === generated.id).estado, 'GENERADO')
  assert.equal(docs().find((d) => d.id === generated.id).ultimo_archivo_confirmado_id, file)
  assert.equal(
    sql(`select row_to_json(x) from public.matricula_documento_archivo x where id='${file}'`),
    versionBefore,
  )
  // Failure in synchronization rolls back both the newly saved config and all applications/audits.
  const expectedSnapshot = snapshot(),
    originalApps = sql(
      `select jsonb_agg(to_jsonb(d) order by id) from public.matricula_documento d where matricula_id in ('${f.enrollment}','${newEnrollment.id}')`,
    )
  const auditBefore = sql('select count(*) from public.auditoria')
  sql(`create function public.h6_test_failure() returns trigger language plpgsql as $$begin raise exception using errcode='P0001',message='H6_EXPECTED_FAILURE';end$$;
 create trigger z_test_failure after update on public.matricula_documento for each row execute function public.h6_test_failure();
 do $$begin perform set_config('request.jwt.claim.sub','${f.actor}',true);begin ${config([{ ...items[0] }, { ...items[1], activo: 'false' }])};raise exception 'failure did not fire';exception when raise_exception then if sqlerrm<>'H6_EXPECTED_FAILURE' then raise;end if;end;end$$;
 drop trigger z_test_failure on public.matricula_documento;drop function public.h6_test_failure();`)
  assert.deepEqual(snapshot(), expectedSnapshot)
  assert.equal(sql('select count(*) from public.auditoria'), auditBefore)
  assert.equal(
    sql(
      `select jsonb_agg(to_jsonb(d) order by id) from public.matricula_documento d where matricula_id in ('${f.enrollment}','${newEnrollment.id}')`,
    ),
    originalApps,
  )
  // Context transfer and RETURN create fresh pending applications, never revive old records.
  const moved = fixture(),
    origin = moved.cycle
  const transfer = (cycle) =>
    sql(
      actorSql(
        f.actor,
        `select public.editar_matricula(jsonb_build_object('id','${moved.enrollment}','expected_updated_at',(select updated_at from public.matricula where id='${moved.enrollment}'),'ciclo_id','${cycle}','expected_ciclo_updated_at',(select updated_at from public.ciclo where id='${cycle}')))`,
      ),
    )
  transfer(f.cycle)
  const first = sql(
    `select distinct contexto_id from public.matricula_documento where matricula_id='${moved.enrollment}' and contexto_vigente`,
  )
  transfer(origin)
  transfer(f.cycle)
  assert.notEqual(
    sql(
      `select distinct contexto_id from public.matricula_documento where matricula_id='${moved.enrollment}' and contexto_vigente`,
    ),
    first,
  )
  assert.equal(
    sql(
      `select count(*) from public.matricula_documento where matricula_id='${moved.enrollment}' and not contexto_vigente and not activo and causa_inactivacion='TRASLADO'`,
    ),
    '2',
  )
  assert.equal(
    sql(
      `select count(*) from public.matricula_documento where matricula_id='${moved.enrollment}' and contexto_vigente and activo and estado='PENDIENTE'`,
    ),
    '2',
  )
  // Confirmed history remains selectable under the coordinator JWT even after annulment.
  sql(
    actorSql(
      f.actor,
      `select public.anular_matricula('${moved.enrollment}',(select updated_at from public.matricula where id='${moved.enrollment}'),'SYNTHETIC')`,
    ),
  )
  const annulledSnapshot = sql(
    `select jsonb_agg(to_jsonb(d) order by id) from public.matricula_documento d where matricula_id='${moved.enrollment}'`,
  )
  sql(actorSql(f.actor, config(items)))
  assert.equal(
    sql(
      `select jsonb_agg(to_jsonb(d) order by id) from public.matricula_documento d where matricula_id='${moved.enrollment}'`,
    ),
    annulledSnapshot,
  )
  console.log(
    'H6 new-registration, confirmed-metadata preservation, atomic sync rollback, transfer/return contexts, annulled exclusion: PASSED DB (no Storage bytes claimed)',
  )
  // Actual concurrent transactions wait at the same Cycle barrier; no command is retried.
  const run = (statement) => {
    const child = spawn(
      'docker',
      [
        'exec',
        '-i',
        container,
        'psql',
        '-U',
        'postgres',
        '-d',
        database,
        '-At',
        '-v',
        'ON_ERROR_STOP=1',
        '-v',
        'VERBOSITY=sqlstate',
      ],
      { windowsHide: true },
    )
    let output = '',
      error = ''
    child.stdout.on('data', (v) => (output += v))
    child.stderr.on('data', (v) => (error += v))
    const done = new Promise((resolve, reject) => {
      child.on('error', reject)
      child.on('close', (code) =>
        resolve({
          ok: code === 0,
          output,
          code: error.match(/\b(40001|40P01|PT409|23514|42501)\b/)?.[1],
        }),
      )
    })
    child.stdin.end(statement)
    return done
  }
  async function race(left, right, exactlyOne = true) {
    const gate = spawn(
      'docker',
      [
        'exec',
        '-i',
        container,
        'psql',
        '-U',
        'postgres',
        '-d',
        database,
        '-At',
        '-v',
        'ON_ERROR_STOP=1',
      ],
      { windowsHide: true },
    )
    let locked = false
    gate.stdout.on('data', (v) => {
      if (String(v).includes('H6_BARRIER')) locked = true
    })
    gate.stderr.on('data', () => {})
    const end = new Promise((resolve, reject) => {
      gate.on('error', reject)
      gate.on('close', (code) => (code === 0 ? resolve() : reject(Error('H6 barrier failed'))))
    })
    gate.stdin.write(
      `begin;select id from public.ciclo where id='${f.cycle}' for update;select 'H6_BARRIER';\n`,
    )
    const deadline = Date.now() + 20000
    try {
      while (!locked && Date.now() < deadline) await new Promise((r) => setTimeout(r, 25))
      assert.ok(locked)
      const as = (body) =>
        `set application_name='H6_RACE';begin isolation level serializable;select set_config('request.jwt.claim.sub','${f.actor}',true);${body};commit;`
      const a = run(as(left)),
        b = run(as(right))
      let waiting = 0
      while (Date.now() < deadline) {
        waiting = Number(
          sql(
            "select count(*) from pg_stat_activity where datname=current_database() and application_name='H6_RACE' and wait_event_type='Lock'",
          ),
        )
        if (waiting === 2) break
        await new Promise((r) => setTimeout(r, 25))
      }
      assert.equal(waiting, 2)
      gate.stdin.end('commit;\n')
      await end
      const result = await Promise.all([a, b])
      if (exactlyOne) assert.equal(result.filter((r) => r.ok).length, 1)
      else assert.ok(result.some((r) => r.ok))
      assert.ok(
        result.filter((r) => !r.ok).every((r) => ['40001', 'PT409', '23514'].includes(r.code)),
      )
      return result
    } finally {
      if (!gate.stdin.writableEnded) gate.stdin.end('rollback;\n')
    }
  }
  const current = snapshot()
  await race(
    config([{ ...items[0] }, { ...items[1], activo: 'false' }], current),
    config([{ ...items[0] }, { ...items[1], obligatorio: 'true' }], current),
  )
  // Explicit fresh decision, not a retry in any product code.
  sql(actorSql(f.actor, config([{ ...items[0] }, { ...items[1], activo: 'false' }])))
  sql(actorSql(f.actor, config(items)))
  await race(config([{ ...items[0] }, { ...items[1], obligatorio: 'true' }]), retire(optional()))
  sql(actorSql(f.actor, config([{ ...items[0] }, { ...items[1], obligatorio: 'true' }])))
  assert.ok(docs().every((d) => d.obligatorio && d.activo))
  assert.equal(docs().find((d) => d.id === generated.id).estado, 'GENERADO')
  sql(actorSql(f.actor, config([{ ...items[0] }, { ...items[1], activo: 'false' }])))
  sql(actorSql(f.actor, config(items)))
  console.log(
    'H6 real concurrency: config/config and mandatory conversion/retirement, two SERIALIZABLE sessions plus lock barrier, one commit, no retry: PASSED',
  )

  const racingStudent = fixture()
  await race(
    config([{ ...items[0] }, { ...items[1], activo: 'false' }]),
    `select public.registrar_matricula(jsonb_build_object('alumno_id','${racingStudent.student}','expected_alumno_updated_at',(select updated_at from public.alumno where id='${racingStudent.student}'),'ciclo_id','${f.cycle}','expected_ciclo_updated_at','${f.cycleVersion}'))`,
    false,
  )
  sql(actorSql(f.actor, config(items)))
  await race(
    config([{ ...items[0] }, { ...items[1], obligatorio: 'true' }]),
    `select public.regularizar_expedientes_ciclo('${f.cycle}','${f.cycleVersion}','${JSON.stringify(snapshot())}')`,
    false,
  )
  sql(actorSql(f.actor, config(items)))
  assert.equal(
    sql(
      `select count(*) from public.matricula_documento d join public.matricula m on m.id=d.matricula_id where m.ciclo_id='${f.cycle}' and m.estado_codigo='ACTIVO' and d.contexto_vigente and d.obligatorio is distinct from (select obligatorio from public.ciclo_documento where id=d.ciclo_documento_id)`,
    ),
    '0',
  )
  console.log(
    'H6 real concurrent config/registration and config/regularization barriers: coherent final effective conditions, no hidden retry PASSED',
  )
  sql(readFileSync('tests/sql/h4-payments.sql', 'utf8'))
  sql(readFileSync('tests/sql/h4-regression.sql', 'utf8'))
  console.log(
    'H6 effective configuration, all-applied, optional retirement/reactivation, mandatory conversion, summary, regularization: PASSED DB',
  )
  sql(base.slice(0, end) + readFileSync('tests/sql/h6-adversarial.sql', 'utf8'))
  console.log(
    'H6 adversarial master/configuration, mixed/duplicate/51/stale retirement, independent Cycle, complete enrollment rollback and history DELETE guards: PASSED isolated DB',
  )
  sql(base.slice(0, end) + readFileSync('tests/sql/h5-source.sql', 'utf8'))
  console.log(
    'H4/H3 financial and academic rollback regression, H5 source/final snapshot/closure regression: PASSED isolated DB',
  )
  // Real PostgREST + independently signed fixture JWT, scoped to the disposable database.
  const image = docker([
    'inspect',
    '-f',
    '{{.Config.Image}}',
    'supabase_rest_perumar-supabase',
  ]).trim()
  const network = JSON.parse(docker(['inspect', container]))[0].NetworkSettings.Networks
  const networkName = Object.keys(network)[0]
  sql(
    `create role ${login} login password '${password}' noinherit;grant anon,authenticated,service_role to ${login};`,
    'postgres',
  )
  roleCreated = true
  docker([
    'run',
    '-d',
    '--name',
    rest,
    '--network',
    networkName,
    '-p',
    '127.0.0.1::3000',
    '-e',
    `PGRST_DB_URI=postgres://${login}:${password}@${container}:5432/${database}`,
    '-e',
    'PGRST_DB_SCHEMAS=public',
    '-e',
    'PGRST_DB_ANON_ROLE=anon',
    '-e',
    `PGRST_JWT_SECRET=${secret}`,
    image,
  ])
  restStarted = true
  const port = JSON.parse(docker(['inspect', rest]))[0].NetworkSettings.Ports['3000/tcp'][0]
    .HostPort
  const url = `http://127.0.0.1:${port}`
  const jwt = (actor, role = 'authenticated') => {
    const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      body = Buffer.from(
        JSON.stringify({ role, sub: actor, exp: Math.floor(Date.now() / 1000) + 300 }),
      ).toString('base64url')
    return (
      head +
      '.' +
      body +
      '.' +
      createHmac('sha256', secret)
        .update(head + '.' + body)
        .digest('base64url')
    )
  }
  let healthy = false
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(url + '/')).ok) {
        healthy = true
        break
      }
    } catch {
      /* disposable API may still be starting */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  assert.ok(healthy, 'Disposable PostgREST readiness')
  const api = async (path, actor, body, method = body ? 'POST' : 'GET') => {
    const res = await fetch(url + path, {
      method,
      headers: { Authorization: 'Bearer ' + jwt(actor), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: res.status, data: await res.json() }
  }
  assert.equal((await api('/matricula_documento?select=id', f.actor)).status, 200)
  const admin = randomUUID()
  sql(
    `insert into auth.users(id) values('${admin}');insert into public.app_users(id) values('${admin}');insert into public.app_user_roles(user_id,role_code) values('${admin}','ADMIN_SISTEMA');`,
  )
  assert.deepEqual((await api('/matricula_documento?select=id', admin)).data, [])
  assert.ok((await api('/matricula_documento?select=id', f.coordinator)).data.length > 0)
  assert.ok(
    (await api('/matricula_documento_archivo?select=id', f.coordinator)).data.some(
      (x) => x.id === file,
    ),
  )
  const customType=await api('/rpc/guardar_tipo_documento',f.coordinator,{p:{codigo:'H6_CUSTOM',nombre:'SYNTHETIC MASTER',origen:'SUBIDO'}})
  assert.equal(customType.status,200);assert.equal(customType.data.origen,'SUBIDO')
  const editedType=await api('/rpc/guardar_tipo_documento',f.coordinator,{p:{id:customType.data.id,expected_updated_at:customType.data.updated_at,nombre:'UPDATED SYNTHETIC MASTER',activo:'false'}})
  assert.equal(editedType.status,200);assert.equal(editedType.data.activo,false);assert.equal(editedType.data.nombre,'UPDATED SYNTHETIC MASTER')
  const typeAudit=sql('select count(*) from public.auditoria')
  const staleType=await api('/rpc/guardar_tipo_documento',f.coordinator,{p:{id:customType.data.id,expected_updated_at:customType.data.updated_at,nombre:'STALE'}})
  assert.equal(staleType.status,409);assert.equal(staleType.data.code,'PT409');assert.equal(sql('select count(*) from public.auditoria'),typeAudit)
  const invalid = await api('/rpc/guardar_tipo_documento', f.actor, {
    p: { codigo: 'FORGED', nombre: 'SYNTHETIC', origen: 'SUBIDO', actor: f.actor },
  })
  assert.equal(invalid.status, 400)
  const denied = await api('/rpc/guardar_tipo_documento', admin, {
    p: { codigo: 'DENIED', nombre: 'SYNTHETIC', origen: 'SUBIDO' },
  })
  assert.equal(denied.status, 403)
  sql(`update public.app_users set active=false where id='${admin}'`)
  assert.deepEqual((await api('/matricula_documento?select=id', admin)).data, [])

  assert.equal((await api('/matricula_documento', f.actor, { id: randomUUID() })).status, 403)
  for (const table of [
    'tipo_documento',
    'ciclo_documento',
    'matricula_documento',
    'matricula_documento_archivo',
  ]) {
    assert.equal((await api('/' + table, f.actor, { id: randomUUID() })).status, 403)
    assert.equal(
      (await api('/' + table + '?id=eq.' + randomUUID(), f.actor, { id: randomUUID() }, 'PATCH'))
        .status,
      403,
    )
    assert.equal(
      (await api('/' + table + '?id=eq.' + randomUUID(), f.actor, undefined, 'DELETE')).status,
      403,
    )
  }
  const before = sql(`select count(*) from public.auditoria`)
  const conflict = await api('/rpc/guardar_documentos_ciclo', f.actor, {
    p_ciclo_id: f.cycle,
    p_expected_updated_at: f.cycleVersion,
    p_expected_config: [],
    p_documentos: items,
  })
  assert.equal(conflict.status, 409)
  assert.equal(conflict.data.code, 'PT409')
  assert.equal(sql('select count(*) from public.auditoria'), before)
  assert.ok(docs().every((d) => d.activo))
  console.log(
    'H6 PostgREST real: PT409/HTTP409, no mutation/audit-success, JWT academic vs admin RLS, direct DML denied: PASSED',
  )

  // Service-only RPCs through real PostgREST. These probes validate metadata transactions;
  // byte upload/integrity is deliberately covered by the separate real Edge/Storage suite.
  const service = async (name, body) => {
    const r = await fetch(url + '/rpc/' + name, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + jwt(undefined, 'service_role'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    return { status: r.status, data: await r.json() }
  }
  const uploaded = () => docs().find((d) => d.codigo === 'DOCUMENTO_IDENTIDAD')
  const reserve = async (d, extra = {}) =>
    service('preparar_archivo_expediente', {
      p_actor: f.actor,
      p_documento_id: d.id,
      p_expected_updated_at: d.updated_at,
      ...extra,
    })
  const confirmation = (id) => ({
    p_actor: f.actor,
    p_archivo_id: id,
    p_mime: 'application/pdf',
    p_bytes: 128,
    p_sha256: 'b'.repeat(64),
  })
  const forbidden = await api('/rpc/preparar_archivo_expediente', f.actor, {
    p_actor: f.actor,
    p_documento_id: uploaded().id,
    p_expected_updated_at: uploaded().updated_at,
  })
  assert.equal(forbidden.status, 403)
  const reserved = await reserve(uploaded())
  assert.equal(reserved.status, 200)
  assert.match(reserved.data.object_key, /^[a-f0-9-]{36}\/[a-f0-9-]{36}$/)
  assert.equal(uploaded().estado, 'PENDIENTE')
  assert.equal((await reserve(uploaded())).status, 409)
  const confirmed = await service('confirmar_archivo_expediente', confirmation(reserved.data.id))
  assert.equal(confirmed.status, 200)
  assert.equal(uploaded().estado, 'CARGADO')
  assert.equal(
    sql(
      `select actor from public.auditoria where registro_id='${uploaded().id}' order by fecha desc limit 1`,
    ),
    f.actor,
  )
  const auditConfirmed = sql('select count(*) from public.auditoria')
  assert.equal(
    (await service('confirmar_archivo_expediente', confirmation(reserved.data.id))).status,
    200,
  )
  assert.equal(
    sql('select count(*) from public.auditoria'),
    auditConfirmed,
    'Exact explicit replay is read-only',
  )
  assert.equal(
    (
      await service('confirmar_archivo_expediente', {
        ...confirmation(reserved.data.id),
        p_bytes: 129,
      })
    ).status,
    409,
  )
  assert.equal(
    (
      await service('abortar_reserva_expediente', {
        p_actor: f.actor,
        p_archivo_id: reserved.data.id,
      })
    ).status,
    409,
  )
  const replacement = await reserve(uploaded())
  assert.equal(replacement.status, 200)
  assert.equal(
    (
      await service('abortar_reserva_expediente', {
        p_actor: f.actor,
        p_archivo_id: replacement.data.id,
      })
    ).status,
    200,
  )
  assert.equal(uploaded().ultimo_archivo_confirmado_id, reserved.data.id)
  const uncertain = await reserve(uploaded())
  assert.equal(uncertain.status, 200)
  const lostBody = await fetch(url + '/rpc/confirmar_archivo_expediente', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + jwt(undefined, 'service_role'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(confirmation(uncertain.data.id)),
  })
  assert.equal(lostBody.status, 200)
  await lostBody.body.cancel()
  assert.equal(
    sql(
      `select estado_tecnico from public.matricula_documento_archivo where id='${uncertain.data.id}'`,
    ),
    'CONFIRMADO',
  )
  const recoveredAudit = sql('select count(*) from public.auditoria')
  assert.equal(
    (await service('confirmar_archivo_expediente', confirmation(uncertain.data.id))).status,
    200,
  )
  assert.equal(
    sql('select count(*) from public.auditoria'),
    recoveredAudit,
    'Explicit recovery after lost body does not confirm twice',
  )
  const genDoc = optional(),
    dni = sql(
      "select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='TIPO_DI' and v.codigo='DNI'",
    )
  const generatedReservation = await reserve(genDoc, {
    p_plantilla_version: 'h6-1:CARTA_PODER',
    p_datos_generacion: {
      apoderado_nombre: 'APODERADO SINTETICO',
      apoderado_tipo_di_id: dni,
      apoderado_numero_di: '00000001',
    },
  })
  assert.equal(generatedReservation.status, 200)
  assert.ok(generatedReservation.data.source.datos_ficha)
  // Change source while generation is outside DB; reject confirmation with no state/pointer/success audit.
  sql(
    actorSql(
      f.actor,
      `update public.alumno set domicilio='H6 SYNTHETIC SOURCE CHANGE' where id='${f.student}'`,
    ),
  )
  const beforeSource = sql('select count(*) from public.auditoria'),
    pointer = optional().ultimo_archivo_confirmado_id
  const staleSource = await service(
    'confirmar_archivo_expediente',
    confirmation(generatedReservation.data.id),
  )
  assert.equal(staleSource.status, 409)
  assert.equal(staleSource.data.message, 'DOCUMENT_SOURCE_CHANGED')
  assert.equal(optional().ultimo_archivo_confirmado_id, pointer)
  assert.equal(sql('select count(*) from public.auditoria'), beforeSource)
  assert.equal(
    (
      await service('abortar_reserva_expediente', {
        p_actor: f.actor,
        p_archivo_id: generatedReservation.data.id,
      })
    ).status,
    200,
  )
  const reserve2 = await reserve(optional(), {
    p_plantilla_version: 'h6-1:CARTA_PODER',
    p_datos_generacion: {
      apoderado_nombre: 'APODERADO SINTETICO',
      apoderado_tipo_di_id: dni,
      apoderado_numero_di: '00000001',
    },
  })
  assert.equal(reserve2.status, 200)
  sql(actorSql(f.actor, retire(optional())))
  assert.equal(
    (await service('confirmar_archivo_expediente', confirmation(reserve2.data.id))).status,
    409,
    'Withdrawal during I/O prevents confirmation',
  )
  assert.equal(
    (
      await service('abortar_reserva_expediente', {
        p_actor: f.actor,
        p_archivo_id: reserve2.data.id,
      })
    ).status,
    200,
  )

  // Actual two-session retirement vs confirmation, not just sequential phase simulation.
  sql(actorSql(f.actor, config([{ ...items[0] }, { ...items[1], activo: 'false' }])))
  sql(actorSql(f.actor, config(items)))
  const raceReservation = await reserve(optional(), {
    p_plantilla_version: 'h6-1:CARTA_PODER',
    p_datos_generacion: {
      apoderado_nombre: 'APODERADO SINTETICO',
      apoderado_tipo_di_id: dni,
      apoderado_numero_di: '00000001',
    },
  })
  assert.equal(raceReservation.status, 200)
  const confirmSql = (id) =>
    `select public.confirmar_archivo_expediente('${f.actor}','${id}','application/pdf',128,repeat('b',64))`
  await race(retire(optional()), confirmSql(raceReservation.data.id))
  if (
    sql(
      `select estado_tecnico from public.matricula_documento_archivo where id='${raceReservation.data.id}'`,
    ) === 'PREPARADO'
  )
    await service('abortar_reserva_expediente', {
      p_actor: f.actor,
      p_archivo_id: raceReservation.data.id,
    })
  sql(actorSql(f.actor, config([{ ...items[0] }, { ...items[1], activo: 'false' }])))
  sql(actorSql(f.actor, config(items)))

  const movingDoc = JSON.parse(
      sql(
        `select to_jsonb(d) from public.matricula_documento d where matricula_id='${newEnrollment.id}' and contexto_vigente and codigo='DOCUMENTO_IDENTIDAD'`,
      ),
    ),
    movingReservation = await reserve(movingDoc)
  assert.equal(movingReservation.status, 200)
  const transferSql = `select public.editar_matricula(jsonb_build_object('id','${newEnrollment.id}','expected_updated_at',(select updated_at from public.matricula where id='${newEnrollment.id}'),'ciclo_id','${racingStudent.cycle}','expected_ciclo_updated_at',(select updated_at from public.ciclo where id='${racingStudent.cycle}')))`
  await race(transferSql, confirmSql(movingReservation.data.id), false)
  if (sql(`select ciclo_id from public.matricula where id='${newEnrollment.id}'`) === f.cycle)
    sql(actorSql(f.actor, transferSql)) // explicit fixture decision, not product retry
  assert.equal(
    sql(
      `select not contexto_vigente and not activo from public.matricula_documento where id='${movingDoc.id}'`,
    ),
    't',
  )
  if (
    sql(
      `select estado_tecnico from public.matricula_documento_archivo where id='${movingReservation.data.id}'`,
    ) === 'PREPARADO'
  )
    assert.equal(
      (
        await service('abortar_reserva_expediente', {
          p_actor: f.actor,
          p_archivo_id: movingReservation.data.id,
        })
      ).status,
      200,
    )
  // Revoke actor AFTER the RPC's first authorization and while it waits on the Cycle lock.
  const revokeReservation = await reserve(uploaded())
  assert.equal(revokeReservation.status, 200)
  const revokeGate = spawn(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      database,
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { windowsHide: true },
  )
  let revokeLocked = false
  revokeGate.stdout.on('data', (v) => {
    if (String(v).includes('H6_REVOKE_BARRIER')) revokeLocked = true
  })
  revokeGate.stderr.on('data', () => {})
  const revokeEnd = new Promise((resolve, reject) => {
    revokeGate.on('error', reject)
    revokeGate.on('close', (code) =>
      code === 0 ? resolve() : reject(Error('Revoke barrier failed')),
    )
  })
  revokeGate.stdin.write(
    `begin;select id from public.ciclo where id='${f.cycle}' for update;select 'H6_REVOKE_BARRIER';\n`,
  )
  try {
    const deadline = Date.now() + 20000
    while (!revokeLocked && Date.now() < deadline) await new Promise((r) => setTimeout(r, 25))
    assert.ok(revokeLocked)
    const before = sql('select count(*) from public.auditoria'),
      pending = run(`set application_name='H6_REVOKE';${confirmSql(revokeReservation.data.id)};`)
    let waiting = false
    while (Date.now() < deadline) {
      if (
        sql(
          "select count(*) from pg_stat_activity where datname=current_database() and application_name='H6_REVOKE' and wait_event_type='Lock'",
        ) === '1'
      ) {
        waiting = true
        break
      }
      await new Promise((r) => setTimeout(r, 25))
    }
    assert.ok(waiting)
    sql(`update public.app_users set active=false where id='${f.actor}'`)
    revokeGate.stdin.end('commit;\n')
    await revokeEnd
    const result = await pending
    assert.equal(result.ok, false)
    assert.equal(result.code, '42501')
    assert.equal(sql('select count(*) from public.auditoria'), before)
  } finally {
    if (!revokeGate.stdin.writableEnded) revokeGate.stdin.end('rollback;\n')
    sql(`update public.app_users set active=true where id='${f.actor}'`)
  }
  assert.equal(
    (
      await service('abortar_reserva_expediente', {
        p_actor: f.actor,
        p_archivo_id: revokeReservation.data.id,
      })
    ).status,
    200,
  )
  console.log(
    'H6 real transfer/confirmation and actor revocation WHILE RPC waits on Cycle: role rechecked, no partial confirmation or successful audit PASSED',
  )
  // Closing competes with confirmation under the same Cycle->Student->Enrollment protocol.
  sql(
    actorSql(
      f.actor,
      `select public.cambiar_estado_ciclo('${f.cycle}','${f.cycleVersion}','EN_CURSO')`,
    ),
  )
  f.cycleVersion = sql(`select updated_at from public.ciclo where id='${f.cycle}'`)
  const closeReservation = await reserve(optional(), {
    p_plantilla_version: 'h6-1:CARTA_PODER',
    p_datos_generacion: {
      apoderado_nombre: 'APODERADO SINTETICO',
      apoderado_tipo_di_id: dni,
      apoderado_numero_di: '00000001',
    },
  })
  assert.equal(closeReservation.status, 200)
  await race(
    `select public.cambiar_estado_ciclo('${f.cycle}','${f.cycleVersion}','CERRADO')`,
    confirmSql(closeReservation.data.id),
    false,
  )
  if (sql(`select estado_codigo from public.ciclo where id='${f.cycle}'`) === 'EN_CURSO')
    sql(
      actorSql(
        f.actor,
        `select public.cambiar_estado_ciclo('${f.cycle}',(select updated_at from public.ciclo where id='${f.cycle}'),'CERRADO')`,
      ),
    ) // explicit new fixture decision after conflict
  if (
    sql(
      `select estado_tecnico from public.matricula_documento_archivo where id='${closeReservation.data.id}'`,
    ) === 'CONFIRMADO'
  ) {
    assert.equal(
      (
        await service('registrar_descarga_expediente', {
          p_actor: f.actor,
          p_documento_id: optional().id,
          p_archivo_id: closeReservation.data.id,
          p_historico: false,
          p_template_version: 'h6-1:CARTA_PODER',
        })
      ).status,
      409,
      'Open-source generation cannot appear current after closing',
    )
  } else
    assert.equal(
      (
        await service('abortar_reserva_expediente', {
          p_actor: f.actor,
          p_archivo_id: closeReservation.data.id,
        })
      ).status,
      200,
    )
  console.log(
    'H6 actual retirement/confirmation and closure/confirmation barriers: atomic winner or explicit history/conflict, no deadlock/retry PASSED',
  )
  // Authorized historical access persists after an annulment, but never a new mutation.
  sql(
    actorSql(
      f.actor,
      `select public.anular_matricula('${f.enrollment}',(select updated_at from public.matricula where id='${f.enrollment}'),'H6 SYNTHETIC')`,
    ),
  )
  assert.equal((await reserve(uploaded())).status, 409)
  const dl = {
    p_actor: f.coordinator,
    p_documento_id: uploaded().id,
    p_archivo_id: reserved.data.id,
    p_historico: false,
  }
  assert.equal((await service('registrar_descarga_expediente', dl)).status, 409)
  assert.equal(
    (await service('registrar_descarga_expediente', { ...dl, p_historico: true })).status,
    200,
  )
  sql(`update public.app_users set active=false where id='${f.coordinator}'`)
  assert.equal(
    (await service('registrar_descarga_expediente', { ...dl, p_historico: true })).status,
    403,
  )
  assert.equal(
    sql(
      "select count(*) from public.auditoria where entidad in ('matricula_documento','matricula_documento_archivo') and (new_values::text ~ 'APODERADO|object_key|sha256|domicilio|numero_di')",
    ),
    '0',
  )
  console.log(
    'H6 real PostgREST service contracts: reserve/confirm/replay/abort, immutable confirmed, source drift, concurrent-phase withdrawal, annulled history and current role: PASSED (metadata; byte delivery separately tested)',
  )

  console.log('H6 FIRST BLOCK probes completed (fixture-only DB/API, no Storage writes).')
} finally {
  if (restStarted) docker(['rm', '-f', rest])
  if (created) docker(['exec', container, 'dropdb', '-U', 'postgres', '--force', database])
  if (roleCreated) sql(`drop role ${login};`, 'postgres')
}
