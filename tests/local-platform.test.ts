// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
// @ts-expect-error Operational JavaScript runs without a TS build.
import { assertLocalProject, assertSecurityInventory } from '../scripts/local-platform.mjs'

import inventory from './fixtures/security-inventory.json'

const cache = path.resolve('.cache')
const temporary: string[] = []
afterEach(() => {
  for (const dir of temporary.splice(0)) {
    if (!dir.startsWith(cache + path.sep)) throw new Error('Ruta temporal fuera de cachÃ©.')
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('destino de fixtures locales', () => {
  it.each(['linked', 'other-project'])('rechaza %s antes de tocar Docker o Auth', condition => {
    mkdirSync(cache, { recursive: true })
    const dir = mkdtempSync(path.join(cache, 'h1-destination-'))
    temporary.push(dir)
    mkdirSync(path.join(dir, 'supabase', '.temp'), { recursive: true })
    writeFileSync(path.join(dir, 'supabase', 'config.toml'), `project_id = "${condition === 'linked' ? 'perumar-supabase' : 'remote-project'}"`)
    if (condition === 'linked') writeFileSync(path.join(dir, 'supabase', '.temp', 'project-ref'), 'synthetic-project')
    expect(() => assertLocalProject(dir)).toThrow(/rechazada/)
  })
})

// Sanitized catalog fixture: metadata only, no records, credentials or function bodies.
describe('inventario de seguridad H1–H7', () => {
  it('acepta el contrato restringido del catálogo publicado', () => {
    expect(() => assertSecurityInventory(structuredClone(inventory))).not.toThrow()
  })
  it.each(['rls', 'view', 'bucket', 'rpc', 'key', 'write', 'anon', 'migration'] as const)('rechaza exposición o desviación %s', violation => {
    const info = structuredClone(inventory)
    if (violation === 'rls') info.tables.find(t => t.name === 'orden_servicio')!.rls = false
    if (violation === 'view') info.tables.find(t => t.name === 'facturacion_reporte')!.options = []
    if (violation === 'bucket') info.orderBucket.public = true
    if (violation === 'rpc') info.orderCommands[0].authenticated = true
    if (violation === 'key') info.orderColumns.find(c => c.name === 'object_key')!.authenticated = true
    if (violation === 'write') info.orderColumns[0].update = true
    if (violation === 'anon') info.orderColumns[0].anon = true
    if (violation === 'migration') info.migrations.push('20990101000000')
    expect(() => assertSecurityInventory(info)).toThrow()
  })
})
