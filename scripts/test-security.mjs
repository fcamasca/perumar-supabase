import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createFixtures, publicClient, checked } from './h1-fixtures.mjs'
import { assertSecurityInventory, securityInventory, inspectDatabase } from './local-platform.mjs'

let current = 'fixtures'
let fixture
const clients = {}
const tokens = {}
const tables = ['app_users', 'app_user_roles', 'app_roles']
const passed = []

async function scenario(id, work) {
  current = id
  await work()
  passed.push(id)
  console.log(`${id}: PASSED`)
}

async function main() {
  fixture = await createFixtures()
  const { config, admin, entries, record } = fixture
  async function request(table, actor, { method = 'GET', query = '', body, headers = {} } = {}) {
    const response = await fetch(`${config.url}/rest/v1/${table}${query}`, {
      method, signal: AbortSignal.timeout(10_000),
      headers: { apikey: config.key, ...(tokens[actor] ? { Authorization: `Bearer ${tokens[actor]}` } : {}), 'Content-Type': 'application/json', ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const text = await response.text()
    return { status: response.status, ok: response.ok, data: text ? JSON.parse(text) : null }
  }
  async function rows(table, actor, query = '') {
    const result = await request(table, actor, { query })
    assert.ok(result.ok && Array.isArray(result.data), 'Lectura ordinaria no válida.')
    return result.data
  }
  async function noRows(actor) {
    for (const table of tables) assert.equal((await rows(table, actor)).length, 0, 'Actor sin habilitación recibió filas.')
  }
  async function mutation(table, actor, method) {
    const identityField = table === 'app_users' ? 'id' : table === 'app_user_roles' ? 'user_id' : 'code'
    const identity = table === 'app_roles' ? 'ADMIN' : (entries[actor] ?? entries.O).id
    const body = table === 'app_users' ? { id: identity, active: false }
      : table === 'app_roles' ? { code: identity, active: false } : { user_id: identity, role_code: 'ADMIN' }
    return request(table, actor, { method, query: method === 'POST' ? '' : `?${identityField}=eq.${identity}`, body: method === 'DELETE' ? undefined : body })
  }
  async function snapshot() {
    const values = []
    for (const table of tables) values.push(checked(await admin.from(table).select('*'), 'observación administrativa').map(row => JSON.stringify(row)).sort())
    return JSON.stringify(values)
  }
  async function roleState(code, active) {
    const before = checked(await admin.from('app_roles').select('active').eq('code', code).single(), 'observar estado de rol')
    checked(await admin.from('app_roles').update({ active }).eq('code', code), 'preparar estado de rol')
    record('role-state', code, 'ok', { before: before.active, after: active })
  }

  await scenario('TEST-H1-002 inventory-and-constraints', async () => {
    assertSecurityInventory(securityInventory())
    assert.ok((await admin.from('app_users').insert({ id: randomUUID() })).error, 'FK Auth no aplicada.')
    assert.ok((await admin.from('app_user_roles').insert({ user_id: randomUUID(), role_code: 'ADMIN' })).error, 'FK asignación no aplicada.')
    assert.ok((await admin.from('app_user_roles').insert({ user_id: entries.O.id, role_code: 'OPERADOR' })).error, 'Duplicado aceptado.')
    assert.ok((await admin.from('app_roles').insert({ code: 'UNKNOWN' })).error, 'Rol no previsto aceptado.')
  })

  await scenario('TEST-H1-004 real-login-and-signup', async () => {
    for (const [actor, entry] of Object.entries(entries)) {
      clients[actor] = publicClient(config)
      const { session } = checked(await clients[actor].auth.signInWithPassword({ email: entry.email, password: entry.password }), 'login de actor')
      assert.ok(session?.access_token, 'Auth no entregó sesión.')
      tokens[actor] = session.access_token
    }
    for (const email of [entries.O.email, `missing-${randomUUID()}@example.invalid`]) {
      const invalid = await publicClient(config).auth.signInWithPassword({ email, password: randomBytes(32).toString('base64url') })
      assert.ok(invalid.error && !invalid.data.session, 'Credenciales inválidas aceptadas.')
    }
    const signup = await publicClient(config).auth.signUp({ email: `blocked-${randomUUID()}@example.invalid`, password: entries.O.password })
    assert.ok(signup.error && !signup.data.user && !signup.data.session, 'Signup público aceptado.')
    const anonymousIdentity = await publicClient(config).auth.signInAnonymously()
    assert.ok(anonymousIdentity.error && !anonymousIdentity.data.session, 'Identidad anónima no prevista aceptada.')
  })

  await scenario('TEST-H1-003 anonymous-and-tampered-token', async () => {
    const original = tokens.O.split('.')
    const payload = JSON.parse(Buffer.from(original[1], 'base64url').toString())
    tokens.tampered = `${original[0]}.${Buffer.from(JSON.stringify({ ...payload, sub: entries.A.id, role: 'service_role' })).toString('base64url')}.${original[2]}`
    tokens.invalid = 'not-a-valid-access-token'
    for (const actor of ['anonymous', 'tampered', 'invalid']) {
      for (const table of tables) {
        assert.ok(!(await request(table, actor)).ok, 'Lectura anónima/token inválido aceptada.')
        for (const method of ['POST', 'PATCH', 'DELETE']) assert.ok(!(await mutation(table, actor, method)).ok, 'Escritura anónima/token inválido aceptada.')
      }
    }
    delete tokens.tampered
    delete tokens.invalid
  })

  await scenario('TEST-H1-007 exact-actor-matrix', async () => {
    if (process.env.H1_PRIVILEGE_FAILURE === 'true') {
      checked(await admin.from('app_user_roles').insert({ user_id: entries.O.id, role_code: 'ADMIN' }), 'ensayo temporal de privilegio')
      record('controlled-extra-assignment', 'O', 'ok', { before: ['OPERADOR'], after: ['OPERADOR', 'ADMIN'] })
    }
    const allIds = Object.entries(entries).filter(([actor]) => actor !== 'F').map(([, entry]) => entry.id).sort()
    for (const actor of ['A', 'B', 'M']) {
      assert.deepEqual((await rows('app_users', actor)).map(row => row.id).sort(), allIds)
      assert.equal((await rows('app_user_roles', actor)).length, 6)
      assert.equal((await rows('app_roles', actor)).length, 2)
    }
    assert.deepEqual((await rows('app_users', 'O')).map(row => row.id), [entries.O.id], 'OPERADOR recibió directorio ampliado.')
    assert.deepEqual((await rows('app_user_roles', 'O')).map(row => row.role_code), ['OPERADOR'])
    assert.equal((await rows('app_roles', 'O')).length, 2)
    assert.equal((await rows('app_users', 'O', `?id=eq.${entries.A.id}`)).length, 0)
    assert.equal((await rows('app_user_roles', 'O', `?user_id=eq.${entries.A.id}`)).length, 0)
    const joined = await rows('app_users', 'O', '?select=id,app_user_roles(role_code)')
    assert.equal(joined.length, 1)
    assert.equal(joined[0].id, entries.O.id)
  })

  await scenario('TEST-H1-011 authenticated-without-access', async () => {
    for (const actor of ['N', 'F', 'I']) await noRows(actor)
  })

  await scenario('TEST-H1-009 client-metadata-cannot-authorize', async () => {
    checked(await clients.O.auth.updateUser({ data: { role: 'ADMIN', permissions: ['*'], user_id: entries.A.id } }), 'metadata editable de prueba')
    const forgedMetadata = checked(await clients.O.auth.refreshSession(), 'renovar JWT con metadata editable')
    tokens.O = forgedMetadata.session.access_token
    assert.equal(JSON.parse(Buffer.from(tokens.O.split('.')[1], 'base64url').toString()).user_metadata.role, 'ADMIN')
    assert.deepEqual((await rows('app_users', 'O')).map(row => row.id), [entries.O.id])
    assert.ok(!(await request('app_users', 'O', { method: 'POST', body: { id: entries.A.id, role: 'ADMIN', permissions: ['*'] } })).ok)
    checked(await clients.O.auth.updateUser({ data: { role: null, permissions: null, user_id: null } }), 'restaurar metadata')
    tokens.O = checked(await clients.O.auth.refreshSession(), 'renovar metadata restaurada').session.access_token
  })

  await scenario('TEST-H1-010 direct-writes-and-alternate-routes', async () => {
    const before = await snapshot()
    for (const actor of ['A', 'O']) for (const table of tables) for (const method of ['POST', 'PATCH', 'DELETE']) {
      const result = await mutation(table, actor, method)
      assert.ok(!result.ok && result.data?.code === '42501', 'Operación sin grant no fue denegada por permisos.')
    }
    assert.equal(await snapshot(), before, 'Escritura denegada dejó efectos.')
    for (const actor of ['A', 'O']) {
      assert.ok(!(await request('rpc/has_active_role', actor, { method: 'POST', body: { role_code: 'ADMIN' } })).ok)
      assert.ok(!(await request('rpc/has_active_role', actor, { method: 'POST', body: { role_code: 'ADMIN', user_id: entries.A.id }, headers: { 'Content-Profile': 'private' } })).ok)
      assert.ok(!(await request('app_users', actor, { headers: { 'Accept-Profile': 'private' } })).ok)
      const identityAdministration = await fetch(`${config.url}/auth/v1/admin/users`, { headers: { apikey: config.key, Authorization: `Bearer ${tokens[actor]}` } })
      assert.equal(identityAdministration.status, 403, 'Rol de aplicación accedió a administración Auth.')
    }
  })

  await scenario('TEST-H1-008 multi-role-union', async () => {
    try {
      await roleState('OPERADOR', false)
      assert.equal((await rows('app_users', 'M')).length, 6)
      await noRows('O')
      await roleState('OPERADOR', true)
      await roleState('ADMIN', false)
      assert.deepEqual((await rows('app_users', 'M')).map(row => row.id), [entries.M.id])
      assert.equal((await rows('app_roles', 'M')).length, 1)
    } finally { await roleState('ADMIN', true); await roleState('OPERADOR', true) }
  })

  await scenario('TEST-H1-012 same-JWT-revocation', async () => {
    assert.equal((await rows('app_users', 'O')).length, 1)
    checked(await admin.from('app_users').update({ active: false }).eq('id', entries.O.id), 'inactivar fixture')
    record('user-state', 'O', 'ok', { before: true, after: false })
    await noRows('O')
    checked(await admin.from('app_users').update({ active: true }).eq('id', entries.O.id), 'restaurar fixture')
    record('user-state', 'O', 'ok', { before: false, after: true })
    checked(await admin.from('app_user_roles').delete().eq('user_id', entries.O.id).eq('role_code', 'OPERADOR'), 'retirar asignación')
    record('assignment-state', 'O', 'ok', { before: ['OPERADOR'], after: [] })
    await noRows('O')
    checked(await admin.from('app_user_roles').insert({ user_id: entries.O.id, role_code: 'OPERADOR' }), 'restaurar asignación')
    record('assignment-state', 'O', 'ok', { before: [], after: ['OPERADOR'] })
    assert.equal((await rows('app_users', 'O')).length, 1)
  })

  await scenario('TEST-H1-013 helper-and-policy-isolation', async () => {
    assertSecurityInventory(securityInventory())
    const result = inspectDatabase(`begin; set local role authenticated;
      select private.has_active_role('ADMIN');
      select set_config('request.jwt.claim.sub', :'actor', true) is not null;
      select private.has_active_role('UNKNOWN');
      select private.has_active_role('ADMIN'' OR TRUE --'); rollback;`, { actor: entries.O.id })
    assert.deepEqual(result.split(/\r?\n/).filter(line => /^[tf]$/.test(line)), ['f', 't', 'f', 'f'])
  })

  await scenario('TEST-H1-005 real-restoration-and-renewal', async () => {
    const storage = new Map()
    const options = { auth: { storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, storageKey: `h1-test-${randomUUID()}`, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } }
    const first = createClient(config.url, config.key, options)
    checked(await first.auth.signInWithPassword({ email: entries.O.email, password: entries.O.password }), 'sesión persistida de prueba')
    const restored = createClient(config.url, config.key, options)
    const { user } = checked(await restored.auth.getUser(), 'confirmar restauración con Auth')
    assert.equal(user.id, entries.O.id)
    checked(await restored.auth.refreshSession(), 'renovación real')
    const { session } = checked(await restored.auth.getSession(), 'sesión renovada')
    tokens.restored = session.access_token
    assert.equal((await rows('app_users', 'restored')).length, 1)
    const copied = session.access_token
    const refreshToken = session.refresh_token
    checked(await restored.auth.signOut({ scope: 'local' }), 'cierre de sesión de prueba')
    assert.equal((await restored.auth.getSession()).data.session, null)
    assert.equal(storage.size, 0)
    tokens.copied = copied
    assert.equal((await rows('app_users', 'copied')).length, 1, 'JWT residual no se documentó correctamente.')
    assert.ok((await publicClient(config).auth.refreshSession({ refresh_token: refreshToken })).error, 'Refresh revocado aceptado.')
    assert.ok((await publicClient(config).auth.refreshSession({ refresh_token: randomBytes(20).toString('hex') })).error)
    passed.push('TEST-H1-006 logout-and-residual-JWT')
    console.log('TEST-H1-006 logout-and-residual-JWT: PASSED (vigencia residual observada, no revocación inmediata).')
  })

  await scenario('TEST-H1-015 public-errors-and-safe-input', async () => {
    const before = await snapshot()
    assert.equal((await rows('app_roles', 'O', `?code=eq.${encodeURIComponent("' OR TRUE --")}`)).length, 0)
    assert.ok(!(await request('app_user_roles', 'O', { method: 'POST', body: { user_id: entries.O.id, role_code: '<script>ADMIN</script>' } })).ok)
    assert.equal(await snapshot(), before)
  })

  await fixture.cleanup()
  fixture = null
  current = 'TEST-H1-016 cleanup'
  assert.equal(inspectDatabase('select count(*) from auth.users;'), '0', 'Restos de identidades locales inesperados.')
  console.log('TEST-H1-016 cleanup: PASSED; identidades retiradas y roles restaurados.')
  console.log(JSON.stringify({ technicalSecurity: 'PASSED', scenarios: passed.length + 1, humanTests: 'PENDING' }))
}

try { await main() }
catch (error) {
  console.error(`FAILED: ${current}. ${error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Revisar el caso; respuestas y credenciales omitidas.'}`)
  process.exitCode = 1
} finally {
  if (fixture) {
    try { await fixture.cleanup() } catch { console.error('Limpieza de fixtures incompleta; revisar IDs locales.'); process.exitCode = 1 }
  }
}
