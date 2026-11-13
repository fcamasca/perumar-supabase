import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PDFArray, PDFDocument, PDFName, PDFRawStream, StandardFonts, decodePDFRawStream } from 'pdf-lib'
import { renderFicha } from '../supabase/functions/_shared/ficha/render'
import { fichaFixture } from './ficha-fixture'

// Inspect actual PDF operators, not a renderer trace or a second copy of its layout algorithm.
async function inspect(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes)
  const pages = pdf.getPages().map(page => {
    const contents = page.node.Contents()
    const streams = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : []
    const operators = streams.map(ref => {
      const stream = pdf.context.lookup(ref)
      return stream instanceof PDFRawStream ? new TextDecoder().decode(decodePDFRawStream(stream).decode()) : ''
    }).join('\n')
    const words = [...operators.matchAll(/BT([\s\S]*?)ET/g)].flatMap(([, block]) => {
      const hex = block.match(/<([0-9A-Fa-f]+)> Tj/), position = block.match(/1 0 0 1 ([-\d.]+) ([-\d.]+) Tm/), font = block.match(/ ([\d.]+) Tf/)
      if (!hex || !position || !font) return []
      const value = String.fromCharCode(...(hex[1].match(/../g) ?? []).map(pair => parseInt(pair, 16)))
      return [{ value, x: Number(position[1]), y: Number(position[2]), size: Number(font[1]) }]
    })
    return { page, words }
  })
  return { pdf, pages, text: pages.map(p => p.words.map(w => w.value).join('\n')).join('\n') }
}
const now = new Date('2026-11-12T20:00:00Z')

it('fits the normal institutional form with one contact and no sponsor on one A4 page', async () => {
  const result = await inspect(await renderFicha(fichaFixture(), now))
  expect(result.pages).toHaveLength(1)
  expect(result.pages[0].page.getWidth()).toBeCloseTo(595.28)
  expect(result.pages[0].page.getHeight()).toBeCloseTo(841.89)
  expect(result.pages[0].words.length).toBeGreaterThan(45)
})
it('keeps Libro Folio Registro visible with no text in their value cells', async () => {
  const { pages } = await inspect(await renderFicha(fichaFixture(), now))
  const words = pages[0].words, date = words.find(w => w.value === '2026-01-01')!
  expect(date).toBeDefined()
  for (const label of ['LIBRO', 'FOLIO', 'REGISTRO']) {
    const header = words.find(w => w.value === label)!
    expect(header).toBeDefined()
    expect(words.filter(w => w.y < header.y && w.y >= date.y - 1 && w.x >= header.x - 3 && w.x <= header.x + 25)).toEqual([])
  }
  expect(words.find(w => w.value === 'FECHA')).toBeDefined()
})
it('prints the institutional title, horizontal groups and signature/fingerprints without a photo space (CHG-H5-001)', async () => {
  const result = await inspect(await renderFicha(fichaFixture(), now))
  for (const label of ['FICHA DE MATRÍCULA', 'CURSO MODELO DE LA AUTORIDAD MARÍTIMA', 'Apellido Paterno', 'Apellido Materno', 'Nombres Completos', 'FIRMA', 'Índice Izquierdo', 'Índice Derecho']) expect(result.text).toContain(label)
  const words = result.pages[0].words
  const personal = ['Apellido Paterno', 'Apellido Materno', 'Nombres Completos'].map(label => words.find(w => w.value === label)!)
  expect(new Set(personal.map(w => w.y)).size).toBe(1)
  expect(result.text).not.toContain('FOTO')
  expect(result.text).toContain('DECLARA BAJO JURAMENTO')
  expect(result.text).toContain('Nota:')
})

it('preserves the complete human-supplied Note literally, including apparent spelling errors', async () => {
  const expected = readFileSync('tests/fixtures/h5-note-chg001.txt', 'utf8').trim().replace(/\s+/g, ' ')
  const { text } = await inspect(await renderFicha(fichaFixture(), now))
  expect(text.replace(/\s+/g, ' ')).toContain(expected)
  for (const marker of ['1.-', '2.-', 'a.', 'b.', 'c.', 'd.', 'e.']) expect(text).toContain(marker)
  for (const literal of ['especficas', 'luga,', 'continuation stamp mis hulas deciares y firm correspondiente.', '42° de la Ley 27444.']) expect(text.replace(/\s+/g, ' ')).toContain(literal)
})

