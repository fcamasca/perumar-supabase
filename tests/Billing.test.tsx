import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { CompanyBilling } from '../src/billing/CompanyBilling'
import { OrderForm, InvoiceForm, TransferForm } from '../src/billing/BillingForms'
import { EnrollmentBilling } from '../src/billing/EnrollmentBilling'
import { EnrollmentPayments } from '../src/payments/EnrollmentPayments'
import { Companies } from '../src/enrollment/EnrollmentPages'
import { recoveryKey } from '../src/billing/contracts'

const {client,access}=vi.hoisted(()=>({client:{from:vi.fn(),rpc:vi.fn()},access:{phase:'authorized',userId:'user',roles:['DIRECTOR_ACADEMICO']}}))
vi.mock('../src/security/SessionProvider',()=>({useSession:()=>({client,state:access})}))
const company={id:'company',razon_social:'EMPRESA MAR',ruc:'20999999999'}
const orders=[{id:'o1',empresa_patrocinadora_id:'company',ciclo_id:'cycle',serie:'OS01',correlativo:'000123',fecha:'2026-01-01',monto:'10000.00',estado_codigo:'VIGENTE',updated_at:'ov1',matriculas_cubiertas:2,facturas_vigentes:0,ciclo:{codigo_ciclo:'2026-MC'}},{id:'o2',empresa_patrocinadora_id:'company',ciclo_id:'cycle',serie:'OS01',correlativo:'000124',fecha:'2026-01-01',monto:'5000.00',estado_codigo:'VIGENTE',updated_at:'ov2',matriculas_cubiertas:1,facturas_vigentes:0,ciclo:{codigo_ciclo:'2026-MC'}}]
const invoice=(id:string,n:string,pending='100.01',estado='PENDIENTE_DESEMBOLSO')=>({id,empresa_patrocinadora_id:'company',serie:'F001',correlativo:n,importe:pending,abonado:'0.00',pendiente:pending,fecha_emision:'2026-01-01',fecha_vencimiento:'2026-02-01',estado_codigo:estado,estado_financiero:'SIN_DESEMBOLSO',updated_at:'iv1',anulado_at:null})
const invoices=[invoice('i1','000456'),invoice('i2','000457','200.02')]
const candidates=[{id:'m1',empresa_patrocinadora_id:'company',ciclo_id:'cycle',estado_codigo:'ACTIVO',codigo_matricula:'2026-MC-001',updated_at:'mv1',ciclo:{updated_at:'cv1'},alumno:{apellido_paterno:'PEREZ',apellido_materno:'PAZ',nombres:'ANA'}},{id:'m2',empresa_patrocinadora_id:'company',ciclo_id:'cycle',estado_codigo:'ACTIVO',codigo_matricula:'2026-MC-002',updated_at:'mv2',ciclo:{updated_at:'cv1'},alumno:{apellido_paterno:'DIAZ',apellido_materno:'SOL',nombres:'LUIS'}}]
let data:Record<string,Record<string,unknown>[]>,readError:string|null=null
const logs:{table:string;method:string;args:unknown[]}[]=[]
const saved=vi.fn(),cancel=vi.fn(),call=vi.fn()
beforeEach(()=>{
 cleanup();sessionStorage.clear();access.roles=['DIRECTOR_ACADEMICO'];access.userId='user';readError=null;logs.length=0;saved.mockReset();cancel.mockReset();call.mockReset().mockResolvedValue({id:'saved'});client.rpc.mockReset().mockResolvedValue({data:{id:'saved'},error:null})
 data={empresa_patrocinadora:[company],ciclo:[{id:'cycle',empresa_patrocinadora_id:'company',codigo_ciclo:'2026-MC',updated_at:'cv1',estado_codigo:'PROGRAMADO'}],matricula:structuredClone(candidates),orden_servicio_resumen:structuredClone(orders),factura_patrocinador_saldo:structuredClone(invoices),pago_patrocinador:[],orden_servicio_matricula:[],factura_orden_servicio:[],pago_patrocinador_aplicacion:[],matricula_saldo:[{matricula_id:'m1',base:'100',abonado:'20',pendiente:'80'}],matricula_cargo_saldo:[{id:'cargo',matricula_id:'m1',activo:true,nombre:'CURSO',pendiente:'80'}],pago:[],catalogo:[{id:'cat',codigo:'MEDIO_PAGO',activo:true},{id:'banks',codigo:'BANCO',activo:true}],catalogo_valor:[{id:'cash',catalogo_id:'cat',activo:true,nombre:'Efectivo'},{id:'bcp',catalogo_id:'banks',codigo:'0002',nombre:'Banco de Crédito del Perú (BCP)',nombre_corto:'BCP',activo:true},{id:'old-bank',catalogo_id:'banks',codigo:'OLD',nombre:'Banco inactivo',activo:false}]}
 data.ciclo_orden_servicio_saldo=[{...data.ciclo[0],anio:2026,curso_nombre:'CURSO MARINERO',capitania_nombre:'Pisco',total_matriculas:'15000',cubierto_os:'4500',saldo_por_cubrir:'10500',matriculas_activas:2}]
 data.matricula_pago_listado=candidates.map((r,i)=>({matricula_id:r.id,ciclo_id:r.ciclo_id,matricula_estado:'ACTIVO',codigo_matricula:r.codigo_matricula,...r.alumno,base:i?'5000':'10000'}))
 client.from.mockImplementation((table:string)=>{
  const predicates:((r:Record<string,unknown>)=>boolean)[]=[],slice={start:0,end:9999}
  const result=(single=false,maybe=false)=>{const source=table==='facturacion_reporte'?[
   ...(data.orden_servicio_resumen??[]).map(r=>({...r,tipo:'order',documento:r.serie+'-'+r.correlativo,importe:r.monto,fecha:r.fecha,estado:r.estado_codigo,estado_operativo:r.estado_codigo,anulado:r.estado_codigo==='ANULADA'})),
   ...(data.factura_patrocinador_saldo??[]).map(r=>({...r,tipo:'invoice',documento:r.serie+'-'+r.correlativo,fecha:r.fecha_emision,vencimiento:r.fecha_vencimiento,estado:r.anulado_at?'ANULADA':r.estado_codigo,estado_operativo:r.estado_codigo,anulado:!!r.anulado_at})),
   ...(data.pago_patrocinador??[]).map(r=>({...r,tipo:'payment',documento:null,fecha:r.fecha_efectiva,estado:r.estado_codigo,estado_operativo:r.estado_codigo,anulado:r.estado_codigo==='ANULADO'}))
  ].map(r=>({...r,ruc:company.ruc,razon_social:company.razon_social,ciclo_ids:[],ordenes:[],facturas:[],beneficiarios:[]})):data[table]??[];const rows=source.filter(r=>predicates.every(p=>p(r))).slice(slice.start,slice.end+1);if(table===readError||(table==='facturacion_reporte'&&readError==='orden_servicio_resumen'))return {data:null,error:{code:'READ'}};return {data:single?(rows[0]??null):maybe?(rows[0]??null):rows,error:null,count:source.filter(r=>predicates.every(p=>p(r))).length}}
  const q={
   select:(...args:unknown[])=>{logs.push({table,method:'select',args});return q},
   eq:(key:string,value:unknown)=>{logs.push({table,method:'eq',args:[key,value]});predicates.push(r=>r[key]===value);return q},
   in:(key:string,values:unknown[])=>{predicates.push(r=>values.includes(r[key]));return q},
   is:(key:string,value:unknown)=>{predicates.push(r=>r[key]===value);return q},
   gt:(key:string,value:number)=>{predicates.push(r=>Number(r[key])>value);return q},
   abortSignal:()=>q,gte:()=>q,lte:()=>q,contains:()=>q,ilike:()=>q,order:(...args:unknown[])=>{logs.push({table,method:'order',args});return q},
   range:(start:number,end:number)=>{slice.start=start;slice.end=end;return q},
   limit:(n:number,options?:unknown)=>{if(!options)slice.end=n-1;return q},
   single:()=>Promise.resolve(result(true)),maybeSingle:()=>Promise.resolve(result(false,true)),
   then:(resolve:(r:unknown)=>unknown)=>Promise.resolve(result()).then(resolve)
  };return q
 })
})
afterEach(cleanup)
const wrap=(ui:React.ReactNode,path='/')=>render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
const props=()=>({company:'company',busy:false,call,saved,cancel})
const set=(name:string,value:string)=>fireEvent.change(screen.getByLabelText(name,{exact:true}),{target:{value}})
async function orderForm(){
 wrap(<OrderForm {...props()}/>)
 await screen.findByRole('option',{name:/2026-MC · CURSO MARINERO/})
 fireEvent.change(screen.getByRole('combobox',{name:'Ciclo'}),{target:{value:'cycle'}})
 await screen.findByText('PEREZ PAZ, ANA')
 set('Serie','OS01');set('Correlativo','1');fireEvent.blur(screen.getByLabelText('Correlativo'));set('Monto (S/)','4500')
}
async function invoiceForm(){
 wrap(<InvoiceForm {...props()}/>)
 await screen.findByRole('checkbox',{name:'Seleccionar OS01-000123'})
 fireEvent.click(screen.getByRole('checkbox',{name:'Seleccionar todas las órdenes de servicio visibles'}))
 set('Serie','F001');set('Correlativo','000456')
}
async function transferForm(){
 wrap(<TransferForm {...props()}/>)
 await screen.findByRole('checkbox',{name:'Seleccionar F001-000456'})
 await screen.findByRole('option',{name:'0002 — Banco de Crédito del Perú (BCP)'})
 fireEvent.click(screen.getByRole('checkbox',{name:'Seleccionar todas las facturas pendientes visibles'}))
 set('Aplicar a F001-000456 (S/)','10.01');set('Aplicar a F001-000457 (S/)','20.02');set('Banco','Banco de Crédito del Perú (BCP)');set('Referencia de operación (opcional)','00078')
}
it('admin alone cannot enter billing or make any reads',()=>{
 access.roles=['ADMIN_SISTEMA'];wrap(<CompanyBilling companyId="company"/>)
 expect(screen.getByRole('alert')).toHaveTextContent('Acceso no autorizado');expect(client.from).not.toHaveBeenCalled()
})
it('company billing reuses three keyboard tabs with CSV and no PDF or extra master',async()=>{
 wrap(<CompanyBilling companyId="company"/>)
 await screen.findByRole('button',{name:'Nueva orden de servicio'})
 expect(screen.getAllByRole('tab').map(r=>r.textContent)).toEqual(['Órdenes de servicio','Facturas','Pagos'])
 fireEvent.keyDown(screen.getByRole('tab',{name:'Órdenes de servicio'}),{key:'ArrowRight'})
 await screen.findByRole('button',{name:'Nueva factura'})
 expect(screen.getByRole('tab',{name:'Facturas'})).toHaveFocus()
 expect(screen.queryByRole('button',{name:/PDF|SUNAT|Subir/})).not.toBeInTheDocument()
})
it('OS shows only sponsored Cycles with coverage balance, contextual details and a read-only compact roster',async()=>{
 data.ciclo_orden_servicio_saldo.push({...data.ciclo_orden_servicio_saldo[0],id:'foreign',codigo_ciclo:'OTHER COMPANY',empresa_patrocinadora_id:'other'})
 data.ciclo_orden_servicio_saldo.push({...data.ciclo_orden_servicio_saldo[0],id:'covered',codigo_ciclo:'FULLY COVERED',saldo_por_cubrir:'0'})
 await orderForm()
 expect(logs).toContainEqual({table:'ciclo_orden_servicio_saldo',method:'eq',args:['empresa_patrocinadora_id','company']})
 expect(screen.queryByRole('option',{name:/OTHER COMPANY|FULLY COVERED/})).not.toBeInTheDocument()
 expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
 expect(screen.getByText('Pisco')).toBeVisible();expect(screen.getByText('2026',{exact:true})).toBeVisible()
 expect(screen.getByRole('table',{name:'Alumnos del Ciclo'})).toHaveTextContent('S/ 15000.00')
 expect(screen.getByRole('button',{name:'Cancelar'})).toBeVisible()
})
it('OS submits only Cycle context, amount and ten-digit reference; server owns the entire roster',async()=>{
 await orderForm();const button=screen.getByRole('button',{name:'Guardar orden de servicio'});fireEvent.click(button);fireEvent.click(button)
 await waitFor(()=>expect(call).toHaveBeenCalledTimes(1))
 expect(call.mock.calls[0][1].p).toMatchObject({monto:'4500',correlativo:'1',expected_ciclo_updated_at:'cv1',ciclo_id:'cycle'})
 expect(call.mock.calls[0][1].p).not.toHaveProperty('matriculas');expect(saved).toHaveBeenCalledWith('order','saved')
})
it('OS rejects an amount beyond remaining coverage without a mutation',async()=>{
 await orderForm();set('Monto (S/)','10500.01');fireEvent.click(screen.getByRole('button',{name:'Guardar orden de servicio'}))
 expect(screen.getByRole('alert')).toHaveTextContent('no supere el saldo por cubrir');expect(call).not.toHaveBeenCalled()
})
it('OS conflict preserves draft and requires explicit refresh without retry',async()=>{
 call.mockRejectedValue({code:'PT409'});await orderForm();fireEvent.click(screen.getByRole('button',{name:'Guardar orden de servicio'}))
 await screen.findByRole('alert');expect(screen.getByLabelText('Monto (S/)')).toHaveValue('4500');expect(screen.getByLabelText('Correlativo')).toHaveValue('1')
 expect(screen.getByRole('button',{name:'Guardar orden de servicio'})).toBeDisabled();expect(call).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByRole('button',{name:'Actualizar datos del Ciclo'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar orden de servicio'})).toBeEnabled())
 expect(call).toHaveBeenCalledTimes(1)
})
it('empty eligible Cycles communicate a clear state and cannot save',async()=>{
 data.ciclo_orden_servicio_saldo=[];wrap(<OrderForm {...props()}/>);
 expect(await screen.findByText('No hay Ciclos de esta empresa con saldo por cubrir.')).toBeVisible()
 expect(screen.getByRole('button',{name:'Guardar orden de servicio'})).toBeDisabled();expect(call).not.toHaveBeenCalled()
})
it('reference pagination never becomes an enrollment selection or limits the OS payload',async()=>{
 data.ciclo_orden_servicio_saldo[0]={...data.ciclo_orden_servicio_saldo[0],matriculas_activas:31,total_matriculas:'31000',saldo_por_cubrir:'26500'}
 data.matricula_pago_listado=Array.from({length:31},(_,i)=>({matricula_id:'ref'+i,ciclo_id:'cycle',matricula_estado:'ACTIVO',codigo_matricula:'M'+i,apellido_paterno:i===30?'ULTIMO':'PEREZ',apellido_materno:'PAZ',nombres:i===0?'ANA':'ALUMNO',base:'1000'}))
 await orderForm();fireEvent.click(screen.getByRole('button',{name:'Siguiente página'}));await screen.findByText('ULTIMO PAZ, ALUMNO')
 expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Guardar orden de servicio'}))
 await waitFor(()=>expect(call).toHaveBeenCalledTimes(1));expect(call.mock.calls[0][1].p).not.toHaveProperty('matriculas')
})
it('invoice sum uses exact cents; 15000 vs4500 requires explicit confirmation and sends no allocation',async()=>{
 await invoiceForm()
 expect(screen.getByLabelText('Importe (S/)')).toHaveValue('15000.00')
 set('Importe (S/)','4500')
 expect(screen.getByText('El importe de la factura difiere del total de las órdenes seleccionadas.')).toBeVisible()
 fireEvent.click(screen.getByRole('button',{name:'Guardar factura'}))
 expect(call).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo registrar la factura con esta diferencia'}))
 fireEvent.click(screen.getByRole('button',{name:'Guardar factura'}))
 await waitFor(()=>expect(call).toHaveBeenCalledTimes(1))
 const p=call.mock.calls[0][1].p
 expect(p).toMatchObject({importe:'4500',confirmar_diferencia:'true',ordenes:[{id:'o1',expected_updated_at:'ov1'},{id:'o2',expected_updated_at:'ov2'}]})
 expect(p.ordenes.every((o:Record<string,unknown>)=>!('importe' in o))).toBe(true)
})
it('invoice amount remains edited and confirmation resets when selection changes',async()=>{
 await invoiceForm();set('Importe (S/)','4500');fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo registrar la factura con esta diferencia'}))
 fireEvent.click(screen.getByRole('checkbox',{name:'Seleccionar OS01-000124'}))
 expect(screen.getByLabelText('Importe (S/)')).toHaveValue('4500');expect(screen.getByRole('checkbox',{name:'Confirmo registrar la factura con esta diferencia'})).not.toBeChecked()
})
it('invoice selection is in the table header with mixed state and a clear selected total',async()=>{
 await invoiceForm();
 const all=screen.getByRole('checkbox',{name:'Seleccionar todas las órdenes de servicio visibles'});
 expect(all.closest('thead')).not.toBeNull();expect(all).toBeChecked();
 expect(screen.getByRole('table',{name:'órdenes de servicio'})).toHaveTextContent('2 órdenes seleccionadas · Total');
 expect(screen.queryByRole('button',{name:'Siguiente página'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('checkbox',{name:'Seleccionar OS01-000124'}));
 expect(all).toBePartiallyChecked();expect(screen.getByLabelText('Importe (S/)')).toHaveValue('10000.00');
 expect(screen.getByRole('button',{name:'Actualizar órdenes'})).toBeEnabled();
 expect(screen.getByRole('button',{name:'Cancelar'})).toBeVisible();expect(call).not.toHaveBeenCalled();
})
it('transfer total is exact and submitted once with bank/date/reference and expected versions',async()=>{
 await transferForm();const button=screen.getByRole('button',{name:'Guardar transferencia'});fireEvent.click(button);fireEvent.click(button)
 await waitFor(()=>expect(call).toHaveBeenCalledTimes(1))
 expect(call.mock.calls[0][1].p).toMatchObject({importe:'30.03',banco:'Banco de Crédito del Perú (BCP)',referencia_operacion:'00078',aplicaciones:[{factura_id:'i1',importe:'10.01',expected_updated_at:'iv1'},{factura_id:'i2',importe:'20.02',expected_updated_at:'iv1'}]})
 expect(screen.queryByLabelText(/Medio de pago/)).not.toBeInTheDocument()
})
it('transfer suggests pending balances in the table but preserves partial amounts on reselection',async()=>{
 wrap(<TransferForm {...props()}/>);
 const first=await screen.findByRole('checkbox',{name:'Seleccionar F001-000456'});
 const all=screen.getByRole('checkbox',{name:'Seleccionar todas las facturas pendientes visibles'});
 expect(all.closest('thead')).not.toBeNull();fireEvent.click(first);
 const amount=screen.getByLabelText('Aplicar a F001-000456 (S/)');expect(amount).toHaveValue('100.01');
 set('Aplicar a F001-000456 (S/)','10.00');fireEvent.click(first);expect(amount).toBeDisabled();fireEvent.click(first);
 expect(amount).toHaveValue('10.00');expect(all).toBePartiallyChecked();fireEvent.click(all);
 expect(screen.getByLabelText('Aplicar a F001-000457 (S/)')).toHaveValue('200.02');
 expect(screen.getByRole('region',{name:'Total y observación'})).toHaveTextContent('S/ 210.02');
 expect(screen.queryByRole('button',{name:'Siguiente página'})).not.toBeInTheDocument();
 expect(call).not.toHaveBeenCalled();expect(sessionStorage.getItem(recoveryKey('user','company'))).toBeNull();
})
it('bank selection comes from the active BANCO catalog and excludes inactive values',async()=>{
 wrap(<TransferForm {...props()}/>);
 const option=await screen.findByRole('option',{name:'0002 — Banco de Crédito del Perú (BCP)'});expect(option).toBeInTheDocument();
 expect(screen.getByRole('combobox',{name:'Banco'})).toBeEnabled();
 expect(screen.queryByRole('option',{name:'Banco inactivo'})).not.toBeInTheDocument();
 expect(screen.queryByRole('option',{name:'Efectivo'})).not.toBeInTheDocument();
 expect(logs).toContainEqual({table:'catalogo',method:'eq',args:['codigo','BANCO']});
 expect(logs).toContainEqual({table:'catalogo_valor',method:'order',args:['codigo']});
 expect(call).not.toHaveBeenCalled();
})
it('missing bank references block a new transfer without creating an attempt',async()=>{
 readError='catalogo_valor';wrap(<TransferForm {...props()}/>);
 expect(await screen.findByText('No se pudieron consultar bancos disponibles.')).toBeVisible();
 expect(screen.getByRole('button',{name:'Guardar transferencia'})).toBeDisabled();
 expect(sessionStorage.getItem(recoveryKey('user','company'))).toBeNull();expect(call).not.toHaveBeenCalled();
})
it('unknown transfer result keeps the same recovery key and explicit lookup, never resubmits',async()=>{
 call.mockRejectedValue(new TypeError('NETWORK SECRET'));await transferForm();fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar resultado del intento'})).toBeEnabled())
 const key=sessionStorage.getItem(recoveryKey('user','company'));expect(key).toMatch(/^[a-f0-9-]{36}$/)
 fireEvent.click(screen.getByRole('button',{name:'Consultar resultado del intento'}))
 await screen.findByText(/Todavía no se encontró un pago/)
 expect(sessionStorage.getItem(recoveryKey('user','company'))).toBe(key);expect(call).toHaveBeenCalledTimes(1)
 data.pago_patrocinador=[{id:'recovered',empresa_patrocinadora_id:'company',idempotency_key:key}]
 fireEvent.click(screen.getByRole('button',{name:'Consultar resultado del intento'}))
 await waitFor(()=>expect(saved).toHaveBeenCalledWith('payment','recovered'));expect(call).toHaveBeenCalledTimes(1)
 expect(sessionStorage.getItem(recoveryKey('user','company'))).toBeNull()
})
it('recovering after remount is scoped to user/company and makes no mutation',async()=>{
 const key='11111111-1111-4111-8111-111111111111';sessionStorage.setItem(recoveryKey('user','company'),key)
 wrap(<TransferForm {...props()}/>);await screen.findByRole('button',{name:'Consultar resultado del intento'})
 expect(call).not.toHaveBeenCalled();expect(screen.getByLabelText('Banco')).toBeDisabled()
 expect(sessionStorage.getItem(recoveryKey('other','company'))).toBeNull()
})
it('transfer overpayment/date errors keep the draft and never call RPC',async()=>{
 await transferForm();set('Aplicar a F001-000456 (S/)','150');fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}))
 expect(screen.getByRole('alert')).toHaveTextContent('Revisa la fecha e importes');expect(screen.getByLabelText('Banco')).toHaveValue('Banco de Crédito del Perú (BCP)');expect(call).not.toHaveBeenCalled()
})
it('required bank focuses a real field before any transfer mutation',async()=>{
 await transferForm();const bank=screen.getByLabelText('Banco');set('Banco','');fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}))
 await waitFor(()=>expect(bank).toHaveFocus());expect(call).not.toHaveBeenCalled()
})
it('invoice state changes use a dated modal, allow only the next stage and preserve financial state',async()=>{
 data.factura_patrocinador_saldo=[{...invoices[0],estado_codigo:'EMITIDA',estado_financiero:'PARCIAL'}]
 client.rpc.mockImplementation((_name:string,args:{destino:string})=>{data.factura_patrocinador_saldo[0].estado_codigo=args.destino;data.factura_patrocinador_saldo[0].updated_at='iv2';return Promise.resolve({data:{id:'i1'},error:null})})
 wrap(<CompanyBilling companyId="company"/>,'/?factura=i1')
 const trigger=await screen.findByRole('button',{name:'Cambiar estado'});trigger.focus();fireEvent.click(trigger)
 const modal=screen.getByRole('dialog',{name:'Cambiar estado de la factura'})
 expect(within(modal).getByRole('button',{name:'Cancelar'})).toHaveFocus()
 expect(within(modal).getByText('Registrada en el sistema del patrocinador')).toBeVisible()
 expect(within(modal).getByLabelText('Fecha de registro en el patrocinador')).toBeVisible()
 expect(screen.getByText('Pago parcial')).toBeInTheDocument();expect(within(modal).queryByRole('combobox')).not.toBeInTheDocument()
 expect(screen.queryByLabelText('Fecha de la siguiente etapa')).not.toBeInTheDocument()
 fireEvent.click(within(modal).getByRole('button',{name:'Guardar cambio'}))
 await waitFor(()=>expect(client.rpc).toHaveBeenCalledExactlyOnceWith('avanzar_factura_patrocinador',expect.objectContaining({destino:'REGISTRADA_PATROCINADOR',expected_updated_at:'iv1'})))
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
 const next=await screen.findByRole('button',{name:'Cambiar estado'});await waitFor(()=>expect(next).toBeEnabled());fireEvent.click(next)
 expect(screen.getByLabelText('Fecha de aprobación')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Cancelar'}))
 expect(client.rpc).toHaveBeenCalledTimes(1)
})
it('invoice state modal cancels with Escape, restores focus and makes no mutation',async()=>{
 data.factura_patrocinador_saldo=[{...invoices[0],estado_codigo:'EMITIDA'}]
 wrap(<CompanyBilling companyId="company"/>,'/?factura=i1')
 const trigger=await screen.findByRole('button',{name:'Cambiar estado'});trigger.focus();fireEvent.click(trigger)
 const dialog=screen.getByRole('dialog',{name:'Cambiar estado de la factura'})
 fireEvent.keyDown(dialog,{key:'Escape'})
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger).toHaveFocus();expect(client.rpc).not.toHaveBeenCalled()
})
it('coordinator cannot see any annul action',async()=>{
 access.roles=['COORDINADOR_ACADEMICO'];wrap(<CompanyBilling companyId="company"/>,'/?orden=o1')
 await screen.findByRole('heading',{name:'Orden de servicio OS01-000123'});expect(screen.queryByRole('button',{name:/Anular orden/})).not.toBeInTheDocument()
})
it('Director cancellation asks for reason, uses accessible confirmation and shows dependent error without cascade',async()=>{
 client.rpc.mockResolvedValue({data:null,error:{code:'23514',message:'H7_OS_HAS_LIVE_INVOICE'}})
 wrap(<CompanyBilling companyId="company"/>,'/?orden=o1')
 fireEvent.click(await screen.findByRole('button',{name:'Anular orden'}))
 set('Motivo obligatorio','Corrección comercial')
 fireEvent.click(screen.getByRole('button',{name:'Revisar anulación'}))
 const dialog=await screen.findByRole('dialog',{name:'Confirmar anulación'})
 expect(within(dialog).getByRole('button',{name:'Cancelar operación'})).toHaveFocus()
 fireEvent.click(within(dialog).getByRole('button',{name:'Confirmar anulación'}))
 await screen.findByText(/tiene facturas no anuladas/)
 expect(client.rpc).toHaveBeenCalledTimes(1);expect(client.rpc).toHaveBeenCalledWith('anular_orden_servicio',{id:'o1',expected_updated_at:'ov1',motivo:'Corrección comercial'})
 expect(screen.getByLabelText('Motivo obligatorio')).toHaveValue('Corrección comercial')
})
it('Director cancellation dialog closes with Escape without mutating',async()=>{
 wrap(<CompanyBilling companyId="company"/>,'/?orden=o1');fireEvent.click(await screen.findByRole('button',{name:'Anular orden'}));set('Motivo obligatorio','Corrección')
 fireEvent.click(screen.getByRole('button',{name:'Revisar anulación'}));await screen.findByRole('dialog');fireEvent.keyDown(document,{key:'Escape'})
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(client.rpc).not.toHaveBeenCalled()
})
it('historical coverage queries the original OS relation, not current company enrollments',async()=>{
 data.orden_servicio_matricula=[{matricula_id:'m1',orden_servicio_id:'o1',matricula:candidates[0]}]
 wrap(<CompanyBilling companyId="company"/>,'/?orden=o1')
 await screen.findByText('PEREZ PAZ, ANA')
 expect(logs).toContainEqual({table:'orden_servicio_matricula',method:'eq',args:['orden_servicio_id','o1']})
 expect(screen.getByText('Esta lista conserva los alumnos incluidos al registrar la orden.')).toBeVisible()
})
it('OS detail highlights its reference and amount with a compact roster and clear actions',async()=>{
 data.orden_servicio_resumen[0]={...orders[0],ciclo:{codigo_ciclo:'2026-MC',carrera:{nombre:'CURSO MARINERO'}}};
 data.orden_servicio_matricula=[{orden_servicio_id:'o1',matricula_id:'m1',matricula:candidates[0]}];
 wrap(<CompanyBilling companyId="company"/>,'/?orden=o1');
 expect(await screen.findByRole('heading',{name:'Orden de servicio OS01-000123'})).toBeVisible();
 expect(screen.getByText('Monto de la orden')).toBeVisible();expect(screen.getByText('CURSO MARINERO')).toBeVisible();
 expect(screen.getByText('01/01/2026')).toBeVisible();expect(screen.getByText('Vigente',{exact:true})).toBeVisible();
 expect(await screen.findByRole('table',{name:'Alumnos incluidos en la orden'})).toHaveTextContent('PEREZ PAZ, ANA');
 expect(screen.getByRole('link',{name:'Ver matrícula 2026-MC-001'})).toHaveAttribute('href','/matriculas/m1');
 expect(screen.getByRole('button',{name:'Actualizar orden de servicio'})).toBeEnabled();
 expect(screen.queryByText(/Monto manual|Ciclo histórico|PDF de la orden/)).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Siguiente página'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Anular orden'})).toBeVisible();expect(client.rpc).not.toHaveBeenCalled();
})
it('matricula only indicates the sponsor responsibility without querying commercial documents',()=>{
 wrap(<EnrollmentBilling sponsor="company"/>)
 expect(screen.getByText('La facturación de esta matrícula es asumida por el patrocinador del Ciclo.')).toBeVisible()
 expect(client.from).not.toHaveBeenCalled();expect(client.rpc).not.toHaveBeenCalled()
 expect(screen.queryByRole('link')).not.toBeInTheDocument();expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('unsponsored enrollment does not show sponsor responsibility or query billing',()=>{
 const {container}=wrap(<EnrollmentBilling sponsor={null}/>);
 expect(container).toBeEmptyDOMElement();expect(client.from).not.toHaveBeenCalled()
})
it('sponsored H4 hides even an initially open form but keeps old payments',async()=>{
 data.pago=[{id:'old',matricula_id:'m1',importe:'20',estado_codigo:'CONFIRMADO',created_at:'2026-01-01',updated_at:'v1',medio_etiqueta:'Efectivo',observaciones:null,motivo_anulacion:null,anulado_por:null,anulado_at:null,pago_aplicacion:[]}]
 wrap(<EnrollmentPayments enrollment="m1" version="v1" enrollmentState="ACTIVO" cycleState="PROGRAMADO" sponsorId="company" initialRegister onChanged={vi.fn()}/>)
 await screen.findByText('Efectivo')
 expect(screen.getByText(/Matrícula patrocinada. Los pagos se gestionan/)).toBeVisible()
 expect(screen.queryByRole('button',{name:'Registrar pago'})).not.toBeInTheDocument()
 expect(screen.queryByRole('button',{name:/Confirmar pago/})).not.toBeInTheDocument()
 expect(screen.getByRole('heading',{name:'Historial de pagos'})).toBeVisible()
})
it('direct payments fail closed until the sponsor is read, including sponsored records reached from Payments',async()=>{
 data.matricula=[{id:'m1',empresa_patrocinadora_id:'company'}]
 wrap(<EnrollmentPayments enrollment="m1" version="v1" enrollmentState="ACTIVO" cycleState="PROGRAMADO" initialRegister onChanged={vi.fn()}/>)
 expect(screen.queryByRole('button',{name:/Confirmar pago/})).not.toBeInTheDocument()
 await screen.findByRole('link',{name:'Ir a Facturación del patrocinador'})
 expect(screen.queryByRole('button',{name:/Confirmar pago/})).not.toBeInTheDocument()
 expect(client.rpc).not.toHaveBeenCalled()
})
it('failed list reads expose an error with no stale rows/actions',async()=>{
 readError='orden_servicio_resumen';wrap(<CompanyBilling companyId="company"/>)
 await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Consultar OS01-000123'})).not.toBeInTheDocument()
 expect(client.rpc).not.toHaveBeenCalled()
})
it('existing company record is the billing entry point',async()=>{
 wrap(<Companies/>);fireEvent.click(await screen.findByRole('button',{name:'Ver empresa: EMPRESA MAR'}))
 expect(screen.getByRole('link',{name:'Facturación'})).toHaveAttribute('href','/empresas/company/facturacion')
 expect(client.rpc).not.toHaveBeenCalled()
})
it('coordinator can open all three registration flows',async()=>{
 access.roles=['COORDINADOR_ACADEMICO'];wrap(<CompanyBilling companyId="company"/>)
 await screen.findByRole('button',{name:'Nueva orden de servicio'})
 fireEvent.click(screen.getByRole('tab',{name:'Facturas'}));await screen.findByRole('button',{name:'Nueva factura'})
 fireEvent.click(screen.getByRole('tab',{name:'Pagos'}));await screen.findByRole('button',{name:'Registrar transferencia'})
})
it('same-key resend is only offered after explicit lookup and repeats the identical payload once',async()=>{
 call.mockRejectedValueOnce(new TypeError('network')).mockResolvedValue({id:'saved'})
 await transferForm();fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}))
 await screen.findByRole('alert');expect(call).toHaveBeenCalledTimes(1)
 expect(screen.queryByRole('button',{name:'Reenviar el mismo intento con la misma clave'})).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Consultar resultado del intento'}))
 fireEvent.click(await screen.findByRole('button',{name:'Reenviar el mismo intento con la misma clave'}))
 await waitFor(()=>expect(call).toHaveBeenCalledTimes(2));expect(call.mock.calls[1]).toEqual(call.mock.calls[0]);expect(saved).toHaveBeenCalledWith('payment','saved')
})
it('definite transfer conflict preserves draft and requires reread without leaving a pending key',async()=>{
 call.mockRejectedValue({code:'PT409'});await transferForm();fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}))
 await screen.findByRole('alert');expect(screen.getByLabelText('Banco')).toHaveValue('Banco de Crédito del Perú (BCP)');expect(screen.getByLabelText('Aplicar a F001-000456 (S/)')).toHaveValue('10.01')
 expect(sessionStorage.getItem(recoveryKey('user','company'))).toBeNull();expect(screen.getByRole('button',{name:'Guardar transferencia'})).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'Actualizar facturas'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar transferencia'})).toBeEnabled());expect(call).toHaveBeenCalledTimes(1)
})
it('invoice cancellation explains live payments without cascading',async()=>{
 client.rpc.mockResolvedValue({data:null,error:{code:'23514',message:'H7_INVOICE_HAS_LIVE_PAYMENT'}})
 wrap(<CompanyBilling companyId="company"/>,'/?factura=i1');fireEvent.click(await screen.findByRole('button',{name:'Anular factura'}));set('Motivo obligatorio','Corrección')
 fireEvent.click(screen.getByRole('button',{name:'Revisar anulación'}));fireEvent.click(await screen.findByRole('button',{name:'Confirmar anulación'}))
 await screen.findByText(/tiene pagos confirmados/);expect(client.rpc).toHaveBeenCalledTimes(1);expect(client.rpc.mock.calls[0][0]).toBe('anular_factura_patrocinador')
})
it('annulling a transfer rereads its state and the invoice balances',async()=>{
 data.pago_patrocinador=[{id:'p1',empresa_patrocinadora_id:'company',importe:'70.00',fecha_efectiva:'2026-01-02',banco:'BCP',referencia_operacion:'0001',estado_codigo:'CONFIRMADO',updated_at:'pv1'}]
 data.factura_patrocinador_saldo=[{...invoices[0],abonado:'70.00',pendiente:'30.01',estado_financiero:'PARCIAL'}]
 client.rpc.mockImplementation(()=>{data.pago_patrocinador[0].estado_codigo='ANULADO';data.factura_patrocinador_saldo[0]={...invoices[0]};return Promise.resolve({data:{id:'p1'},error:null})})
 wrap(<CompanyBilling companyId="company"/>,'/?pago=p1');fireEvent.click(await screen.findByRole('button',{name:'Anular transferencia'}));set('Motivo obligatorio','Corrección')
 fireEvent.click(screen.getByRole('button',{name:'Revisar anulación'}));fireEvent.click(await screen.findByRole('button',{name:'Confirmar anulación'}));await screen.findByText('ANULADO')
 fireEvent.click(screen.getByRole('tab',{name:'Facturas'}));const table=await screen.findByRole('table',{name:'Facturas del patrocinador'});expect(within(table).getByRole('row',{name:/F001-000456/})).toHaveTextContent('Pendiente de desembolso');expect(client.rpc).toHaveBeenCalledTimes(1)
})
it('sponsored history is still visible if the private payment catalog is unavailable',async()=>{
 readError='catalogo';data.pago=[{id:'old',matricula_id:'m1',importe:'20',estado_codigo:'CONFIRMADO',created_at:'2026-01-01',updated_at:'v1',medio_etiqueta:'Efectivo histórico',pago_aplicacion:[]}]
 wrap(<EnrollmentPayments enrollment="m1" version="v1" enrollmentState="ACTIVO" cycleState="PROGRAMADO" sponsorId="company" initialRegister onChanged={vi.fn()}/>)
 await screen.findByText('Efectivo histórico');expect(screen.queryByRole('button',{name:/Confirmar pago/})).not.toBeInTheDocument()
})
it('ADMIN alone does not display the academic sponsorship notice or query billing',()=>{
 access.roles=['ADMIN_SISTEMA'];const {container}=wrap(<EnrollmentBilling sponsor="company"/>);
 expect(container).toBeEmptyDOMElement();expect(client.from).not.toHaveBeenCalled()
})
it('failed sponsorship reads never enable a new private payment',async()=>{
 readError='matricula';wrap(<EnrollmentPayments enrollment="m1" version="v1" enrollmentState="ACTIVO" cycleState="PROGRAMADO" initialRegister onChanged={vi.fn()}/>)
 await screen.findByText(/No se pudo confirmar el patrocinador/);expect(screen.queryByRole('button',{name:/Confirmar pago/})).not.toBeInTheDocument();expect(client.rpc).not.toHaveBeenCalled()
})
it('invoice annulment is a condition, never a replacement for its manual workflow',async()=>{
 data.factura_patrocinador_saldo=[{...invoices[0],anulado_at:'2026-02-01T12:00:00Z'}]
 wrap(<CompanyBilling companyId="company"/>,'/?factura=i1')
 expect(await screen.findByText('Anulada',{exact:true})).toBeVisible()
 expect(screen.getByText('Etapa actual').parentElement).toHaveTextContent('Pendiente de desembolso')
 expect(screen.getByText('Última etapa registrada')).toBeVisible()
 expect(screen.queryByRole('button',{name:'Cambiar estado'})).not.toBeInTheDocument()
 expect(screen.queryByRole('button',{name:'Anular factura'})).not.toBeInTheDocument()
})
it('uncertain transfer survives remount and explicit reconstruction uses the original key once',async()=>{
 const random=vi.spyOn(crypto,'randomUUID')
 try{
  call.mockRejectedValueOnce(new TypeError('network')).mockResolvedValue({id:'resolved'})
  await transferForm();fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}))
  await screen.findByRole('alert')
  const original=structuredClone(call.mock.calls[0][1].p),generated=random.mock.calls.length
  expect(sessionStorage.getItem(recoveryKey('user','company'))).toBe(original.idempotency_key)
  cleanup();wrap(<TransferForm {...props()}/>);
  await screen.findByRole('button',{name:'Consultar resultado del intento'})
  expect(screen.getByLabelText('Banco')).toBeDisabled();expect(call).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button',{name:'Consultar resultado del intento'}))
  fireEvent.click(await screen.findByRole('button',{name:'Revisar el mismo intento con la misma clave'}))
  await waitFor(()=>expect(screen.getByLabelText('Banco')).toBeEnabled())
  fireEvent.click(screen.getByRole('checkbox',{name:'Seleccionar todas las facturas pendientes visibles'}))
  set('Aplicar a F001-000456 (S/)','10.01');set('Aplicar a F001-000457 (S/)','20.02');set('Banco',original.banco);set('Referencia de operación (opcional)','00078');set('Fecha de la transferencia',original.fecha_efectiva)
  fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}))
  expect(call).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo que estos datos corresponden al mismo intento original'}))
  const submit=screen.getByRole('button',{name:'Guardar transferencia'});fireEvent.click(submit);fireEvent.click(submit)
  await waitFor(()=>expect(saved).toHaveBeenCalledWith('payment','resolved'))
  expect(call).toHaveBeenCalledTimes(2);expect(call.mock.calls[1][1].p).toEqual(original)
  expect(random.mock.calls.length).toBe(generated);expect(sessionStorage.getItem(recoveryKey('user','company'))).toBeNull()
 }finally{random.mockRestore()}
})
it('legacy key-only recovery keeps its key after an idempotency conflict and resolves by lookup',async()=>{
 const key='11111111-1111-4111-8111-111111111111';sessionStorage.setItem(recoveryKey('user','company'),key)
 call.mockRejectedValue({code:'PT409',message:'H7_IDEMPOTENCY_CONFLICT'})
 wrap(<TransferForm {...props()}/>);fireEvent.click(await screen.findByRole('button',{name:'Consultar resultado del intento'}))
 fireEvent.click(await screen.findByRole('button',{name:'Revisar el mismo intento con la misma clave'}))
 await waitFor(()=>expect(screen.getByLabelText('Banco')).toBeEnabled())
 fireEvent.click(screen.getByRole('checkbox',{name:'Seleccionar F001-000456'}));set('Aplicar a F001-000456 (S/)','10.01');set('Banco','BCP')
 fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo que estos datos corresponden al mismo intento original'}))
 fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}))
 await waitFor(()=>expect(call).toHaveBeenCalledTimes(1))
 await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar resultado del intento'})).toBeEnabled())
 expect(call.mock.calls[0][1].p.idempotency_key).toBe(key);expect(sessionStorage.getItem(recoveryKey('user','company'))).toBe(key)
 data.pago_patrocinador=[{id:'original',empresa_patrocinadora_id:'company',idempotency_key:key}]
 fireEvent.click(screen.getByRole('button',{name:'Consultar resultado del intento'}))
 await waitFor(()=>expect(saved).toHaveBeenCalledWith('payment','original'));expect(call).toHaveBeenCalledTimes(1)
})
it('a definite retry error cannot release the key of an earlier uncertain request',async()=>{
 call.mockRejectedValueOnce(new TypeError('network')).mockRejectedValueOnce({code:'40001'})
 await transferForm();fireEvent.click(screen.getByRole('button',{name:'Guardar transferencia'}));await screen.findByRole('alert')
 const key=sessionStorage.getItem(recoveryKey('user','company'))
 fireEvent.click(screen.getByRole('button',{name:'Consultar resultado del intento'}))
 fireEvent.click(await screen.findByRole('button',{name:'Reenviar el mismo intento con la misma clave'}))
 await waitFor(()=>expect(call).toHaveBeenCalledTimes(2))
 await waitFor(()=>expect(screen.getByRole('button',{name:'Consultar resultado del intento'})).toBeEnabled())
 expect(sessionStorage.getItem(recoveryKey('user','company'))).toBe(key)
 expect(screen.getByLabelText('Banco')).toBeDisabled();expect(call.mock.calls[1][1].p.idempotency_key).toBe(key)
})

