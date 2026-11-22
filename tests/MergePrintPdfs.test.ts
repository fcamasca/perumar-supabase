import { expect, it } from 'vitest'
import { degrees, PDFDocument } from 'pdf-lib'
import { mergePrintPdfs } from '../src/documents/mergePrintPdfs'
async function input(student: string, sizes: [number, number][], rotate = 0) {
  const pdf = await PDFDocument.create()
  for (const size of sizes) pdf.addPage(size).setRotation(degrees(rotate))
  return { student, bytes: await pdf.save() }
}
it('preserves all original pages, sizes and rotations in order, one document per new page', async () => {
  const a = await input('a', [[595, 842], [500, 700]]), b = await input('a', [[842, 595]], 90)
  const result = await PDFDocument.load(await (await mergePrintPdfs([a, b], false)).arrayBuffer())
  expect(result.getPages().map(p => [p.getWidth(), p.getHeight(), p.getRotation().angle])).toEqual([[595, 842, 0], [500, 700, 0], [842, 595, 90]])
})
it('pads odd student packets only between students for double-sided printing', async () => {
  const files = [await input('a', [[595, 842]]), await input('b', [[595, 842], [595, 842]]), await input('c', [[595, 842]])]
  expect((await PDFDocument.load(await (await mergePrintPdfs(files, true)).arrayBuffer())).getPageCount()).toBe(5)
  expect((await PDFDocument.load(await (await mergePrintPdfs(files, false)).arrayBuffer())).getPageCount()).toBe(4)
})
it('rejects empty, malformed or cancelled inputs without a partial PDF', async () => {
  await expect(mergePrintPdfs([], true)).rejects.toThrow()
  await expect(mergePrintPdfs([await input('a', [[595, 842]]), { student: 'b', bytes: new Uint8Array([1, 2, 3]) }], true)).rejects.toThrow()
  const abort = new AbortController(); abort.abort()
  await expect(mergePrintPdfs([await input('a', [[595, 842]])], true, abort.signal)).rejects.toThrow()
})
