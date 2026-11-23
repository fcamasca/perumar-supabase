import { beforeEach, expect, it, vi } from 'vitest'
import { downloadPrintFiles, loadPrintPlan } from '../src/documents/printExpedienteData'
import type { SupabaseClient } from '@supabase/supabase-js'

const students = [
  { id: 'b', codigo_matricula: 'M-B', alumno: { apellido_paterno: 'ZETA', apellido_materno: 'PÉREZ', nombres: 'ANA', numero_di: '222' } },
  { id: 'a', codigo_matricula: 'M-A', alumno: { apellido_paterno: 'ÁLVAREZ', apellido_materno: 'PÉREZ', nombres: 'JUAN', numero_di: '111' } },
]
const makeDoc = (id: string, student: string, code = 'FICHA_MATRICULA') => ({ id, matricula_id: student, codigo: code, nombre: code, origen: 'GENERADO', estado: 'GENERADO', activo: true, contexto_vigente: true, ultimo_archivo_confirmado_id: `f-${id}`, updated_at: 'v1' })
let docs: ReturnType<typeof makeDoc>[], cycleState: string, denied: boolean, currentSource: string, enrollmentRows: typeof students
const log: { table: string; eq: unknown[][]; in: unknown[][] }[] = []
const invoke = vi.fn()
const client = { from: (table: string) => {
  const call = { table, eq: [] as unknown[][], in: [] as unknown[][] }; log.push(call)
  const q = { select: () => q, eq: (...p: unknown[]) => { call.eq.push(p); return q }, in: (...p: unknown[]) => { call.in.push(p); return q }, order: () => q, range: () => q, abortSignal: () => q, single: () => q,
    then: (resolve: (r: unknown) => void) => Promise.resolve({ error: denied ? { code: '42501' } : null, data:
      table === 'ciclo' ? { estado_codigo: cycleState, capitania: { nombre: 'PISCO' } } : table === 'matricula' ? enrollmentRows
      : table === 'matricula_documento' ? docs : table === 'matricula_ficha_fuente' ? students.map(s => ({ id: s.id, source_fingerprint: currentSource }))
      : docs.filter(d => d.ultimo_archivo_confirmado_id).map(d => ({ id: d.ultimo_archivo_confirmado_id, estado_tecnico: 'CONFIRMADO', fuente_base_fingerprint: 'current', plantilla_version: `${d.codigo === 'FICHA_MATRICULA' ? 'h6-1' : 'h6-2'}:${d.codigo}`, datos_generacion: { capitania_nombre: 'PISCO' } })) }).then(resolve) }
  return q
}, functions: { invoke } } as unknown as SupabaseClient
const signal = () => new AbortController().signal
beforeEach(() => {
  docs = [makeDoc('db', 'b'), makeDoc('da2', 'a', 'CARTA_PODER'), makeDoc('da', 'a')]
  enrollmentRows = students; cycleState = 'PROGRAMADO'; denied = false; currentSource = 'current'; log.length = 0
  invoke.mockReset().mockResolvedValue({ data: new Blob(['%PDF-test'], { type: 'application/pdf' }), error: null })
})
it('loads only active current generated documents and orders students alphabetically', async () => {
  const plan = await loadPrintPlan(client, 'cycle', ['b', 'a'], signal())
  expect(plan.students.map(s => s.id)).toEqual(['a', 'b']); expect(plan.documents.every(d => d.printStatus === 'Disponible')).toBe(true)
  expect(log.find(c => c.table === 'matricula')?.eq).toEqual([['ciclo_id', 'cycle'], ['estado_codigo', 'ACTIVO']])
  expect(log.find(c => c.table === 'matricula_documento')?.eq).toEqual([['origen', 'GENERADO'], ['activo', true], ['contexto_vigente', true]])
  expect(invoke).not.toHaveBeenCalled()
})
it('distinguishes pending generation from stale existing versions', async () => {
  docs[0].estado = 'PENDIENTE'; currentSource = 'new'
  const plan = await loadPrintPlan(client, 'cycle', ['a', 'b'], signal())
  expect(plan.documents.map(d => d.printStatus)).toEqual(['Pendiente de generar', 'Requiere regenerar', 'Requiere regenerar'])
})
it.each(['ANULADO', 'DESIERTO'])('blocks Cycle %s before requesting files', async state => {
  cycleState = state; await expect(loadPrintPlan(client, 'cycle', ['a', 'b'], signal())).rejects.toThrow('cambió'); expect(invoke).not.toHaveBeenCalled()
})
it('accepts CERRADO and rejects denied, transferred or annulled selections', async () => {
  cycleState = 'CERRADO'; await expect(loadPrintPlan(client, 'cycle', ['a', 'b'], signal())).resolves.toBeDefined()
  enrollmentRows = [students[0]]; await expect(loadPrintPlan(client, 'cycle', ['a', 'b'], signal())).rejects.toThrow()
  denied = true; await expect(loadPrintPlan(client, 'cycle', ['a', 'b'], signal())).rejects.toThrow()
})
it('downloads the selected available PDFs in student/document order with ordinary authorized Edge', async () => {
  const plan = await loadPrintPlan(client, 'cycle', ['a', 'b'], signal()), progress = vi.fn()
  const result = await downloadPrintFiles(client, 'cycle', plan, ['FICHA_MATRICULA', 'CARTA_PODER'], signal(), progress)
  expect(result.map(r => r.student)).toEqual(['a', 'a', 'b'])
  expect(invoke.mock.calls.map(c => c[1].body)).toEqual(['da', 'da2', 'db'].map(id => ({ documento_id: id, archivo_id: `f-${id}`, historico: false })))
  expect(invoke.mock.calls.every(c => c[0] === 'expediente-descargar')).toBe(true); expect(progress).toHaveBeenLastCalledWith(3, 3)
})
it('excludes deselected/pending documents without generating them', async () => {
  docs[0].estado = 'PENDIENTE'
  const plan = await loadPrintPlan(client, 'cycle', ['a', 'b'], signal())
  const result = await downloadPrintFiles(client, 'cycle', plan, ['FICHA_MATRICULA'], signal(), vi.fn())
  expect(result).toHaveLength(1); expect(invoke).toHaveBeenCalledTimes(1)
})
it('rejects concurrent pointer/source changes and cancelled work without partial output', async () => {
  const plan = await loadPrintPlan(client, 'cycle', ['a', 'b'], signal())
  docs[0].ultimo_archivo_confirmado_id = 'changed'
  await expect(downloadPrintFiles(client, 'cycle', plan, ['FICHA_MATRICULA'], signal(), vi.fn())).rejects.toThrow('cambió')
  expect(invoke).not.toHaveBeenCalled()
  const abort = new AbortController(); abort.abort()
  await expect(downloadPrintFiles(client, 'cycle', plan, ['FICHA_MATRICULA'], abort.signal, vi.fn())).rejects.toThrow()
})
it('does not retry an Edge conflict or accept a historical fallback', async () => {
  const plan = await loadPrintPlan(client, 'cycle', ['a', 'b'], signal())
  invoke.mockResolvedValueOnce({ error: { context: new Response(JSON.stringify({ code: 'DOCUMENT_HISTORY_REQUIRED' })) } })
  await expect(downloadPrintFiles(client, 'cycle', plan, ['FICHA_MATRICULA'], signal(), vi.fn())).rejects.toThrow('histórica')
  expect(invoke).toHaveBeenCalledTimes(1)
  invoke.mockResolvedValueOnce({ data: new Blob(['pdf'], { type: 'application/pdf' }), response: new Response('', { headers: { 'X-Documento-Historico': 'true' } }) })
  await expect(downloadPrintFiles(client, 'cycle', plan, ['FICHA_MATRICULA'], signal(), vi.fn())).rejects.toThrow('cambió')
})
it('rechecks source and academic state after the last download', async () => {
  const plan = await loadPrintPlan(client, 'cycle', ['a', 'b'], signal())
  invoke.mockImplementation(async () => { currentSource = 'changed'; return { data: new Blob(['pdf'], { type: 'application/pdf' }), error: null } })
  await expect(downloadPrintFiles(client, 'cycle', plan, ['FICHA_MATRICULA'], signal(), vi.fn())).rejects.toThrow('cambió')
})
