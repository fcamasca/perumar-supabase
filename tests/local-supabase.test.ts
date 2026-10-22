// @vitest-environment node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// The operational script is JavaScript so it runs before any TypeScript build.
// @ts-expect-error Plain Node script has no declaration file.
import { publishedPortsAreLocal } from '../scripts/local-supabase.mjs'

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
