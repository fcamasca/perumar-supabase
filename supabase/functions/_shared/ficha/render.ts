import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib'
import { FichaError, projectFicha, type Source } from './contract.ts'

export const TEMPLATE_VERSION = 'h5-1'
// Standard PDF fonts use WinAnsi: Spanish is supported, unsupported glyphs fail explicitly.
// No HTML, external resources, dynamic URLs, scripts, fonts or user-controlled templates.
export async function renderFicha(source: Source, now: Date): Promise<Uint8Array> {
  const model = projectFicha(source, now)
  const document = await PDFDocument.create()
  document.setTitle('Ficha de matrícula - PERÚ MAR')
  document.setProducer(`PERÚ MAR / ${TEMPLATE_VERSION}`)
  document.setCreationDate(now)
  const normal = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(.09, .22, .29), pale = rgb(.92, .95, .96), line = rgb(.72, .78, .81)
  const width = 595.28, height = 841.89, margin = 36, available = width - margin * 2
  let page!: PDFPage, y = 0
  const text = (value: string, x: number, baseline: number, strong = false, size = 9) => {
    try { page.drawText(value.normalize('NFC'), { x, y: baseline, font: strong ? bold : normal, size, color: ink }) }
    catch { throw new FichaError(422, 'GLYPH') }
  }
  const wrap = (value: string, max: number) => {
    // A measured character flow also handles unbroken tokens and explicit line breaks.
    const result: string[] = []
    for (const paragraph of value.replace(/\r\n?/g, '\n').split('\n')) {
      let current = ''
      for (const character of paragraph.normalize('NFC')) {
        if (character < ' ' && character !== '\t') throw new FichaError(422, 'GLYPH')
        let measured: number
        try { measured = normal.widthOfTextAtSize(current + character.replace('\t', ' '), 9) }
        catch { throw new FichaError(422, 'GLYPH') }
        if (measured > max && current) {
          const space = current.lastIndexOf(' ')
          if (space > 0) { result.push(current.slice(0, space)); current = current.slice(space + 1) }
          else { result.push(current); current = '' }
        }
        current += character.replace('\t', ' ')
      }
      result.push(current)
    }
    return result
  }
  const newPage = () => {
    if (document.getPageCount() >= 20) throw new FichaError(413, 'LIMIT')
    page = document.addPage([width, height]); y = height - margin
    text('PERÚ MAR', margin, y - 4, true, 17)
    text('FICHA DE MATRÍCULA', width - margin - 157, y - 3, true, 11)
    text(model.code, width - margin - 157, y - 18)
    y -= 34
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: ink })
    y -= 16
  }
  const ensure = (space: number) => { if (y - space < 49) newPage() }
  const heading = (title: string) => {
    ensure(48)
    page.drawRectangle({ x: margin, y: y - 20, width: available, height: 22, color: pale })
    text(title, margin + 7, y - 13, true, 10); y -= 29
  }
  newPage()
  for (const section of model.sections) {
    heading(section.title)
    for (const [label, value] of section.fields) {
      const lines = wrap(value, available - 151)
      let offset = 0
      while (offset < lines.length) {
        ensure(26)
        const take = Math.min(lines.length - offset, Math.floor((y - 55) / 12))
        text(offset === 0 ? label : `${label} (cont.)`, margin + 4, y - 9, true)
        for (let i = 0; i < take; i++) text(lines[offset + i], margin + 151, y - 9 - i * 12)
        y -= Math.max(21, take * 12 + 6); offset += take
        page.drawLine({ start: { x: margin, y: y + 3 }, end: { x: width - margin, y: y + 3 }, thickness: .3, color: line })
      }
    }
    y -= 8
  }
  const columns = [104, 104, 82, 80, available - 370]
  const firstContactHeight = model.contacts.length ? Math.max(...model.contacts[0].map((cell, i) => wrap(cell, columns[i] - 10).length)) * 12 + 10 : 24
  ensure(firstContactHeight + 57) // Keep section title/header with its first row.
  heading('Contactos de emergencia históricos')
  const row = (cells: string[], header = false) => {
    const lines = cells.map((cell, i) => wrap(cell, columns[i] - 10))
    const count = Math.max(...lines.map(l => l.length)), rowHeight = count * 12 + 10
    if (rowHeight > height - 140) throw new FichaError(413, 'LIMIT')
    if (y - rowHeight < 49) {
      newPage(); heading('Contactos de emergencia históricos (continuación)')
      if (!header) drawRow(['Apellidos', 'Nombres', 'Parentesco', 'Celular', 'Dirección'], true)
    }
    drawRow(cells, header)
  }
  const drawRow = (cells: string[], header: boolean) => {
    const lines = cells.map((cell, i) => wrap(cell, columns[i] - 10))
    const rowHeight = Math.max(...lines.map(l => l.length)) * 12 + 10
    let x = margin
    for (let i = 0; i < cells.length; i++) {
      page.drawRectangle({ x, y: y - rowHeight, width: columns[i], height: rowHeight, borderColor: line, borderWidth: .4, ...(header ? { color: pale } : {}) })
      lines[i].forEach((part, j) => text(part, x + 5, y - 13 - j * 12, header))
      x += columns[i]
    }
    y -= rowHeight
  }
  row(['Apellidos', 'Nombres', 'Parentesco', 'Celular', 'Dirección'], true)
  if (!model.contacts.length) { ensure(24); text('Sin contactos en la fotografía histórica.', margin + 5, y - 14); y -= 25 }
  for (const contact of model.contacts) row(contact)
  y -= 14; ensure(144); heading('Espacios de fotografía, firma y huellas')
  const boxes = [['Foto', 92], ['Firma del alumno', 227], ['Huellas', available - 319]] as const
  let x = margin
  for (const [label, boxWidth] of boxes) {
    page.drawRectangle({ x, y: y - 92, width: boxWidth, height: 92, borderColor: line, borderWidth: .6 })
    text(label, x + 7, y - 84); x += boxWidth
  }
  const total = document.getPageCount()
  document.getPages().forEach((p, i) => {
    page = p
    page.drawLine({ start: { x: margin, y: 38 }, end: { x: width - margin, y: 38 }, thickness: .5, color: line })
    text(`Emisión Lima: ${model.emitted}`, margin, 25)
    text(`Página ${i + 1} de ${total}`, width - margin - 76, 25)
  })
  const bytes = await document.save()
  if (bytes.length > 2 * 1024 * 1024) throw new FichaError(413, 'LIMIT')
  return bytes
}
