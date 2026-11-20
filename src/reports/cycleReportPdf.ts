import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { perumarLogoPng } from '../../supabase/functions/_shared/ficha/brand'
import { checkMatrix, reportCells, reportHeaders, reportNames, type MatrixColumn, type ReportKind, type ReportRow } from './reportData'

type Context = { cycleCode: string; search: string; includeCancelled: boolean; at: Date }
const ink = rgb(.08, .18, .26), border = rgb(.72, .78, .82), pale = rgb(.92, .95, .97)
const margin = 32, width = 841.89, height = 595.28, available = width - 2 * margin
const size = 8.5, leading = 11, bottom = 38

// Three fixed operational reports. No template inputs, institutional document mutation or Storage.
export async function renderCycleReportPdf(rows: ReportRow[], kind: ReportKind, documents: MatrixColumn[], context: Context, signal?: AbortSignal) {
  if (kind === 1) checkMatrix(rows, documents)
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${reportNames[kind]} - ${context.cycleCode || 'Ciclo'}`)
  pdf.setCreationDate(context.at)
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const logo = await pdf.embedPng(Uint8Array.from(atob(perumarLogoPng), character => character.charCodeAt(0)))
  const clean = (value: string) => value.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(/[\u00a0\u2007\u202f]/g, ' ')
  function wrap(value: string, max: number, face: PDFFont = font, fontSize = size): string[] {
    const result: string[] = []
    for (const paragraph of clean(value).split('\n')) {
      let line = ''
      for (const word of paragraph.split(/ +/)) {
        const candidate = line ? `${line} ${word}` : word
        if (face.widthOfTextAtSize(candidate, fontSize) <= max) { line = candidate; continue }
        if (line) { result.push(line); line = '' }
        for (const character of word) {
          if (line && face.widthOfTextAtSize(line + character, fontSize) > max) { result.push(line); line = '' }
          line += character
        }
      }
      result.push(line)
    }
    return result.length ? result : ['']
  }
  // Reject unsupported glyphs instead of silently replacing a student's identity.
  const strings = [context.cycleCode, context.search, ...documents.map(d => d.nombre), ...rows.flatMap(r => reportCells(r, kind, documents))]
  for (const text of strings) font.encodeText(clean(text).replaceAll('\n', ' '))
  const emitted = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(context.at)
  const groups: MatrixColumn[][] = []
  const docSpace = available - 85 - 220, matrixHeader = 212
  const documentWidth = (d: MatrixColumn) => Math.max(34, wrap(d.nombre, matrixHeader - 16, bold, 8).length * 9.5 + 12)
  if (kind === 1) {
    let group: MatrixColumn[] = [], used = 0
    for (const document of documents) {
      const needed = documentWidth(document)
      if (group.length && used + needed > docSpace) { groups.push(group); group = []; used = 0 }
      group.push(document); used += needed
    }
    groups.push(group)
  } else groups.push([])
  const info: { page: PDFPage; part: number }[] = []
  function text(page: PDFPage, value: string, x: number, y: number, strong = false, fontSize = size) {
    page.drawText(clean(value), { x, y, font: strong ? bold : font, size: fontSize, color: ink })
  }
  function mark(page: PDFPage, value: string, x: number, y: number) {
    const color = value === 'Completo' ? rgb(.08, .38, .27) : value === 'Pendiente' ? rgb(.5, .29, .05) : ink
    if (value === 'Completo') {
      page.drawLine({ start: { x: x - 4, y }, end: { x: x - 1, y: y - 3 }, thickness: 1.2, color })
      page.drawLine({ start: { x: x - 1, y: y - 3 }, end: { x: x + 5, y: y + 4 }, thickness: 1.2, color })
    } else if (value === 'Pendiente') page.drawCircle({ x, y, size: 3.7, borderWidth: 1, borderColor: color })
    else page.drawLine({ start: { x: x - 4, y }, end: { x: x + 4, y }, thickness: 1, color })
  }
  for (const [part, group] of groups.entries()) {
    const headers = kind === 1 ? [...reportHeaders[kind], ...group.map(d => d.nombre)] : reportHeaders[kind]
    const widths = kind === 1 ? [85, 220, ...group.map(documentWidth)]
      : kind === 0 ? [95, available - 95 - 130 - 85, 130, 85] : [85, available - 85 - 115 - 3 * 85, 115, 85, 85, 85]
    const tableWidth = widths.reduce((sum, value) => sum + value, 0)
    const headerLines = headers.map((h, i) => wrap(h, widths[i] - 12, bold))
    const headerHeight = kind === 1 && group.length ? matrixHeader : Math.max(30, ...headerLines.map(lines => lines.length * leading + 14))
    let page: PDFPage, y = 0
    function newPage() {
      if (signal?.aborted) throw new Error('Exportación cancelada')
      page = pdf.addPage([width, height]); info.push({ page, part })
      page.drawImage(logo, { x: margin, y: height - 53, width: 36, height: 36 })
      text(page, 'PERÚ MAR - Reporte operativo', margin + 46, height - 30, true, 10)
      text(page, reportNames[kind], margin + 46, height - 48, true, 13)
      text(page, `Ciclo: ${context.cycleCode || 'No indicado'} | ${rows.length} matrículas | Exportado (Lima): ${emitted}`, margin, height - 65)
      const filterLines = wrap(`Filtro: ${context.search || 'Sin búsqueda'} | ${context.includeCancelled ? 'Incluye anulados' : 'Solo matrículas activas'}`, available)
      let top = height - 81
      for (const line of filterLines) { text(page, line, margin, top); top -= leading }
      if (kind === 1) {
        for (const [i, label] of ['Completo', 'Pendiente', 'No aplica'].entries()) { mark(page, label, margin + 5 + i * 102, top); text(page, label, margin + 16 + i * 102, top - 3) }
        top -= 17
      }
      y = top - 7
      let x = margin
      headers.forEach((h, i) => {
        page.drawRectangle({ x, y: y - headerHeight, width: widths[i], height: headerHeight, color: pale, borderWidth: .4, borderColor: border })
        if (kind === 1 && i >= 2) {
          wrap(h, headerHeight - 16, bold, 8).forEach((line, index) => page.drawText(line, { x: x + widths[i] - 6 - index * 9.5, y: y - headerHeight + 8, rotate: degrees(90), size: 8, font: bold, color: ink }))
        } else headerLines[i].forEach((line, index) => text(page, line, x + 6, y - headerHeight + 8 + (headerLines[i].length - index - 1) * leading, true))
        x += widths[i]
      })
      y -= headerHeight
    }
    newPage()
    if (!rows.length) { text(page!, 'No hay matrículas para estos filtros.', margin + 6, y - 18); y -= 28 }
    for (const [rowIndex, row] of rows.entries()) {
      if (signal?.aborted) throw new Error('Exportación cancelada')
      if (rowIndex % 100 === 99) await new Promise(resolve => setTimeout(resolve, 0))
      const cells = reportCells(row, kind, group)
      const lines = cells.map((cell, i) => kind === 1 && i >= 2 ? [''] : wrap(cell, widths[i] - 12))
      const total = Math.max(...lines.map(l => l.length))
      let offset = 0
      while (offset < total) {
        if (y - 24 < bottom) newPage()
        const take = Math.min(total - offset, Math.floor((y - bottom - 12) / leading))
        if (take < 1) throw new Error('No hay espacio para el reporte')
        const rowHeight = Math.max(24, take * leading + 12)
        let x = margin
        widths.forEach((w, i) => {
          page!.drawRectangle({ x, y: y - rowHeight, width: w, height: rowHeight, borderWidth: .4, borderColor: border })
          if (kind === 1 && i >= 2) mark(page!, cells[i], x + w / 2, y - rowHeight / 2)
          else lines[i].slice(offset, offset + take).forEach((line, index) => {
            const right = kind === 2 && i >= 3
            text(page!, line, right ? x + w - 6 - font.widthOfTextAtSize(line, size) : x + 6, y - 13 - index * leading)
          })
          x += w
        })
        y -= rowHeight; offset += take
      }
    }
    // Keep table bounds explicit even when there are zero configured documents.
    page!.drawLine({ start: { x: margin, y }, end: { x: margin + tableWidth, y }, thickness: .4, color: border })
  }
  for (const [index, item] of info.entries()) {
    text(item.page, `Página ${index + 1} de ${info.length}${groups.length > 1 ? ` | Grupo documental ${item.part + 1} de ${groups.length}` : ''}`, margin, 20)
  }
  if (signal?.aborted) throw new Error('Exportación cancelada')
  return pdf.save({ useObjectStreams: false })
}
