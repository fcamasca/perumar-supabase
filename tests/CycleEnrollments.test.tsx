import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router-dom'
import {CycleEnrollments} from '../src/enrollment/CycleEnrollments'
import {studentSearchFilter} from '../src/lib/studentSearch'
const {client,roles}=vi.hoisted(()=>({client:{from:vi.fn(),rpc:vi.fn()},roles:{current:['COORDINADOR_ACADEMICO']}}))
vi.mock('../src/security/SessionProvider',()=>({useSession:()=>({client,state:{roles:roles.current}})}))
const cycle={id:'c1',codigo_ciclo:'2026-001-NAV',estado_codigo:'PROGRAMADO',updated_at:'cv1'}
const candidate={id:'p2',codigo_alumno:'A-0000002',apellido_paterno:'NUEVO',apellido_materno:'ALUMNO',nombres:'ANA',numero_di:'00123456',updated_at:'pv1'}
let records:Record<string,unknown>[]
const queryLog: {table:string;filters:Record<string,unknown>;or?:string;opts?:unknown;range?:number[]}[]=[]
beforeEach(()=>{
 roles.current=['COORDINADOR_ACADEMICO'];client.rpc.mockReset();queryLog.length=0
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','')}})
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open')}})
 records=[{id:'m1',alumno_id:'p1',ciclo_id:'c1',codigo_matricula:'2026-NAV-001',estado_codigo:'ACTIVO',alumno:{...candidate,id:'p1',apellido_paterno:'MATRICULADO'}}]
 client.from.mockImplementation((table:string)=>{
  const call:{table:string;filters:Record<string,unknown>;or?:string;opts?:unknown;range?:number[]}={table,filters:{}};queryLog.push(call);let single=false
  const q={select:()=>q,eq:(key:string,val:unknown)=>{call.filters[key]=val;return q},in:()=>q,order:()=>q,limit:()=>q,range:(start:number,end:number)=>{call.range=[start,end];return q},or:(text:string,opts?:unknown)=>{call.or=text;call.opts=opts;return q},single:()=>{single=true;return q},then:(resolve:(r:unknown)=>unknown)=>{
   const data=table==='matricula'?records.filter(r=>Object.entries(call.filters).every(([key,val])=>r[key]===val)):table==='ciclo'?[cycle]:table==='alumno'?[candidate]:table==='ciclo_tarifa'?[{id:'fee',importe:'100',obligatorio:true,tarifa:{nombre:'CARRERA',activo:true}},{id:'opt',importe:'20',obligatorio:false,tarifa:{nombre:'SEGURO',activo:true}}]:[]
   return Promise.resolve({data:single?data[0]:data,error:null,count:data.length}).then(resolve)
  }};return q
 })
})
function show(props:Partial<Parameters<typeof CycleEnrollments>[0]>={}){return render(<MemoryRouter><CycleEnrollments cycle={cycle} {...props}/></MemoryRouter>)}
it('keeps one enrolled grid and scopes its filter to pupils of this Cycle',async()=>{
 show();const table=await screen.findByRole('table',{name:'Alumnos matriculados en el Ciclo'});await waitFor(()=>expect(table).toHaveTextContent('MATRICULADO ALUMNO, ANA'))
 expect(screen.getByRole('heading',{name:'Alumnos matriculados · 1'})).toBeVisible();expect(screen.getAllByRole('table')).toHaveLength(1)
 fireEvent.change(screen.getByRole('searchbox',{name:'Filtrar matriculados'}),{target:{value:'ana'}})
 await waitFor(()=>expect(queryLog.filter(q=>q.table==='matricula').at(-1)).toMatchObject({filters:{ciclo_id:'c1'},or:studentSearchFilter('ANA'),opts:{referencedTable:'alumno'},range:[0,29]}))
 expect(within(table).getByRole('link',{name:'Ver matrícula'})).toHaveAttribute('href','/matriculas/m1');expect(client.rpc).not.toHaveBeenCalled()
})
it('opens a fixed-Cycle drawer with a compact result list, confirms once and refreshes the grid',async()=>{
 show();const trigger=screen.getByRole('button',{name:'+ Matricular alumno'});fireEvent.click(trigger)
 const drawer=await screen.findByRole('dialog',{name:'Matricular alumno en 2026-001-NAV'});expect(within(drawer).queryByRole('combobox',{name:'Ciclo'})).not.toBeInTheDocument()
 fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}})
 const results=await within(drawer).findByRole('list',{name:'Coincidencias de alumnos'});expect(within(drawer).queryByRole('table')).not.toBeInTheDocument()
 fireEvent.click(within(results).getByRole('button',{name:'Seleccionar'}));await within(drawer).findByRole('button',{name:'Cambiar alumno'})
 expect(within(drawer).queryByRole('list',{name:'Coincidencias de alumnos'})).not.toBeInTheDocument();expect(within(drawer).getByRole('region',{name:'Cargos'})).toBeVisible()
 expect(client.rpc).not.toHaveBeenCalled()
 records.push({id:'m2',alumno_id:'p2',ciclo_id:'c1',codigo_matricula:'2026-NAV-002',estado_codigo:'ACTIVO',alumno:candidate})
 client.rpc.mockResolvedValue({data:{id:'m2',codigo_matricula:'2026-NAV-002'},error:null})
 fireEvent.click(within(drawer).getByRole('button',{name:'Confirmar matrícula'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
 expect(client.rpc).toHaveBeenCalledExactlyOnceWith('registrar_matricula',{p:{ciclo_id:'c1',expected_ciclo_updated_at:'cv1',alumno_id:'p2',expected_alumno_updated_at:'pv1',empresa_patrocinadora_id:null},opcionales:[]})
 await waitFor(()=>expect(screen.getByRole('table',{name:'Alumnos matriculados en el Ciclo'})).toHaveTextContent('2026-NAV-002'));await waitFor(()=>expect(trigger).toHaveFocus())
 fireEvent.click(trigger);const next=await screen.findByRole('dialog');expect(within(next).queryByRole('button',{name:'Confirmar matrícula'})).not.toBeInTheDocument();expect(within(next).getByRole('searchbox',{name:'Buscar Alumno'})).toHaveValue('')
})
it('cancel closes the drawer without creating a partial registration',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.click(within(drawer).getByRole('button',{name:'Cancelar'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(client.rpc).not.toHaveBeenCalled()
})
it('retains the pending drawer on a conflict and never retries',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});fireEvent.click(await within(drawer).findByRole('button',{name:'Seleccionar'}));await within(drawer).findByRole('button',{name:'Cambiar alumno'});
 client.rpc.mockResolvedValue({error:{code:'40001'}});fireEvent.click(within(drawer).getByRole('button',{name:'Confirmar matrícula'}));expect(await within(drawer).findByRole('alert')).toHaveTextContent('La información cambió');expect(drawer).toBeVisible();expect(client.rpc).toHaveBeenCalledTimes(1)
})
it('blocks dismissal while the registration transaction has no confirmed response',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});fireEvent.click(await within(drawer).findByRole('button',{name:'Seleccionar'}));await within(drawer).findByRole('button',{name:'Cambiar alumno'});
 let finish:(r:unknown)=>void=()=>{};client.rpc.mockReturnValue(new Promise(resolve=>{finish=resolve}));fireEvent.click(within(drawer).getByRole('button',{name:'Confirmar matrícula'}));expect(within(drawer).getByRole('button',{name:'Cerrar panel de matrícula'})).toBeDisabled();expect(fireEvent(drawer,new Event('cancel',{cancelable:true}))).toBe(false);expect(drawer).toBeVisible();await act(async()=>finish({error:{code:'40001'}}))
})
it.each(['CERRADO','DESIERTO','ANULADO'])('allows only historical consultation for terminal Cycle %s',async estado=>{
 show({cycle:{...cycle,estado_codigo:estado}});await screen.findByRole('table',{name:'Alumnos matriculados en el Ciclo'});expect(screen.queryByRole('button',{name:'+ Matricular alumno'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('blocks opening the panel when Cycle data has unsaved changes',()=>{show({blocked:true});expect(screen.getByRole('button',{name:'+ Matricular alumno'})).toBeDisabled();expect(screen.getByText(/Guarda o cancela/)).toBeVisible()})
it('prevents choosing a pupil whose existing registration was annulled too',async()=>{
 records.push({id:'old',alumno_id:'p2',ciclo_id:'c1',codigo_matricula:'2026-NAV-000',estado_codigo:'ANULADO',alumno:candidate});show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});fireEvent.click(await within(drawer).findByRole('button',{name:'Seleccionar'}));expect(await within(drawer).findByText(/ya tiene una matrícula/)).toBeVisible();expect(within(drawer).queryByRole('button',{name:'Confirmar matrícula'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})

it('opening a full pupil form leaves the drawer and Cancel returns to the same Cycle search',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.click(within(drawer).getByRole('button',{name:'Nuevo Alumno'}));
 expect(await screen.findByRole('heading',{name:'Nuevo Alumno'})).toBeVisible();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.queryByRole('table',{name:'Alumnos matriculados en el Ciclo'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(await screen.findByRole('dialog',{name:'Matricular alumno en 2026-001-NAV'})).toBeVisible();expect(screen.getByRole('table',{name:'Alumnos matriculados en el Ciclo'})).toBeVisible();expect(client.rpc).not.toHaveBeenCalled();
});
it('hides registration controls without an academic role',async()=>{
 roles.current=['ADMIN_SISTEMA'];show();await screen.findByRole('table',{name:'Alumnos matriculados en el Ciclo'});expect(screen.queryByRole('button',{name:'+ Matricular alumno'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled();
});
