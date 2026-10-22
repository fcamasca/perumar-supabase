import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { localStatus } from './local-platform.mjs'

export const actors = {
  A: { roles: ['ADMIN'] }, B: { roles: ['ADMIN'] }, O: { roles: ['OPERADOR'] },
  M: { roles: ['ADMIN', 'OPERADOR'] }, N: { roles: [] }, F: { roles: [], absent: true },
  I: { roles: ['OPERADOR'], inactive: true },
}

export function publicClient(config) {
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
  })
}

export function checked(result, operation) {
  if (result.error) throw new Error(`Falló ${operation}; contenido sensible omitido.`)
  return result.data
}

export async function createFixtures({ password, tag = randomUUID() } = {}) {
  const config = localStatus()
  if (!config.administrativeKey) throw new Error('Credencial administrativa local no disponible.')
  const admin = createClient(config.url, config.administrativeKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const entries = {}
  const events = []
  const secret = password ?? randomBytes(30).toString('base64url')
  const record = (operation, actor, result = 'ok', change = {}) => {
    const event = { milestone: 'H1', run: tag, executor: process.env.CI ? 'CI' : 'local-maintainer', operation, actor, id: entries[actor]?.id, result, before: change.before, after: change.after }
    events.push(event)
    console.log(JSON.stringify(event))
  }
  async function cleanup() {
    const failures = []
    for (const [actor, entry] of Object.entries(entries)) {
      const { error } = await admin.auth.admin.deleteUser(entry.id)
      if (error) failures.push(actor)
      record('fixture-delete', actor, error ? 'failed' : 'ok')
    }
    checked(await admin.from('app_roles').update({ active: true }).in('code', ['ADMIN', 'OPERADOR']), 'restaurar roles')
    if (failures.length) throw new Error('No se confirmó toda la limpieza de fixtures; revisar IDs locales.')
  }
  try {
    for (const [actor, definition] of Object.entries(actors)) {
      const email = `h1-${actor.toLowerCase()}-${tag}@example.invalid`
      const { user } = checked(await admin.auth.admin.createUser({ email, password: secret, email_confirm: true, user_metadata: { h1_fixture: tag } }), 'crear identidad sintética')
      entries[actor] = { id: user.id, email, password: secret }
      if (!definition.absent) {
        checked(await admin.from('app_users').insert({ id: user.id, active: !definition.inactive }), 'preparar usuario')
        if (definition.roles.length) checked(await admin.from('app_user_roles').insert(definition.roles.map(role_code => ({ user_id: user.id, role_code }))), 'preparar asignaciones')
      }
      record('fixture-create', actor, 'ok', { before: 'absent', after: { active: !definition.inactive, roles: definition.roles, appUser: !definition.absent } })
    }
    return { config: { url: config.url, key: config.key }, admin, entries, events, record, cleanup }
  } catch {
    await cleanup()
    throw new Error('Preparación fallida; fixtures creados retirados, valores omitidos.')
  }
}

async function hiddenPassword() {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) throw new Error('Se requiere terminal interactiva para contraseña oculta.')
  process.stdout.write('Contraseña de ensayo elegida por la persona (entrada oculta): ')
  return new Promise((resolve, reject) => {
    let value = ''
    process.stdin.setRawMode(true)
    process.stdin.resume()
    const finish = (error) => {
      process.stdin.off('data', handle)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }
    const handle = chunk => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') return finish(new Error('Cancelado.'))
        if (char === '\r' || char === '\n') return finish()
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
        else value += char
      }
    }
    process.stdin.on('data', handle)
  })
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== 'human') throw new Error('Uso: fixtures:human; solo ensayo humano local.')
  const password = await hiddenPassword()
  if (password.length < 8) throw new Error('Entrada de ensayo demasiado corta; usar al menos ocho caracteres para este fixture.')
  const fixture = await createFixtures({ password, tag: randomUUID() })
  const cancel = () => { fixture.cleanup().then(() => process.exit(0)).catch(() => { console.error('Limpieza incompleta; revisar fixtures locales.'); process.exit(1) }) }
  process.once('SIGINT', cancel)
  process.once('SIGTERM', cancel)
  for (const [actor, entry] of Object.entries(fixture.entries)) console.log(`${actor}: ${entry.email}`)
  console.log('Credenciales conocidas solo por la persona. Mantener esta terminal abierta. Enter al terminar para limpiar identidades de esta sesión.')
  await new Promise(resolve => { process.stdin.resume(); process.stdin.once('data', resolve) })
  process.stdin.pause()
  process.removeListener('SIGINT', cancel)
  process.removeListener('SIGTERM', cancel)
  await fixture.cleanup()
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Ensayo de fixtures fallido; no se imprimieron credenciales.'); process.exitCode = 1 })
}
