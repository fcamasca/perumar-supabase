import { StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EnrollmentPhoto, StudentPhoto } from '../src/documents/EnrollmentPhoto'
const { client, query, eq, order, state } = vi.hoisted(() => ({
  client: { from: vi.fn(), functions: { invoke: vi.fn() } }, query: vi.fn(), eq: vi.fn(), order: vi.fn(),
  state: { userId: 'actor', roles: ['DIRECTOR_ACADEMICO'] },
}))
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client, state }) }))
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
const create = vi.fn(), revoke = vi.fn()
const props = { enrollment: 'enrollment', enrollmentState: 'ACTIVO', cycleState: 'PROGRAMADO' }
beforeEach(() => {
  state.roles = ['DIRECTOR_ACADEMICO']; state.userId = 'actor'
  query.mockReset().mockResolvedValue({ data: null, error: null }); eq.mockReset(); order.mockReset()
  client.functions.invoke.mockReset()
  client.from.mockReset().mockImplementation(() => {
    const q = { select: () => q, eq: (...args: unknown[]) => { eq(...args); return q }, in: () => q, order: (...args: unknown[]) => { order(...args); return q }, limit: () => q, maybeSingle: query }
    return q
  })
  create.mockReset().mockReturnValue('blob:photo'); revoke.mockReset()
  class LocalURL extends URL { static createObjectURL = create; static revokeObjectURL = revoke }
  vi.stubGlobal('URL', LocalURL)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false } })
})
afterEach(() => {
  cleanup(); vi.unstubAllGlobals()
  for (const [key, descriptor] of [['showModal', originalShow], ['close', originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key)
  }
})
it('shows no photo without fetching a file when no active current confirmed photo exists', async () => {
  render(<EnrollmentPhoto {...props} />)
  expect(await screen.findByText('Sin foto')).toBeVisible()
  expect(eq.mock.calls).toEqual(expect.arrayContaining([
    ['matricula_id', 'enrollment'], ['codigo', 'FOTO_ALUMNO'], ['activo', true], ['contexto_vigente', true], ['estado', 'CARGADO'],
  ]))
  expect(client.functions.invoke).not.toHaveBeenCalled()
})
it('loads one private confirmed photo in StrictMode, enlarges it and releases its URL', async () => {
  query.mockResolvedValue({ data: { id: 'photo-doc', ultimo_archivo_confirmado_id: 'photo-file' }, error: null })
  client.functions.invoke.mockResolvedValue({ data: new Blob(['photo'], { type: 'image/jpeg' }), error: null })
  const view = render(<StrictMode><EnrollmentPhoto {...props} /></StrictMode>)
  const enlarge = await screen.findByRole('button', { name: 'Ampliar foto del alumno' })
  expect(client.functions.invoke).toHaveBeenCalledExactlyOnceWith('expediente-descargar', { body: { documento_id: 'photo-doc', archivo_id: 'photo-file', historico: false } })
  fireEvent.click(enlarge)
  expect(screen.getByRole('dialog', { name: 'Foto del alumno' })).toBeVisible()
  expect(screen.getByAltText('Foto del alumno ampliada')).toHaveAttribute('src', 'blob:photo')
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar foto' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  view.unmount()
  expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:photo')
})
it('does not automatically fetch historical photos for an annulled enrollment or an admin-only user', () => {
  const view = render(<EnrollmentPhoto {...props} enrollmentState="ANULADO" />)
  expect(screen.getByText('Sin foto')).toBeVisible()
  expect(client.from).not.toHaveBeenCalled()
  view.unmount(); state.roles = ['ADMIN_SISTEMA']
  render(<EnrollmentPhoto {...props} />)
  expect(client.from).not.toHaveBeenCalled()
})
it('shows a safe error without retries when the authorized read fails', async () => {
  query.mockResolvedValue({ data: { id: 'photo-doc', ultimo_archivo_confirmado_id: 'photo-file' }, error: null })
  client.functions.invoke.mockResolvedValue({ data: null, error: { code: 'DOCUMENT_ACCESS' } })
  render(<EnrollmentPhoto {...props} />)
  expect(await screen.findByText('No se pudo consultar la foto')).toBeVisible()
  expect(client.functions.invoke).toHaveBeenCalledOnce()
  expect(create).not.toHaveBeenCalled()
})
it('selects the latest confirmed student photo across courses and identifies its enrollment', async () => {
  query.mockResolvedValue({ data: { id: 'latest-file', confirmado_at: '2026-11-19T17:00:00Z', documento: {
    id: 'other-enrollment-document', activo: true, contexto_vigente: true, ultimo_archivo_confirmado_id: 'latest-file',
    matricula: { codigo_matricula: '2026-OTRO-002', estado_codigo: 'ACTIVO', ciclo: { estado_codigo: 'CERRADO' } },
  } }, error: null })
  client.functions.invoke.mockResolvedValue({ data: new Blob(['photo'], { type: 'image/png' }), error: null })
  render(<StudentPhoto student="student-id" />)
  await screen.findByRole('button', { name: 'Ampliar foto del alumno' })
  expect(client.from).toHaveBeenCalledWith('matricula_documento_archivo')
  expect(eq.mock.calls).toContainEqual(['documento.matricula.alumno_id', 'student-id'])
  expect(eq.mock.calls.some(([column]) => column.includes('ciclo_id'))).toBe(false)
  expect(order.mock.calls).toEqual([['confirmado_at', { ascending: false }], ['id', { ascending: false }]])
  expect(client.functions.invoke).toHaveBeenCalledExactlyOnceWith('expediente-descargar', { body: { documento_id: 'other-enrollment-document', archivo_id: 'latest-file', historico: false } })
  expect(screen.getByText(/Matrícula 2026-OTRO-002/, { selector: 'small' })).toBeVisible()
})
it('labels a historical latest student photo and requests its historical read explicitly', async () => {
  query.mockResolvedValue({ data: { id: 'historical-file', confirmado_at: '2026-11-18T17:00:00Z', documento: {
    id: 'historical-document', activo: false, contexto_vigente: false, ultimo_archivo_confirmado_id: 'historical-file',
    matricula: { codigo_matricula: '2026-OLD-001', estado_codigo: 'ANULADO', ciclo: { estado_codigo: 'ANULADO' } },
  } }, error: null })
  client.functions.invoke.mockResolvedValue({ data: new Blob(['photo'], { type: 'image/png' }), error: null })
  render(<StudentPhoto student="student-id" />)
  await screen.findByRole('button', { name: 'Ampliar foto del alumno' })
  expect(client.functions.invoke.mock.calls[0][1].body.historico).toBe(true)
  expect(screen.getByText(/Histórica/, { selector: 'small' })).toBeVisible()
})
