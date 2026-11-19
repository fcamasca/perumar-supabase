export type DocumentType = {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  origen: 'SUBIDO' | 'GENERADO'
  activo: boolean
  updated_at: string
}
export type CycleDocument = {
  id: string
  tipo_documento_id: string
  obligatorio: boolean
  activo: boolean
  updated_at: string
}
export type AppliedDocument = {
  id: string
  matricula_id: string
  ciclo_documento_id: string
  codigo: string
  nombre: string
  origen: 'SUBIDO' | 'GENERADO'
  estado: 'PENDIENTE' | 'CARGADO' | 'GENERADO'
  activo: boolean
  contexto_vigente: boolean
  obligatorio: boolean
  updated_at: string
  ultimo_archivo_confirmado_id: string | null
}
export type DocumentFile = {
  id: string
  matricula_documento_id: string
  estado_tecnico: string
  iniciado_por: string
  iniciado_at: string
  confirmado_at: string | null
  plantilla_version: string | null
  fuente_base_fingerprint: string | null
  datos_generacion: Record<string, string>
  mime: string | null
  bytes: number | null
}
export const generatedCodes = [
  'SOLICITUD',
  'DECLARACION_JURADA',
  'CARTA_PODER',
  'FICHA_DATOS_PERSONALES',
  'FICHA_MATRICULA',
]
const messages: Record<string, string> = {
  DOCUMENT_SESSION: 'La sesión venció. Inicia sesión nuevamente.',
  DOCUMENT_ACCESS: 'Tu acceso ya no permite esta operación.',
  DOCUMENT_VERSION:
    'La información cambió. Consulta el estado y decide nuevamente; tu borrador se conserva.',
  DOCUMENT_SOURCE_CHANGED:
    'La fuente cambió. Consulta el estado antes de solicitar una nueva generación.',
  DOCUMENT_HISTORY_REQUIRED:
    'Esta versión es histórica o su fuente cambió. Descárgala explícitamente desde Historia.',
  DOCUMENT_STATE: 'La matrícula, el Ciclo o la aplicación ya no admiten esta modificación.',
  DOCUMENT_RESERVATION_EXISTS:
    'Existe una operación pendiente. Consulta su resultado o cancela la reserva antes de volver a intentar.',
  DOCUMENT_FILE_INVALID:
    'Archivo no admitido. Usa PDF simple sin cifrado, formularios, enlaces ni contenido activo, o una imagen JPEG/PNG válida.',
  DOCUMENT_PHOTO_FORMAT: 'Foto del alumno admite únicamente imágenes JPG/JPEG o PNG; no admite PDF.',
  DOCUMENT_IMAGE_INVALID: 'No se pudo validar la imagen. Vuelve a exportarla como JPG/JPEG o PNG e intenta cargar el nuevo archivo.',
  DOCUMENT_IMAGE_LIMIT: 'No se pudo procesar la imagen dentro de los recursos disponibles. Exporta una copia optimizada e intenta nuevamente.',
  DOCUMENT_LIMIT:
    'El archivo supera los límites: máximo 5 MiB y, para PDF, hasta 20 páginas.',
  DOCUMENT_REPRESENTATIVE_REQUIRED:
    'Completa el nombre y documento del apoderado para esta generación.',
  DOCUMENT_GLYPH: 'Hay caracteres que la plantilla no puede representar. Revisa los datos.',
  DOCUMENT_SNAPSHOT: 'La fotografía final del Ciclo no está disponible. Solicita revisión.',
  DOCUMENT_NOT_OPTIONAL:
    'Solo puedes retirar un documento opcional activo del contexto vigente. Consulta su configuración y decide nuevamente.',
  DOCUMENT_TYPE_CONFIGURED:
    'Desactiva primero este tipo de documento en los Ciclos donde está aplicado antes de inactivarlo.',
  DOCUMENT_TYPE_INVALID: 'Selecciona tipos activos sin repetir el mismo documento en el Ciclo.',
  DOCUMENT_TYPE_HISTORY_IMMUTABLE:
    'El código y origen de un tipo ya utilizado no pueden modificarse.',
}
export function documentError(error: { code?: string; message?: string }) {
  return (
    messages[error.code ?? ''] ??
    messages[error.message ?? ''] ??
    (['PT409', '40001', '40P01'].includes(error.code ?? '')
      ? messages.DOCUMENT_VERSION
      : error.code === '42501'
        ? messages.DOCUMENT_ACCESS
        : error.code === '23505'
          ? 'Ya existe un tipo de documento con ese código o una configuración repetida.'
          : 'No se pudo completar la operación. Consulta su resultado antes de intentar nuevamente; no se reintentó automáticamente.')
  )
}
