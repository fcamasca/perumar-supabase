import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FichaPdfAction } from '../src/enrollment/FichaPdfAction'
const mock = vi.hoisted(() => {
  const invoke = vi.fn(), query = vi.fn(), select = vi.fn()
  const from = vi.fn((table: string) => {
    const q = { select: (fields: string) => { select(table, fields); return q }, eq: () => q, order: () => q, limit: () => q, maybeSingle: () => query(table) }
    return q
  })
  return { invoke, query, select, from, roles: ['DIRECTOR_ACADEMICO'], userId: 'actor', client: { functions: { invoke }, from } }
})
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client: mock.client, state: { userId: mock.userId, roles: mock.roles } }) }))
beforeEach(() => {
  mock.invoke.mockReset(); mock.roles = ['DIRECTOR_ACADEMICO']; mock.userId = 'actor'; mock.from.mockClear(); mock.select.mockClear()
  mock.query.mockReset().mockImplementation((table: string) => Promise.resolve({ data: table === 'auditoria' ? null : { source_fingerprint: 'fp' }, error: null }))
})
const props = { enrollment: 'm1', version: 'v1', enrollmentState: 'ACTIVO', cycleState: 'PROGRAMADO' }
async function ready() {
  const view = render(<FichaPdfAction {...props}/>)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generar ficha PDF' })).toBeEnabled())
  return view
}

