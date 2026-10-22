import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { createFixtures, publicClient, checked } from './h1-fixtures.mjs'
import { assertLocalProject, inspectDatabase, runLocal } from './local-platform.mjs'

const configPath = 'supabase/config.toml'
const original = readFileSync(configPath, 'utf8')
let fixture
let changed = false
let failure = false

function lifecycle(action) { runLocal(process.execPath, ['scripts/local-supabase.mjs', action], undefined, 600_000) }

try {
  assertLocalProject()
  assert.equal(inspectDatabase('select count(*) from auth.users;'), '0', 'El ensayo requiere ausencia de fixtures previos.')
  assert.ok(/^jwt_expiry = 3600$/m.test(original), 'Perfil de expiración original inesperado.')
  lifecycle('stop')
  writeFileSync(configPath, original.replace(/^jwt_expiry = 3600$/m, 'jwt_expiry = 60'))
  changed = true
  lifecycle('start')
  fixture = await createFixtures()
  const client = publicClient(fixture.config)
  checked(await client.auth.signInWithPassword({ email: fixture.entries.O.email, password: fixture.entries.O.password }), 'login de expiración')
  const { session } = checked(await client.auth.refreshSession(), 'renovación con perfil corto')
  const payload = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString())
  assert.equal(payload.exp - payload.iat, 60, 'Auth no emitió un JWT de 60 segundos.')
  const fetchToken = () => fetch(`${fixture.config.url}/rest/v1/app_users`, { signal: AbortSignal.timeout(5000), headers: { apikey: fixture.config.key, Authorization: `Bearer ${session.access_token}` } })
  assert.equal((await fetchToken()).status, 200)
  checked(await client.auth.signOut({ scope: 'local' }), 'logout de expiración')
  assert.equal((await fetchToken()).status, 200, 'No se observó JWT residual anterior a expiración.')
  const deadline = (payload.exp + 35) * 1000
  console.log('TEST-H1-005/006: JWT real de 60s, renovación y residual tras logout verificados. Esperando exp + 35s de tolerancia técnica.')
  while (Date.now() < deadline) await delay(Math.min(25_000, deadline - Date.now()))
  const expired = await fetchToken()
  assert.ok(expired.status === 401 || expired.status === 403, 'JWT realmente expirado fue aceptado.')
  console.log('TEST-H1-005/006 real-expiry: PASSED; token emitido por Auth rechazado después de exp y tolerancia, sin firma fabricada.')
} catch {
  console.error('FAILED: TEST-H1-005/006 real-expiry. Diagnóstico sensible omitido; se restaura perfil local.')
  failure = true
} finally {
  try { if (fixture) await fixture.cleanup() } catch { failure = true; console.error('Limpieza de expiración incompleta.') }
  if (changed) {
    try {
      lifecycle('stop')
      writeFileSync(configPath, original)
      lifecycle('start')
      console.log('Perfil local restaurado a jwt_expiry=3600; stack protegido disponible.')
    } catch {
      writeFileSync(configPath, original)
      failure = true
      console.error('Configuración restaurada; no se confirmó recuperación del stack. Revisar antes de continuar.')
    }
  }
}
if (failure) process.exitCode = 1
