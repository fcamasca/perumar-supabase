import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { EnrollmentPayments } from '../src/payments/EnrollmentPayments'
import { savePaymentReference } from '../src/payments/paymentRecovery'
const { client, identity } = vi.hoisted(() => ({ client: { from: vi.fn(), rpc: vi.fn() }, identity: { roles: ['DIRECTOR_ACADEMICO'] } }))
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client, state: { userId:'u', roles:identity.roles } }) }))
let recovery: unknown = null
const changed = vi.fn()
const props = { enrollment:'m', version:'v1', enrollmentState:'ACTIVO', cycleState:'PROGRAMADO', onChanged:changed }
beforeEach(() => {
  sessionStorage.clear(); identity.roles=['DIRECTOR_ACADEMICO']; recovery=null; client.rpc.mockReset(); changed.mockReset()
  client.from.mockImplementation((table:string) => {
    const data = table==='matricula_saldo'?{base:120,abonado:0,pendiente:120}:table==='matricula_cargo_saldo'?[{id:'c1',nombre:'CURSO',pendiente:100},{id:'c2',nombre:'OTRO',pendiente:20}]:table==='catalogo'?{id:'cat'}:table==='catalogo_valor'?[{id:'cash',nombre:'Efectivo'}]:[]
    const q = {select:()=>q,eq:()=>q,order:()=>q,range:()=>q,single:()=>Promise.resolve({data,error:null}),maybeSingle:()=>Promise.resolve({data:recovery,error:null}),then:(resolve:(r:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)}
    return q
  })
})
async function show(overrides:Partial<typeof props>={}) { render(<EnrollmentPayments {...props} {...overrides}/>); await waitFor(()=>expect(screen.getByRole('button',{name:'Registrar pago'})).toBeEnabled()) }
it('manual selection proposes full pending, supports partial and unchecked zero', async () => {
  await show(); fireEvent.click(screen.getByRole('button',{name:'Registrar pago'}))
  fireEvent.click(screen.getByRole('checkbox',{name:'Pagar CURSO'})); expect(screen.getByRole('textbox',{name:'Importe para CURSO'})).toHaveValue('100')
  fireEvent.change(screen.getByRole('textbox',{name:'Importe para CURSO'}),{target:{value:'30.25'}})
  expect(screen.getByRole('checkbox',{name:'Pagar CURSO'})).toBeChecked()
  fireEvent.click(screen.getByRole('checkbox',{name:'Pagar CURSO'})); expect(screen.getByRole('textbox',{name:'Importe para CURSO'})).toHaveValue('0')
  fireEvent.click(screen.getByRole('button',{name:'Seleccionar todos los pendientes'})); expect(screen.getByRole('textbox',{name:'Importe para OTRO'})).toHaveValue('20')
  expect(client.rpc).not.toHaveBeenCalled()
})
it('sends one transactional command with exact manual applications, no date or free concept', async () => {
  await show(); fireEvent.click(screen.getByRole('button',{name:'Registrar pago'}))
  fireEvent.change(screen.getByRole('textbox',{name:'Importe para CURSO'}),{target:{value:'30.25'}})
  fireEvent.change(screen.getByRole('combobox',{name:/Medio de pago/}),{target:{value:'cash'}})
  fireEvent.change(screen.getByRole('textbox',{name:/Observaciones/}),{target:{value:' Nota Mixta '}})
  client.rpc.mockResolvedValue({data:{id:'p'},error:null})
  fireEvent.click(screen.getByRole('button',{name:'Confirmar pago'}))
  await waitFor(()=>expect(client.rpc).toHaveBeenCalledTimes(1))
  const [command,{p}]=client.rpc.mock.calls[0]
  expect(command).toBe('registrar_pago');expect(p).toEqual({matricula_id:'m',expected_matricula_updated_at:'v1',idempotency_key:expect.any(String),importe:'30.25',medio_pago_id:'cash',observaciones:'Nota Mixta',aplicaciones:[{matricula_cargo_id:'c1',importe:'30.25'}]})
  await waitFor(()=>expect(changed).toHaveBeenCalled())
})
it('rejects excess precision before sending, without rounding',async()=>{
  await show();fireEvent.click(screen.getByRole('button',{name:'Registrar pago'}));fireEvent.change(screen.getByRole('textbox',{name:'Importe para CURSO'}),{target:{value:'10.001'}});fireEvent.change(screen.getByRole('combobox'),{target:{value:'cash'}});fireEvent.click(screen.getByRole('button',{name:'Confirmar pago'}));expect(client.rpc).not.toHaveBeenCalled();expect(screen.getByRole('status')).toHaveTextContent('máximo dos decimales')
})
it('retains key after lost response and only replays the identical explicit attempt',async()=>{
  await show();fireEvent.click(screen.getByRole('button',{name:'Registrar pago'}));fireEvent.click(screen.getByRole('checkbox',{name:'Pagar CURSO'}));fireEvent.change(screen.getByRole('combobox'),{target:{value:'cash'}})
  client.rpc.mockRejectedValue(new Error('network'));fireEvent.click(screen.getByRole('button',{name:'Confirmar pago'}));await screen.findByText(/Resultado sin confirmar/)
  expect(client.rpc).toHaveBeenCalledTimes(1);expect(screen.getByRole('textbox',{name:'Importe para CURSO'})).toBeDisabled()
  const payload=client.rpc.mock.calls[0][1];client.rpc.mockResolvedValue({data:{id:'p'},error:null});fireEvent.click(screen.getByRole('button',{name:'Reenviar el mismo intento'}));await waitFor(()=>expect(client.rpc).toHaveBeenCalledTimes(2));expect(client.rpc.mock.calls[1][1]).toEqual(payload)
})
it('restores opaque reference and queries without an automatic write',async()=>{
  savePaymentReference('u','m','91b635e5-e71d-45ab-9fe1-f658a3b7bc17');recovery={id:'p',estado_codigo:'ANULADO'}
  render(<EnrollmentPayments {...props}/>);await screen.findByText(/Pago recuperado. Estado actual: Anulado/);expect(client.rpc).not.toHaveBeenCalled();expect(sessionStorage.length).toBe(0)
})
it('does not treat an empty recovery query as rollback',async()=>{
  savePaymentReference('u','m','91b635e5-e71d-45ab-9fe1-f658a3b7bc17');render(<EnrollmentPayments {...props}/>);await screen.findByText(/Resultado sin confirmar/);expect(screen.getByRole('button',{name:'Registrar pago'})).toBeDisabled();expect(client.rpc).not.toHaveBeenCalled();expect(sessionStorage.length).toBe(1)
})
it('annulled enrollment is read only even in a closed cycle',async()=>{
  render(<EnrollmentPayments {...props} enrollmentState="ANULADO" cycleState="CERRADO"/>);await screen.findByRole('table',{name:'Historial de pagos'});expect(screen.queryByRole('button',{name:'Registrar pago'})).not.toBeInTheDocument();expect(within(screen.getByRole('table')).queryByRole('button',{name:'Anular'})).not.toBeInTheDocument()
})