it('sends only enrollment/version and preserves context on explicit conflict without retry', async () => {
  mock.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ code: 'VERSION' })) } })
  await ready(); fireEvent.click(screen.getByRole('button', { name: 'Generar ficha PDF' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('La matrícula cambió')
  expect(mock.invoke).toHaveBeenCalledExactlyOnceWith('ficha-matricula', { body: { matricula_id: 'm1', expected_updated_at: 'v1' } })
  expect(screen.getByRole('alert')).toHaveFocus()
})
it('guards double click and offers an explicit download after generation', async () => {
  let resolve!: (v: unknown) => void
  mock.invoke.mockReturnValue(new Promise(r => { resolve = r }))
  await ready(); const button = screen.getByRole('button', { name: 'Generar ficha PDF' })
  fireEvent.click(button); fireEvent.click(button); expect(mock.invoke).toHaveBeenCalledOnce()
  resolve({ data: { artefacto_id: 'artifact' }, error: null })
  await screen.findByRole('button', { name: 'Descargar ficha PDF' })
  expect(screen.getByRole('status')).toHaveTextContent('24 horas')
})
it.each(['ANULADO', 'DESIERTO'])('blocks ineligible cycle %s', state => {
  render(<FichaPdfAction {...props} cycleState={state}/>); expect(screen.getByRole('button')).toBeDisabled(); expect(mock.invoke).not.toHaveBeenCalled()
})
it('blocks an annulled enrollment and unsaved edits', () => {
  const r = render(<FichaPdfAction {...props} enrollmentState="ANULADO"/>); expect(screen.getByRole('button')).toBeDisabled()
  r.rerender(<FichaPdfAction {...props} disabled/>); expect(screen.getByRole('button')).toBeDisabled()
})
it('hides action for an administrative role alone', () => {
  mock.roles = ['ADMIN_SISTEMA']; render(<FichaPdfAction {...props}/>); expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('does not regenerate automatically after failure', async () => {
  mock.invoke.mockRejectedValue(new Error('Synthetic unavailable'))
  await ready(); fireEvent.click(screen.getByRole('button'))
  await screen.findByRole('alert'); await waitFor(() => expect(screen.getByRole('button')).toBeEnabled()); expect(mock.invoke).toHaveBeenCalledOnce()
})

it('requires explicit regeneration after changed source without retry or losing enrollment context', async () => {
  mock.invoke.mockResolvedValueOnce({ data: { artefacto_id: 'artifact' }, error: null })
  await ready(); fireEvent.click(screen.getByRole('button', { name: 'Generar ficha PDF' }))
  const download = await screen.findByRole('button', { name: 'Descargar ficha PDF' })
  mock.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ code: 'SOURCE_CHANGED' })) } })
  fireEvent.click(download)
  expect(await screen.findByRole('alert')).toHaveTextContent('Los datos de la ficha cambiaron')
  expect(screen.queryByRole('button', { name: 'Descargar ficha PDF' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Regenerar ficha PDF' })).toBeEnabled()
  expect(mock.invoke).toHaveBeenCalledTimes(2)
  expect(mock.invoke.mock.calls[1][1].body.matricula_id).toBe('m1')
})

function recoverable(overrides = {}) {
  return { artefacto_id: 'previous', source_fingerprint: 'fp', expires_at: new Date(Date.now() + 60000).toISOString(), ...overrides }
}
function history(manifest: ReturnType<typeof recoverable>) {
  mock.query.mockImplementation((table: string) => Promise.resolve({ data: table === 'auditoria' ? { new_values: manifest } : { source_fingerprint: 'fp' }, error: null }))
}
it('recovers Regenerate and Download from server metadata after leaving and returning', async () => {
  history(recoverable())
  const view = render(<FichaPdfAction {...props}/>)
  await screen.findByRole('button', { name: 'Descargar ficha PDF' })
  expect(screen.getByRole('button', { name: 'Regenerar ficha PDF' })).toBeEnabled()
  view.unmount()
  mock.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ code: 'EXPIRED' })) } })
  render(<FichaPdfAction {...props}/>)
  fireEvent.click(await screen.findByRole('button', { name: 'Descargar ficha PDF' }))
  await waitFor(() => expect(mock.invoke).toHaveBeenCalledExactlyOnceWith('ficha-matricula', { body: { matricula_id: 'm1', expected_updated_at: 'v1', artefacto_id: 'previous' } }))
  expect(await screen.findByRole('alert')).toHaveTextContent('La ficha venció')
  expect(screen.getByRole('button', { name: 'Regenerar ficha PDF' })).toBeEnabled()
  expect(mock.select).toHaveBeenCalledWith('auditoria', 'new_values')
  expect(mock.select).toHaveBeenCalledWith('matricula_ficha_fuente', 'source_fingerprint')
})
it.each(['expired', 'changed', 'legacy'])('keeps Regenerate for %s previous PDF without offering a stale download', async kind => {
  history(recoverable(kind === 'expired' ? { expires_at: '2000-01-01' } : { source_fingerprint: kind === 'legacy' ? undefined : 'old' }))
  render(<FichaPdfAction {...props}/>)
  expect(await screen.findByRole('button', { name: 'Regenerar ficha PDF' })).toBeEnabled()
  expect(screen.queryByRole('button', { name: 'Descargar ficha PDF' })).not.toBeInTheDocument()
  expect(mock.invoke).not.toHaveBeenCalled()
})
it('does not mistake a lookup failure for a first generation or retry automatically', async () => {
  mock.query.mockRejectedValue(new Error('unavailable'))
  render(<FichaPdfAction {...props}/>)
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar la ficha anterior')
  expect(screen.getByRole('button', { name: 'Generar nueva ficha PDF' })).toBeEnabled()
  expect(mock.invoke).not.toHaveBeenCalled(); expect(mock.query).toHaveBeenCalledTimes(2)
})
it('ignores recovered metadata arriving after changing enrollment and identity', async () => {
  let finish!: (value: unknown) => void
  mock.query.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const view = render(<FichaPdfAction {...props}/>)
  mock.userId = 'another-actor'
  view.rerender(<FichaPdfAction {...props} enrollment="m2"/>)
  await screen.findByRole('button', { name: 'Generar ficha PDF' })
  finish({ data: { new_values: recoverable() }, error: null })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generar ficha PDF' })).toBeEnabled())
  expect(screen.queryByRole('button', { name: 'Descargar ficha PDF' })).not.toBeInTheDocument()
  expect(mock.invoke).not.toHaveBeenCalled()
})
