import { expect, it } from 'vitest'
import { renderWordDocument } from '../src/documents/wordDocument'
import { fichaFixture } from './ficha-fixture'
import { generatedCodes } from '../src/documents/contracts'
import { wordParts, wordText } from './word-parts'
import { institutionalNote } from '../supabase/functions/_shared/ficha/note'

const at = new Date('2026-11-09T17:00:00Z')
const data = { capitania_nombre: 'PISCO', apoderado_nombre: 'APODERADO DE EJEMPLO', apoderado_tipo_di_etiqueta: 'DNI', apoderado_numero_di: '00000002' }
it.each(generatedCodes)('creates an editable safe OOXML Word for %s with the version date and original identity', async code => {
  const source = fichaFixture(), before = JSON.stringify(source)
  const blob = renderWordDocument(code, source, at, data), parts = await wordParts(blob)
  expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  expect(Object.keys(parts)).toContain('[Content_Types].xml'); expect(Object.keys(parts)).toContain('word/styles.xml')
  for (const [name, bytes] of Object.entries(parts)) if (name.endsWith('.xml') || name.endsWith('.rels')) {
    const raw = new TextDecoder().decode(bytes)
    expect(new DOMParser().parseFromString(raw, 'application/xml').getElementsByTagName('parsererror')).toHaveLength(0)
    expect(raw).not.toMatch(/TargetMode="External"|altChunk|INCLUDETEXT|INCLUDEPICTURE|vbaProject|w:instrText/)
  }
  const text = wordText(parts['word/document.xml'])
  expect(text).toContain('ÁNGELA LUCÍA'); expect(text).toContain('MUÑOZ'); expect(text).toContain('QUIÑONES'); expect(text).toContain('00000001')
  expect(text).toContain('9 de noviembre de 2026'); expect(text).not.toContain(source.id)
  expect(text).not.toContain('source_fingerprint'); expect(JSON.stringify(source)).toBe(before)
  if (code === 'FICHA_MATRICULA') { expect(parts['word/media/escudo.png']).toBeDefined(); for (const note of institutionalNote) expect(text).toContain(note) }
  else expect(parts['word/media/escudo.png']).toBeUndefined()
  if (code === 'CARTA_PODER') expect(text).toContain(data.apoderado_nombre)
})
it('escapes personal text as plain XML, never as fields, links or markup', async () => {
  const source = fichaFixture(); source.datos_ficha.alumno.nombres = '<w:fldSimple w:instr="DDE"> & Ñ'
  const parts = await wordParts(renderWordDocument('DECLARACION_JURADA', source, at, data))
  const raw = new TextDecoder().decode(parts['word/document.xml'])
  expect(raw).toContain('&lt;w:fldSimple'); expect(raw).not.toContain('<w:fldSimple'); expect(wordText(parts['word/document.xml'])).toContain('<w:fldSimple w:instr="DDE"> & Ñ')
})
it('retains long names and all emergency contacts as editable text', async () => {
  const source = fichaFixture(100); source.datos_ficha.alumno.nombres = 'Ñ'.repeat(400)
  const text = wordText((await wordParts(renderWordDocument('FICHA_DATOS_PERSONALES', source, at, data)))['word/document.xml'])
  expect(text).toContain('Ñ'.repeat(400)); expect(text).toContain('MUÑOZ 100')
})
it('uses final closure data explicitly and rejects unsupported templates, missing representative or invalid dates', async () => {
  const source = fichaFixture(); source.fuente = 'cierre'; source.ciclo!.estado_codigo = 'CERRADO'
  expect(wordText((await wordParts(renderWordDocument('FICHA_DATOS_PERSONALES', source, at, data)))['word/document.xml'])).toContain('ÁNGELA')
  expect(() => renderWordDocument('UNKNOWN', source, at, data)).toThrow()
  expect(() => renderWordDocument('CARTA_PODER', source, at, {})).toThrow()
  expect(() => renderWordDocument('SOLICITUD', source, new Date('invalid'), data)).toThrow()
  source.fuente = 'vigente'; expect(() => renderWordDocument('SOLICITUD', source, at, data)).toThrow()
})
