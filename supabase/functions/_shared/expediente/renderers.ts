import { ageAtEnrollment, type Source } from '../ficha/contract.ts'
import { renderFicha } from '../ficha/render.ts'
import { DocumentoError, templateVersion } from './contract.ts'
import { renderDeclaration } from './declaration.ts'
import { renderReferenceForm } from './referenceForms.ts'

// Four fixed institutional forms, not a database-configurable template engine.
export async function renderExpediente(
  code: string,
  source: Source,
  at: Date,
  data: Record<string, string>,
) {
  const version = templateVersion(code)
  if (code === 'FICHA_MATRICULA') return renderFicha(source, at, 'H6')
  if (!source.datos_ficha?.alumno || !Number.isFinite(at.getTime()))
    throw new DocumentoError(422, 'DOCUMENT_SNAPSHOT')
  const a = source.datos_ficha.alumno,
    snap = source.datos_ficha
  if (snap.contactos.length > 100) throw new DocumentoError(413, 'DOCUMENT_LIMIT')
  const text = (v: unknown) => (v === null || v === undefined ? '' : String(v))
  const cat = (key: string) => text(snap.catalogos[key]?.etiqueta)
  const geo = (prefix: string, part: string) =>
    text(snap.geografia[text(a[`${prefix}_${part}_id`])])
  const name = [a.nombres, a.apellido_paterno, a.apellido_materno]
    .map(text)
    .filter(Boolean)
    .join(' ')
  const age = ageAtEnrollment(text(a.fecha_nacimiento), at.toISOString()).replace('Sin dato', '')
  const course = text(source.ciclo?.carrera?.nombre),
    place = text(source.ciclo?.distrito?.nombre)
  const authority = data.capitania_nombre || place
  const date = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(at)
  const address = [a.domicilio, a.numero_mz_lt].map(text).filter(Boolean).join(' ')
  const identity = `Yo, ${name}, de ${age}${age ? ' de edad' : ''}, identificado con ${cat('TIPO_DI')} N.º ${text(a.numero_di)}, de estado civil ${cat('ESTADO_CIVIL')}, con domicilio legal en ${address}, del Distrito de ${geo('domicilio', 'distrito')}, Provincia de ${geo('domicilio', 'provincia')} y Departamento de ${geo('domicilio', 'departamento')}`
  if (code === 'DECLARACION_JURADA')
    return renderDeclaration(identity, name, `${cat('TIPO_DI')} ${text(a.numero_di)}`, `${place}${place ? ', ' : ''}${date}`, at, version)
  if (code === 'CARTA_PODER' && (!data.apoderado_nombre || !data.apoderado_numero_di))
    throw new DocumentoError(422, 'DOCUMENT_REPRESENTATIVE_REQUIRED')
  return renderReferenceForm(code, {
    source, at, version, name, document: `${cat('TIPO_DI')} ${text(a.numero_di)}`,
    identity, course, authority, placeAndDate: `${place}${place ? ', ' : ''}${date}`,
    address, cat, geo, text, data,
  })
}
