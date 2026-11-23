import type { SupabaseClient } from '@supabase/supabase-js'
import { documentError, type AppliedDocument, type DocumentFile } from './contracts'
import { documentFileBlob } from './documentFileResponse'

export type PrintStudent = { id: string; codigo_matricula: string; alumno: { apellido_paterno: string; apellido_materno: string; nombres: string; numero_di: string } }
export type PrintDocument = AppliedDocument & { printStatus: 'Disponible' | 'Pendiente de generar' | 'Requiere regenerar' }
export type PrintPlan = { students: PrintStudent[]; documents: PrintDocument[] }
export const printOrder = ['FICHA_MATRICULA', 'FICHA_DATOS_PERSONALES', 'SOLICITUD', 'DECLARACION_JURADA', 'CARTA_PODER']
export const printName = (student: PrintStudent) => `${student.alumno.apellido_paterno} ${student.alumno.apellido_materno}, ${student.alumno.nombres}`
const eligibleStates = ['PROGRAMADO', 'EN_CURSO', 'CERRADO']
const changed = () => new Error('La selección o el expediente cambió. Cierra y vuelve a consultar antes de imprimir.')

async function printContext(client: SupabaseClient, cycle: string, ids: string[], signal: AbortSignal) {
  if (!ids.length || ids.length > 30 || new Set(ids).size !== ids.length) throw changed()
  const [c, m] = await Promise.all([
    client.from('ciclo').select('estado_codigo,capitania(nombre)').eq('id', cycle).abortSignal(signal).single(),
    client.from('matricula').select('id,codigo_matricula,alumno!inner(apellido_paterno,apellido_materno,nombres,numero_di)')
      .eq('ciclo_id', cycle).eq('estado_codigo', 'ACTIVO').in('id', ids).abortSignal(signal),
  ])
  if (signal.aborted || c.error || m.error || !eligibleStates.includes(c.data.estado_codigo) || m.data.length !== ids.length) throw changed()
  const students = m.data as unknown as PrintStudent[]
  if (students.some(s => !ids.includes(s.id)) || new Set(students.map(s => s.id)).size !== ids.length) throw changed()
  students.sort((a, b) => printName(a).localeCompare(printName(b), 'es') || a.id.localeCompare(b.id))
  return { students, capitania: (c.data.capitania as unknown as { nombre: string } | null)?.nombre ?? '' }
}

export async function loadPrintPlan(client: SupabaseClient, cycle: string, ids: string[], signal: AbortSignal): Promise<PrintPlan> {
  const { students, capitania } = await printContext(client, cycle, ids, signal)
  const documents: AppliedDocument[] = []
  for (let offset = 0; ; offset += 500) {
    const r = await client.from('matricula_documento').select('id,matricula_id,codigo,nombre,origen,estado,activo,contexto_vigente,ultimo_archivo_confirmado_id,updated_at')
      .in('matricula_id', ids).eq('origen', 'GENERADO').eq('activo', true).eq('contexto_vigente', true).order('id').range(offset, offset + 499).abortSignal(signal)
    if (r.error || signal.aborted) throw new Error('No se pudo consultar el expediente completo. Cierra y vuelve a abrir la impresión.')
    documents.push(...r.data as AppliedDocument[])
    if (r.data.length < 500) break
  }
  const files = documents.flatMap(d => d.ultimo_archivo_confirmado_id ? [d.ultimo_archivo_confirmado_id] : [])
  const [sources, versions] = await Promise.all([
    client.from('matricula_ficha_fuente').select('id,source_fingerprint').in('id', ids).abortSignal(signal),
    files.length ? client.from('matricula_documento_archivo').select('id,estado_tecnico,plantilla_version,fuente_base_fingerprint,datos_generacion')
      .in('id', files).abortSignal(signal) : Promise.resolve({ data: [], error: null }),
  ])
  if (sources.error || versions.error || signal.aborted) throw new Error('No se pudo comprobar la vigencia de los documentos.')
  return { students, documents: documents.map(d => {
    const file = (versions.data as DocumentFile[]).find(f => f.id === d.ultimo_archivo_confirmado_id)
    const source = sources.data.find(s => s.id === d.matricula_id)?.source_fingerprint
    const available = file?.estado_tecnico === 'CONFIRMADO' && source && file.fuente_base_fingerprint === source
      && file.plantilla_version === `${d.codigo === 'FICHA_MATRICULA' ? 'h6-1' : 'h6-2'}:${d.codigo}` && file.datos_generacion?.capitania_nombre === capitania
    return { ...d, printStatus: d.estado !== 'GENERADO' || !d.ultimo_archivo_confirmado_id ? 'Pendiente de generar' : available ? 'Disponible' : 'Requiere regenerar' }
  }) }
}

export async function downloadPrintFiles(client: SupabaseClient, cycle: string, plan: PrintPlan, selected: string[], signal: AbortSignal, progress: (done: number, total: number) => void) {
  const ids = plan.students.map(s => s.id)
  const current = await loadPrintPlan(client, cycle, ids, signal)
  const expected = plan.documents.filter(d => selected.includes(d.codigo) && d.printStatus === 'Disponible')
  if (!expected.length) throw new Error('Selecciona al menos un documento disponible.')
  if (expected.some(d => !current.documents.some(c => c.id === d.id && c.printStatus === 'Disponible' && c.updated_at === d.updated_at && c.ultimo_archivo_confirmado_id === d.ultimo_archivo_confirmado_id))) throw changed()
  const result: { student: string; bytes: Uint8Array }[] = []
  let totalBytes = 0
  for (const student of plan.students) {
    const docs = expected.filter(d => d.matricula_id === student.id).sort((a, b) => {
      const index = (code: string) => printOrder.includes(code) ? printOrder.indexOf(code) : printOrder.length
      return index(a.codigo) - index(b.codigo) || a.nombre.localeCompare(b.nombre, 'es') || a.id.localeCompare(b.id)
    })
    for (const d of docs) {
      signal.throwIfAborted()
      const r = await client.functions.invoke('expediente-descargar', { body: { documento_id: d.id, archivo_id: d.ultimo_archivo_confirmado_id, historico: false }, signal })
      if (r.error) {
        let code = ''
        try { if (r.error.context instanceof Response) code = (await r.error.context.json()).code ?? '' } catch { /* No raw response/PII. */ }
        throw new Error(documentError({ code }))
      }
      if (r.response?.headers.get('X-Documento-Historico') === 'true') throw changed()
      const blob = documentFileBlob(r.data, r.response)
      if (blob.type !== 'application/pdf') throw new Error('El documento generado no es un PDF válido.')
      totalBytes += blob.size
      if (totalBytes > 50 * 1024 * 1024) throw new Error('El paquete supera 50 MiB. Selecciona menos alumnos o documentos.')
      result.push({ student: student.id, bytes: new Uint8Array(await blob.arrayBuffer()) })
      progress(result.length, expected.length)
    }
  }
  // Recheck source, pointers and academic context after the complete sequence. No stale/partial fallback.
  const final = await loadPrintPlan(client, cycle, ids, signal)
  if (expected.some(d => !final.documents.some(c => c.id === d.id && c.printStatus === 'Disponible' && c.updated_at === d.updated_at && c.ultimo_archivo_confirmado_id === d.ultimo_archivo_confirmado_id))) throw changed()
  signal.throwIfAborted()
  return result
}
