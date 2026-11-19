import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { renderExpediente } from '../../supabase/functions/_shared/expediente/renderers.ts'
import type { Source } from '../../supabase/functions/_shared/ficha/contract.ts'
import { generatedCodes } from './contracts.ts'

// Synthetic source only. This preview never reads pupils, invokes an RPC or writes Storage.
export async function buildDocumentPreview(code: string): Promise<Blob> {
  if (!generatedCodes.includes(code)) throw new Error('Formato no disponible para vista previa.')
  const source: Source = {
    id: '11111111-1111-4111-8111-111111111111', updated_at: '2030-01-15T17:00:00Z',
    created_at: '2030-01-15T17:00:00Z', estado_codigo: 'ACTIVO', codigo_matricula: 'EJEMPLO-001',
    fuente: 'vigente', source_fingerprint: 'a'.repeat(64),
    empresa_patrocinadora_id: null, empresa_patrocinadora: null,
    ciclo: { codigo_ciclo: 'EJEMPLO', nombre_promocion: 'PROMOCIÓN DE EJEMPLO', estado_codigo: 'PROGRAMADO', carrera: { nombre: 'MARINERO DE PESCA ARTESANAL' }, distrito: { nombre: 'PISCO' } },
    datos_ficha: {
      alumno: {
        apellido_paterno: 'APELLIDO', apellido_materno: 'DE EJEMPLO', nombres: 'PERSONA',
        codigo_alumno: 'EJEMPLO', numero_di: '00000000', fecha_nacimiento: '2000-01-01',
        domicilio: 'DOMICILIO DE EJEMPLO', numero_mz_lt: '100',
        nacimiento_distrito_id: 'd', nacimiento_provincia_id: 'p', nacimiento_departamento_id: 'r',
        domicilio_distrito_id: 'd', domicilio_provincia_id: 'p', domicilio_departamento_id: 'r',
        estatura_cm: 170, peso_kg: 70, senas_particulares: 'SIN SEÑAS PARTICULARES',
        celular: '000000000', email: 'ejemplo@example.invalid',
      },
      catalogos: {
        TIPO_DI: { etiqueta: 'DNI' }, SEXO: { etiqueta: 'MASCULINO' },
        ESTADO_CIVIL: { etiqueta: 'SOLTERO' }, GRADO_INSTRUCCION: { etiqueta: 'SECUNDARIA' },
        COLOR_OJOS: { etiqueta: 'MARRONES' }, COLOR_CABELLO: { etiqueta: 'NEGRO' },
        GRUPO_SANGUINEO: { etiqueta: 'O+' }, OCUPACION: { etiqueta: 'ESTUDIANTE' },
      },
      geografia: { d: 'PISCO', p: 'PISCO', r: 'ICA' },
      contactos: [{ apellido: 'DE EJEMPLO', nombre: 'CONTACTO', parentesco: { etiqueta: 'Familiar' }, celular: '000000000', direccion: 'DIRECCIÓN DE EJEMPLO' }],
    },
  }
  const bytes = await renderExpediente(code, source, new Date('2030-01-15T17:00:00Z'), {
    capitania_nombre: 'PISCO', apoderado_nombre: 'APODERADO DE EJEMPLO',
    apoderado_tipo_di_etiqueta: 'DNI', apoderado_numero_di: '00000000',
  })
  const pdf = await PDFDocument.load(bytes), font = await pdf.embedFont(StandardFonts.HelveticaBold)
  for (const page of pdf.getPages()) {
    page.drawText('VISTA PREVIA — DATOS DE EJEMPLO — SIN VALIDEZ', {
      x: 44, y: 14, size: 9, font, color: rgb(.65, .1, .1),
    })
  }
  return new Blob([Uint8Array.from(await pdf.save({ useObjectStreams: false })).buffer], { type: 'application/pdf' })
}
