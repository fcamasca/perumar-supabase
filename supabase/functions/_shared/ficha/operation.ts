import type { SupabaseClient } from '@supabase/supabase-js'
import { FichaError, type FichaRequest } from './contract.ts'
import { readFicha } from './read.ts'
import { renderFicha, TEMPLATE_VERSION } from './render.ts'

export const PDF_BUCKET = 'fichas-matricula'
export type Manifest = { artefacto_id: string; generated_at: string; expires_at: string; source_version: string; template_version: string; source_fingerprint: string }
// Explicit stages allow testing failures without a production test bypass.
export async function operateFicha(user: SupabaseClient, server: SupabaseClient, request: FichaRequest) {
  const first = await readFicha(user, request)
  const storage = server.storage.from(PDF_BUCKET)
  const audit = async (event: string, artifact: string, generated: string) => {
    const result = await server.rpc('registrar_evento_ficha_pdf', { p_actor: first.actor, p_matricula_id: request.matricula_id, p_artefacto_id: artifact, p_evento: event, p_source_version: request.expected_updated_at, p_generated_at: generated, p_source_fingerprint: first.source.source_fingerprint })
    if (result.error) throw new FichaError(result.error.code === 'PT409' ? 409 : result.error.code === '42501' ? 403 : 503, result.error.code === 'PT409' ? 'SOURCE_CHANGED' : 'AUDIT')
    return result.data as Manifest
  }
  const recheck = async () => {
    const current = await readFicha(user, request)
    if (current.source.source_fingerprint !== first.source.source_fingerprint) throw new FichaError(409, 'SOURCE_CHANGED')
  }
  if (request.artefacto_id) {
    // Read minimal artifact manifest under the user's existing audit RLS, no privileged source lookup.
    const result = await user.from('auditoria').select('new_values').eq('entidad', 'ficha_pdf').eq('registro_id', request.matricula_id).eq('accion', 'FICHA_PDF_GENERADA').contains('new_values', { artefacto_id: request.artefacto_id }).single()
    const manifest = result.data?.new_values as Manifest | undefined
    if (result.error || !manifest) throw new FichaError(404, 'ARTIFACT')
    if (!Number.isFinite(Date.parse(manifest.expires_at)) || Date.now() >= Date.parse(manifest.expires_at)) throw new FichaError(409, 'EXPIRED')
    if (manifest.source_fingerprint !== first.source.source_fingerprint || manifest.template_version !== TEMPLATE_VERSION) throw new FichaError(409, 'SOURCE_CHANGED')
    const download = await storage.download(`${request.matricula_id}/${request.artefacto_id}.pdf`)
    if (download.error || !download.data) throw new FichaError(404, 'ARTIFACT')
    const bytes = new Uint8Array(await download.data.arrayBuffer())
    if (bytes.length > 2097152 || new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new FichaError(503, 'ARTIFACT')
    await recheck() // State/session/roles rechecked immediately before audit and delivery.
    await audit('FICHA_PDF_DESCARGA_INICIADA', request.artefacto_id, manifest.generated_at)
    return { bytes, manifest }
  }
  const generated = new Date(), artifact = crypto.randomUUID()
  const bytes = await renderFicha(first.source, generated)
  await recheck()
  const path = `${request.matricula_id}/${artifact}.pdf`
  const upload = await storage.upload(path, bytes, { contentType: 'application/pdf', cacheControl: '0', upsert: false, metadata: { template_version: TEMPLATE_VERSION, generated_at: generated.toISOString(), expires_at: new Date(generated.getTime() + 86400000).toISOString(), source_version: request.expected_updated_at, source_fingerprint: first.source.source_fingerprint } })
  if (upload.error) throw new FichaError(503, 'UPLOAD')
  try {
    await recheck()
    const manifest = await audit('FICHA_PDF_GENERADA', artifact, generated.toISOString())
    return { manifest }
  } catch (error) {
    // Compensation is best-effort; failure leaves a private artifact, never delivered without audit.
    const removed = await storage.remove([path]).catch(() => ({ error: true }))
    if (removed.error) console.error(JSON.stringify({ phase: 'compensation', category: 'PRIVATE_ORPHAN', correlation: crypto.randomUUID() }))
    throw error
  }
}
