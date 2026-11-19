import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DocumentPreview } from '../src/documents/DocumentPreview'
const { build, createUrl, revokeUrl } = vi.hoisted(() => ({ build: vi.fn(), createUrl: vi.fn(), revokeUrl: vi.fn() }))
vi.mock('../src/documents/previewPdf', () => ({ buildDocumentPreview: build }))
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeEach(() => {
  build.mockReset().mockResolvedValue(new Blob(['synthetic'], { type: 'application/pdf' }))
  createUrl.mockReset().mockReturnValue('blob:synthetic-preview')
  revokeUrl.mockReset()
  class PreviewURL extends URL {
    static createObjectURL = createUrl
    static revokeObjectURL = revokeUrl
  }
  vi.stubGlobal('URL', PreviewURL)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals()
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})
it('opens the selected synthetic PDF, labels it and releases its URL on close', async () => {
  const close = vi.fn(), view = render(<DocumentPreview code="CARTA_PODER" name="Carta poder" onClose={close} />)
  expect(screen.getByRole('dialog', { name: 'Vista previa: Carta poder' })).toBeVisible()
  await waitFor(() => expect(screen.getByTitle('Vista previa PDF de Carta poder')).toHaveAttribute('src', 'blob:synthetic-preview'))
  expect(build).toHaveBeenCalledExactlyOnceWith('CARTA_PODER')
  expect(screen.getByText(/No se registra ningún documento/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }))
  expect(close).toHaveBeenCalledOnce()
  view.unmount()
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:synthetic-preview')
})
it('shows a safe failure without retry or a PDF frame', async () => {
  build.mockRejectedValue(new Error('internal'))
  render(<DocumentPreview code="SOLICITUD" name="Solicitud" onClose={() => {}} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo preparar la vista previa')
  expect(build).toHaveBeenCalledOnce()
  expect(createUrl).not.toHaveBeenCalled()
  expect(screen.queryByTitle('Vista previa PDF de Solicitud')).not.toBeInTheDocument()
})
it('does not retain a PDF URL when the dialog closes before rendering completes', async () => {
  let resolve!: (blob: Blob) => void
  build.mockReturnValue(new Promise<Blob>(r => { resolve = r }))
  const view = render(<DocumentPreview code="SOLICITUD" name="Solicitud" onClose={() => {}} />)
  await waitFor(() => expect(build).toHaveBeenCalledOnce())
  view.unmount()
  resolve(new Blob(['synthetic']))
  await Promise.resolve()
  expect(createUrl).not.toHaveBeenCalled()
})
