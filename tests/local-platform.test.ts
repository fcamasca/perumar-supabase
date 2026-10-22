// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
// @ts-expect-error Operational JavaScript runs without a TS build.
import { assertLocalProject } from '../scripts/local-platform.mjs'

const cache = path.resolve('.cache')
const temporary: string[] = []
afterEach(() => {
  for (const dir of temporary.splice(0)) {
    if (!dir.startsWith(cache + path.sep)) throw new Error('Ruta temporal fuera de caché.')
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
