import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createServer } from 'vite'
import { PDFDocument } from 'pdf-lib'

const directory = '.cache/h6-layout/cycle-reports'
mkdirSync(directory, { recursive: true })
const server = await createServer({ configFile: false, cacheDir: '.cache/report-pdf-vite', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { renderCycleReportPdf } = await server.ssrLoadModule('/src/reports/cycleReportPdf.ts')
  const { reportFixture, reportDocuments, reportContext } = await server.ssrLoadModule('/tests/cycle-report-fixture.ts')
  const results = []
  for (const kind of [0, 1, 2]) for (const extensive of [false, true]) {
    const documents = extensive && kind === 1 ? Array.from({ length: 28 }, (_, i) => ({ codigo: `DOC_${i}`, nombre: `DOCUMENTO ${i} ${i === 0 ? 'Ñ'.repeat(145) : 'SINTÉTICO'}` })) : reportDocuments
    const rows = Array.from({ length: extensive ? 60 : 3 }, (_, i) => reportFixture(i, documents))
    if (extensive) rows[0].nombres = 'NOMBRE EXTENSO ' + 'Á'.repeat(450)
    const bytes = await renderCycleReportPdf(rows, kind, documents, reportContext)
    const file = `${directory}/report-${kind}-${extensive ? 'extensive' : 'normal'}.pdf`
    writeFileSync(file, bytes)
    const pdf = await PDFDocument.load(bytes)
    if (process.env.CI === 'true') {
      const result = spawnSync('pdftotext', ['-bbox', '-enc', 'UTF-8', file, '-'], { encoding: 'utf8', windowsHide: true })
      assert.equal(result.status, 0)
      const pages = [...result.stdout.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)]
      assert.equal(pages.length, pdf.getPageCount())
      for (const [, width, height, content] of pages) {
        const words = [...content.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">/g)]
        assert.ok(words.length)
        assert.ok(words.every(([, x1, y1, x2, y2]) => Number(x1) >= 25 && Number(y1) >= 15 && Number(x2) <= Number(width) - 25 && Number(y2) <= Number(height) - 10), 'Operational report text must remain within page margins')
      }
    }
    const rendered = spawnSync('pdftoppm', ['-f', '1', '-singlefile', '-scale-to', '1400', '-png', file, file.slice(0, -4)], { encoding: 'utf8', windowsHide: true })
    assert.equal(rendered.status, 0, 'Independent report rasterization')
    results.push({ kind, extensive, rows: rows.length, documentColumns: documents.length, pages: pdf.getPageCount(), bytes: bytes.length })
  }
  writeFileSync(directory + '/results.json', JSON.stringify(results, null, 2))
  console.log('H6.1 operational PDF normal/extensive, pagination/horizontal groups and independent rasterization PASSED: ' + JSON.stringify(results))
} finally { await server.close() }
