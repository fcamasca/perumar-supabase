import { PDFDocument } from 'pdf-lib'

// Copy only existing document pages. Never generate an institutional document or write Storage.
export async function mergePrintPdfs(files: { student: string; bytes: Uint8Array }[], duplex: boolean, signal?: AbortSignal) {
  if (!files.length) throw new Error('No hay documentos disponibles para imprimir.')
  const output = await PDFDocument.create()
  output.setTitle('Expedientes de alumnos')
  let previous = ''
  for (const file of files) {
    signal?.throwIfAborted()
    if (previous && file.student !== previous && duplex && output.getPageCount() % 2) {
      const last = output.getPage(output.getPageCount() - 1)
      const blank = output.addPage([last.getWidth(), last.getHeight()]); blank.setRotation(last.getRotation())
    }
    const input = await PDFDocument.load(file.bytes)
    if (!input.getPageCount()) throw new Error('Se encontró un PDF sin páginas.')
    if (output.getPageCount() + input.getPageCount() > 500) throw new Error('El paquete supera 500 páginas. Selecciona menos alumnos o documentos.')
    const pages = await output.copyPages(input, input.getPageIndices())
    for (const page of pages) output.addPage(page)
    previous = file.student
  }
  signal?.throwIfAborted()
  return new Blob([new Uint8Array(await output.save())], { type: 'application/pdf' })
}
