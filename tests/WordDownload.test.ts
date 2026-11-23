import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildWordDownload } from '../src/documents/wordDownload'
import { fichaFixture } from './ficha-fixture'
import { wordParts, wordText } from './word-parts'
let tables: Record<string, Record<string, unknown>>, denied: boolean
const invoke = vi.fn(), calls: string[] = []
const client = { from: (table: string) => {
  calls.push(table)
  const q = { select: () => q, eq: () => q, abortSignal: () => q, single: () => q, then: (resolve: (r: unknown) => unknown) => Promise.resolve({ data: structuredClone(tables[table]), error: denied ? { code: '42501' } : null }).then(resolve) }
  return q
}, functions: { invoke } } as unknown as SupabaseClient
const signal = () => new AbortController().signal
beforeEach(() => {
  const source = fichaFixture(); denied = false; calls.length = 0
  tables = {
    matricula_documento: { id: 'doc', matricula_id: 'enrollment', origen: 'GENERADO', codigo: 'DECLARACION_JURADA', estado: 'GENERADO', activo: true, contexto_vigente: true, ultimo_archivo_confirmado_id: 'file', updated_at: 'v1' },
    matricula_documento_archivo: { id: 'file', matricula_documento_id: 'doc', estado_tecnico: 'CONFIRMADO', plantilla_version: 'h6-2:DECLARACION_JURADA', fuente_base_fingerprint: source.source_fingerprint, fecha_generacion: '2026-11-09T17:00:00Z', datos_generacion: { capitania_nombre: 'PISCO' } },
    matricula_ficha_fuente: { source, source_fingerprint: source.source_fingerprint, updated_at: source.updated_at },
  }
  invoke.mockReset().mockResolvedValue({ data: new Blob(['%PDF'], { type: 'application/pdf' }), error: null })
})
it('downloads one editable Word after RLS source reads and ordinary server-side PDF authorization', async () => {
  const blob = await buildWordDownload(client, 'enrollment', 'doc', 'file', signal())
  expect(wordText((await wordParts(blob))['word/document.xml'])).toContain('9 de noviembre de 2026')
  expect(invoke).toHaveBeenCalledExactlyOnceWith('expediente-descargar', { body: { documento_id: 'doc', archivo_id: 'file', historico: false }, signal: expect.any(AbortSignal) })
  expect(calls.filter(c => c === 'matricula_ficha_fuente')).toHaveLength(2)
})
it.each(['SUBIDO', 'PENDIENTE', 'RETIRADO', 'ANTERIOR', 'FUENTE', 'VERSION'])('blocks %s without requesting file bytes', async mode => {
  if (mode === 'SUBIDO') tables.matricula_documento.origen = 'SUBIDO'
  if (mode === 'PENDIENTE') tables.matricula_documento.estado = 'PENDIENTE'
  if (mode === 'RETIRADO') tables.matricula_documento.activo = false
  if (mode === 'ANTERIOR') tables.matricula_documento.contexto_vigente = false
  if (mode === 'FUENTE') tables.matricula_ficha_fuente.source_fingerprint = 'changed'
  if (mode === 'VERSION') tables.matricula_documento.ultimo_archivo_confirmado_id = 'different'
  await expect(buildWordDownload(client, 'enrollment', 'doc', 'file', signal())).rejects.toThrow('cambió'); expect(invoke).not.toHaveBeenCalled()
})
it('rejects denied academic access and blocked states', async () => {
  denied = true; await expect(buildWordDownload(client, 'enrollment', 'doc', 'file', signal())).rejects.toThrow('acceso')
  denied = false; (tables.matricula_ficha_fuente.source as ReturnType<typeof fichaFixture>).estado_codigo = 'ANULADO'
  await expect(buildWordDownload(client, 'enrollment', 'doc', 'file', signal())).rejects.toThrow('cambió'); expect(invoke).not.toHaveBeenCalled()
})
it('does not retry a server conflict or allow historical fallback', async () => {
  invoke.mockResolvedValueOnce({ error: { context: new Response(JSON.stringify({ code: 'DOCUMENT_SOURCE_CHANGED' })) } })
  await expect(buildWordDownload(client, 'enrollment', 'doc', 'file', signal())).rejects.toThrow('fuente cambió'); expect(invoke).toHaveBeenCalledTimes(1)
  invoke.mockResolvedValueOnce({ data: new Blob(['pdf'], { type: 'application/pdf' }), response: new Response('', { headers: { 'X-Documento-Historico': 'true' } }) })
  await expect(buildWordDownload(client, 'enrollment', 'doc', 'file', signal())).rejects.toThrow('cambió')
})
it('rechecks source after authorization and cancels without producing a downloadable copy', async () => {
  invoke.mockImplementation(async () => { tables.matricula_ficha_fuente.source_fingerprint = 'changed'; return { data: new Blob(['pdf'], { type: 'application/pdf' }) } })
  await expect(buildWordDownload(client, 'enrollment', 'doc', 'file', signal())).rejects.toThrow('cambió')
  const abort = new AbortController(); abort.abort(); await expect(buildWordDownload(client, 'enrollment', 'doc', 'file', abort.signal)).rejects.toThrow()
})
