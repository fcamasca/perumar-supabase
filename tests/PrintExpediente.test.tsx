import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { PrintExpediente } from '../src/documents/PrintExpediente'
import type { PrintPlan } from '../src/documents/printExpedienteData'

const { load, download, roles, client } = vi.hoisted(() => ({ load: vi.fn(), download: vi.fn(), roles: { current: ['DIRECTOR_ACADEMICO'] }, client: {} }))
vi.mock('../src/documents/printExpedienteData', async original => ({ ...await original<typeof import('../src/documents/printExpedienteData')>(), loadPrintPlan: load, downloadPrintFiles: download }))
let plan: PrintPlan
const create = vi.fn(), revoke = vi.fn()
beforeEach(async () => {
  roles.current = ['DIRECTOR_ACADEMICO']; load.mockReset(); download.mockReset(); create.mockReset().mockReturnValue('blob:print'); revoke.mockReset()
  plan = { students: [{ id: 'a', codigo_matricula: 'M1', alumno: { apellido_paterno: 'PÉREZ', apellido_materno: 'RÍOS', nombres: 'ANA', numero_di: '111' } }], documents: [
    { id: 'd1', matricula_id: 'a', codigo: 'FICHA_MATRICULA', nombre: 'Ficha de matrícula', printStatus: 'Disponible' },
    { id: 'd2', matricula_id: 'a', codigo: 'CARTA_PODER', nombre: 'Carta poder', printStatus: 'Pendiente de generar' },
  ] } as PrintPlan
  load.mockResolvedValue(plan)
  const pdf = await PDFDocument.create(); pdf.addPage([595, 842])
  download.mockResolvedValue([{ student: 'a', bytes: await pdf.save() }])
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client, state: { userId: 'actor', roles: roles.current } }) }))
it('defaults all generated types on, explains pending documents and never generates on opening', async () => {
  render(<PrintExpediente cycle="c" enrollments={['a']} close={() => {}}/>)
  await screen.findByText('1 alumno · 1 documento disponible · 1 pendiente de generar o regenerar')
  expect(screen.getByRole('checkbox', { name: 'Ficha de matrícula' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Carta poder' })).toBeChecked()
  expect(screen.getByText('Carta poder: Pendiente de generar')).toBeVisible()
  expect(download).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ficha de matrícula' }))
  expect(screen.getByRole('button', { name: 'Preparar vista previa (0)' })).toBeDisabled()
})
it('opens a real merged PDF only on request and cleans up on close with focus restoration', async () => {
  function Harness() { const [open, setOpen] = useState(false); return <><button onClick={() => setOpen(true)}>Abrir impresión</button>{open && <PrintExpediente cycle="c" enrollments={['a']} close={() => setOpen(false)}/>}</> }
  render(<Harness/>); const trigger = screen.getByRole('button', { name: 'Abrir impresión' }); trigger.focus(); fireEvent.click(trigger)
  fireEvent.click(await screen.findByRole('button', { name: 'Preparar vista previa (1)' }))
  const iframe = await screen.findByTitle('PDF de expedientes', {}, { timeout: 5000 })
  expect(iframe).toHaveAttribute('src', 'blob:print'); expect(create.mock.calls[0][0].type).toBe('application/pdf')
  expect(download).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: 'Imprimir' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(revoke).toHaveBeenCalledWith('blob:print'); expect(trigger).toHaveFocus()
})
it('preserves selection on failure, shows no partial package and does not retry', async () => {
  download.mockRejectedValue(new Error('La fuente cambió.'))
  render(<PrintExpediente cycle="c" enrollments={['a']} close={() => {}}/>)
  fireEvent.click(await screen.findByRole('button', { name: 'Preparar vista previa (1)' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('No se abrió un paquete parcial')
  expect(download).toHaveBeenCalledTimes(1); expect(screen.queryByTitle('PDF de expedientes')).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Ficha de matrícula' })).toBeChecked()
})
it('does not query or prepare without academic access', async () => {
  roles.current = ['ADMIN_SISTEMA']
  render(<PrintExpediente cycle="c" enrollments={['a']} close={() => {}}/>)
  expect(screen.getByRole('alert')).toHaveTextContent('No tienes acceso académico')
  expect(load).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled()
})
it('aborts pending preparation when closed and handles Escape', async () => {
  download.mockImplementation(() => new Promise(() => {}))
  const close = vi.fn(), view = render(<PrintExpediente cycle="c" enrollments={['a']} close={close}/>)
  fireEvent.click(await screen.findByRole('button', { name: 'Preparar vista previa (1)' }))
  await waitFor(() => expect(download).toHaveBeenCalledOnce())
  const signal = download.mock.calls[0][4] as AbortSignal
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(close).toHaveBeenCalledOnce()
  view.unmount(); expect(signal.aborted).toBe(true); expect(create).not.toHaveBeenCalled()
})
