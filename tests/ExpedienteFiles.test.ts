import { expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import { validateFile } from '../supabase/functions/_shared/expediente/validateFile'
import {
  generationRequest,
  downloadRequest,
  sha256,
  databaseError,
  GENERADO_CODES,
} from '../supabase/functions/_shared/expediente/contract'
import { renderExpediente } from '../supabase/functions/_shared/expediente/renderers'
import { renderFicha } from '../supabase/functions/_shared/ficha/render'
import { fichaFixture } from './ficha-fixture'
const id = '11111111-1111-4111-8111-111111111111',
  version = '2026-01-01T12:00:00.123456Z'
async function pdf(pages = 1, active = false, compressed = false) {
  const p = await PDFDocument.create()
  for (let i = 0; i < pages; i++) p.addPage()
  if (active) p.catalog.set(PDFName.of('OpenAction'), PDFDict.withContext(p.context))
  return p.save({ useObjectStreams: compressed })
}
async function words(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  return doc
    .getPages()
    .flatMap((p) => {
      const c = p.node.Contents(),
        refs = c instanceof PDFArray ? c.asArray() : c ? [c] : []
      return refs
        .map((r) => doc.context.lookup(r))
        .filter((s): s is PDFRawStream => s instanceof PDFRawStream)
        .flatMap((s) =>
          [
            ...new TextDecoder()
              .decode(decodePDFRawStream(s).decode())
              .matchAll(/<([A-Fa-f0-9]+)> Tj/g),
          ].map(([, v]) => Buffer.from(v, 'hex').toString('latin1')),
        )
    })
    .join('\n')
}
it.each([
  'actor',
  'estado',
  'object_key',
  'bucket',
  'url',
  'hash',
  'sql',
  'plantilla',
  'service_role',
])('rejects %s supplied by React', (field) => {
  expect(() =>
    generationRequest({ documento_id: id, expected_updated_at: version, [field]: 'FORGED' }),
  ).toThrow('DOCUMENT_INPUT')
})
it('rejects non-string proxy fields, malformed versions, ids and historical flags', () => {
  expect(() =>
    generationRequest({
      documento_id: id,
      expected_updated_at: version,
      datos_generacion: { apoderado_nombre: { html: 'x' } },
    }),
  ).toThrow()
  expect(() => generationRequest({ documento_id: 'bad', expected_updated_at: version })).toThrow()
  expect(() => generationRequest({ documento_id: id, expected_updated_at: 'yesterday' })).toThrow()
  expect(() => downloadRequest({ documento_id: id, archivo_id: id, historico: 'true' })).toThrow()
  expect(downloadRequest({ documento_id: id, archivo_id: id, historico: true }).historico).toBe(
    true,
  )
})
it.each(['PT409', '40001', '40P01'])('keeps %s explicit without leaking SQL details', (code) => {
  const e = databaseError({ code, message: 'SQL PII TOKEN' })
  expect(e.status).toBe(409)
  expect(e.code).toBe('DOCUMENT_VERSION')
  expect(e.message).not.toContain('PII')
})
it('hashes actual bytes on the server', async () => {
  vi.stubGlobal('crypto', webcrypto)
  expect(await sha256(new TextEncoder().encode('abc'))).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
  vi.unstubAllGlobals()
})
it('parses safe PDF and rejects encrypted/active/structurally unbounded/too-many-page or corrupt input', async () => {
  expect(await validateFile(await pdf(), 'application/pdf', 'scan.pdf')).toBe('application/pdf')
  await expect(validateFile(await pdf(1, true), 'application/pdf', 'scan.pdf')).rejects.toThrow(
    'DOCUMENT_FILE_INVALID',
  )
  await expect(
    validateFile(await pdf(1, false, true), 'application/pdf', 'scan.pdf'),
  ).rejects.toThrow('DOCUMENT_FILE_INVALID')
  await expect(validateFile(await pdf(21), 'application/pdf', 'scan.pdf')).rejects.toThrow(
    'DOCUMENT_FILE_INVALID',
  )
  await expect(
    validateFile(
      new TextEncoder().encode('%PDF-1.4 CORRUPT\n%%EOF'),
      'application/pdf',
      'scan.pdf',
    ),
  ).rejects.toThrow('DOCUMENT_FILE_INVALID')
})
it('decodes real PNG/JPEG and rejects corruption, MIME disguise, tails and dangerous double extensions', async () => {
  const rgba = Buffer.from([255, 0, 0, 255]),
    png = PNG.sync.write(Object.assign(new PNG({ width: 1, height: 1 }), { data: rgba })),
    jpg = jpeg.encode({ width: 1, height: 1, data: rgba }).data
  expect(await validateFile(png, 'image/png', 'foto.png', true)).toBe('image/png')
  expect(await validateFile(jpg, 'image/jpeg', 'foto.jpg', true)).toBe('image/jpeg')
  await expect(validateFile(png, 'image/jpeg', 'foto.jpg')).rejects.toThrow()
  await expect(
    validateFile(Buffer.concat([png, Buffer.from('<html>')]), 'image/png', 'foto.png'),
  ).rejects.toThrow()
  await expect(
    validateFile(Buffer.concat([jpg, Buffer.from('<html>')]), 'image/jpeg', 'foto.jpg'),
  ).rejects.toThrow()
  await expect(validateFile(png, 'image/png', 'foto.exe.png')).rejects.toThrow()
  const bad = Buffer.from(png)
  bad[bad.length - 1] ^= 1
  await expect(validateFile(bad, 'image/png', 'foto.png')).rejects.toThrow()
  await expect(validateFile(await pdf(), 'application/pdf', 'foto.pdf', true)).rejects.toThrow()
})
it('rejects empty/oversized and oversized decoded PNG before allocating pixels', async () => {
  await expect(validateFile(new Uint8Array(), 'image/png', 'x.png')).rejects.toThrow(
    'DOCUMENT_LIMIT',
  )
  await expect(validateFile(new Uint8Array(5242881), 'application/pdf', 'x.pdf')).rejects.toThrow(
    'DOCUMENT_LIMIT',
  )
  const png = PNG.sync.write(
    Object.assign(new PNG({ width: 1, height: 1 }), { data: Buffer.from([0, 0, 0, 255]) }),
  )
  png.writeUInt32BE(100000, 16)
  png.writeUInt32BE(100000, 20)
  await expect(validateFile(png, 'image/png', 'x.png')).rejects.toThrow('DOCUMENT_FILE_INVALID')
})
it.each(GENERADO_CODES)(
  'renders fixed institutional %s with current generation date/age and safe output',
  async (code) => {
    const source = fichaFixture(),
      at = new Date('2035-01-03T02:00:00Z'),
      data = {
        capitania_nombre: 'PISCO',
        apoderado_nombre: 'PERSONA APODERADA SINTÉTICA',
        apoderado_tipo_di_etiqueta: 'DNI',
        apoderado_numero_di: '00000002',
      }
    const bytes = await renderExpediente(code, source, at, data),
      text = await words(bytes)
    expect(text).toContain('35 años')
    expect(text).toContain('2035')
    expect(text).toContain('ÁNGELA LUCÍA')
    expect(await validateFile(bytes, 'application/pdf', 'documento.pdf')).toBe('application/pdf')
    const parsed = await PDFDocument.load(bytes)
    expect(parsed.getPageCount()).toBeGreaterThan(0)
    if (code === 'CARTA_PODER') {
      expect(text).toContain(data.apoderado_nombre)
      await expect(
        renderExpediente(code, source, at, { capitania_nombre: 'PISCO' }),
      ).rejects.toThrow('DOCUMENT_REPRESENTATIVE_REQUIRED')
    }
  },
)
it('preserves the old H5 default date/age while H6 uses a fixed generation profile', async () => {
  const source = fichaFixture(),
    now = new Date('2035-01-03T02:00:00Z')
  expect(await words(await renderFicha(source, now))).toContain('25 años')
  const h6 = await words(await renderFicha(source, now, 'H6'))
  expect(h6).toContain('35 años')
  expect(h6).toContain('Fecha de matrícula: 2026-01-01')
})
it('paginates all personal contacts and rejects unsupported glyphs without silent substitution', async () => {
  const source = fichaFixture(100),
    at = new Date('2035-01-03T02:00:00Z')
  const bytes = await renderExpediente('FICHA_DATOS_PERSONALES', source, at, {
      capitania_nombre: 'PISCO',
    }),
    parsed = await PDFDocument.load(bytes),
    text = await words(bytes)
  expect(parsed.getPageCount()).toBeGreaterThan(1)
  expect(text).toContain('MUÑOZ 100')
  source.datos_ficha.alumno.nombres = 'UNSUPPORTED 🛥'
  await expect(renderExpediente('DECLARACION_JURADA', source, at, {})).rejects.toThrow(
    'DOCUMENT_GLYPH',
  )
})
