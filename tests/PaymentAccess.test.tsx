import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { PaymentsPage } from '../src/payments/PaymentAccess'
const { client, flow } = vi.hoisted(() => ({ client: { from: vi.fn(), rpc: vi.fn() }, flow: vi.fn() }))
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client, state: { userId: 'u', roles: ['DIRECTOR_ACADEMICO'] } }) }))
vi.mock('../src/payments/EnrollmentPayments', () => ({ EnrollmentPayments: (props: Record<string, unknown>) => { flow(props); return <section aria-label="Flujo H4 existente"><span>{String(props.enrollment)}</span><button onClick={() => (props.onChanged as () => void)()}>Simular pago confirmado</button></section> } }))
const student = { id: 'a', codigo_alumno: 'A-0000001', apellido_paterno: 'QUIROZ', apellido_materno: 'PEREZ', nombres: 'JUAN', numero_di: '12345678' }
const cycles = ['PROGRAMADO','EN_CURSO','CERRADO'].map((estado_codigo,i) => ({ id:`c${i}`,codigo_ciclo:`2026-00${i+1}-MA`,estado_codigo,carrera:{nombre:'PESCA'} }))
const row = (id: string, pending: string, extra={}) => ({ ...student, matricula_id:id,alumno_id:'a',ciclo_id:'c0',codigo_matricula:`2026-MA-${id}`,matricula_estado:'ACTIVO',matricula_updated_at:'v1',codigo_ciclo:'2026-001-MA',ciclo_estado:'PROGRAMADO',curso_nombre:'PESCA',base:pending,abonado:'0',pendiente:pending,...extra })
let rows: ReturnType<typeof row>[], failed=false
const queries: {table:string;eq:unknown[][];order:unknown[][];or:unknown[][];in:unknown[][];range:unknown[][]}[]=[]
beforeEach(() => {
  rows=[row('m1','100'),row('m2','20',{ciclo_estado:'CERRADO'}),row('m3','0')];failed=false;queries.length=0;client.from.mockReset();client.rpc.mockReset();flow.mockReset()
  client.from.mockImplementation((table:string) => {
    const log={table,eq:[] as unknown[][],order:[] as unknown[][],or:[] as unknown[][],in:[] as unknown[][],range:[] as unknown[][]};queries.push(log)
    const data=()=>table==='alumno'?[student]:table==='ciclo'?cycles:rows
    const q={select:()=>q,eq:(...a:unknown[])=>{log.eq.push(a);return q},order:(...a:unknown[])=>{log.order.push(a);return q},or:(...a:unknown[])=>{log.or.push(a);return q},in:(...a:unknown[])=>{log.in.push(a);return q},ilike:()=>q,range:(...a:unknown[])=>{log.range.push(a);return q},single:()=>Promise.resolve({data:failed?null:rows.find(r=>r.matricula_id===log.eq[0]?.[1]),error:failed?{code:'404'}:null}),then:(resolve:(r:unknown)=>unknown)=>Promise.resolve({data:failed?null:data(),error:failed?{code:'FAILED'}:null}).then(resolve)}
    return q
  })
})
function NavigationProbe(){const location=useLocation();return <output data-testid="navigation-state">{JSON.stringify({pathname:location.pathname,search:location.search,state:location.state})}</output>}
function show(path='/pagos',state?:unknown){return render(<MemoryRouter initialEntries={[{pathname:path,state}]}><NavigationProbe/><Routes><Route path="/pagos/*" element={<PaymentsPage/>}/></Routes></MemoryRouter>)}
async function byStudent(){show();fireEvent.change(screen.getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'quiroz'}});fireEvent.click(await screen.findByRole('button',{name:'Ver matrículas de QUIROZ PEREZ, JUAN'}));await screen.findByRole('button',{name:'Pagar matrícula 2026-MA-m1'})}
it('starts Por Alumno with no bulk financial enumeration',()=>{
 show();expect(screen.getByRole('tab',{name:'Por Alumno'})).toHaveAttribute('aria-selected','true');expect(client.from).not.toHaveBeenCalled();expect(client.rpc).not.toHaveBeenCalled()
})
it.each(['A-0000001','12345678','JUAN','QUIROZ PEREZ'])('reuses the existing student search for %s',async term=>{
 show();fireEvent.change(screen.getByRole('searchbox'),{target:{value:term}});await screen.findByRole('table',{name:'Resultados de alumnos'});expect(String(queries[0].or)).toContain('codigo_alumno.ilike');expect(String(queries[0].or)).toContain('numero_di.ilike');expect(String(queries[0].or)).toContain('nombres.ilike');expect(String(queries[0].or)).toContain('apellido_paterno.ilike');expect(client.rpc).not.toHaveBeenCalled()
})
it('lists all student enrollments, requests global numeric debt order, and retains zero last',async()=>{
 await byStudent();const table=screen.getByRole('table',{name:'Matrículas y saldos'});expect(within(table).getAllByRole('row')).toHaveLength(4);expect(within(table).getAllByRole('row').at(-1)).toHaveTextContent('S/ 0.00Ver');expect(queries.find(q=>q.table==='matricula_pago_listado')?.order).toEqual([['pendiente',{ascending:false}],['ciclo_fecha_inicio',{ascending:false}],['matricula_created_at',{ascending:false}],['matricula_id',{ascending:false}]])
})
it('uses one projection request for the complete list, no per-row financial queries',async()=>{
 await byStudent();expect(queries.filter(q=>q.table==='matricula_pago_listado')).toHaveLength(1);expect(queries.map(q=>q.table)).toEqual(['alumno','matricula_pago_listado']);expect(client.rpc).not.toHaveBeenCalled()
})
it('Pagar opens the correct existing module directly, with identity/context and no editing route',async()=>{
 await byStudent();fireEvent.click(screen.getByRole('button',{name:'Pagar matrícula 2026-MA-m2'}));await screen.findByRole('region',{name:'Flujo H4 existente'});expect(flow.mock.calls.at(-1)?.[0]).toMatchObject({enrollment:'m2',version:'v1',cycleState:'CERRADO',initialRegister:true});expect(screen.getByText('QUIROZ PEREZ, JUAN')).toBeVisible();expect(screen.getByText('PESCA')).toBeVisible();expect(screen.queryByText('Editar matrícula')).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('Ver opens the same module for zero-balance history without the payment form',async()=>{
 await byStudent();fireEvent.click(screen.getByRole('button',{name:'Ver matrícula 2026-MA-m3'}));await screen.findByRole('region',{name:'Flujo H4 existente'});expect(flow.mock.calls.at(-1)?.[0]).toMatchObject({enrollment:'m3',initialRegister:false})
})
it('return restores student query and selected enrollment results',async()=>{
 await byStudent();fireEvent.click(screen.getByRole('button',{name:'Pagar matrícula 2026-MA-m1'}));fireEvent.click(await screen.findByRole('button',{name:'Volver a matrículas del Alumno'}));expect(screen.getByRole('searchbox',{name:'Buscar Alumno'})).toHaveValue('QUIROZ');await screen.findByRole('button',{name:'Pagar matrícula 2026-MA-m1'})
})
it('Por Ciclo includes Programado, En curso and Cerrado; filters use shared student logic',async()=>{
 show();fireEvent.click(screen.getByRole('tab',{name:'Por Ciclo'}));await screen.findByRole('table',{name:'Ciclos cobrables'});expect(queries.find(q=>q.table==='ciclo')?.in).toEqual([['estado_codigo',['PROGRAMADO','EN_CURSO','CERRADO']]]);fireEvent.click(screen.getByRole('button',{name:'Ver alumnos de 2026-003-MA'}));await screen.findByRole('table',{name:'Matrículas y saldos'});fireEvent.change(screen.getByRole('searchbox',{name:'Filtrar alumnos del Ciclo'}),{target:{value:'12345678 juan'}});await waitFor(()=>expect(queries.filter(q=>q.table==='matricula_pago_listado').at(-1)?.or.length).toBe(1));expect(String(queries.filter(q=>q.table==='matricula_pago_listado').at(-1)?.or)).toContain('numero_di.ilike')
})
it('return restores cycle selection and within-cycle filter',async()=>{
 show();fireEvent.click(screen.getByRole('tab',{name:'Por Ciclo'}));fireEvent.click(await screen.findByRole('button',{name:'Ver alumnos de 2026-003-MA'}));await screen.findByRole('button',{name:'Pagar matrícula 2026-MA-m1'});fireEvent.change(screen.getByRole('searchbox',{name:'Filtrar alumnos del Ciclo'}),{target:{value:'JUAN'}});await waitFor(()=>expect(queries.filter(q=>q.table==='matricula_pago_listado').at(-1)?.or.length).toBe(1));fireEvent.click(screen.getByRole('button',{name:'Pagar matrícula 2026-MA-m1'}));fireEvent.click(await screen.findByRole('button',{name:'Volver a alumnos del Ciclo'}));expect(screen.getByRole('tab',{name:'Por Ciclo'})).toHaveAttribute('aria-selected','true');expect(screen.getByRole('searchbox',{name:'Filtrar alumnos del Ciclo'})).toHaveValue('JUAN');await screen.findByRole('button',{name:'Pagar matrícula 2026-MA-m1'})
})
it.each(['DESIERTO','ANULADO'])('a direct %s cycle record stays read-only even with forged pay navigation state',async cycleState=>{
 rows=[row('m1','100',{ciclo_estado:cycleState})];show('/pagos/m1',{register:true});await screen.findByRole('region',{name:'Flujo H4 existente'});expect(flow.mock.calls.at(-1)?.[0]).toMatchObject({initialRegister:false,cycleState})
})
it('annulled enrollment never exposes Pagar',async()=>{
 rows=[row('m1','100',{matricula_estado:'ANULADO'})];show('/pagos/m1',{register:true});await screen.findByRole('region',{name:'Flujo H4 existente'});expect(flow.mock.calls.at(-1)?.[0]).toMatchObject({initialRegister:false,enrollmentState:'ANULADO'})
})
it('a missing or manipulated ID shows no stale identity, amount or financial module',async()=>{
 failed=true;show('/pagos/manipulated');expect(await screen.findByRole('alert')).toHaveTextContent('Matrícula no disponible o sin acceso');expect(flow).not.toHaveBeenCalled();expect(screen.queryByText('QUIROZ PEREZ, JUAN')).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('read failure clears list amounts rather than showing a partial balance',async()=>{
 show();fireEvent.change(screen.getByRole('searchbox'),{target:{value:'JUAN'}});fireEvent.click(await screen.findByRole('button',{name:'Ver matrículas de QUIROZ PEREZ, JUAN'}));await screen.findByRole('button',{name:'Pagar matrícula 2026-MA-m1'});failed=true;fireEvent.change(screen.getByRole('searchbox'),{target:{value:'OTHER'}});await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Pagar matrícula 2026-MA-m1'})).not.toBeInTheDocument()
})
it('parent refresh preserves the existing payment component after a confirmation',async()=>{
 show('/pagos/m1',{register:true});await screen.findByRole('region',{name:'Flujo H4 existente'});fireEvent.click(screen.getByRole('button',{name:'Simular pago confirmado'}));await waitFor(()=>expect(queries.filter(q=>q.table==='matricula_pago_listado')).toHaveLength(2));expect(screen.getByRole('region',{name:'Flujo H4 existente'})).toBeVisible()
})

it('keeps search context in React only, not history state, URL or browser storage',async()=>{
 sessionStorage.clear();localStorage.clear();await byStudent();fireEvent.click(screen.getByRole('button',{name:'Pagar matrícula 2026-MA-m1'}));await screen.findByRole('region',{name:'Flujo H4 existente'});const navigation=JSON.parse(screen.getByTestId('navigation-state').textContent!);expect(navigation).toEqual({pathname:'/pagos/m1',search:'',state:{register:true}});expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0)
})
