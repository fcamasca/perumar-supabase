import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const canary = 'sb_secret_H0_PRIVILEGED_CANARY_DO_NOT_USE'
const out = '.cache/rejected-build'
try {
  if (existsSync(out)) throw new Error('El directorio de ensayo ya existe; revisar antes de repetir.')
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', out], {
    encoding: 'utf8', windowsHide: true,
    env: { ...process.env, VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: canary },
  })
  if (result.error || result.status === 0 || existsSync(out)
    || !result.stderr.includes('VITE_SUPABASE_PUBLISHABLE_KEY') || (result.stdout + result.stderr).includes(canary)) {
    throw new Error('El build no rechazó de forma segura la configuración privilegiada.')
  }
  function scan(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name)
      if (item.isDirectory()) scan(file)
      else if (readFileSync(file, 'utf8').includes(canary)) throw new Error('Canario presente en artefactos.')
    }
  }
  if (!existsSync('dist')) throw new Error('Ejecutar primero el build válido.')
  scan('dist')
  console.log('Build seguro PASÓ: clave privilegiada rechazada antes de generar artefactos, sin canario en salida ni bundle válido.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