it('transfer detail highlights its amount and shows linked invoices without single-page controls',async()=>{
 data.pago_patrocinador=[{id:'p1',empresa_patrocinadora_id:'company',importe:'70.00',fecha_efectiva:'2026-01-02',banco:'BCP',referencia_operacion:null,estado_codigo:'CONFIRMADO',updated_at:'pv1'}]
 data.pago_patrocinador_aplicacion=[{pago_id:'p1',factura_id:'i1',importe:'70.00',factura_patrocinador:invoices[0]}]
 wrap(<CompanyBilling companyId="company"/>,'/?pago=p1')
 const table=await screen.findByRole('table',{name:'Facturas pagadas con esta transferencia'})
 expect(screen.getByRole('heading',{name:'Transferencia bancaria'})).toBeVisible()
 expect(screen.getByText('Confirmada',{exact:true})).toBeVisible()
 expect(screen.getByText('02/01/2026')).toBeVisible()
 expect(screen.getByText('No indicada')).toBeVisible()
 expect(within(table).getByRole('link',{name:'Ver factura F001-000456'})).toHaveAttribute('href','/empresas/company/facturacion?factura=i1')
 expect(within(table).getByRole('row',{name:/Total de la transferencia/})).toHaveTextContent('S/ 70.00')
 expect(screen.queryByRole('button',{name:'Siguiente página'})).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Actualizar transferencia'}))
 await screen.findByRole('table',{name:'Facturas pagadas con esta transferencia'})
 expect(client.rpc).not.toHaveBeenCalled()
})

