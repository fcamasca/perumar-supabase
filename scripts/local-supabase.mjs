import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const network = 'perumar-h0-local'
const action = process.argv[2]
const allowed = ['start', 'status', 'stop', 'reset']

export function publishedPortsAreLocal(containers) {
  return containers.every(container => Object.values(container.NetworkSettings?.Ports ?? {})
    .flatMap(bindings => bindings ?? [])
    .every(binding => ['127.0.0.1', '::1'].includes(binding.HostIp)))
}

function run(file, args, timeout = 600_000) {
  const result = spawnSync(file, args, { cwd: root, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true })
  if (result.error || result.status !== 0) {
    // CLI output may contain administrative credentials; do not echo it.
    throw new Error(`Falló ${file === process.execPath ? 'Supabase CLI' : 'Docker'} (${result.status ?? 'no disponible'}). No se imprimió su salida para proteger credenciales.`)
  }
  return result.stdout
}

function main() {
try {
  if (!allowed.includes(action) || process.argv.length !== 3) throw new Error('Operación permitida: start, status, stop o reset. No se admiten flags o destinos adicionales.')
  const config = readFileSync(path.join(root, 'supabase/config.toml'), 'utf8')
  if (!/^project_id = "perumar-supabase"$/m.test(config)) throw new Error('Proyecto local no reconocido.')
  if (existsSync(path.join(root, 'supabase/.temp/project-ref'))) throw new Error('Se detectó un vínculo remoto. Operación rechazada.')
  const cli = path.join(root, 'node_modules/supabase/dist/supabase.js')
  if (action === 'start') {
    const probe = spawnSync('docker', ['network', 'inspect', network], { encoding: 'utf8', windowsHide: true })
    if (probe.status !== 0) run('docker', ['network', 'create', '--opt', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', network])
    const [info] = JSON.parse(run('docker', ['network', 'inspect', network]))
    if (info.Options?.['com.docker.network.bridge.host_binding_ipv4'] !== '127.0.0.1') throw new Error('La red local existente no restringe el bind a loopback.')
    console.log('Iniciando Supabase local. La primera descarga de imágenes puede tardar varios minutos.')
    run(process.execPath, [cli, 'start', '--network-id', network, '--yes'])
    const names = run('docker', ['ps', '--filter', 'name=perumar-supabase', '--format', '{{.Names}}'])
      .trim().split(/\r?\n/).filter(name => name.endsWith('_perumar-supabase'))
    if (!names.length) throw new Error('No se encontraron los contenedores del proyecto local.')
    const containers = JSON.parse(run('docker', ['inspect', ...names]))
    if (!publishedPortsAreLocal(containers)) {
      run(process.execPath, [cli, 'stop'])
      throw new Error('Docker publicó puertos fuera de loopback. El stack se detuvo. Se requiere decisión humana sobre el entorno; no se cambió Docker, WSL ni firewall.')
    }
  } else if (action === 'reset') {
    // Explicit local-only flag; no user-supplied database URL, link or project ref.
    run('docker', ['inspect', 'supabase_db_perumar-supabase'])
    run(process.execPath, [cli, 'db', 'reset', '--local', '--no-seed', '--yes'])
  } else if (action === 'stop') {
    run(process.execPath, [cli, 'stop'])
  } else {
    const info = JSON.parse(run(process.execPath, [cli, 'status', '--output', 'json']))
    const api = new URL(info.API_URL)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) throw new Error('La API no es local.')
    console.log(`API local: ${api.origin}. No se muestran claves ni credenciales.`)
  }
  console.log(`Supabase local: ${action} completado.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falló la operación local.')
  process.exitCode = 1
}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
