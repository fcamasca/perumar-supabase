import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { DocumentoError } from './contract.ts'

// Fixed declaration model: centered heading, narrow justified body and named signature.
export async function renderDeclaration(
  identity: string,
  name: string,
  document: string,
  placeAndDate: string,
  at: Date,
  version: string,
) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const left = 111, right = 484, size = 10, leading = 17
  let page = pdf.addPage([595.28, 841.89]), y = 704
  pdf.setTitle('DECLARACIÓN JURADA')
  pdf.setProducer(`PERÚ MAR / ${version}`)
  pdf.setCreationDate(at)
  function measure(text: string, strong = false, fontSize = size) {
    try {
      if ([...text].some((c) => c.charCodeAt(0) < 32)) throw new Error('control')
      return (strong ? bold : regular).widthOfTextAtSize(text.normalize('NFC'), fontSize)
    } catch {
      throw new DocumentoError(422, 'DOCUMENT_GLYPH')
    }
  }
  function draw(text: string, x: number, baseline: number, strong = false, fontSize = size) {
    measure(text, strong, fontSize)
    page.drawText(text.normalize('NFC'), {
      x, y: baseline, font: strong ? bold : regular, size: fontSize, color: rgb(0, 0, 0),
    })
  }
  function centered(text: string, baseline: number, strong = false, fontSize = size, x1 = 0, x2 = 595.28) {
    draw(text, (x1 + x2 - measure(text, strong, fontSize)) / 2, baseline, strong, fontSize)
  }
  function heading() {
    centered('DECLARACIÓN JURADA', 779, true, 14)
    centered('Ley de Procedimiento Administrativo General', 755, true)
    centered('Art. 42° de la Ley 27444', 743, true)
  }
  function nextPage() {
    if (pdf.getPageCount() >= 20) throw new DocumentoError(413, 'DOCUMENT_LIMIT')
    page = pdf.addPage([595.28, 841.89])
    heading()
    y = 704
  }
  function paragraph(text: string) {
    let remaining = text.normalize('NFC'), first = true
    while (remaining) {
      if (y < 90) nextPage()
      const x = left + (first ? 35 : 0), available = right - x
      let end = 0
      while (end < remaining.length && measure(remaining.slice(0, end + 1)) <= available) end++
      if (end === 0) throw new DocumentoError(422, 'DOCUMENT_GLYPH')
      if (end < remaining.length) {
        const space = remaining.lastIndexOf(' ', end)
        if (space > 0) end = space
      }
      const row = remaining.slice(0, end).trimEnd()
      remaining = remaining.slice(end).trimStart()
      const words = row.split(' ')
      if (remaining && words.length > 1) {
        const spacing = (available - words.reduce((sum, word) => sum + measure(word), 0)) / (words.length - 1)
        let cursor = x
        for (const word of words) {
          draw(word, cursor, y)
          cursor += measure(word) + spacing
        }
      } else {
        draw(row, x, y)
        // The reference closes each paragraph with a dotted writing line.
        const start = x + measure(row) + 5
        if (right - start > 15) {
          page.drawLine({ start: { x: start, y: y - 1 }, end: { x: right, y: y - 1 }, thickness: .6, dashArray: [1, 1] })
        }
      }
      y -= leading
      first = false
    }
    y -= 26
  }
  heading()
  paragraph(`${identity}, en pleno ejercicio de mis derechos ciudadanos y al amparo del Artículo y Ley en referencia.`)
  paragraph('DECLARO BAJO JURAMENTO, no tener antecedentes penales, policiales ni judiciales, asimismo conozco que, en caso de detectarse fraude o falsedad en mi presente declaración, habrá lugar a la nulidad que genere, sometiéndome en tal circunstancia a la sanción que establece la ley.')
  paragraph('Para mayor veracidad estampo mi huella dactilar índice derecho, y firma correspondiente.')
  // Keep the date/signature together; long names wrap inside the signature block.
  const signatureLines: string[] = []
  let rest = name.normalize('NFC')
  while (rest) {
    let end = 0
    while (end < rest.length && measure(rest.slice(0, end + 1)) <= 190) end++
    if (!end) throw new DocumentoError(422, 'DOCUMENT_GLYPH')
    if (end < rest.length && rest.lastIndexOf(' ', end) > 0) end = rest.lastIndexOf(' ', end)
    signatureLines.push(rest.slice(0, end).trimEnd())
    rest = rest.slice(end).trimStart()
  }
  if (y - 135 - signatureLines.length * 12 < 55) nextPage()
  const dateY = Math.min(409, y - 35)
  draw(placeAndDate, right - measure(placeAndDate, true), dateY, true)
  const signatureY = dateY - 62, signatureLeft = 295
  page.drawLine({ start: { x: signatureLeft, y: signatureY }, end: { x: right, y: signatureY }, thickness: .6 })
  signatureLines.forEach((row, i) => centered(row, signatureY - 12 - i * 12, false, size, signatureLeft, right))
  centered(document, signatureY - 12 - signatureLines.length * 12, false, size, signatureLeft, right)
  const bytes = await pdf.save({ useObjectStreams: false })
  if (bytes.length > 2097152) throw new DocumentoError(413, 'DOCUMENT_LIMIT')
  return bytes
}
