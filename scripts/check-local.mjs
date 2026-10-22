import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { validateEnv } from '../src/lib/env.ts'
import { assertSecurityInventory, securityInventory } from './local-platform.mjs'

function run(file, args) {
  const result = spawnSync(file, args, { encoding: 'utf8', windowsHide: true, timeout: 60_000 })
  if (result.status !== 0 || result.error) throw new Error('Comprobación local fallida; salida omitida para proteger credenciales.')
  return result.stdout
}

try {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== 'env')) throw new Error('Solo se admite la opción env.')
  run(process.execPath, ['scripts/local-supabase.mjs', 'status'])
  const status = JSON.parse(run(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '--output', 'json']))
  const config = validateEnv({ VITE_SUPABASE_URL: status.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY })
  if (process.argv[2] === 'env') {
    writeFileSync('.env.local', `VITE_SUPABASE_URL=${config.url}\nVITE_SUPABASE_PUBLISHABLE_KEY=${config.key}\n`, { flag: 'wx', mode: 0o600 })
    console.log('.env.local creado con configuración pública local; no se muestran valores.')
  } else {
    const client = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
    })
    const { data, error } = await client.getOpenApiSpec()
    if (error || !data?.paths || Object.keys(data.paths).some(route => route !== '/')) throw new Error('Data API no está disponible o expone rutas de aplicación inesperadas.')
    assertSecurityInventory(securityInventory())
    console.log('Integración local PASÓ: Data API pública sin rutas protegidas y inventario H2 exacto con grants/RLS/helpers/RPC.')
  }
} catch (error) {
  // Never forward SDK/CLI errors or local configuration content.
  console.error(error?.code === 'EEXIST' ? '.env.local ya existe; no se sobrescribe.' : 'Comprobación local fallida. Revisa stack, configuración pública y inventario aprobado; valores omitidos.')
  process.exitCode = 1
}
