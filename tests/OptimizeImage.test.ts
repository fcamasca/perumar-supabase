import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { optimizeImage } from '../src/documents/optimizeImage'

let width: number, height: number, broken: boolean
const createUrl = vi.fn(), revokeUrl = vi.fn(), draw = vi.fn()
const canvasSizes: number[][] = []
beforeEach(() => {
  width = 4000; height = 3000; broken = false; canvasSizes.length = 0
  createUrl.mockReset().mockReturnValue('blob:source'); revokeUrl.mockReset(); draw.mockReset()
  class LocalURL extends URL { static createObjectURL = createUrl; static revokeObjectURL = revokeUrl }
  class Picture {
    naturalWidth = width; naturalHeight = height
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_value: string) { queueMicrotask(() => broken ? this.onerror?.() : this.onload?.()) }
  }
  vi.stubGlobal('URL', LocalURL); vi.stubGlobal('Image', Picture)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback, type) {
    canvasSizes.push([this.width, this.height])
    callback(new Blob(['rebuilt'], { type }))
  })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('creates a proportional JPEG copy, preserves the original and releases the source URL', async () => {
  const original = new File(['original'], 'camera.jpg', { type: 'image/jpeg' })
  const copy = await optimizeImage(original)
  expect(copy).not.toBe(original)
  expect(copy.name).toBe('imagen-optimizada.jpg')
  expect(copy.type).toBe('image/jpeg')
  expect(original.name).toBe('camera.jpg')
  expect(original.size).toBe(8)
  expect(canvasSizes).toEqual([[2000, 1500]])
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:source')
})
it('preserves PNG format and never enlarges an already small image', async () => {
  width = 200; height = 300
  const copy = await optimizeImage(new File(['original'], 'photo.png', { type: 'image/png' }))
  expect(copy.name).toBe('imagen-optimizada.png')
  expect(copy.type).toBe('image/png')
  expect(canvasSizes).toEqual([[200, 300]])
})
it('keeps failure explicit and releases the URL when decoding fails', async () => {
  broken = true
  await expect(optimizeImage(new File(['broken'], 'photo.jpg', { type: 'image/jpeg' }))).rejects.toThrow('No se pudo leer')
  expect(revokeUrl).toHaveBeenCalledOnce()
  expect(draw).not.toHaveBeenCalled()
})
it('never attempts to optimize a PDF', async () => {
  await expect(optimizeImage(new File(['pdf'], 'scan.pdf', { type: 'application/pdf' }))).rejects.toThrow('Solo se pueden optimizar')
  expect(createUrl).not.toHaveBeenCalled()
})
it('reduces an oversized PNG progressively while keeping PNG format', async () => {
  let attempts = 0
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(function (this: HTMLCanvasElement, callback, type) {
    canvasSizes.push([this.width, this.height])
    callback(new Blob([new Uint8Array((++attempts === 1 ? 6 : 4) * 1024 * 1024)], { type }))
  })
  const copy = await optimizeImage(new File(['original'], 'large.png', { type: 'image/png' }))
  expect(copy.size).toBe(4 * 1024 * 1024)
  expect(copy.type).toBe('image/png')
  expect(attempts).toBe(2)
  expect(canvasSizes[1][0]).toBeLessThan(canvasSizes[0][0])
  expect(canvasSizes[1][1]).toBeLessThan(canvasSizes[0][1])
})
it('compresses JPEG quality before reducing its pixel dimensions', async () => {
  const qualities: unknown[] = []
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(function (this: HTMLCanvasElement, callback, type, quality) {
    qualities.push(quality); canvasSizes.push([this.width, this.height])
    callback(new Blob([new Uint8Array((qualities.length === 1 ? 6 : 2) * 1024 * 1024)], { type }))
  })
  const copy = await optimizeImage(new File(['original'], 'large.jpg', { type: 'image/jpeg' }))
  expect(copy.size).toBe(2 * 1024 * 1024)
  expect(qualities[1]).toBeLessThan(qualities[0] as number)
  expect(canvasSizes[1]).toEqual(canvasSizes[0])
})
it('stops with a safe message when the encoder cannot meet the file limit', async () => {
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(callback => callback(new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' })))
  await expect(optimizeImage(new File(['original'], 'large.png', { type: 'image/png' }))).rejects.toThrow('No se pudo reducir la copia a 5 MiB')
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(6)
  expect(revokeUrl).toHaveBeenCalledOnce()
})
