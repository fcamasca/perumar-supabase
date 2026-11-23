import type { SupabaseClient } from '@supabase/supabase-js'
import { requireEligible, type Source } from '../../supabase/functions/_shared/ficha/contract'
import { generatedCodes, documentError, type AppliedDocument, type DocumentFile } from './contracts'
import { documentFileBlob } from './documentFileResponse'

const changed = () => new Error('La versión o su fuente cambió. Consulta el expediente y regenera el documento antes de descargar Word.')
async function readWordSource(client: SupabaseClient, enrollment: string, document: string, file: string, signal: AbortSignal) {
  const [d, f, s] = await Promise.all([
    client.from('matricula_documento').select('*').eq('id', document).eq('matricula_id', enrollment).abortSignal(signal).single(),
    client.from('matricula_documento_archivo').select('id,matricula_documento_id,estado_tecnico,plantilla_version,fuente_base_fingerprint,datos_generacion,fecha_generacion')
      .eq('id', file).eq('matricula_documento_id', document).abortSignal(signal).single(),
    client.from('matricula_ficha_fuente').select('source,updated_at,source_fingerprint').eq('id', enrollment).abortSignal(signal).single(),
  ])
  signal.throwIfAborted()
  if (d.error || f.error || s.error || !d.data || !f.data || !s.data) throw new Error('No se pudo consultar el documento o tu acceso ya no lo permite.')
  const doc = d.data as AppliedDocument, version = f.data as DocumentFile & { fecha_generacion: string }
  const source = { ...s.data.source, updated_at: s.data.updated_at, source_fingerprint: s.data.source_fingerprint } as Source
  if (doc.matricula_id !== enrollment || doc.origen !== 'GENERADO' || !generatedCodes.includes(doc.codigo) || !doc.activo || !doc.contexto_vigente || doc.estado !== 'GENERADO'
    || doc.ultimo_archivo_confirmado_id !== file || version.matricula_documento_id !== document || version.estado_tecnico !== 'CONFIRMADO'
    || !source.source_fingerprint || version.fuente_base_fingerprint !== source.source_fingerprint
    || version.plantilla_version !== `${doc.codigo === 'FICHA_MATRICULA' ? 'h6-1' : 'h6-2'}:${doc.codigo}` || !Number.isFinite(Date.parse(version.fecha_generacion))) throw changed()
  try { requireEligible(source, { matricula_id: enrollment, expected_updated_at: source.updated_at }) } catch { throw changed() }
  return { doc, version, source }
}

// A derived, editable copy of one confirmed/current version. Existing RLS and Edge authorize it.
export async function buildWordDownload(client: SupabaseClient, enrollment: string, document: string, file: string, signal: AbortSignal) {
  const first = await readWordSource(client, enrollment, document, file, signal)
  const { renderWordDocument } = await import('./wordDocument')
  const blob = renderWordDocument(first.doc.codigo, first.source, new Date(first.version.fecha_generacion), first.version.datos_generacion)
  const r = await client.functions.invoke('expediente-descargar', { body: { documento_id: document, archivo_id: file, historico: false }, signal })
  if (r.error) {
    let code = ''
    try { if (r.error.context instanceof Response) code = (await r.error.context.json()).code ?? '' } catch { /* Never expose raw responses/PII. */ }
    throw new Error(documentError({ code }))
  }
  if (r.response?.headers.get('X-Documento-Historico') === 'true' || documentFileBlob(r.data, r.response).type !== 'application/pdf') throw changed()
  const final = await readWordSource(client, enrollment, document, file, signal)
  if (first.doc.updated_at !== final.doc.updated_at || first.source.source_fingerprint !== final.source.source_fingerprint
    || JSON.stringify(first.version) !== JSON.stringify(final.version)) throw changed()
  signal.throwIfAborted()
  return blob
}
