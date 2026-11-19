import { afterEach, expect, it, vi } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'
import { FunctionsClient } from '@supabase/functions-js'
import { documentFileBlob } from '../src/documents/documentFileResponse'

afterEach(() => vi.unstubAllGlobals())
it.each(['image/jpeg', 'image/png', 'application/pdf'])(
  'preserves exact binary bytes through the real Functions SDK for %s', async mime => {
    vi.stubGlobal('Blob', NodeBlob)
    const bytes = new Uint8Array([0, 255, 216, 128, 254, 0, 10, 217])
    const fetcher = vi.fn(async () => new Response(bytes, { headers: {
      'Content-Type': mime.startsWith('image/') ? 'application/octet-stream' : mime,
      'X-Documento-Mime': mime,
    } }))
    const client = new FunctionsClient('http://127.0.0.1/functions/v1', { customFetch: fetcher })
    const result = await client.invoke('expediente-descargar', { body: { documento_id: 'doc', archivo_id: 'file' } })
    expect(result.error).toBeNull()
    const blob = documentFileBlob(result.data, result.response)
    expect(blob.type).toBe(mime)
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes)
    expect(fetcher).toHaveBeenCalledOnce()
  },
)
it('rejects text-decoded data and unapproved MIME without interpreting it as an image', () => {
  expect(() => documentFileBlob('corrupted text')).toThrow('binario válido')
  expect(() => documentFileBlob(new Blob(['content'], { type: 'text/html' }))).toThrow('formato de archivo admitido')
})
