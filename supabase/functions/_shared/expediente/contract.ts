import { uuid } from '../ficha/contract.ts'
export const EXPEDIENTE_BUCKET = 'h6-expediente'
export const MAX_FILE = 5 * 1024 * 1024
export const GENERADO_CODES = ['SOLICITUD', 'DECLARACION_JURADA', 'CARTA_PODER', 'FICHA_DATOS_PERSONALES', 'FICHA_MATRICULA'] as const
export class DocumentoError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}
export function templateVersion(code: string) {
  if (!(GENERADO_CODES as readonly string[]).includes(code)) throw new DocumentoError(422, 'DOCUMENT_TEMPLATE')
  return `h6-1:${code}`
}
export function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new DocumentoError(422, 'DOCUMENT_INPUT')
  return value as Record<string, unknown>
}
export function identifier(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new DocumentoError(422, 'DOCUMENT_INPUT')
  return value
}
export function version(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new DocumentoError(422, 'DOCUMENT_INPUT')
  return value
}
export function generationRequest(value: unknown) {
  const v = object(value, ['documento_id', 'expected_updated_at', 'datos_generacion'])
  const data = object(v.datos_generacion ?? {}, ['apoderado_nombre', 'apoderado_tipo_di_id', 'apoderado_numero_di'])
  if (Object.values(data).some(x => typeof x !== 'string')) throw new DocumentoError(422, 'DOCUMENT_INPUT')
  return { documento_id: identifier(v.documento_id), expected_updated_at: version(v.expected_updated_at), datos_generacion: data }
}
export function downloadRequest(value: unknown) {
  const v = object(value, ['documento_id', 'archivo_id', 'historico'])
  if (v.historico !== undefined && typeof v.historico !== 'boolean') throw new DocumentoError(422, 'DOCUMENT_INPUT')
  return { documento_id: identifier(v.documento_id), archivo_id: identifier(v.archivo_id), historico: v.historico === true }
}
export const sha256 = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer))].map(x => x.toString(16).padStart(2, '0')).join('')
// Only known safe error categories leave Edge. SQL details/PII/keys never leave this boundary.
export function databaseError(error: { code?: string; message?: string }) {
  const permitted = ['DOCUMENT_SOURCE_CHANGED', 'DOCUMENT_STATE', 'DOCUMENT_HISTORY_REQUIRED', 'DOCUMENT_RESERVATION_EXISTS', 'DOCUMENT_REPRESENTATIVE_REQUIRED', 'DOCUMENT_ALREADY_CONFIRMED', 'DOCUMENT_SNAPSHOT']
  const code = permitted.includes(error.message ?? '') ? error.message! : error.code === '42501' ? 'DOCUMENT_ACCESS' : ['PT409','40001','40P01'].includes(error.code ?? '') ? 'DOCUMENT_VERSION' : ['22023','23514','23502'].includes(error.code ?? '') ? 'DOCUMENT_INPUT' : 'DOCUMENT_UNAVAILABLE'
  return new DocumentoError(error.code === '42501' ? 403 : ['PT409','40001','40P01'].includes(error.code ?? '') ? 409 : ['22023','23514','23502'].includes(error.code ?? '') ? 422 : 503, code)
}