it('invoice detail separates financial totals, dated stages and included orders',async()=>{
 data.factura_patrocinador_saldo=[{...invoices[0],importe:'15000.00',abonado:'0.00',pendiente:'15000.00',fecha_registrada_patrocinador:'2026-01-03',fecha_aprobada:'2026-01-05',fecha_pendiente_desembolso:'2026-01-06'}]
 data.factura_orden_servicio=orders.map(o=>({factura_id:'i1',orden_servicio_id:o.id,orden_servicio:o}))
 wrap(<CompanyBilling companyId="company"/>,'/?factura=i1')
 const table=await screen.findByRole('table',{name:'Órdenes de servicio incluidas'})
 expect(screen.getByRole('heading',{name:'Factura F001-000456'})).toBeVisible()
 expect(screen.getByText('Vigente',{exact:true})).toBeVisible()
 expect(screen.getByText('Saldo pendiente').parentElement).toHaveTextContent('S/ 15000.00')
 expect(screen.getByText('Sin pagos registrados')).toBeVisible()
 const tracking=screen.getByRole('region',{name:'Seguimiento de la factura'})
 expect(within(tracking).getByText('03/01/2026')).toBeVisible()
 expect(tracking.querySelector('[aria-current="step"]')).toHaveTextContent('Pendiente de desembolso')
 expect(screen.getByText('Fecha de vencimiento').parentElement).toHaveTextContent('01/02/2026')
 expect(within(table).getByRole('link',{name:'Ver orden OS01-000123'})).toHaveAttribute('href','/empresas/company/facturacion?orden=o1')
 expect(within(table).getByRole('row',{name:/Total de las órdenes/})).toHaveTextContent('S/ 15000.00')
 expect(screen.queryByRole('button',{name:'Siguiente página'})).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Actualizar factura'}))
 await screen.findByRole('table',{name:'Órdenes de servicio incluidas'})
 expect(client.rpc).not.toHaveBeenCalled()
})

