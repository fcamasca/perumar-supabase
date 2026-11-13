import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { FichaError, projectFicha, type Source } from './contract.ts'
import { perumarLogoPng } from './brand.ts'
import { institutionalNote } from './note.ts'

export const TEMPLATE_VERSION = 'h5-1'
// CHG-H5-001 changes only photo/Note presentation; provenance, audit ID and budgets are unchanged.
export async function renderFicha(source: Source, now: Date): Promise<Uint8Array> {
  const model = projectFicha(source, now)
  const document = await PDFDocument.create()
  document.setTitle('Ficha de matrícula - PERÚ MAR')
  document.setProducer(`PERÚ MAR / ${TEMPLATE_VERSION} / CHG-H5-001`)
  document.setCreationDate(now)
  const normal = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const logo = await document.embedPng(Uint8Array.from(atob(perumarLogoPng), c => c.charCodeAt(0)))
  const ink = rgb(.09, .17, .21), border = rgb(.35, .39, .41), paper = rgb(.96, .97, .97)
  const width = 595.28, height = 841.89, margin = 36, available = width - margin * 2
  const bottom = 49, size = 9, leading = 11, padding = 3
  let page!: PDFPage, y = 0
  const text = (value: string, x: number, baseline: number, strong = false, fontSize = size) => {
    try { page.drawText(value.normalize('NFC'), { x, y: baseline, font: strong ? bold : normal, size: fontSize, color: ink }) }
    catch { throw new FichaError(422, 'GLYPH') }
  }
  const wrap = (value: string, max: number, font: PDFFont = normal, fontSize = size) => {
    const lines: string[] = []
    for (const paragraph of value.replace(/\r\n?/g, '\n').split('\n')) {
      let current = ''
      for (const character of paragraph.normalize('NFC')) {
        if (character < ' ' && character !== '\t') throw new FichaError(422, 'GLYPH')
        const next = character.replace('\t', ' ')
        let measured: number
        try { measured = font.widthOfTextAtSize(current + next, fontSize) }
        catch { throw new FichaError(422, 'GLYPH') }
        if (measured > max && current) {
          const space = current.lastIndexOf(' ')
          if (space > 0) { lines.push(current.slice(0, space)); current = current.slice(space + 1) }
          else { lines.push(current); current = '' }
        }
        current += next
      }
      lines.push(current)
    }
    return lines
  }
  const center = (value: string, x: number, cellWidth: number, baseline: number, strong = false, fontSize = size) => {
    let measured: number
    try { measured = (strong ? bold : normal).widthOfTextAtSize(value.normalize('NFC'), fontSize) }
    catch { throw new FichaError(422, 'GLYPH') }
    text(value, x + Math.max(padding, (cellWidth - measured) / 2), baseline, strong, fontSize)
  }
  const newPage = (first = false) => {
    if (document.getPageCount() >= 20) throw new FichaError(413, 'LIMIT')
    page = document.addPage([width, height]); y = height - margin
    if (!first) {
      page.drawImage(logo, { x: margin, y: y - 32, width: 32, height: 32 })
      text('PERÚ MAR', margin + 38, y - 12, true, 11)
      text('FICHA DE MATRÍCULA (continuación)', margin + 175, y - 11, true, 10)
      text(model.code, margin + 175, y - 25)
      y -= 39
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: .6, color: border })
      y -= 8
    }
  }
  const rowHeight = (lines: string[][]) => Math.max(17, Math.max(...lines.map(c => c.length)) * leading + padding * 2)
  const drawRow = (lines: string[][], widths: number[], rowSize: number, header: boolean, x = margin, labelColumn = false, centerFirstValue = false) => {
    for (let column = 0; column < widths.length; column++) {
      const cellHeader = header || (labelColumn && column === 0)
      page.drawRectangle({ x, y: y - rowSize, width: widths[column], height: rowSize, borderColor: border, borderWidth: .5, ...(cellHeader ? { color: paper } : {}) })
      lines[column].forEach((part, i) => {
        const baseline = y - padding - size - i * leading
        if (cellHeader) center(part, x, widths[column], baseline, true)
        else if (centerFirstValue && column === 0) center(part, x, widths[column], baseline)
        else text(part, x + padding, baseline)
      })
      x += widths[column]
    }
    y -= rowSize
  }
  // Concrete form tables; repeat headers, move ordinary rows and split truly oversized rows.
  // No font shrinking, omitted values or user-controlled templates/resources.
  const table = (labels: string[], values: string[][], widths: number[], x = margin, centerFirstValue = false) => {
    const headers = labels.map((label, i) => wrap(label, widths[i] - padding * 2, bold))
    const headerSize = rowHeight(headers)
    const measured = values.map(cells => cells.map((cell, i) => wrap(cell, widths[i] - padding * 2)))
    const maxRow = height - margin - 47 - bottom - headerSize
    const firstRow = measured[0] ? Math.min(rowHeight(measured[0]), maxRow) : 17
    if (y - headerSize - firstRow < bottom) newPage()
    drawRow(headers, widths, headerSize, true, x)
    for (const lines of measured) {
      let offset = 0
      const count = Math.max(...lines.map(c => c.length))
      if (y - rowHeight(lines) < bottom && rowHeight(lines) <= height - margin - 47 - bottom - headerSize) {
        newPage(); drawRow(headers, widths, headerSize, true, x)
      }
      while (offset < count) {
        let room = Math.floor((y - bottom - padding * 2) / leading)
        if (room < 1 || y - 17 < bottom) { newPage(); drawRow(headers, widths, headerSize, true, x); room = Math.floor((y - bottom - padding * 2) / leading) }
        const take = Math.min(count - offset, room)
        drawRow(lines.map(cell => cell.slice(offset, offset + take)), widths, Math.max(17, take * leading + padding * 2), false, x, false, centerFirstValue)
        offset += take
        if (offset < count) { newPage(); drawRow(headers, widths, headerSize, true, x) }
      }
    }
    y -= 4
  }
  const inlineField = (label: string, value: string, labelWidth = 103) => {
    const labelLines = wrap(label, labelWidth - padding * 2, bold), valueLines = wrap(value, available - labelWidth - padding * 2)
    const count = Math.max(labelLines.length, valueLines.length)
    if (y - (count * leading + padding * 2) < bottom) newPage()
    let offset = 0
    while (offset < count) {
      const room = Math.floor((y - bottom - padding * 2) / leading)
      if (room < 1 || y - 17 < bottom) { newPage(); continue }
      const take = Math.min(count - offset, room)
      drawRow([labelLines, valueLines.slice(offset, offset + take)], [labelWidth, available - labelWidth], Math.max(17, take * leading + padding * 2), false, margin, true)
      offset += take
      if (offset < count) newPage()
    }
    y -= 4
  }
  const section = (index: number) => Object.fromEntries(model.sections[index].fields)
  const context = section(0), identity = section(1), address = section(2), extra = section(3), sponsor = section(4)
  const a = source.alumno_snapshot.alumno
  const historical = (key: string) => a[key] === null || a[key] === undefined || a[key] === '' ? 'Sin dato' : String(a[key])
  const geo = (prefix: string, part: string) => source.alumno_snapshot.geografia[String(a[`${prefix}_${part}_id`])] || 'Sin dato'

  newPage(true)
  const top = y, headerX = margin + 99, headerWidth = available - 99
  page.drawImage(logo, { x: margin + 5, y: top - 80, width: 80, height: 80 })
  table(['CURSO', 'LIBRO', 'FOLIO', 'REGISTRO', 'FECHA'], [[context.Curso, '', '', '', context['Fecha de matrícula']]], [headerWidth - 193, 36, 36, 60, 61], headerX, true)
  y += 4
  table(['PROMOCIÓN', 'PATROCINADOR'], [[context.Promoción, source.empresa_patrocinadora ? sponsor['Razón social'] : '']], [headerWidth * .5, headerWidth * .5], headerX)
  y = Math.min(y, top - 80)
  center('FICHA DE MATRÍCULA', margin, available, y - 13, true, 15)
  center('CURSO MODELO DE LA AUTORIDAD MARÍTIMA', margin, available, y - 28, true, 11)
  y -= 36

  table(['Apellido Paterno', 'Apellido Materno', 'Nombres Completos'], [[historical('apellido_paterno'), historical('apellido_materno'), identity.Nombres]], [available * .30, available * .27, available * .43])
  table(['Estado Civil', 'Tipo Doc. Id.', 'N.º Doc. Id.', 'Edad', 'Sexo', 'Teléfono Fijo', 'Celular'], [[identity['Estado civil'], identity['Tipo de documento'], identity['Número de documento'], identity['Edad a la matrícula'], identity.Sexo, address['Teléfono fijo'], address.Celular]], [66, 71, 87, 44, 68, 94, available - 430])
  table(['Estatura', 'Peso', 'Grupo Sanguíneo/RH', 'Ojos', 'Cabello', 'Ocupación', 'Grado de Instrucción'], [[extra['Estatura (cm)'], extra['Peso (kg)'], extra['Grupo sanguíneo'], extra['Color de ojos'], extra['Color de cabello'], extra.Ocupación, extra['Grado de instrucción']]], [54, 47, 84, 56, 56, 110, available - 407])
  table(['Fecha de Nacimiento', 'Lugar de Nacimiento', 'Provincia', 'Departamento'], [[identity['Fecha de nacimiento'], geo('nacimiento', 'distrito'), geo('nacimiento', 'provincia'), geo('nacimiento', 'departamento')]], [103, 164, 125, available - 392])
  inlineField('Señas Particulares', extra['Señas particulares'])
  table(['Domicilio Actual', 'N.º / Mz / Lt', 'Distrito', 'Provincia', 'Departamento'], [[address.Domicilio, address['N° / Mz / Lt'], geo('domicilio', 'distrito'), geo('domicilio', 'provincia'), geo('domicilio', 'departamento')]], [236, 66, 73, 73, available - 448])
  inlineField('Email', address['Correo electrónico'])
  const contacts = model.contacts.map(c => [`${c[0]}, ${c[1]}`, c[2], c[3], c[4]])
  table(['Persona a Notificar en caso de Emergencia', 'Parentesco', 'Celular', 'Dirección'], contacts.length ? contacts : [['Sin contactos en la fotografía histórica.', '', '', '']], [236, 74, 80, available - 390])
  table(['Patrocinador', 'Contacto', 'Celular/Teléfono', 'Email'], [source.empresa_patrocinadora ? [sponsor['Razón social'] + (sponsor.RUC === 'Sin dato' ? '' : `\nRUC: ${sponsor.RUC}`), sponsor['Persona de contacto'], sponsor.Teléfono, sponsor['Correo electrónico']] : ['', '', '', '']], [165, 115, 106, available - 386])

  // Wording is human-supplied, fixed and literal. Keep each ordinary paragraph together.
  const noteLines = institutionalNote.map(paragraph => wrap(paragraph, available - 12))
  if (y - (14 + noteLines[0].length * leading) < bottom) newPage()
  text('Nota:', margin, y - 9, true); y -= 14
  for (const lines of noteLines) {
    if (y - lines.length * leading < bottom) { newPage(); text('Nota: (continuación)', margin, y - 9, true); y -= 14 }
    for (let index = 0; index < lines.length; index++) { text(lines[index], margin + (index ? 12 : 0), y - 9); y -= leading }
    y -= 2
  }
  y -= 4
  if (y - 96 < bottom) newPage()
  const spacesTop = y - 3
  const emptyBox = (x: number, boxWidth: number, label: string) => {
    page.drawRectangle({ x, y: spacesTop - 77, width: boxWidth, height: 77, borderColor: border, borderWidth: .6 })
    center(label, x - 8, boxWidth + 16, spacesTop - 91)
  }
  emptyBox(margin + 24, 60, 'Índice Izquierdo')
  emptyBox(margin + 150, 60, 'Índice Derecho')
  const signatureX = margin + 280, signatureWidth = available - 280
  const district = source.ciclo?.distrito?.nombre?.trim()
  const place = district ? district.toLocaleLowerCase('es-PE').replace(/(^|\s)\p{L}/gu, part => part.toLocaleUpperCase('es-PE')) : 'Sin dato'
  const signatureDate = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(source.created_at))
  const signatureLines = wrap(`${place}, ${signatureDate}`, signatureWidth, bold)
  signatureLines.forEach((line, index) => center(line, signatureX, signatureWidth, spacesTop - 12 - index * leading, true))
  page.drawLine({ start: { x: signatureX, y: spacesTop - 77 }, end: { x: signatureX + signatureWidth, y: spacesTop - 77 }, thickness: .7, color: border })
  center('FIRMA', signatureX, signatureWidth, spacesTop - 91)
  const total = document.getPageCount()
  document.getPages().forEach((p, i) => {
    page = p
    page.drawLine({ start: { x: margin, y: 38 }, end: { x: width - margin, y: 38 }, thickness: .5, color: border })
    text(`Emisión Lima: ${model.emitted}`, margin, 25)
    text(`Página ${i + 1} de ${total}`, width - margin - 76, 25)
  })
  const bytes = await document.save()
  if (bytes.length > 2 * 1024 * 1024) throw new FichaError(413, 'LIMIT')
  return bytes
}
