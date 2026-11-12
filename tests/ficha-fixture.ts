import type { Source } from '../supabase/functions/_shared/ficha/contract'
export function fichaFixture(contacts = 1): Source {
  return {
    id: '11111111-1111-4111-8111-111111111111', updated_at: '2026-11-12T12:00:00.123456+00:00', created_at: '2026-01-02T02:00:00Z', estado_codigo: 'ACTIVO', codigo_matricula: '2026-MA-001',
    empresa_patrocinadora_id: null, empresa_patrocinadora: null,
    ciclo: { codigo_ciclo: '2026-001-MA', nombre_promocion: 'PROMOCIÓN SINTÉTICA', estado_codigo: 'PROGRAMADO', carrera: { nombre: 'MARINERO DE PESCA ARTESANAL' } },
    alumno_snapshot: { alumno: { apellido_paterno: 'MUÑOZ', apellido_materno: 'QUIÑONES', nombres: 'ÁNGELA LUCÍA', codigo_alumno: 'A-0000001', numero_di: '00000001', fecha_nacimiento: '2000-01-02', domicilio: 'DIRECCIÓN SINTÉTICA', celular: '900000001', senas_particulares: 'Ñ ñ Á É Í Ó Ú á é í ó ú ü Ü ¿Qué? ¡Sí!' }, catalogos: { TIPO_DI: { etiqueta: 'DNI' }, SEXO: { etiqueta: 'FEMENINO' } }, geografia: {}, contactos: Array.from({ length: contacts }, (_, i) => ({ apellido: `MUÑOZ ${i + 1}`, nombre: 'CONTACTO SINTÉTICO', parentesco: { etiqueta: 'Madre' }, celular: '900000002', direccion: 'DIRECCIÓN DE PRUEBA' })) },
  }
}
