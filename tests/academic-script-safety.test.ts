// @vitest-environment node
import { expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

it.each([{}, { CI: 'true' }, { GITHUB_ACTIONS: 'true' }])('blocks academic business fixtures outside disposable GitHub CI: %j', flags => {
  const env = { ...process.env }
  delete env.CI
  delete env.GITHUB_ACTIONS
  const result = spawnSync(process.execPath, ['scripts/test-academic.mjs'], {
    env: { ...env, ...flags }, encoding: 'utf8', windowsHide: true, timeout: 15000,
  })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('no usar sobre la base de pruebas humanas')
  expect(result.stdout).not.toContain('fixture-create')
})
