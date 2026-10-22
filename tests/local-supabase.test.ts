// @vitest-environment node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// The operational script is JavaScript so it runs before any TypeScript build.
// @ts-expect-error Plain Node script has no declaration file.
import { approvedFirewallState, firewallCoversPublishedPorts, publishedPortsAreLocal } from '../scripts/local-supabase.mjs'

const script = path.resolve('scripts/local-supabase.mjs')

describe('protección del comando local destructivo', () => {
  it.each([
    ['reset', '--linked'],
    ['reset', '--db-url', 'postgresql://remote.invalid/database'],
    ['reset', '--project-ref', 'remote-project'],
    ['deploy'],
  ])('rechaza argumentos/destinos no aprobados: %j', (...args) => {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', windowsHide: true })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Operación permitida: start, status, stop o reset')
    expect(result.stdout).toBe('')
    expect(result.stderr).not.toContain('remote.invalid')
  })
})

const approvedRule = {
  name: 'PERUMAR-H0-Block-NonLoopback', enabled: 'True', direction: 'Inbound', action: 'Block',
  profile: 'Any', edge: 'Block', status: 'OK', protocol: 'TCP', localPorts: ['54320-54324'], remotePorts: ['Any'],
  localAddresses: ['0.0.0.0-126.255.255.255', '128.0.0.0-255.255.255.255', '::2-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'],
  remoteAddresses: ['Any'], program: 'Any', package: null, service: 'Any', interfaces: ['Any'], interfaceType: 'Any',
  enabledProfiles: ['Domain', 'Private', 'Public'],
}

describe('mitigación CHG-H0-001', () => {
  it('admite únicamente la configuración efectiva aprobada', () => {
    expect(approvedFirewallState(approvedRule)).toBe(true)
    expect(approvedFirewallState(null)).toBe(false)
  })
  it.each([
    { name: 'otra' }, { enabled: 'False' }, { direction: 'Outbound' }, { action: 'Allow' },
    { profile: 'Private' }, { edge: 'Allow' }, { status: 'Error' }, { protocol: 'UDP' },
    { localPorts: ['54321'] }, { remotePorts: ['80'] }, { localAddresses: ['Any'] },
    { remoteAddresses: ['LocalSubnet'] }, { program: 'specific.exe' }, { package: 'package' },
    { service: 'specific' }, { interfaces: ['Wi-Fi'] }, { interfaceType: 'Wireless' },
    { enabledProfiles: ['Private', 'Public'] },
  ])('rechaza regla alterada o control incompleto: %j', change => {
    expect(approvedFirewallState({ ...approvedRule, ...change })).toBe(false)
  })
  it.each([
    ['0.0.0.0', '54321', 'tcp', true], ['::', '54324', 'tcp', true],
    ['0.0.0.0', '54325', 'tcp', false], ['::', '54322', 'udp', false],
    ['192.168.1.236', '54321', 'tcp', false], ['', '54321', 'tcp', false],
  ])('solo cubre los bindings globales TCP del rango aprobado', (ip, port, protocol, expected) => {
    expect(firewallCoversPublishedPorts([{ NetworkSettings: { Ports: {
      [`8000/${protocol}`]: [{ HostIp: ip, HostPort: port }],
    } } }])).toBe(expected)
  })
})

describe('aislamiento de puertos Docker', () => {
  it('rechaza el estado real observado: publicación IPv4/IPv6 global', () => {
    expect(publishedPortsAreLocal([{ NetworkSettings: { Ports: {
      '5432/tcp': [{ HostIp: '0.0.0.0' }, { HostIp: '::' }],
    } } }])).toBe(false)
  })

  it('admite loopback explícito y contenedores sin puertos publicados', () => {
    expect(publishedPortsAreLocal([
      { NetworkSettings: { Ports: { '8000/tcp': [{ HostIp: '127.0.0.1' }, { HostIp: '::1' }] } } },
      { NetworkSettings: { Ports: { '5000/tcp': null } } },
    ])).toBe(true)
  })

  it('rechaza un bind sin IP explícita', () => {
    expect(publishedPortsAreLocal([{ NetworkSettings: { Ports: {
      '8000/tcp': [{ HostIp: '' }],
    } } }])).toBe(false)
  })
})
