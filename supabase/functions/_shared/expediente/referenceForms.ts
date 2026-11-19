import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Source } from '../ficha/contract.ts'
import { DocumentoError } from './contract.ts'

type PaperData = {
  source: Source; at: Date; version: string; name: string; document: string; identity: string;
  course: string; authority: string; placeAndDate: string; address: string;
  cat: (key: string) => string; geo: (prefix: string, part: string) => string;
  text: (value: unknown) => string; data: Record<string, string>;
}

// Three fixed paper layouts; not a configurable template engine.
export async function renderReferenceForm(code: string, model: PaperData) {
  if (!['SOLICITUD', 'CARTA_PODER', 'FICHA_DATOS_PERSONALES'].includes(code)) throw new DocumentoError(422, 'DOCUMENT_TEMPLATE')
  const { source, at, version, name, document, identity, course, authority, placeAndDate, address, cat, geo, text, data } = model
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const left = 84, right = 511, size = 10
  let page = pdf.addPage([595.28, 841.89]), y = 704
  const title = code === 'FICHA_DATOS_PERSONALES' ? 'FICHA DE DATOS PERSONALES' : code === 'CARTA_PODER' ? 'CARTA PODER' : 'SOLICITUD'
  pdf.setTitle(title); pdf.setProducer(`PERÚ MAR / ${version}`); pdf.setCreationDate(at)
  function measure(value: string, strong = false, fontSize = size) {
    try {
      if ([...value].some(c => c.charCodeAt(0) < 32)) throw new Error('control')
      return (strong ? bold : font).widthOfTextAtSize(value.normalize('NFC'), fontSize)
    } catch { throw new DocumentoError(422, 'DOCUMENT_GLYPH') }
  }
  function draw(value: string, x: number, baseline: number, strong = false, fontSize = size) {
    measure(value, strong, fontSize)
    page.drawText(value.normalize('NFC'), { x, y: baseline, size: fontSize, font: strong ? bold : font, color: rgb(0, 0, 0) })
  }
  function center(value: string, baseline: number, strong = false, fontSize = size, x1 = 0, x2 = 595.28) {
    draw(value, (x1 + x2 - measure(value, strong, fontSize)) / 2, baseline, strong, fontSize)
  }
  function split(value: string, width: number, fontSize = size, strong = false) {
    const rows: string[] = []
    for (const part of value.replace(/\r\n?/g, '\n').split('\n')) {
      let rest = part.normalize('NFC')
      if (!rest) rows.push('')
      while (rest) {
        let end = 0
        while (end < rest.length && measure(rest.slice(0, end + 1), strong, fontSize) <= width) end++
        if (!end) throw new DocumentoError(422, 'DOCUMENT_GLYPH')
        if (end < rest.length && rest.lastIndexOf(' ', end) > 0) end = rest.lastIndexOf(' ', end)
        rows.push(rest.slice(0, end).trimEnd()); rest = rest.slice(end).trimStart()
      }
    }
    return rows
  }
  function heading(continued = false) {
    if (code === 'FICHA_DATOS_PERSONALES') {
      center('CAPITANÍA GUARDACOSTAS', 779, true, 14)
      const lines = split(`MARÍTIMA DE ${authority.toLocaleUpperCase('es-PE')}`, right - left, 14, true)
      lines.forEach((row, i) => center(row, 763 - i * 17, true, 14))
      const baseline = 714 - (lines.length - 1) * 17
      center(title, baseline, true)
      const w = measure(title, true)
      page.drawLine({ start: { x: (595.28 - w) / 2, y: baseline - 2 }, end: { x: (595.28 + w) / 2, y: baseline - 2 }, thickness: .5 })
      y = baseline - 50
    } else if (code === 'CARTA_PODER') { center(title, 773, false, 14); y = 714 }
    else if (continued) { center('SOLICITUD — CONTINUACIÓN', 779, true, 11); y = 745 }
  }
  function next() {
    if (pdf.getPageCount() >= 20) throw new DocumentoError(413, 'DOCUMENT_LIMIT')
    page = pdf.addPage([595.28, 841.89]); heading(true)
  }
  function ensure(height: number) { if (y - height < 60) next() }
  function paragraph(value: string, options: { x?: number; width?: number; indent?: number; leading?: number; gap?: number; justify?: boolean; strong?: boolean } = {}) {
    const x = options.x ?? left, width = options.width ?? right - x, indent = options.indent ?? 0, leading = options.leading ?? 13, strong = options.strong ?? false
    let rest = value.normalize('NFC'), first = true
    while (rest) {
      ensure(leading)
      const rowX = x + (first ? indent : 0), available = width - (first ? indent : 0), row = split(rest, available, size, strong)[0]
      rest = rest.slice(row.length).trimStart()
      const words = row.split(' '), wordWidth = words.reduce((sum, word) => sum + measure(word, strong), 0)
      const spacing = words.length > 1 ? (available - wordWidth) / (words.length - 1) : 0
      if (rest && options.justify && words.length > 1 && spacing <= measure(' ', strong) * 3) {
        let cursor = rowX
        for (const word of words) { draw(word, cursor, y, strong); cursor += measure(word, strong) + spacing }
      } else draw(row, rowX, y, strong)
      y -= leading; first = false
    }
    y -= options.gap ?? 14
  }
  function namedSignature(dateBaseline: number) {
    const lines = split(name, 190), docLines = split(document, 190)
    ensure(115 + (lines.length + docLines.length) * 12)
    const dateRows = split(placeAndDate, right - left, size, true), dateY = Math.min(dateBaseline, y - 20)
    dateRows.forEach((row, i) => draw(row, right - measure(row, true), dateY - i * 12, true))
    const signatureY = dateY - dateRows.length * 12 - 50, x = 320
    page.drawLine({ start: { x, y: signatureY }, end: { x: right, y: signatureY }, thickness: .6 })
    ;[...lines, ...docLines].forEach((row, i) => center(row, signatureY - 12 - i * 12, false, size, x, right))
  }
  heading()
  if (code === 'SOLICITUD') {
    y = 771; draw('SOLICITO:', 237, y)
    paragraph(`Inscripción y obtención de Libreta de Embarco y Carné ${course}`, { x: 296, width: 215, gap: 24, leading: 11 })
    paragraph(`SEÑOR, CAPITÁN DE FRAGATA, CAPITÁN DE PUERTO DE ${authority.toLocaleUpperCase('es-PE')}.`, { strong: true, gap: 0, leading: 12 })
    paragraph('S.C.P.', { gap: 28, leading: 12 })
    paragraph(`${identity}, ante usted con el debido respeto me presento y expongo:`, { width: 245, indent: 14, leading: 13, gap: 24, justify: true })
    // Reference wording only; H6 does not infer or certify academic results.
    paragraph(`Que, de conformidad con las disposiciones legales vigentes de la Autoridad Marítima y habiendo culminado y aprobado el curso para ${course}, Solicito a Ud. Señor, Capitán de Fragata, Capitán de Puerto de ${authority}, tenga a bien disponer a quien corresponda la Inscripción y obtención de Libreta de Embarco y Carné de ${course}.`, { indent: 14, justify: true, leading: 13, gap: 23 })
    paragraph('PARA TAL EFECTO:', { strong: true, gap: 20, leading: 12 })
    paragraph('Adjunto:', { x: left + 14, gap: 4, leading: 12 })
    for (const item of [
      'UNA (01) Ficha de Datos.',
      `DOS (02) Copias fotostáticas simples del ${cat('TIPO_DI') || 'documento de identidad'}.`,
      'UN (01) Certificado de aptitud psicofísica.',
      'UNA (01) Declaración jurada simple de no encontrarse requisitoriado por la Autoridad Judicial y Policial.',
      'CUATRO (04) fotos a colores tamaño pasaporte con fondo azul.',
      'UN (01) Original del Certificado Oficial de Estudios de Educación Secundaria de Menores.',
      `UN (01) Original y Copia del Certificado Académico de haber aprobado el Curso ${course}.`,
      'UN (01) Recibo de pago al Banco de la Nación por el derecho correspondiente.',
    ]) paragraph(`- ${item}`, { x: 140, leading: 11, gap: 1 })
    y -= 24
    paragraph('POR LO EXPUESTO:', { strong: true, gap: 6, leading: 12 })
    paragraph('Es gracia que espero alcanzar de Ud.', { x: left + 14, leading: 12, gap: 0 })
    namedSignature(210)
  } else if (code === 'CARTA_PODER') {
    paragraph(`${identity}, en pleno ejercicio de mis derechos ciudadanos y en uso de mis facultades y en nombre propio:`, { indent: 20, leading: 17, gap: 34, justify: true })
    paragraph(`Otorgo Poder a favor de ${data.apoderado_nombre}, identificado con ${data.apoderado_tipo_di_etiqueta} N.º ${data.apoderado_numero_di}, para que, en mi nombre y representación, ante la Capitanía de Puerto de ${authority}, efectúe los trámites de Inscripción y obtención de Libreta de Embarco y Carné de ${course} y recoja el o los documentos correspondientes.`, { indent: 20, leading: 17, gap: 0, justify: true })
    for (let i = 0; i < 3; i++) { ensure(17); page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: .6, dashArray: [1, 1] }); y -= 17 }
    namedSignature(435)
  } else {
    const a = source.datos_ficha.alumno
    type Cell = [string, string, number]
    function row(cells: Cell[]) {
      const rows = cells.map(([label, value, width]) => split(`${label}${label ? ' ' : ''}${value}`, width - 12, 9.5))
      for (let i = 0; i < Math.max(...rows.map(lines => lines.length)); i++) {
        ensure(14); let x = left
        cells.forEach((cell, index) => { if (rows[index][i]) draw(rows[index][i], x, y, false, 9.5); x += cell[2] })
        y -= 14
      }
      y -= 9
    }
    const full = (label: string, value: unknown) => row([[label, text(value), right - left]])
    const birth = /^\d{4}-\d{2}-\d{2}$/.test(text(a.fecha_nacimiento)) ? text(a.fecha_nacimiento).split('-').reverse().join('-') : ''
    row([['NOMBRES:', text(a.nombres), 213], ['APELLIDOS:', [a.apellido_paterno, a.apellido_materno].map(text).filter(Boolean).join(' '), 214]])
    row([[`${cat('TIPO_DI') || 'D.I.'}:`, text(a.numero_di), 150], ['L.M.:', '', 60], ['LUGAR DE NACIMIENTO:', geo('nacimiento', 'distrito'), 217]])
    const location = (prefix: string) => row([['DISTRITO:', geo(prefix, 'distrito'), 142], ['PROVINCIA:', geo(prefix, 'provincia'), 142], ['DEPARTAMENTO:', geo(prefix, 'departamento'), 143]])
    location('nacimiento')
    row([['FECHA NACIMIENTO:', birth, 213], ['GRADO DE INSTRUCCIÓN:', cat('GRADO_INSTRUCCION'), 214]])
    const height = text(a.estatura_cm) ? `${(Number(a.estatura_cm) / 100).toFixed(2)} mts.` : ''
    row([['OJOS:', cat('COLOR_OJOS'), 135], ['CABELLO:', cat('COLOR_CABELLO'), 135], ['ESTATURA:', height, 157]])
    row([['SEXO:', cat('SEXO'), 115], ['PESO:', text(a.peso_kg) ? `${text(a.peso_kg)} Kg.` : '', 100], ['GRUPO SANGUÍNEO RH:', cat('GRUPO_SANGUINEO'), 212]])
    full('SEÑAS PARTICULARES:', a.senas_particulares)
    full('DOMICILIO ACTUAL:', address)
    row([['TELÉFONO FIJO:', text(a.telefono_fijo), 213], ['CELULAR:', text(a.celular), 214]])
    full('CORREO:', a.email); location('domicilio')
    ensure(105); y -= 22
    paragraph('PERSONA A NOTIFICAR EN CASO DE EMERGENCIA', { strong: true, gap: 10, leading: 14 })
    for (const [index, c] of source.datos_ficha.contactos.entries()) {
      ensure(85); if (index > 0) y -= 9
      row([['NOMBRES:', text(c.nombre), 213], ['APELLIDOS:', text(c.apellido), 214]])
      full('DIRECCIÓN:', c.direccion)
      row([['PARENTESCO:', text((c.parentesco as { etiqueta?: string })?.etiqueta), 213], ['CELULAR:', text(c.celular), 214]])
    }
    ensure(155)
    const dateRows = split(placeAndDate, right - left, size, true), dateY = Math.min(260, y - 25)
    dateRows.forEach((line, i) => draw(line, right - measure(line, true), dateY - i * 12, true))
    const signY = dateY - dateRows.length * 12 - 87
    page.drawLine({ start: { x: 265, y: signY }, end: { x: 462, y: signY }, thickness: .5, dashArray: [1, 2] })
    center('(Firma)', signY - 13, false, size, 265, 462); draw('Huella', 492, signY - 13)
  }
  const bytes = await pdf.save({ useObjectStreams: false })
  if (bytes.length > 2097152) throw new DocumentoError(413, 'DOCUMENT_LIMIT')
  return bytes
}
