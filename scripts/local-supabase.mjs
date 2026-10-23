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

const approvedAddresses = ['0.0.0.0-126.255.255.255', '128.0.0.0-255.255.255.255', '::2-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff']
const sameSet = (actual, expected) => Array.isArray(actual) && actual.length === expected.length && expected.every(value => actual.includes(value))

export function approvedFirewallState(state) {
  return state?.name === 'PERUMAR-H0-Block-NonLoopback' && state.enabled === 'True'
    && state.direction === 'Inbound' && state.action === 'Block' && state.profile === 'Any'
    && state.edge === 'Block' && state.status === 'OK' && state.protocol === 'TCP'
    && sameSet(state.localPorts, ['54320-54324']) && sameSet(state.remotePorts, ['Any'])
    && sameSet(state.localAddresses, approvedAddresses) && sameSet(state.remoteAddresses, ['Any'])
    && state.program === 'Any' && !state.package && state.service === 'Any'
    && sameSet(state.interfaces, ['Any']) && state.interfaceType === 'Any'
    && state.authentication === 'NotRequired' && state.encryption === 'NotRequired'
    && state.overrideBlock === 'False' && state.localUser === 'Any' && state.remoteUser === 'Any' && state.remoteMachine === 'Any'
    && sameSet(state.enabledProfiles, ['Domain', 'Private', 'Public'])
}

export function firewallCoversPublishedPorts(containers) {
  const bindings = containers.flatMap(container => Object.entries(container.NetworkSettings?.Ports ?? {})
    .flatMap(([port, values]) => (values ?? []).map(value => ({ ...value, protocol: port.split('/')[1] }))))
  return bindings.length > 0 && bindings.every(binding => ['127.0.0.1', '::1'].includes(binding.HostIp)
    || (['0.0.0.0', '::'].includes(binding.HostIp) && binding.protocol === 'tcp'
      && /^\d+$/.test(binding.HostPort) && Number(binding.HostPort) >= 54320 && Number(binding.HostPort) <= 54324))
}

function readFirewallState() {
  if (process.platform !== 'win32') return null
  // Read the effective policy. Never create, enable or edit a firewall rule here.
  const command = `$ErrorActionPreference='Stop'
$r=@(Get-NetFirewallRule -PolicyStore ActiveStore -Name 'PERUMAR-H0-Block-NonLoopback')
if($r.Count -ne 1){throw 'Ambiguous rule'}
$r=$r[0]; $p=$r|Get-NetFirewallPortFilter; $a=$r|Get-NetFirewallAddressFilter
$app=$r|Get-NetFirewallApplicationFilter; $s=$r|Get-NetFirewallServiceFilter
$i=$r|Get-NetFirewallInterfaceFilter; $t=$r|Get-NetFirewallInterfaceTypeFilter
$security=$r|Get-NetFirewallSecurityFilter
[pscustomobject]@{name=$r.Name;enabled=$r.Enabled.ToString();direction=$r.Direction.ToString();action=$r.Action.ToString();profile=$r.Profile.ToString();edge=$r.EdgeTraversalPolicy.ToString();status=$r.PrimaryStatus.ToString();protocol=$p.Protocol;localPorts=@($p.LocalPort);remotePorts=@($p.RemotePort);localAddresses=@($a.LocalAddress);remoteAddresses=@($a.RemoteAddress);program=$app.Program;package=$app.Package;service=$s.Service;interfaces=@($i.InterfaceAlias);interfaceType=$t.InterfaceType.ToString();authentication=$security.Authentication.ToString();encryption=$security.Encryption.ToString();overrideBlock=$security.OverrideBlockRules.ToString();localUser=$security.LocalUser;remoteUser=$security.RemoteUser;remoteMachine=$security.RemoteMachine;enabledProfiles=@(Get-NetFirewallProfile -PolicyStore ActiveStore|Where-Object {$_.Enabled.ToString() -eq 'True'}|ForEach-Object {$_.Name})}|ConvertTo-Json -Compress`
  try { return JSON.parse(run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], 30_000)) }
  catch { return null }
}

function verifyIsolation() {
  const names = run('docker', ['ps', '--filter', 'name=perumar-supabase', '--format', '{{.Names}}'])
    .trim().split(/\r?\n/).filter(name => name.endsWith('_perumar-supabase'))
  if (!names.length) throw new Error('No se encontraron los contenedores del proyecto local.')
  const containers = JSON.parse(run('docker', ['inspect', ...names]))
  if (publishedPortsAreLocal(containers)) return 'loopback estricto'
  if (firewallCoversPublishedPorts(containers) && approvedFirewallState(readFirewallState())) return 'mitigación Windows Firewall aprobada (CHG-H0-001)'
  throw new Error('Aislamiento no verificable: se requiere loopback estricto o la regla efectiva exacta aprobada.')
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
let stopOnFailure = false
try {
  if (!allowed.includes(action) || process.argv.length !== 3) throw new Error('Operación permitida: start, status, stop o reset. No se admiten flags o destinos adicionales.')
  const config = readFileSync(path.join(root, 'supabase/config.toml'), 'utf8')
  if (!/^project_id = "perumar-supabase"$/m.test(config)) throw new Error('Proyecto local no reconocido.')
  if (existsSync(path.join(root, 'supabase/.temp/project-ref'))) throw new Error('Se detectó un vínculo remoto. Operación rechazada.')
  const cli = path.join(root, 'node_modules/supabase/dist/supabase.js')
  if (action === 'start') {
    stopOnFailure = true
    const probe = spawnSync('docker', ['network', 'inspect', network], { encoding: 'utf8', windowsHide: true })
    if (probe.status !== 0) run('docker', ['network', 'create', '--opt', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', network])
    const [info] = JSON.parse(run('docker', ['network', 'inspect', network]))
    if (info.Options?.['com.docker.network.bridge.host_binding_ipv4'] !== '127.0.0.1') throw new Error('La red local existente no restringe el bind a loopback.')
    console.log('Iniciando Supabase local. La primera descarga de imágenes puede tardar varios minutos.')
    run(process.execPath, [cli, 'start', '--network-id', network, '--yes'])
    console.log(`Aislamiento: ${verifyIsolation()}.`)
  } else if (action === 'reset') {
    stopOnFailure = true
    verifyIsolation()
    // Explicit local-only flag; no user-supplied database URL, link or project ref.
    run('docker', ['inspect', 'supabase_db_perumar-supabase'])
    run(process.execPath, [cli, 'db', 'reset', '--local', '--network-id', network, '--yes'])
    verifyIsolation()
  } else if (action === 'stop') {
    run(process.execPath, [cli, 'stop'])
  } else {
    stopOnFailure = true
    console.log(`Aislamiento: ${verifyIsolation()}.`)
    const info = JSON.parse(run(process.execPath, [cli, 'status', '--output', 'json']))
    const api = new URL(info.API_URL)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) throw new Error('La API no es local.')
    console.log(`API local: ${api.origin}. No se muestran claves ni credenciales.`)
  }
  console.log(`Supabase local: ${action} completado.`)
} catch (error) {
  if (stopOnFailure) {
    try { run(process.execPath, [path.join(root, 'node_modules/supabase/dist/supabase.js'), 'stop']); console.error('Stack local detenido por seguridad.') }
    catch { console.error('No fue posible confirmar la parada. Detenga manualmente el stack local del proyecto.') }
  }
  console.error(error instanceof Error ? error.message : 'Falló la operación local.')
  process.exitCode = 1
}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
