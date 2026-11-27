import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Offline, synthetic builds only. Never loads project credentials into the child environment.
const root = '.cache/build-safety'
mkdirSync(root, { recursive: true })
const directory = mkdtempSync(path.join(root, 'run-'))
const base = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('VITE_')))
const ref = 'abcdefghijklmnopqrst'
const canary = 'sb_secret_HOSTED_PRIVILEGED_CANARY_DO_NOT_USE'
const profiles = {
  local: { VITE_DEPLOYMENT_ENV: 'local', VITE_SUPABASE_PROJECT_REF: '', VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_local' },
  hosted: { VITE_DEPLOYMENT_ENV: 'hosted', VITE_SUPABASE_PROJECT_REF: ref, VITE_SUPABASE_URL: `https://${ref}.supabase.co`, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_hosted' },
}
function build(profile, output) {
  return spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', output], {
    encoding: 'utf8', windowsHide: true, timeout: 120_000, env: { ...base, ...profile },
  })
}
function scan(dir, inspect) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) scan(file, inspect)
    else inspect(file, readFileSync(file, 'utf8'))
  }
}
try {
  for (const [name, profile] of Object.entries(profiles)) {
    const output = path.join(directory, name)
    const result = build(profile, output)
    assert.ok(!result.error && result.status === 0, `Build sintético ${name} falló; salida omitida.`)
    let javascript = ''
    scan(output, (file, content) => {
      assert.ok(!content.includes(canary), 'Canario en artefactos.')
      if (file.endsWith('.js')) javascript += content
    })
    assert.ok(javascript.includes(profile.VITE_SUPABASE_URL) && javascript.includes(profile.VITE_SUPABASE_PUBLISHABLE_KEY), 'Configuración sintética no incorporada.')
    const other = profiles[name === 'local' ? 'hosted' : 'local']
    assert.ok(!javascript.includes(other.VITE_SUPABASE_PUBLISHABLE_KEY), 'Configuración cruzada en bundle.')
    const headers = readFileSync(path.join(output, '_headers'), 'utf8')
    assert.ok(headers.includes(`connect-src 'self' ${profile.VITE_SUPABASE_URL};`), 'CSP no coincide con destino validado.')
    assert.ok(!headers.includes('perumar-supabase.invalid') && !headers.includes('*.supabase.co'), 'CSP sin resolver o demasiado amplia.')
    assert.ok(headers.includes("script-src 'self';") && headers.includes("frame-src 'self' blob:;"), 'CSP incompatible o scripts inline habilitados.')
    assert.ok(existsSync(path.join(output, 'index.html')) && !existsSync(path.join(output, '404.html')), 'Fallback SPA de Pages alterado.')
    for (const [kind, overrides, expected] of [
      ['secret', { VITE_SUPABASE_PUBLISHABLE_KEY: canary }, 'VITE_SUPABASE_PUBLISHABLE_KEY'],
      ['role', { VITE_SUPABASE_PUBLISHABLE_KEY: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({role:'service_role', ref})).toString('base64url')}.signature` }, 'VITE_SUPABASE_PUBLISHABLE_KEY'],
      ['crossed', { VITE_SUPABASE_URL: other.VITE_SUPABASE_URL }, 'VITE_SUPABASE_URL'],
      ['leak', { VITE_SERVICE_ROLE_KEY: canary }, 'privilegiadas'],
    ]) {
      const rejected = path.join(directory, `rejected-${name}-${kind}`)
      const invalid = build({ ...profile, ...overrides }, rejected)
      assert.ok(!invalid.error && invalid.status !== 0 && !existsSync(rejected), 'Build inválido no rechazado antes de escribir artefactos.')
      assert.ok(invalid.stderr.includes(expected) && !(invalid.stdout + invalid.stderr).includes(canary), 'Error inseguro o inesperado.')
    }
    console.log(`Build ${name} y rechazo de secretos/destinos cruzados: PASÓ.`)
  }
  console.log(`Artefactos exclusivamente sintéticos: ${directory}`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
