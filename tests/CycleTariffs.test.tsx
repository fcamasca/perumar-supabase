import {act,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {beforeEach,expect,it,vi} from 'vitest'
import {CycleTariffs} from '../src/enrollment/CycleTariffs'
const {client,roles}=vi.hoisted(()=>({client:{from:vi.fn(),rpc:vi.fn()},roles:{current:['DIRECTOR_ACADEMICO']}}))
vi.mock('../src/security/SessionProvider',()=>({useSession:()=>({client,state:{roles:roles.current}})}))
const cycle={id:'c1',estado_codigo:'PROGRAMADO',updated_at:'cv1'}
let catalog:Record<string,unknown>[],assigned:Record<string,unknown>[],failed=false
const changed=vi.fn(),dirty=vi.fn(),busy=vi.fn(),ready=vi.fn()
beforeEach(()=>{
 roles.current=['DIRECTOR_ACADEMICO'];client.rpc.mockReset();changed.mockReset();dirty.mockReset();busy.mockReset();ready.mockReset();failed=false
 catalog=[{id:'career',codigo:'TC',nombre:'CARRERA',tipo:'CARRERA',monto_por_defecto:'650',activo:true},{id:'extra',codigo:'TS',nombre:'SEGURO',tipo:'OTRO',monto_por_defecto:'25',activo:true},{id:'old',codigo:'OLD',nombre:'INACTIVA',tipo:'OTRO',monto_por_defecto:'10',activo:false}]
 assigned=[{tarifa_id:'career',importe:'600',obligatorio:true,activo:true}]
 client.from.mockImplementation((table:string)=>{const q={select:()=>q,order:()=>q,eq:()=>q,then:(resolve:(r:unknown)=>unknown)=>Promise.resolve({data:table==='tarifa'?catalog:assigned,error:failed?{code:'FAILED'}:null}).then(resolve)};return q})
})
function show(props:Partial<Parameters<typeof CycleTariffs>[0]>={}){return render(<CycleTariffs cycle={cycle} onChanged={changed} onDirtyChange={dirty} onBusyChange={busy} onReadyChange={ready} {...props}/>)}
it('shows assigned tariffs and indicates eligibility for matriculation',async()=>{
 show();await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.getByRole('spinbutton',{name:'Importe de CARRERA'})).toHaveValue(600);expect(screen.getByRole('checkbox',{name:'Obligatoria CARRERA'})).toBeChecked();expect(screen.getByRole('status')).toHaveTextContent('listas para matricular');await waitFor(()=>expect(ready).toHaveBeenLastCalledWith(true));expect(screen.queryByText('TS — SEGURO')).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('adds an active catalog tariff with its default, stages edits and saves only through the existing RPC',async()=>{
 show();await screen.findByRole('table',{name:'Tarifas del Ciclo'});const search=screen.getByRole('searchbox',{name:'Agregar tarifa del catálogo'});fireEvent.change(search,{target:{value:'segur'}});fireEvent.click(screen.getByRole('button',{name:'Agregar TS — SEGURO'}));expect(screen.getByRole('spinbutton',{name:'Importe de SEGURO'})).toHaveValue(25);expect(screen.getByRole('checkbox',{name:'Obligatoria SEGURO'})).not.toBeChecked();expect(client.rpc).not.toHaveBeenCalled();expect(dirty).toHaveBeenLastCalledWith(true);expect(ready).toHaveBeenLastCalledWith(false)
 fireEvent.change(screen.getByRole('spinbutton',{name:'Importe de SEGURO'}),{target:{value:'30'}});client.rpc.mockResolvedValue({data:{...cycle,updated_at:'cv2'},error:null});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifas del Ciclo'}));await waitFor(()=>expect(client.rpc).toHaveBeenCalledExactlyOnceWith('guardar_ciclo_tarifas',{ciclo_id:'c1',expected_updated_at:'cv1',configuracion:[{tarifa_id:'career',importe:'600',obligatorio:'true'},{tarifa_id:'extra',importe:'30',obligatorio:'false'}]}));expect(changed).toHaveBeenCalledWith({...cycle,updated_at:'cv2'});await waitFor(()=>expect(dirty).toHaveBeenLastCalledWith(false))
})
it('excludes inactive/already assigned tariffs and never lists the catalog without searching',async()=>{
 show();await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.queryByRole('list',{name:'Tarifas disponibles'})).not.toBeInTheDocument();const search=screen.getByRole('searchbox');for(const term of ['CARRERA','INACTIVA']){fireEvent.change(search,{target:{value:term}});expect(screen.queryByRole('button',{name:/^Agregar /})).not.toBeInTheDocument()}
})
it('retiring an assignment is staged, Cancel restores it, and save omits it without DELETE',async()=>{
 show();await screen.findByRole('table',{name:'Tarifas del Ciclo'});fireEvent.click(screen.getByRole('button',{name:'Retirar'}));expect(screen.getByRole('table')).not.toHaveTextContent('TC — CARRERA');expect(client.rpc).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Cancelar cambios'}));expect(screen.getByRole('table')).toHaveTextContent('TC — CARRERA');fireEvent.click(screen.getByRole('button',{name:'Retirar'}));client.rpc.mockResolvedValue({data:{...cycle,updated_at:'cv2'},error:null});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifas del Ciclo'}));await waitFor(()=>expect(client.rpc).toHaveBeenCalledExactlyOnceWith('guardar_ciclo_tarifas',{ciclo_id:'c1',expected_updated_at:'cv1',configuracion:[]}))
})
it('preserves edited prices on a version conflict without retry',async()=>{
 show();await screen.findByRole('table',{name:'Tarifas del Ciclo'});fireEvent.change(screen.getByRole('spinbutton',{name:'Importe de CARRERA'}),{target:{value:'620'}});client.rpc.mockResolvedValue({error:{code:'40001'}});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifas del Ciclo'}));await screen.findByText(/La información cambió/);expect(screen.getByRole('spinbutton',{name:'Importe de CARRERA'})).toHaveValue(620);expect(client.rpc).toHaveBeenCalledTimes(1);expect(changed).not.toHaveBeenCalled()
})
it.each(['COORDINADOR_ACADEMICO','ADMIN_SISTEMA'])('does not expose configuration writes for %s',async role=>{
 roles.current=[role];show();await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Guardar tarifas del Ciclo'})).not.toBeInTheDocument();expect(screen.getByText('600.00')).toBeVisible();expect(client.rpc).not.toHaveBeenCalled()
})
it.each(['CERRADO','DESIERTO','ANULADO'])('terminal %s is read-only',async state=>{
 show({cycle:{...cycle,estado_codigo:state}});await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.queryByRole('button',{name:'Retirar'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Guardar tarifas del Ciclo'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('failed configuration load cannot save an empty replacement',async()=>{
 failed=true;show();expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar');expect(screen.queryByRole('table')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Guardar tarifas del Ciclo'})).not.toBeInTheDocument();expect(ready).toHaveBeenLastCalledWith(null);expect(client.rpc).not.toHaveBeenCalled()
})
it('missing or optional Career pricing is explained before matriculation',async()=>{
 assigned=[];const rendered=show();await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.getByRole('alert')).toHaveTextContent('Falta asignar una tarifa de Curso');rendered.unmount();assigned=[{tarifa_id:'career',importe:'600',obligatorio:false,activo:true}];show();await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.getByRole('alert')).toHaveTextContent('debe ser obligatoria')
})

it('keeps eligibility unknown until both catalog and assignments finish loading',async()=>{
 let finishCatalog:(result:unknown)=>void=()=>{},finishAssigned:(result:unknown)=>void=()=>{};
 const catalogResponse=new Promise(resolve=>{finishCatalog=resolve}),assignedResponse=new Promise(resolve=>{finishAssigned=resolve});
 client.from.mockImplementation((table:string)=>{const q={select:()=>q,order:()=>q,eq:()=>q,then:(resolve:(r:unknown)=>unknown)=>(table==='tarifa'?catalogResponse:assignedResponse).then(resolve)};return q});
 show();expect(ready).toHaveBeenLastCalledWith(null);expect(screen.queryByRole('table')).not.toBeInTheDocument();
 await act(async()=>finishCatalog({data:catalog,error:null}));expect(ready).toHaveBeenLastCalledWith(null);expect(screen.queryByRole('table')).not.toBeInTheDocument();
 await act(async()=>finishAssigned({data:assigned,error:null}));await waitFor(()=>expect(ready).toHaveBeenLastCalledWith(true));expect(screen.getByRole('table',{name:'Tarifas del Ciclo'})).toBeVisible();expect(client.rpc).not.toHaveBeenCalled();
});