it('fully paid invoices keep their administrative stage and show payment in business terms',async()=>{
 data.factura_patrocinador_saldo=[{...invoices[0],importe:'100.01',abonado:'100.01',pendiente:'0.00',estado_financiero:'DESEMBOLSADA'}]
 wrap(<CompanyBilling companyId="company"/>,'/?factura=i1')
 expect(await screen.findByText('Pagada',{exact:true})).toBeVisible()
 expect(screen.getByText('Saldo pendiente').parentElement).toHaveTextContent('S/ 0.00')
 expect(screen.getByText('Etapa actual').parentElement).toHaveTextContent('Pendiente de desembolso')
 expect(screen.queryByRole('button',{name:'Cambiar estado'})).not.toBeInTheDocument()
})

it('invoice selection excludes orders with a live invoice and restores orders with only annulled history',async()=>{
 data.orden_servicio_resumen[0].facturas_vigentes=1
 data.orden_servicio_resumen[1].facturas_relacionadas=1
 data.orden_servicio_resumen[1].facturas_vigentes=0
 wrap(<InvoiceForm {...props()}/>)
 await screen.findByRole('checkbox',{name:'Seleccionar OS01-000124'})
 expect(screen.queryByRole('checkbox',{name:'Seleccionar OS01-000123'})).not.toBeInTheDocument()
 expect(logs).toContainEqual({table:'orden_servicio_resumen',method:'eq',args:['facturas_vigentes',0]})
})
it('an order invoiced by another operator blocks saving until explicit refresh without retry',async()=>{
 call.mockRejectedValue({code:'23514',message:'H7_OS_ALREADY_INVOICED'})
 await invoiceForm()
 fireEvent.click(screen.getByRole('button',{name:'Guardar factura'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('ya tiene una factura vigente')
 expect(call).toHaveBeenCalledTimes(1)
 expect(screen.getByRole('button',{name:'Guardar factura'})).toBeDisabled()
 data.orden_servicio_resumen.forEach(o=>{o.facturas_vigentes=1})
 fireEvent.click(screen.getByRole('button',{name:'Actualizar órdenes'}))
 await screen.findByText('No hay órdenes de servicio pendientes de facturar.')
 fireEvent.click(screen.getByRole('button',{name:'Guardar factura'}))
 expect(call).toHaveBeenCalledTimes(1)
})
