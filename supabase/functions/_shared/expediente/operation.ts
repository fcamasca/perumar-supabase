import type { SupabaseClient } from '@supabase/supabase-js'
import type { Source } from '../ficha/contract.ts'
import {
  DocumentoError,
  EXPEDIENTE_BUCKET,
  databaseError,
  sha256,
  templateVersion,
} from './contract.ts'
import { validateFile } from './validateFile.ts'
import { renderExpediente } from './renderers.ts'

export type DocumentRow = {
  id: string
  matricula_id: string
  codigo: string
  origen: 'SUBIDO' | 'GENERADO'
  activo: boolean
  contexto_vigente: boolean
  updated_at: string
}
export type FileRow = {
  id: string
  matricula_documento_id: string
  object_key: string
  estado_tecnico: string
  iniciado_por: string
  mime: string
  bytes: number
  sha256: string
  plantilla_version: string | null
  fecha_generacion: string
  datos_generacion: Record<string, string>
  source?: Source
}
export async function academicActor(user: SupabaseClient) {
  const identity = await user.auth.getUser()
  if (identity.error || !identity.data.user) throw new DocumentoError(401, 'DOCUMENT_SESSION')
  const actor = identity.data.user.id
  const [profile, assignments, roles] = await Promise.all([
    user.from('app_users').select('id,active').eq('id', actor).single(),
    user.from('app_user_roles').select('role_code').eq('user_id', actor),
    user
      .from('app_roles')
      .select('code,active')
      .in('code', ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO']),
  ])
  if (
    profile.error ||
    assignments.error ||
    roles.error ||
    !profile.data?.active ||
    !assignments.data?.some((a) => roles.data?.some((r) => r.active && r.code === a.role_code))
  )
    throw new DocumentoError(403, 'DOCUMENT_ACCESS')
  return actor
}
export async function documentRow(user: SupabaseClient, id: string) {
  const q = await user.from('matricula_documento').select('*').eq('id', id).single()
  if (q.error || !q.data) throw new DocumentoError(403, 'DOCUMENT_ACCESS')
  return q.data as DocumentRow
}
async function call(server: SupabaseClient, name: string, p: Record<string, unknown>) {
  const r = await server.rpc(name, p)
  if (r.error) throw databaseError(r.error)
  return r.data
}
// Cleanup only follows an acknowledged abort of a NEVER-confirmed operation.
export async function cancelReservation(
  user: SupabaseClient,
  server: SupabaseClient,
  actor: string,
  id: string,
) {
  const q = await user
    .from('matricula_documento_archivo')
    .select('id,iniciado_por,estado_tecnico')
    .eq('id', id)
    .single()
  if (q.error || !q.data || q.data.iniciado_por !== actor)
    throw new DocumentoError(403, 'DOCUMENT_ACCESS')
  const f = (await call(server, 'abortar_reserva_expediente', {
    p_actor: actor,
    p_archivo_id: id,
  })) as FileRow
  const removed = await server.storage.from(EXPEDIENTE_BUCKET).remove([f.object_key])
  if (removed.error) throw new DocumentoError(503, 'DOCUMENT_PRIVATE_ORPHAN')
  return { archivo_id: f.id, estado_tecnico: f.estado_tecnico }
}
async function persist(
  server: SupabaseClient,
  actor: string,
  reservation: FileRow,
  bytes: Uint8Array,
  mime: string,
) {
  const bucket = server.storage.from(EXPEDIENTE_BUCKET)
  try {
    const upload = await bucket.upload(reservation.object_key, bytes, {
      contentType: mime,
      cacheControl: '0',
      upsert: false,
    })
    if (upload.error) throw new DocumentoError(503, 'DOCUMENT_UPLOAD_FAILED')
    const f = (await call(server, 'confirmar_archivo_expediente', {
      p_actor: actor,
      p_archivo_id: reservation.id,
      p_mime: mime,
      p_bytes: bytes.length,
      p_sha256: await sha256(bytes),
    })) as FileRow
    return {
      archivo_id: f.id,
      documento_id: f.matricula_documento_id,
      estado_tecnico: 'CONFIRMADO',
    }
  } catch (error) {
    // If confirmation committed but its response was lost, abort MUST fail; never delete confirmed bytes.
    try {
      const aborted = (await call(server, 'abortar_reserva_expediente', {
        p_actor: actor,
        p_archivo_id: reservation.id,
      })) as FileRow
      const removed = await bucket.remove([aborted.object_key])
      if (removed.error)
        console.error(
          JSON.stringify({
            phase: 'expediente-compensation',
            category: 'PRIVATE_ORPHAN',
            correlation: crypto.randomUUID(),
          }),
        )
    } catch {
      /* Preserve an uncertain/confirmed operation; operator/user recovers by authorized reads. */
    }
    throw error
  }
}
export async function uploadDocument(
  user: SupabaseClient,
  server: SupabaseClient,
  actor: string,
  input: { documento_id: string; expected_updated_at: string },
  file: File,
) {
  const d = await documentRow(user, input.documento_id)
  if (d.origen !== 'SUBIDO') throw new DocumentoError(422, 'DOCUMENT_ORIGIN')
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = await validateFile(bytes, file.type, file.name, d.codigo === 'FOTO_PASAPORTE')
  const r = (await call(server, 'preparar_archivo_expediente', {
    p_actor: actor,
    p_documento_id: d.id,
    p_expected_updated_at: input.expected_updated_at,
  })) as FileRow
  return persist(server, actor, r, bytes, mime)
}
export async function generateDocument(
  user: SupabaseClient,
  server: SupabaseClient,
  actor: string,
  input: {
    documento_id: string
    expected_updated_at: string
    datos_generacion: Record<string, unknown>
  },
) {
  const d = await documentRow(user, input.documento_id)
  if (d.origen !== 'GENERADO') throw new DocumentoError(422, 'DOCUMENT_ORIGIN')
  const r = (await call(server, 'preparar_archivo_expediente', {
    p_actor: actor,
    p_documento_id: d.id,
    p_expected_updated_at: input.expected_updated_at,
    p_plantilla_version: templateVersion(d.codigo),
    p_datos_generacion: input.datos_generacion,
  })) as FileRow
  let bytes: Uint8Array
  try {
    if (!r.source) throw new DocumentoError(503, 'DOCUMENT_SNAPSHOT')
    bytes = await renderExpediente(
      d.codigo,
      r.source,
      new Date(r.fecha_generacion),
      r.datos_generacion,
    )
    await validateFile(bytes, 'application/pdf', 'documento.pdf')
  } catch (error) {
    // No bytes were uploaded yet; release the technical reservation without touching history.
    try {
      await call(server, 'abortar_reserva_expediente', { p_actor: actor, p_archivo_id: r.id })
    } catch {
      /* uncertain reservation remains private */
    }
    throw error
  }
  return persist(server, actor, r, bytes, 'application/pdf')
}
export async function downloadDocument(
  user: SupabaseClient,
  server: SupabaseClient,
  actor: string,
  input: { documento_id: string; archivo_id: string; historico: boolean },
) {
  const d = await documentRow(user, input.documento_id)
  const q = await user
    .from('matricula_documento_archivo')
    .select('*')
    .eq('id', input.archivo_id)
    .eq('matricula_documento_id', d.id)
    .single()
  const f = q.data as FileRow | null
  if (q.error || !f || f.estado_tecnico !== 'CONFIRMADO')
    throw new DocumentoError(403, 'DOCUMENT_ACCESS')
  const result = await server.storage.from(EXPEDIENTE_BUCKET).download(f.object_key)
  if (result.error || !result.data) throw new DocumentoError(404, 'DOCUMENT_FILE_UNAVAILABLE')
  if (result.data.size > 5242880) throw new DocumentoError(503, 'DOCUMENT_INTEGRITY')
  const bytes = new Uint8Array(await result.data.arrayBuffer())
  if (bytes.length !== f.bytes || (await sha256(bytes)) !== f.sha256)
    throw new DocumentoError(503, 'DOCUMENT_INTEGRITY')
  // Recheck current DB authorization/context after I/O, before ANY bytes leave Edge.
  const manifest = (await call(server, 'registrar_descarga_expediente', {
    p_actor: actor,
    p_documento_id: d.id,
    p_archivo_id: f.id,
    p_historico: input.historico,
    p_template_version: d.origen === 'GENERADO' ? templateVersion(d.codigo) : null,
  })) as FileRow & { historico: boolean }
  return {
    bytes,
    mime: f.mime,
    historico: manifest.historico,
    filename: `documento.${f.mime === 'application/pdf' ? 'pdf' : f.mime === 'image/png' ? 'png' : 'jpg'}`,
  }
}
