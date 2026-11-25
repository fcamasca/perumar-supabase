import { PDFArray, PDFName, PDFNumber, PDFParser, PDFRawStream } from 'pdf-lib'
import { inflateSync } from 'node:zlib'

// Instance-local interception before pdf-lib expands ObjStm/XRef internally.
// Never patch a shared prototype: concurrent requests have separate budgets.
class BoundedPdfParser extends PDFParser {
 private structuralBytes = 0
 private compressedObjects = 0
 protected override parseDictOrStream() {
  const value = super.parseDictOrStream()
  if (!(value instanceof PDFRawStream)) return value
  const type = value.dict.lookup(PDFName.of('Type'))
  if (type !== PDFName.of('ObjStm') && type !== PDFName.of('XRef')) return value
  const filter = value.dict.get(PDFName.of('Filter'))
  const flate = filter === PDFName.of('FlateDecode') || (filter instanceof PDFArray && filter.size() === 1 && filter.get(0) === PDFName.of('FlateDecode'))
  if (filter && !flate) throw Error('Unsupported structural filter')
  const remaining = 16 * 1024 * 1024 - this.structuralBytes
  if (remaining <= 0) throw Error('Structural PDF budget')
  const decoded = flate ? inflateSync(value.getContents(), { maxOutputLength: Math.min(8 * 1024 * 1024, remaining) }) : value.getContents()
  if (decoded.length > Math.min(8 * 1024 * 1024, remaining)) throw Error('Structural PDF budget')
  this.structuralBytes += decoded.length
  if (type === PDFName.of('ObjStm')) {
   const n = value.dict.get(PDFName.of('N')), first = value.dict.get(PDFName.of('First'))
   if (!(n instanceof PDFNumber) || !Number.isSafeInteger(n.asNumber()) || n.asNumber() < 0 || !(first instanceof PDFNumber) || !Number.isSafeInteger(first.asNumber()) || first.asNumber() < 0 || first.asNumber() > decoded.length) throw Error('Invalid object stream')
   this.compressedObjects += n.asNumber()
   if (this.compressedObjects > 10000) throw Error('Compressed object budget')
  }
  if (type === PDFName.of('XRef')) {
   const widths = value.dict.get(PDFName.of('W'))
   if (!(widths instanceof PDFArray) || widths.size() !== 3 || widths.asArray().some(w => !(w instanceof PDFNumber) || !Number.isSafeInteger(w.asNumber()) || w.asNumber() < 0 || w.asNumber() > 8)) throw Error('Cross-reference widths')
   const size = value.dict.get(PDFName.of('Size')), index = value.dict.get(PDFName.of('Index'))
   if (!(size instanceof PDFNumber) || !Number.isSafeInteger(size.asNumber()) || size.asNumber() < 0 || size.asNumber() > 20000) throw Error('Cross-reference budget')
   if (index) {
    if (!(index instanceof PDFArray) || index.size() % 2 || index.size() > 20000) throw Error('Cross-reference index')
    let count = 0
    for (let i = 0; i < index.size(); i += 2) {
     const start = index.get(i), length = index.get(i + 1)
     if (!(start instanceof PDFNumber) || !(length instanceof PDFNumber) || !Number.isSafeInteger(start.asNumber()) || !Number.isSafeInteger(length.asNumber()) || start.asNumber() < 0 || length.asNumber() < 0 || start.asNumber() + length.asNumber() > size.asNumber()) throw Error('Cross-reference index')
     count += length.asNumber()
     if (count > 20000) throw Error('Cross-reference budget')
    }
   }
  }
  return value
 }
}
export async function checkStructuralPdf(bytes: Uint8Array) {
 // Strict parser: rejects unsupported filters/indirect structural metadata instead of guessing.
 await new BoundedPdfParser(bytes, 50, true).parseDocument()
}
