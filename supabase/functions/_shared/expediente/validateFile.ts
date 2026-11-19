import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
import { Buffer } from 'node:buffer'
import { inflateSync } from 'node:zlib'
import { DocumentoError, MAX_FILE } from './contract.ts'
const DECODE_BUDGET_BYTES = 96 * 1024 * 1024

export async function validateFile(
  bytes: Uint8Array,
  declared: string,
  filename: string,
  photo = false,
) {
  if (!bytes.length || bytes.length > MAX_FILE) throw new DocumentoError(413, 'DOCUMENT_LIMIT')
  if (photo && !['image/jpeg', 'image/png'].includes(declared))
    throw new DocumentoError(422, 'DOCUMENT_PHOTO_FORMAT')
  if (
    !filename ||
    filename.length > 150 ||
    /[\\/]/.test(filename) ||
    [...filename].some((c) => c.charCodeAt(0) < 32) ||
    /\.(exe|com|bat|cmd|js|mjs|html?|svg|zip|php|sh)(\.|$)/i.test(filename)
  )
    throw new DocumentoError(422, 'DOCUMENT_FILE_INVALID')
  const ext = filename.split('.').pop()?.toLowerCase(),
    b = Buffer.from(bytes)
  try {
    if (declared === 'application/pdf' && ext === 'pdf' && !photo) {
      if (
        b.subarray(0, 5).toString() !== '%PDF-' ||
        !/%%EOF\s*$/.test(b.subarray(-1024).toString('latin1'))
      )
        throw Error('PDF envelope')
      // Fail closed on structural compression whose inflation cannot be budgeted here.
      // This is a conservative supported-subset limit, NOT an antivirus/CDR guarantee.
      const names = b
        .toString('latin1')
        .replace(/#([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      let tokens = 0
      for (const token of names.matchAll(/\S+/g)) {
        if (token[0] && ++tokens > 200000) throw Error('PDF token budget')
      }
      if ((names.match(/\b\d+\s+\d+\s+obj\b/g)?.length ?? 0) > 10000)
        throw Error('PDF object budget')
      if (/\/(ObjStm|XRef)\b/.test(names)) throw Error('Unverifiable structural compression')
      const pdf = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
        throwOnInvalidObject: true,
        updateMetadata: false,
      })
      if (pdf.isEncrypted || !pdf.getPageCount() || pdf.getPageCount() > 20)
        throw Error('PDF budget')
      const forbidden = new Set([
        'JS',
        'JavaScript',
        'AA',
        'OpenAction',
        'Launch',
        'EmbeddedFiles',
        'RichMedia',
        'XFA',
        'AcroForm',
        'URI',
        'EF',
      ])
      const queue = pdf.context.enumerateIndirectObjects().map(([, entry]) => entry),
        visited = new Set<unknown>()
      let inflated = 0
      while (queue.length) {
        const entry = queue.pop()!
        if (visited.has(entry)) continue
        visited.add(entry)
        if (visited.size > 100000) throw Error('PDF traversal budget')
        if (entry instanceof PDFRawStream) {
          const filter = entry.dict.get(PDFName.of('Filter'))?.toString()
          if (filter) {
            if (
              !['/FlateDecode', '[/FlateDecode]', '[ /FlateDecode ]', '/DCTDecode'].includes(filter)
            )
              throw Error('Unverifiable stream compression')
            if (filter !== '/DCTDecode') {
              const result = inflateSync(Buffer.from(entry.getContents()), {
                maxOutputLength: 96 * 1024 * 1024 - inflated,
              })
              inflated += result.length
              if (inflated > 96 * 1024 * 1024) throw Error('PDF inflation budget')
            }
          } else {
            inflated += entry.getContents().length
            if (inflated > 96 * 1024 * 1024) throw Error('PDF raw stream budget')
          }
        }
        const dict =
          entry instanceof PDFDict ? entry : entry instanceof PDFRawStream ? entry.dict : undefined
        if (entry instanceof PDFArray)
          for (const child of entry.asArray()) {
            const value = pdf.context.lookup(child)
            if (value) queue.push(value)
          }
        if (!dict) continue
        if (dict.keys().some((k) => forbidden.has(k.decodeText()))) throw Error('Active PDF')
        const action = dict.get(PDFName.of('S'))?.toString()
        if (
          action &&
          ['/JavaScript', '/Launch', '/GoToR', '/SubmitForm', '/ImportData', '/Rendition'].includes(
            action,
          )
        )
          throw Error('Active PDF')
        if (dict.get(PDFName.of('Subtype'))?.toString() === '/Image') {
          const w = Number(dict.get(PDFName.of('Width'))?.toString()),
            h = Number(dict.get(PDFName.of('Height'))?.toString())
          if (
            !Number.isSafeInteger(w) ||
            !Number.isSafeInteger(h) ||
            w < 1 ||
            h < 1 ||
            w * h * 4 > DECODE_BUDGET_BYTES
          )
            throw Error('PDF image budget')
        }
        for (const [, child] of dict.entries()) {
          const value = pdf.context.lookup(child)
          if (value) queue.push(value)
        }
      }
      return 'application/pdf'
    }
    if (declared === 'image/png' && ext === 'png') {
      if (
        !b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        b.length < 45 ||
        b.toString('ascii', 12, 16) !== 'IHDR'
      )
        throw Error('PNG envelope')
      const w = b.readUInt32BE(16),
        h = b.readUInt32BE(20)
      if (!w || !h) throw Error('PNG dimensions')
      // Resource budget, not a required photo width/height or megapixel business rule.
      if (w * h * 4 > DECODE_BUDGET_BYTES) throw new DocumentoError(413, 'DOCUMENT_IMAGE_LIMIT')
      let offset = 8,
        ended = false
      const compressed: Buffer[] = []
      while (offset < b.length) {
        if (offset + 12 > b.length) throw Error('PNG chunk')
        const length = b.readUInt32BE(offset),
          type = b.toString('ascii', offset + 4, offset + 8)
        if (offset + 12 + length > b.length || type === 'acTL') throw Error('PNG chunk')
        if (type === 'IDAT') compressed.push(b.subarray(offset + 8, offset + 8 + length))
        offset += 12 + length
        if (type === 'IEND') {
          if (length !== 0 || offset !== b.length) throw Error('PNG tail')
          ended = true
          break
        }
      }
      if (!ended || !compressed.length) throw Error('PNG data')
      // Bound inflation including interlaced/16-bit input BEFORE handing it to a decoder.
      inflateSync(Buffer.concat(compressed), {
        maxOutputLength: Math.min(96 * 1024 * 1024, w * h * 8 + h * 8 + 1024),
      })
      const decoded = await new Promise<PNG>((resolve, reject) =>
        new PNG({ checkCRC: true }).parse(b, (error: Error | null, data: PNG) =>
          error ? reject(error) : resolve(data),
        ),
      )
      if (decoded.width !== w || decoded.height !== h || decoded.data.length !== w * h * 4)
        throw Error('PNG decode')
      return 'image/png'
    }
    if (declared === 'image/jpeg' && ['jpg', 'jpeg'].includes(ext ?? '')) {
      if (b[0] !== 255 || b[1] !== 216 || b[b.length - 2] !== 255 || b[b.length - 1] !== 217)
        throw Error('JPEG envelope')
      const decoded = jpeg.decode(bytes, {
        useTArray: true,
        formatAsRGBA: false,
        tolerantDecoding: false,
        maxResolutionInMP: Number.MAX_SAFE_INTEGER,
        maxMemoryUsageInMB: 96,
      })
      if (
        !decoded.width ||
        !decoded.height ||
        decoded.data.length !== decoded.width * decoded.height * 3
      )
        throw Error('JPEG decode')
      return 'image/jpeg'
    }
  } catch (error) {
    if (error instanceof DocumentoError) throw error
    if (declared === 'image/jpeg' || declared === 'image/png') {
      if (error instanceof Error && /^max(?:ResolutionInMP|MemoryUsageInMB) limit exceeded/.test(error.message))
        throw new DocumentoError(413, 'DOCUMENT_IMAGE_LIMIT')
      throw new DocumentoError(422, 'DOCUMENT_IMAGE_INVALID')
    }
    throw new DocumentoError(422, 'DOCUMENT_FILE_INVALID')
  }
  throw new DocumentoError(422, 'DOCUMENT_FILE_INVALID')
}
