// H5: closed input and provenance contract. No current Alumno lookup is permitted.
export class FichaError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code }
}
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export type FichaRequest = { matricula_id: string; expected_updated_at: string; artefacto_id?: string }
export function parseRequest(value: unknown): FichaRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new FichaError(422, 'INPUT')
  const v = value as Record<string, unknown>
  if (Object.keys(v).some(k => !['matricula_id', 'expected_updated_at', 'artefacto_id'].includes(k)) ||
    typeof v.matricula_id !== 'string' || !uuid.test(v.matricula_id) ||
    typeof v.expected_updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(v.expected_updated_at) || !Number.isFinite(Date.parse(v.expected_updated_at)) ||
    ('artefacto_id' in v && (typeof v.artefacto_id !== 'string' || !uuid.test(v.artefacto_id)))) throw new FichaError(422, 'INPUT')
  return v as FichaRequest
}
export type RecordData = Record<string, unknown>
export type Source = {
  id: string; updated_at: string; created_at: string; estado_codigo: string; codigo_matricula: string;
  alumno_snapshot: { alumno: RecordData; catalogos: Record<string, { etiqueta?: string }>; geografia: Record<string, string>; contactos: RecordData[] };
  ciclo: { codigo_ciclo: string; nombre_promocion: string | null; estado_codigo: string; carrera: { nombre: string } | null; distrito?: { nombre: string } | null } | null;
  empresa_patrocinadora_id: string | null;
  empresa_patrocinadora: RecordData | null;
}
export function requireEligible(source: Source, request: FichaRequest) {
  if (!source.ciclo || !source.ciclo.carrera || (source.empresa_patrocinadora_id && !source.empresa_patrocinadora)) throw new FichaError(403, 'ACCESS')
  if (source.estado_codigo !== 'ACTIVO' || !['PROGRAMADO', 'EN_CURSO', 'CERRADO'].includes(source.ciclo.estado_codigo)) throw new FichaError(409, 'STATE')
  // Preserve microseconds: Date.parse alone would miss sub-millisecond conflicts.
  const canonical = (s: string) => {
    const instant = Date.parse(s)
    const fraction = s.match(/\.(\d+)/)?.[1]?.padEnd(6, '0') ?? '000000'
    return `${Math.floor(instant / 1000)}:${fraction}`
  }
  if (canonical(source.updated_at) !== canonical(request.expected_updated_at)) throw new FichaError(409, 'VERSION')
}
export const limaDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
export function ageAtEnrollment(birth: string, createdAt: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || !Number.isFinite(Date.parse(createdAt))) return 'Sin dato'
  const day = limaDate(new Date(createdAt))
  const age = Number(day.slice(0, 4)) - Number(birth.slice(0, 4)) - Number(day.slice(5) < birth.slice(5))
  return age >= 0 ? `${age} años` : 'Sin dato'
}
export type FichaSection = { title: string; fields: [string, string][] }
export function projectFicha(source: Source, now: Date): { sections: FichaSection[]; contacts: string[][]; code: string; emitted: string } {
  const snap = source.alumno_snapshot
  if (!snap?.alumno || !snap.catalogos || !snap.geografia || !Array.isArray(snap.contactos)) throw new FichaError(422, 'SNAPSHOT')
  if (snap.contactos.length > 100) throw new FichaError(413, 'LIMIT')
  const a = snap.alumno, text = (v: unknown) => v === null || v === undefined || v === '' ? 'Sin dato' : String(v)
  const cat = (key: string) => text(snap.catalogos[key]?.etiqueta)
  const geo = (prefix: string) => ['departamento', 'provincia', 'distrito'].map(k => text(snap.geografia[String(a[`${prefix}_${k}_id`])])).join(' / ')
  const company = source.empresa_patrocinadora
  return {
    code: source.codigo_matricula,
    emitted: new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now),
    sections: [
      { title: 'Matrícula y contexto de emisión', fields: [ ['Matrícula', source.codigo_matricula], ['Fecha de matrícula', limaDate(new Date(source.created_at))], ['Ciclo', text(source.ciclo?.codigo_ciclo)], ['Curso', text(source.ciclo?.carrera?.nombre)], ['Promoción', text(source.ciclo?.nombre_promocion)], ['Libro', ''], ['Folio', ''], ['Registro', ''] ] },
      { title: 'Identificación histórica del alumno', fields: [ ['Código de alumno', text(a.codigo_alumno)], ['Apellidos', `${text(a.apellido_paterno)} ${text(a.apellido_materno)}`], ['Nombres', text(a.nombres)], ['Tipo de documento', cat('TIPO_DI')], ['Número de documento', text(a.numero_di)], ['Fecha de nacimiento', text(a.fecha_nacimiento)], ['Edad a la matrícula', ageAtEnrollment(String(a.fecha_nacimiento), source.created_at)], ['Sexo', cat('SEXO')], ['Estado civil', cat('ESTADO_CIVIL')], ['Lugar de nacimiento', geo('nacimiento')] ] },
      { title: 'Domicilio y comunicación históricos', fields: [['Domicilio', text(a.domicilio)], ['N° / Mz / Lt', text(a.numero_mz_lt)], ['Ubicación', geo('domicilio')], ['Celular', text(a.celular)], ['Teléfono fijo', text(a.telefono_fijo)], ['Correo electrónico', text(a.email)]] },
      { title: 'Información adicional histórica', fields: [['Grupo sanguíneo', cat('GRUPO_SANGUINEO')], ['Grado de instrucción', cat('GRADO_INSTRUCCION')], ['Color de ojos', cat('COLOR_OJOS')], ['Color de cabello', cat('COLOR_CABELLO')], ['Estatura (cm)', text(a.estatura_cm)], ['Peso (kg)', text(a.peso_kg)], ['Ocupación', text(a.ocupacion) === 'Sin dato' ? cat('OCUPACION') : text(a.ocupacion)], ['Señas particulares', text(a.senas_particulares)]] },
      { title: 'Patrocinador actual al emitir', fields: [['Razón social', text(company?.razon_social)], ['RUC', text(company?.ruc)], ['Persona de contacto', text(company?.persona_contacto)], ['Teléfono', text(company?.telefono)], ['Correo electrónico', text(company?.email)]] },
    ],
    contacts: snap.contactos.map(c => [text(c.apellido), text(c.nombre), text((c.parentesco as { etiqueta?: string } | undefined)?.etiqueta), text(c.celular), text(c.direccion)]),
  }
}
