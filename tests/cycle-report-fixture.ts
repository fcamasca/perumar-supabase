import type { MatrixColumn, ReportRow } from '../src/reports/reportData'
export const reportDocuments: MatrixColumn[] = [
  ['CARTA', 'Carta poder'], ['ESTUDIOS', 'Certificado de estudios'], ['PSICO', 'Certificado psicofísico'],
  ['DECLARACION', 'Declaración jurada'], ['DI', 'Documento de identidad'], ['DATOS', 'Ficha de datos personales'],
  ['MATRICULA', 'Ficha de matrícula'], ['FOTO', 'Foto del alumno'], ['SOLICITUD', 'Solicitud de inscripción y obtención de Libreta de Embarco / Carné'],
].map(([codigo, nombre]) => ({ codigo, nombre }))
export const reportContext = { cycleCode: '2026-1001-MA', search: 'PÉREZ', includeCancelled: false, at: new Date('2026-11-20T17:00:00Z') }
export function reportFixture(index = 0, documents = reportDocuments): ReportRow {
  return {
    matricula_id: `private-internal-id-${index}`, codigo_matricula: `2026-MA-${String(index + 1).padStart(3, '0')}`, matricula_estado: 'ACTIVO',
    apellido_paterno: index ? `PRUEBA ${index}` : 'QUIROZ', apellido_materno: 'PÉREZ', nombres: 'JUAN ÁNGEL', numero_di: String(10000000 + index),
    aplicables: documents.length, completados: 0, pendientes: documents.length, faltantes: documents.map(d => d.nombre),
    base: '180.00', abonado: '120.00', pendiente: '60.00',
    documentos: documents.map((d, i) => ({ ...d, estado: (['GENERADO', 'CARGADO', 'PENDIENTE', null] as const)[i % 4] })),
  }
}
