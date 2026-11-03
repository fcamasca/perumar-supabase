import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {beforeEach,expect,it,vi} from 'vitest'
import {Tariffs} from '../src/enrollment/EnrollmentPages'
const {client,roles}=vi.hoisted(()=>({client:{from:vi.fn(),rpc:vi.fn()},roles:{current:['DIRECTOR_ACADEMICO']}}))
vi.mock('../src/security/SessionProvider',()=>({useSession:()=>({client,state:{roles:roles.current}})}))
let tariffs:Record<string,unknown>[]
let configFailure=false
const queries:{table:string;or?:string;range?:number[];filters:Record<string,unknown>;orders:unknown[]}[]=[]
beforeEach(()=>{
 roles.current=['DIRECTOR_ACADEMICO'];client.rpc.mockReset();queries.length=0;configFailure=false
 tariffs=[{id:'t1',codigo:'TC',nombre:'CARRERA',tipo:'CARRERA',descripcion:'DETALLE',monto_por_defecto:'650',activo:true,updated_at:'tv1'}]
 client.from.mockImplementation((table:string)=>{
  const call:{table:string;or?:string;range?:number[];filters:Record<string,unknown>;orders:unknown[]}={table,filters:{},orders:[]};queries.push(call)
  const q={select:()=>q,order:(field:string,opts?:unknown)=>{call.orders.push([field,opts]);return q},range:(start:number,end:number)=>{call.range=[start,end];return q},or:(text:string)=>{call.or=text;return q},eq:(field:string,v:unknown)=>{call.filters[field]=v;return q},then:(resolve:(r:unknown)=>unknown)=>Promise.resolve({data:table==='tarifa'?tariffs.filter(t=>Object.entries(call.filters).every(([k,v])=>t[k]===v)):table==='ciclo'?[{id:'c1',codigo_ciclo:'2026-001-NAV',estado_codigo:'PROGRAMADO',updated_at:'cv1'},{id:'closed',codigo_ciclo:'2026-002-NAV',estado_codigo:'CERRADO',updated_at:'cv2'}]:table==='ciclo_tarifa'?[{tarifa_id:'t1',activo:true,importe:'600',obligatorio:true}]:[],error:table==='ciclo_tarifa'&&configFailure?{code:'FAILED'}:null}).then(resolve)};return q
 })
})
it('uses the common search/grid/actions and opens a separate read-only tariff record',async()=>{
 render(<Tariffs/>);const grid=await screen.findByRole('table',{name:'Tarifas'});await waitFor(()=>expect(grid).toHaveTextContent('CARRERA'))
 expect(screen.queryByRole('button',{name:'Guardar tarifa'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Nueva tarifa'})).toBeVisible();expect(queries.find(q=>q.range)?.orders).toEqual([['created_at',{ascending:false}],['id',{ascending:false}]])
 fireEvent.change(screen.getByRole('searchbox',{name:'Buscar tarifa por código o nombre'}),{target:{value:'car'}});await waitFor(()=>expect(queries.filter(q=>q.table==='tarifa').at(-1)?.or).toBe('codigo.ilike."%CAR%",nombre.ilike."%CAR%"'))
 fireEvent.click(screen.getByRole('button',{name:'Ver CARRERA'}));expect(screen.queryByRole('table',{name:'Tarifas'})).not.toBeInTheDocument();expect(screen.getByRole('textbox',{name:'Nombre tarifa'})).toHaveAttribute('readonly');expect(screen.getByRole('textbox',{name:'Monto por defecto (S/)'})).toHaveValue('650')
 fireEvent.click(screen.getByRole('button',{name:'Volver a tarifas'}));expect(screen.getByRole('searchbox')).toHaveValue('CAR');expect(client.rpc).not.toHaveBeenCalled()
})
it('saves the Director edit with its version and returns to the refreshed grid',async()=>{
 render(<Tariffs/>);fireEvent.click(await screen.findByRole('button',{name:'Editar CARRERA'}));fireEvent.change(screen.getByRole('textbox',{name:'Nombre tarifa'}),{target:{value:'carrera nueva'}})
 tariffs[0]={...tariffs[0],nombre:'CARRERA NUEVA',updated_at:'tv2'};client.rpc.mockResolvedValue({data:tariffs[0],error:null});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifa'}))
 expect(await screen.findByRole('table',{name:'Tarifas'})).toBeVisible();await screen.findByRole('button',{name:'Ver CARRERA NUEVA'});expect(client.rpc).toHaveBeenCalledExactlyOnceWith('guardar_tarifa',{p:{codigo:'TC',nombre:'CARRERA NUEVA',descripcion:'DETALLE',tipo:'CARRERA',monto_por_defecto:'650',id:'t1',expected_updated_at:'tv1'}})
})
it('preserves the form on a save conflict without retry',async()=>{
 render(<Tariffs/>);fireEvent.click(await screen.findByRole('button',{name:'Editar CARRERA'}));fireEvent.change(screen.getByRole('textbox',{name:'Nombre tarifa'}),{target:{value:'CAMBIO'}});client.rpc.mockResolvedValue({error:{code:'40001'}});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifa'}));expect(await screen.findByRole('alert')).toHaveTextContent('La información cambió');expect(screen.getByRole('textbox',{name:'Nombre tarifa'})).toHaveValue('CAMBIO');expect(client.rpc).toHaveBeenCalledTimes(1)
})
it('Coordinador can consult without maintaining tariff records or configuration',async()=>{
 roles.current=['COORDINADOR_ACADEMICO'];render(<Tariffs/>);await screen.findByRole('button',{name:'Ver CARRERA'});expect(screen.queryByRole('button',{name:'Nueva tarifa'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Editar CARRERA'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Inactivar CARRERA'})).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Tarifas por Ciclo'}));await screen.findByRole('option',{name:/2026-001-NAV/});fireEvent.change(screen.getByRole('combobox',{name:'Ciclo'}),{target:{value:'c1'}});await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.getByRole('spinbutton',{name:'Importe de CARRERA'})).toBeDisabled();expect(screen.queryByRole('button',{name:'Guardar tarifas del Ciclo'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('activation is confirmed separately and cancellation never writes',async()=>{
 render(<Tariffs/>);fireEvent.click(await screen.findByRole('button',{name:'Inactivar CARRERA'}));const dialog=await screen.findByRole('dialog',{name:'Inactivar tarifa'});expect(dialog).toHaveTextContent('no recalcula matrículas');fireEvent.click(within(dialog).getByRole('button',{name:'Cancelar operación'}));expect(client.rpc).not.toHaveBeenCalled()
})
it('cycle configuration loads into a compact grid and sends the existing concrete command',async()=>{
 render(<Tariffs/>);fireEvent.click(screen.getByRole('button',{name:'Tarifas por Ciclo'}));expect(screen.queryByRole('table',{name:'Tarifas'})).not.toBeInTheDocument();await screen.findByRole('option',{name:/2026-001-NAV/});fireEvent.change(screen.getByRole('combobox',{name:'Ciclo'}),{target:{value:'c1'}})
 await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.getByRole('checkbox',{name:'Seleccionar CARRERA'})).toBeChecked();fireEvent.change(screen.getByRole('spinbutton',{name:'Importe de CARRERA'}),{target:{value:'620'}});client.rpc.mockResolvedValue({data:{id:'c1',codigo_ciclo:'2026-001-NAV',estado_codigo:'PROGRAMADO',updated_at:'cv2'},error:null});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifas del Ciclo'}));await waitFor(()=>expect(client.rpc).toHaveBeenCalledExactlyOnceWith('guardar_ciclo_tarifas',{ciclo_id:'c1',expected_updated_at:'cv1',configuracion:[{tarifa_id:'t1',importe:'620',obligatorio:'true'}]}))
})
it('terminal Cycles expose read-only tariff configuration',async()=>{
 render(<Tariffs/>);fireEvent.click(screen.getByRole('button',{name:'Tarifas por Ciclo'}));await screen.findByRole('option',{name:/2026-002-NAV/});fireEvent.change(screen.getByRole('combobox',{name:'Ciclo'}),{target:{value:'closed'}});await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.getByRole('spinbutton',{name:'Importe de CARRERA'})).toBeDisabled();expect(screen.queryByRole('button',{name:'Guardar tarifas del Ciclo'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('failed cycle configuration cannot be saved as an empty replacement',async()=>{
 configFailure=true;render(<Tariffs/>);fireEvent.click(screen.getByRole('button',{name:'Tarifas por Ciclo'}));await screen.findByRole('option',{name:/2026-001-NAV/});fireEvent.change(screen.getByRole('combobox',{name:'Ciclo'}),{target:{value:'c1'}});expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la configuración');expect(screen.queryByRole('button',{name:'Guardar tarifas del Ciclo'})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})

it('creates a tariff from the explicit New action and returns to the grid',async()=>{
 render(<Tariffs/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Nueva tarifa'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Nueva tarifa'}));
 fireEvent.change(screen.getByRole('textbox',{name:'Código tarifa'}),{target:{value:'ot1'}});fireEvent.change(screen.getByRole('textbox',{name:'Nombre tarifa'}),{target:{value:'seguro'}});fireEvent.change(screen.getByRole('spinbutton',{name:'Monto por defecto (S/)'}),{target:{value:'25.50'}});
 client.rpc.mockResolvedValue({data:{id:'new'},error:null});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifa'}));expect(await screen.findByRole('table',{name:'Tarifas'})).toBeVisible();expect(client.rpc).toHaveBeenCalledExactlyOnceWith('guardar_tarifa',{p:{codigo:'OT1',nombre:'SEGURO',descripcion:null,tipo:'OTRO',monto_por_defecto:'25.50'}})
})
it('rejects a negative default amount inline before sending any command',async()=>{
 render(<Tariffs/>);fireEvent.click(await screen.findByRole('button',{name:'Editar CARRERA'}));const amount=screen.getByRole('spinbutton',{name:'Monto por defecto (S/)'});fireEvent.change(amount,{target:{value:'-1'}});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifa'}));await waitFor(()=>expect(amount).toHaveFocus());expect(client.rpc).not.toHaveBeenCalled();expect(amount).toHaveAttribute('min','0');expect(amount).toHaveAttribute('step','0.01')
})

it('identifies the repeated tariff code inline, focuses it and preserves the rest of the draft',async()=>{
 render(<Tariffs/>);fireEvent.click(await screen.findByRole('button',{name:'Editar CARRERA'}));fireEvent.change(screen.getByRole('textbox',{name:'Nombre tarifa'}),{target:{value:'NOMBRE CONSERVADO'}});
 client.rpc.mockResolvedValue({error:{code:'23505',message:'duplicate key value violates unique constraint tarifa_codigo_key SQL INTERNAL'}});fireEvent.click(screen.getByRole('button',{name:'Guardar tarifa'}));
 const alert=await screen.findByRole('alert');expect(alert).toHaveTextContent('Ya existe una tarifa con el código «TC»');expect(alert).toHaveTextContent('inactiva');expect(alert).not.toHaveTextContent(/RUC|documento|Alumno|SQL|INTERNAL/);
 const code=screen.getByRole('textbox',{name:'Código tarifa'});await waitFor(()=>expect(code).toHaveFocus());expect(code).toHaveAttribute('aria-invalid','true');expect(document.getElementById(code.getAttribute('aria-describedby')!)).toHaveTextContent('Este código ya está registrado.');expect(screen.getByRole('textbox',{name:'Nombre tarifa'})).toHaveValue('NOMBRE CONSERVADO');expect(client.rpc).toHaveBeenCalledTimes(1);
 fireEvent.change(code,{target:{value:'OTRO-CODIGO'}});expect(code).toHaveAttribute('aria-invalid','false');expect(screen.queryByRole('alert')).not.toBeInTheDocument();expect(screen.getByRole('textbox',{name:'Nombre tarifa'})).toHaveValue('NOMBRE CONSERVADO');expect(client.rpc).toHaveBeenCalledTimes(1);
})