it('keeps Note above the two physical fingerprint spaces/signature and out of the footer', async () => {
  const { pages } = await inspect(await renderFicha(fichaFixture(), now))
  expect(pages).toHaveLength(1)
  const words = pages[0].words, end = words.find(w => w.value.startsWith('e. Para mayor veracidad'))!
  expect(end).toBeDefined()
  for (const label of ['Índice Izquierdo', 'Índice Derecho', 'FIRMA']) {
    const mark = words.find(w => w.value === label)!
    expect(end.y - mark.y).toBeGreaterThanOrEqual(91)
    expect(mark.y).toBeGreaterThan(49)
  }
  expect(words.some(w => w.value.startsWith('Matrícula:') || w.value.startsWith('Alumno:'))).toBe(false)
})
it('centers only the course name in the header and simplifies labels without converting measurements', async () => {
  const source = fichaFixture(); source.datos_ficha.alumno.estatura_cm = 164; source.datos_ficha.alumno.peso_kg = 80
  const { pdf, pages, text } = await inspect(await renderFicha(source, now))
  const font = await pdf.embedFont(StandardFonts.Helvetica), course = pages[0].words.find(w => w.value === source.ciclo!.carrera!.nombre)!
  expect(course.x + font.widthOfTextAtSize(course.value, course.size) / 2).toBeCloseTo(135 + (595.28 - 72 - 99 - 193) / 2)
  for (const label of ['FECHA', 'Estatura', 'Peso', '164', '80']) expect(text).toContain(label)
  for (const label of ['FECHA DE', 'Estatura (cm)', 'Peso (kg)', 'A-0000001', 'Ciclo:']) expect(text).not.toContain(label)
})
it('prints current Cycle district and historical enrollment day in Lima above the physical signature', async () => {
  const source = fichaFixture(); source.datos_ficha.geografia = { elsewhere: 'OTRO DISTRITO' }
  source.created_at = '2026-01-18T02:00:00Z'
  const { pages, text } = await inspect(await renderFicha(source, now))
  const words = pages.at(-1)!.words, date = words.find(w => w.value === 'Pisco, 17 de enero de 2026')!, signature = words.find(w => w.value === 'FIRMA')!
  expect(date).toBeDefined(); expect(date.y).toBeGreaterThan(signature.y + 20)
  expect(text).toContain('2026-01-17')
  expect(text).toContain('Emisión Lima: 12/11/2026')
  delete source.ciclo!.distrito
  expect((await inspect(await renderFicha(source, now))).text).toContain('Sin dato, 17 de enero de 2026')
})
it('embeds the institutional logo locally and preserves Spanish historical values and emergency contact', async () => {
  const result = await inspect(await renderFicha(fichaFixture(), now))
  const images = result.pages[0].page.node.Resources()?.lookup(PDFName.of('XObject'))
  expect(images?.toString()).toContain('Image')
  for (const value of ['MUÑOZ', 'QUIÑONES', 'ÁNGELA LUCÍA', '25 años', 'Madre', '900000002', 'DIRECCIÓN DE PRUEBA']) expect(result.text).toContain(value)
  expect(result.text).toContain('Emisión Lima: 12/11/2026, 15:00:00')
})
it('retains all sponsor fields in the horizontal sponsor table without changing its source', async () => {
  const source = fichaFixture()
  source.empresa_patrocinadora_id = '22222222-2222-4222-8222-222222222222'
  source.empresa_patrocinadora = { razon_social: 'PATROCINADOR SINTÉTICO', ruc: '20000000001', persona_contacto: 'PEÑA', telefono: '010000001', email: 'sponsor@example.invalid' }
  const before = JSON.stringify(source), result = await inspect(await renderFicha(source, now))
  for (const value of ['PATROCINADOR SINTÉTICO', 'RUC: 20000000001', 'PEÑA', '010000001', 'sponsor@example.invalid']) expect(result.text.replaceAll('\n', '')).toContain(value)
  expect(JSON.stringify(source)).toBe(before)
})
it('does not shrink fonts or overlap running header/footer when 100 contacts continue', async () => {
  const result = await inspect(await renderFicha(fichaFixture(100), now))
  expect(result.pages.length).toBeGreaterThan(1)
  expect(result.pages.length).toBeLessThanOrEqual(20)
  for (const [index, { words }] of result.pages.entries()) {
    expect(words.every(w => w.size >= 9)).toBe(true)
    expect(words.every(w => w.y >= 25 && w.y <= 806)).toBe(true)
    expect(words.filter(w => w.y < 49).map(w => w.value)).toEqual([expect.stringContaining('Emisión Lima:'), `Página ${index + 1} de ${result.pages.length}`])
    expect(words.filter(w => !w.value.startsWith('Página ') && !w.value.startsWith('Emisión Lima:')).every(w => w.y >= 49)).toBe(true)
  }
  for (let i = 1; i <= 100; i++) expect(result.text).toContain(`MUÑOZ ${i},`)
})
it('wraps maximum personal fields and unbroken contact addresses without losing text', async () => {
  const source = fichaFixture(3)
  source.datos_ficha.alumno.nombres = 'Á'.repeat(150)
  source.datos_ficha.alumno.domicilio = 'D'.repeat(500)
  source.datos_ficha.alumno.senas_particulares = 'Ñ'.repeat(500)
  source.datos_ficha.contactos.forEach(c => { c.direccion = 'W'.repeat(500) })
  const result = await inspect(await renderFicha(source, now)), text = result.text.replaceAll('\n', '')
  expect(result.pages.length).toBeGreaterThan(1)
  expect(text).toContain('Á'.repeat(150)); expect(text).toContain('D'.repeat(500)); expect(text).toContain('Ñ'.repeat(500))
  expect((text.match(/W/g) ?? []).length).toBe(1500)
})
