import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fichaFixture } from './ficha-fixture'
import { operateFicha } from '../supabase/functions/_shared/ficha/operation'
const mocks = vi.hoisted(() => ({ read: vi.fn(), render: vi.fn() }))
vi.mock('../supabase/functions/_shared/ficha/read.ts', () => ({ readFicha: mocks.read }))
vi.mock('../supabase/functions/_shared/ficha/render.ts', () => ({ renderFicha: mocks.render, TEMPLATE_VERSION: 'h5-1' }))
const upload = vi.fn(), remove = vi.fn(), download = vi.fn(), audit = vi.fn()
const source = fichaFixture(), request = { matricula_id: source.id, expected_updated_at: source.updated_at }
const manifest = () => ({ artefacto_id: source.id, generated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), source_version: source.updated_at, template_version: 'h5-1' })
let record = manifest()
const user = { from: vi.fn(() => { const q = { select: () => q, eq: () => q, contains: () => q, single: async () => ({ data: { new_values: record }, error: null }) }; return q }) } as unknown as SupabaseClient
const server = { rpc: audit, storage: { from: vi.fn(() => ({ upload, remove, download })) } } as unknown as SupabaseClient
beforeEach(() => {
  vi.clearAllMocks(); record = manifest()
  mocks.read.mockReset().mockResolvedValue({ source, actor: 'actor' }); mocks.render.mockReset().mockResolvedValue(new TextEncoder().encode('%PDF-synthetic'))
  upload.mockReset().mockResolvedValue({ error: null }); remove.mockReset().mockResolvedValue({ error: null }); audit.mockReset().mockResolvedValue({ error: null, data: record }); download.mockReset().mockResolvedValue({ error: null, data: new Blob(['%PDF-synthetic']) })
})
it('never renders, uploads or audits a denied business read', async () => {
  mocks.read.mockRejectedValueOnce(new Error('ACCESS'))
  await expect(operateFicha(user, server, request)).rejects.toThrow('ACCESS')
  expect(upload).not.toHaveBeenCalled(); expect(audit).not.toHaveBeenCalled(); expect(mocks.render).not.toHaveBeenCalled()
})
it('does not upload or audit a rendering failure', async () => {
  mocks.render.mockRejectedValueOnce(new Error('GLYPH'))
  await expect(operateFicha(user, server, request)).rejects.toThrow('GLYPH')
  expect(upload).not.toHaveBeenCalled(); expect(audit).not.toHaveBeenCalled()
})
it('does not record success or retry a failed upload', async () => {
  upload.mockResolvedValue({ error: true })
  await expect(operateFicha(user, server, request)).rejects.toThrow('UPLOAD')
  expect(upload).toHaveBeenCalledTimes(1); expect(audit).not.toHaveBeenCalled()
})
it('compensates after audit failure and never returns an artifact', async () => {
  audit.mockResolvedValue({ error: { code: 'PT409' } })
  await expect(operateFicha(user, server, request)).rejects.toThrow('AUDIT')
  expect(remove).toHaveBeenCalledOnce(); expect(audit).toHaveBeenCalledOnce()
})
it('compensates if authorization is revoked after upload', async () => {
  mocks.read.mockResolvedValueOnce({ source, actor: 'actor' }).mockResolvedValueOnce({ source, actor: 'actor' }).mockRejectedValueOnce(new Error('ACCESS'))
  await expect(operateFicha(user, server, request)).rejects.toThrow('ACCESS')
  expect(remove).toHaveBeenCalledOnce(); expect(audit).not.toHaveBeenCalled()
})
it('uses unique server UUIDs, no overwrite, and no personal fields in metadata', async () => {
  await Promise.all([operateFicha(user, server, request), operateFicha(user, server, request)])
  const calls = upload.mock.calls
  expect(calls[0][0]).not.toBe(calls[1][0]); expect(calls[0][0]).toMatch(new RegExp(`^${source.id}/[0-9a-f-]+\\.pdf$`))
  expect(calls[0][2].upsert).toBe(false)
  expect(JSON.stringify(calls[0][2])).not.toContain('MUÑOZ'); expect(JSON.stringify(calls[0][2])).not.toContain('00000001')
  expect(mocks.read).toHaveBeenCalledTimes(6)
})
it('rejects logical expiry at the exact boundary without reading bytes', async () => {
  record.expires_at = new Date(Date.now() - 1).toISOString()
  await expect(operateFicha(user, server, { ...request, artefacto_id: source.id })).rejects.toThrow('EXPIRED')
  expect(download).not.toHaveBeenCalled(); expect(audit).not.toHaveBeenCalled()
})
it('does not deliver downloaded bytes if final audit fails', async () => {
  audit.mockResolvedValue({ error: { code: '42501' } })
  await expect(operateFicha(user, server, { ...request, artefacto_id: source.id })).rejects.toThrow('AUDIT')
  expect(download).toHaveBeenCalledOnce(); expect(audit).toHaveBeenCalledOnce()
})
it('records download initiated only after complete bytes and repeated authorization', async () => {
  const result = await operateFicha(user, server, { ...request, artefacto_id: source.id })
  expect(result.bytes).toBeInstanceOf(Uint8Array)
  expect(mocks.read).toHaveBeenCalledTimes(2)
  expect(audit.mock.calls[0][1].p_evento).toBe('FICHA_PDF_DESCARGA_INICIADA')
})
