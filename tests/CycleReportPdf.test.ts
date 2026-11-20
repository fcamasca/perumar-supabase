import { expect, it, vi } from 'vitest'
import { PDFArray, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import { renderCycleReportPdf } from '../src/reports/cycleReportPdf'
import { reportContext, reportDocuments, reportFixture } from './cycle-report-fixture'
import type { ReportKind } from '../src/reports/reportData'

async function inspect(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes)
  const text = pdf.getPages().flatMap(page => {
    const contents = page.node.Contents(), refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : []
    return refs.flatMap(ref => {
      const stream = pdf.context.lookup(ref)
      return stream instanceof PDFRawStream ? [...new TextDecoder().decode(decodePDFRawStream(stream).decode()).matchAll(/<([a-f0-9]+)> Tj/gi)].map(([, hex]) => Buffer.from(hex, 'hex').toString('latin1')) : []
    })
  }).join('\n')
  return { pdf, text }
}
it.each([0, 1, 2] as ReportKind[])('renders readable fixed report %s with identity first, Spanish, context and no internal ID', async kind => {
  const { pdf, text } = await inspect(await renderCycleReportPdf([reportFixture()], kind, reportDocuments, reportContext))
  expect(pdf.getPageCount()).toBe(1); expect(pdf.getPages()[0].getSize().width).toBeCloseTo(841.89)
  expect(text).toContain('Doc. Identidad'); expect(text).toContain('Apellidos y nombres'); expect(text).toContain('QUIROZ PÉREZ, JUAN ÁNGEL')
  expect(text).toContain('2026-1001-MA'); expect(text).toContain('10000000'); expect(text).toContain('Página 1 de 1')
  expect(text).not.toContain('private-internal-id'); expect(text).not.toContain('Código alumno')
  if (kind === 2) { expect(text).toContain('S/ 180.00'); expect(text).toContain('S/ 120.00'); expect(text).toContain('S/ 60.00') }
  if (kind === 1) for (const d of reportDocuments) expect(text.replaceAll('\n', ' ')).toContain(d.nombre)
  expect(pdf.catalog.has(PDFName.of('OpenAction'))).toBe(false); expect(pdf.catalog.has(PDFName.of('AcroForm'))).toBe(false)
})
it.each([0, 1, 2] as ReportKind[])('paginates report %s, repeats headers and includes the last student', async kind => {
  const rows = Array.from({ length: 60 }, (_, i) => reportFixture(i))
  const { pdf, text } = await inspect(await renderCycleReportPdf(rows, kind, reportDocuments, reportContext))
  expect(pdf.getPageCount()).toBeGreaterThan(1); expect(text).toContain('10000059')
  expect(text.match(/Doc\. Identidad/g)).toHaveLength(pdf.getPageCount())
})
it('splits many document columns into readable groups without losing headers', async () => {
  const documents = Array.from({ length: 35 }, (_, i) => ({ codigo: String(i), nombre: `DOCUMENTO ${i}` }))
  const { pdf, text } = await inspect(await renderCycleReportPdf([reportFixture(0, documents)], 1, documents, reportContext))
  expect(pdf.getPageCount()).toBeGreaterThan(1)
  for (const d of documents) expect(text).toContain(d.nombre)
  expect(text).toContain('Grupo documental')
})
it('wraps very long words and multi-page identities instead of clipping them', async () => {
  const { pdf, text } = await inspect(await renderCycleReportPdf([{ ...reportFixture(), nombres: 'Ñ'.repeat(4000) }], 0, [], reportContext))
  expect(pdf.getPageCount()).toBeGreaterThan(1); expect(text.match(/Ñ/g)?.length).toBe(4000)
})
it.each([0, 1, 2] as ReportKind[])('renders empty filtered report %s including headers', async kind => {
  const { text } = await inspect(await renderCycleReportPdf([], kind, reportDocuments, reportContext))
  expect(text).toContain('No hay matrículas para estos filtros.'); expect(text).toContain('Doc. Identidad')
})
it('rejects configuration drift and cancellation without returning a partial PDF', async () => {
  await expect(renderCycleReportPdf([{ ...reportFixture(), documentos: [] }], 1, reportDocuments, reportContext)).rejects.toThrow('configuración')
  const controller = new AbortController(); controller.abort()
  await expect(renderCycleReportPdf([reportFixture()], 0, [], reportContext, controller.signal)).rejects.toThrow('cancelada')
})
it('does not silently change unsupported characters in a student name', async () => {
  await expect(renderCycleReportPdf([{ ...reportFixture(), nombres: 'JUAN 🚢' }], 0, [], reportContext)).rejects.toThrow()
})

it('handles browser-localized date whitespace in PDF metadata', async () => {
  const formatter = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function () { return { format: () => '20/11/26, 10:00\u202fa.\u00a0m.' } as Intl.DateTimeFormat })
  try {
    const { text } = await inspect(await renderCycleReportPdf([reportFixture()], 2, [], reportContext))
    expect(text).toContain('20/11/26, 10:00 a. m.')
  } finally { formatter.mockRestore() }
})
