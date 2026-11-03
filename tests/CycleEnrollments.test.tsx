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
it('adds directly from search results with only mandatory defaults and refreshes the grid',async()=>{
 show();const trigger=screen.getByRole('button',{name:'+ Matricular alumno'});fireEvent.click(trigger);
 const drawer=await screen.findByRole('dialog',{name:'Agregar alumnos a 2026-001-NAV'});
 fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});
 const add=await within(drawer).findByRole('button',{name:'Agregar'});
 const results=within(drawer).getByRole('table',{name:'Resultados para agregar'});expect(within(results).getAllByRole('columnheader').map(h=>h.textContent)).toEqual(['Alumno','DI','Acciones']);expect(results).toHaveTextContent('NUEVO ALUMNO, ANA');expect(results).toHaveTextContent('ANA');expect(results).toHaveTextContent('00123456');expect(within(drawer).queryByRole('button',{name:'Confirmar matrícula'})).not.toBeInTheDocument();expect(within(drawer).queryByText('Cargos')).not.toBeInTheDocument();
 records.push({id:'m2',alumno_id:'p2',ciclo_id:'c1',codigo_matricula:'2026-NAV-002',estado_codigo:'ACTIVO',alumno:candidate});
 client.rpc.mockResolvedValue({data:{id:'m2',codigo_matricula:'2026-NAV-002'},error:null});fireEvent.click(add);
 await waitFor(()=>expect(client.rpc).toHaveBeenCalledExactlyOnceWith('registrar_matricula',{p:{ciclo_id:'c1',expected_ciclo_updated_at:'cv1',alumno_id:'p2',expected_alumno_updated_at:'pv1',empresa_patrocinadora_id:null},opcionales:[]}));
 await waitFor(()=>expect(screen.getByRole('table',{name:'Alumnos matriculados en el Ciclo'})).toHaveTextContent('2026-NAV-002'));
 expect(drawer).toBeVisible();expect(within(drawer).queryByRole('button',{name:'Agregar'})).not.toBeInTheDocument();
 fireEvent.click(within(drawer).getByRole('button',{name:'Cerrar panel de matrícula'}));await waitFor(()=>expect(trigger).toHaveFocus());
 expect(screen.getAllByRole('link',{name:'Editar matrícula'}).at(-1)).toHaveAttribute('href','/matriculas/m2?editar=1');
});
it('closing search does not register any pupil',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.click(within(drawer).getByRole('button',{name:'Cerrar panel de matrícula'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(client.rpc).not.toHaveBeenCalled();
});
it('an add conflict preserves results without retry',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});const add=await within(drawer).findByRole('button',{name:'Agregar'});
 client.rpc.mockResolvedValue({error:{code:'40001'}});fireEvent.click(add);expect(await within(drawer).findByRole('alert')).toHaveTextContent('La información cambió');expect(drawer).toBeVisible();expect(client.rpc).toHaveBeenCalledTimes(1);expect(add).toBeVisible();
});
it('blocks closing during an Add transaction',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});const add=await within(drawer).findByRole('button',{name:'Agregar'});
 let finish:(r:unknown)=>void=()=>{};client.rpc.mockReturnValue(new Promise(resolve=>{finish=resolve}));fireEvent.click(add);await waitFor(()=>expect(client.rpc).toHaveBeenCalledTimes(1));expect(within(drawer).getByRole('button',{name:'Cerrar panel de matrícula'})).toBeDisabled();expect(fireEvent(drawer,new Event('cancel',{cancelable:true}))).toBe(false);fireEvent.click(within(drawer).getByRole('link',{name:'Registrar nuevo Alumno'}));expect(drawer).toBeVisible();await act(async()=>finish({error:{code:'40001'}}));
});
it.each(['CERRADO','DESIERTO','ANULADO'])('allows only historical consultation for terminal Cycle %s',async estado=>{
 show({cycle:{...cycle,estado_codigo:estado}});await screen.findByRole('table',{name:'Alumnos matriculados en el Ciclo'});expect(screen.queryByRole('button',{name:'+ Matricular alumno'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('blocks opening the panel when Cycle data has unsaved changes',()=>{show({blocked:true});expect(screen.getByRole('button',{name:'+ Matricular alumno'})).toBeDisabled();expect(screen.getByText(/Guarda o cancela/)).toBeVisible()})
it('excludes existing registrations including annulled ones from search candidates',async()=>{
 records.push({id:'old',alumno_id:'p2',ciclo_id:'c1',codigo_matricula:'2026-NAV-000',estado_codigo:'ANULADO',alumno:candidate});show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});
 await within(drawer).findByText('No hay alumnos disponibles para esta búsqueda.');expect(within(drawer).queryByRole('button',{name:'Agregar'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled();
});
it('new pupil registration opens a full route with a return Cycle',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');expect(within(drawer).getByRole('link',{name:'Registrar nuevo Alumno'})).toHaveAttribute('href','/alumnos/nuevo?ciclo=c1');expect(client.rpc).not.toHaveBeenCalled();
});
it('hides registration controls without an academic role',async()=>{
 roles.current=['ADMIN_SISTEMA'];show();await screen.findByRole('table',{name:'Alumnos matriculados en el Ciclo'});expect(screen.queryByRole('button',{name:'+ Matricular alumno'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled();
});

it('failed mandatory validation does not add a row and offers completing the pupil record',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});const add=await within(drawer).findByRole('button',{name:'Agregar'});client.rpc.mockResolvedValue({error:{code:'23514',message:'Se requiere contacto de emergencia activo y válido'}});fireEvent.click(add);
 expect(await within(drawer).findByRole('alert')).toHaveTextContent('El alumno necesita al menos un contacto de emergencia activo y válido');expect(within(drawer).getByRole('link',{name:/Completar ficha/})).toHaveAttribute('href','/alumnos/p2?editar=1&ciclo=c1');expect(screen.getByRole('table',{name:'Alumnos matriculados en el Ciclo'})).not.toHaveTextContent('2026-NAV-002');expect(client.rpc).toHaveBeenCalledTimes(1);
});
it('an uncertain Add response blocks that candidate until the grid is reviewed',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});const add=await within(drawer).findByRole('button',{name:'Agregar'});client.rpc.mockRejectedValue(new Error('connection lost'));fireEvent.click(add);
 expect(await within(drawer).findByRole('alert')).toHaveTextContent('Respuesta no confirmada');expect(within(drawer).getByRole('button',{name:'Agregar'})).toBeDisabled();expect(client.rpc).toHaveBeenCalledTimes(1);
});

it('SDK network errors are treated as uncertain and never auto-retried',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'+ Matricular alumno'}));const drawer=await screen.findByRole('dialog');fireEvent.change(within(drawer).getByRole('searchbox',{name:'Buscar Alumno'}),{target:{value:'nuevo'}});const add=await within(drawer).findByRole('button',{name:'Agregar'});client.rpc.mockResolvedValue({error:{code:'',message:'Failed to fetch'}});fireEvent.click(add);expect(await within(drawer).findByRole('alert')).toHaveTextContent('Respuesta no confirmada');expect(within(drawer).getByRole('button',{name:'Agregar'})).toBeDisabled();expect(client.rpc).toHaveBeenCalledTimes(1);
});

it('hides pagination when the enrolled grid has only one page',async()=>{
 show();const table=await screen.findByRole('table',{name:'Alumnos matriculados en el Ciclo'});await waitFor(()=>expect(table).toHaveTextContent('2026-NAV-001'));expect(screen.queryByRole('button',{name:'Anterior'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Siguiente página'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Página siguiente'})).not.toBeInTheDocument();
});
