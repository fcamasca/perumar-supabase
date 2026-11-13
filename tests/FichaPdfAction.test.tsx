import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FichaPdfAction } from '../src/enrollment/FichaPdfAction'
const mock = vi.hoisted(() => ({ invoke: vi.fn(), roles: ['DIRECTOR_ACADEMICO'] }))
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client: { functions: { invoke: mock.invoke } }, state: { userId: 'actor', roles: mock.roles } }) }))
beforeEach(() => { mock.invoke.mockReset(); mock.roles = ['DIRECTOR_ACADEMICO'] })
const props = { enrollment: 'm1', version: 'v1', enrollmentState: 'ACTIVO', cycleState: 'PROGRAMADO' }
it('sends only enrollment/version and preserves context on explicit conflict without retry', async () => {
  mock.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ code: 'VERSION' })) } })
  render(<FichaPdfAction {...props}/>); fireEvent.click(screen.getByRole('button', { name: 'Generar ficha PDF' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('La matrícula cambió')
  expect(mock.invoke).toHaveBeenCalledExactlyOnceWith('ficha-matricula', { body: { matricula_id: 'm1', expected_updated_at: 'v1' } })
  expect(screen.getByRole('alert')).toHaveFocus()
})
it('guards double click and offers an explicit download after generation', async () => {
  let resolve!: (v: unknown) => void
  mock.invoke.mockReturnValue(new Promise(r => { resolve = r }))
  render(<FichaPdfAction {...props}/>); const button = screen.getByRole('button', { name: 'Generar ficha PDF' })
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
  render(<FichaPdfAction {...props}/>); fireEvent.click(screen.getByRole('button'))
  await screen.findByRole('alert'); await waitFor(() => expect(screen.getByRole('button')).toBeEnabled()); expect(mock.invoke).toHaveBeenCalledOnce()
})

it('requires explicit regeneration after changed source without retry or losing enrollment context', async () => {
  mock.invoke.mockResolvedValueOnce({ data: { artefacto_id: 'artifact' }, error: null })
  render(<FichaPdfAction {...props}/>); fireEvent.click(screen.getByRole('button', { name: 'Generar ficha PDF' }))
  const download = await screen.findByRole('button', { name: 'Descargar ficha PDF' })
  mock.invoke.mockResolvedValue({ error: { context: new Response(JSON.stringify({ code: 'SOURCE_CHANGED' })) } })
  fireEvent.click(download)
  expect(await screen.findByRole('alert')).toHaveTextContent('Los datos de la ficha cambiaron')
  expect(screen.queryByRole('button', { name: 'Descargar ficha PDF' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Generar ficha PDF' })).toBeEnabled()
  expect(mock.invoke).toHaveBeenCalledTimes(2)
  expect(mock.invoke.mock.calls[1][1].body.matricula_id).toBe('m1')
})
