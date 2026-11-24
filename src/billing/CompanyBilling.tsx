import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useSession } from '../security/SessionProvider'
import { AcademicTabs } from '../academic/AcademicLayout'
import { EditorHeading, InlineForm, StatusBadge, useConfirmation } from '../academic/AcademicUi'
import { pen } from '../payments/money'
import { BillingForm, Pager, useRows } from './BillingUi'
import { InvoiceForm, OrderForm, TransferForm, type Call, type Kind } from './BillingForms'
import { billingError, invoiceColumns, orderColumns, reference, steps, stepLabels, studentName, todayLima, transferColumns, type Candidate, type Company, type Invoice, type Order, type Transfer } from './contracts'
import './billing.css'

type Data=Order|Invoice|Transfer
const tables=['orden_servicio_resumen','factura_patrocinador_saldo','pago_patrocinador']
const baseColumns:string[]=[orderColumns+',ciclo(codigo_ciclo)',invoiceColumns,transferColumns]
const columns=[orderColumns+',ciclo(codigo_ciclo)',invoiceColumns,transferColumns+',pago_patrocinador_aplicacion(factura_patrocinador(serie,correlativo))']
const kinds:Kind[]=['order','invoice','payment'],queryKeys=['orden','factura','pago']
const relationTables=['orden_servicio_matricula','factura_orden_servicio','pago_patrocinador_aplicacion']
const relationFields=['matricula_id,matricula(id,codigo_matricula,alumno(apellido_paterno,apellido_materno,nombres))','orden_servicio_id,orden_servicio(id,serie,correlativo,monto::text,ciclo_id)','factura_id,importe::text,factura_patrocinador(id,serie,correlativo)']
const relationParents=['orden_servicio_id','factura_id','pago_id'],relationOrder=['matricula_id','orden_servicio_id','factura_id']
export function SponsorBillingPage(){const {companyId}=useParams();return companyId?<CompanyBilling companyId={companyId}/>:<p role="alert">Empresa no disponible.</p>}
export function CompanyBilling({companyId}:{companyId:string}){
 const {state}=useSession()
 if(state.phase!=='authorized'||!state.roles?.some(r=>['DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO'].includes(r)))return <p role="alert">Acceso no autorizado a Facturación.</p>
 return <BillingWorkspace key={(state.userId??'')+':'+companyId} companyId={companyId}/>
}
function BillingWorkspace({companyId}:{companyId:string}){
 const {client}=useSession(),[params,setParams]=useSearchParams()
 const [tabFallback,setTab]=useState(()=>Math.max(0,queryKeys.findIndex(k=>params.has(k))))
 const paramTab=queryKeys.findIndex(k=>params.has(k)),tab=paramTab>=0?paramTab:tabFallback
 const [form,setForm]=useState<Kind|null>(null),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[status,setStatus]=useState('')
 const flight=useRef(false),alive=useRef(true)
 const {ask,dialog}=useConfirmation(busy)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const companies=useRows<Company>(useCallback(()=>client.from('empresa_patrocinadora').select('id,ruc,razon_social').eq('id',companyId).limit(1),[client,companyId]))
 const list=useRows<Data>(useCallback(()=>{
  let q=client.from(tables[tab]).select(columns[tab]).eq('empresa_patrocinadora_id',companyId).order('created_at',{ascending:false}).order('id').range(page*30,page*30+29)
  if(tab===2)q=q.limit(3,{referencedTable:'pago_patrocinador_aplicacion'})
  return q
 },[client,companyId,tab,page]))
 const detail=queryKeys.map(k=>params.get(k)).find(Boolean)??null
 const detailTab=queryKeys.findIndex(k=>params.has(k))
 const call:Call=async(name,args)=>{
  if(flight.current)return null
  flight.current=true;setBusy(true)
  try{const r=await client.rpc(name,args);if(r.error)throw r.error;if(!r.data||typeof r.data.id!=='string')throw Error('Unconfirmed response');return r.data as Record<string,unknown>}
  finally{flight.current=false;if(alive.current)setBusy(false)}
 }
 const saved=(kind:Kind,id:string)=>{if(!alive.current)return;setForm(null);setTab(kinds.indexOf(kind));setParams({[queryKeys[kinds.indexOf(kind)]]:id});list.reload();setStatus('Operación completada correctamente.')}
 async function cancel(){
  if(await ask({title:'Volver sin registrar',description:'El borrador de este formulario se descartará. Si existe una transferencia sin confirmar, su referencia de recuperación se conserva.',confirmLabel:'Volver al listado'})!==null)setForm(null)
 }
 if(companies.loading)return <p role="status">Consultando patrocinador…</p>
 if(companies.error||!companies.rows.length)return <section><p role="alert">{companies.error||'Empresa no disponible.'}</p><button onClick={companies.reload}>Volver a consultar empresa</button><Link to="/empresas">Volver a empresas</Link></section>
 return <section className="billing" aria-label="Facturación del patrocinador">{dialog}<EditorHeading>Facturación del patrocinador</EditorHeading><header className="student-detail-header"><div><h3>{companies.rows[0].razon_social}</h3><p>RUC · {companies.rows[0].ruc}</p></div><Link to="/empresas">Volver a empresas</Link></header>
 {status&&<p role="status">{status}</p>}
 <AcademicTabs id="sponsor-billing" names={['Órdenes de servicio','Facturas','Pagos']} active={tab} disabled={busy||!!form} onChange={i=>{setTab(i);setPage(0);setParams({});setStatus('')}}/>
 {kinds.map((_,panelIndex)=><div key={panelIndex} role="tabpanel" hidden={panelIndex!==tab} id={'sponsor-billing-panel-'+panelIndex} aria-labelledby={'sponsor-billing-tab-'+panelIndex} className="billing-panel" tabIndex={0}>{panelIndex===tab&&<>
 {form==='order'?<OrderForm company={companyId} busy={busy} call={call} saved={saved} cancel={()=>void cancel()}/>:form==='invoice'?<InvoiceForm company={companyId} busy={busy} call={call} saved={saved} cancel={()=>void cancel()}/>:form==='payment'?<TransferForm company={companyId} busy={busy} call={call} saved={saved} cancel={()=>void cancel()}/>:detail?<BillingDetail key={detail} company={companyId} id={detail} kind={kinds[Math.max(0,detailTab)]} busy={busy} call={call} changed={()=>{list.reload();setStatus('Operación completada correctamente.')}} back={()=>setParams({})}/>:<>
 <div className="billing-toolbar"><button type="button" disabled={busy} onClick={()=>{setForm(kinds[tab]);setStatus('')}}>{['Nueva orden de servicio','Nueva factura','Registrar transferencia'][tab]}</button><button type="button" className="secondary" disabled={busy||list.loading} onClick={list.reload}>Actualizar listado</button></div>
 {list.loading&&<p role="status">Consultando…</p>}{list.error&&<p role="alert">{list.error}</p>}
 {!list.loading&&!list.error&&<div className="table-scroll"><table aria-label={['Órdenes de servicio','Facturas del patrocinador','Transferencias del patrocinador'][tab]}><thead><tr>{(tab===0?['Orden','Fecha','Ciclo','Monto','Matrículas cubiertas','Estado']:tab===1?['Factura','Emisión','Vencimiento','Importe','Estado operativo','Estado financiero','Abonado','Pendiente']:['Fecha efectiva','Banco','Referencia','Importe','Estado','Facturas aplicadas']).map(h=><th key={h}>{h}</th>)}<th>Acciones</th></tr></thead><tbody>{list.rows.map(row=><tr key={row.id}>{tab===0?(()=>{const r=row as Order&{ciclo?:{codigo_ciclo:string}};return <><td>{reference(r)}</td><td>{r.fecha}</td><td>{r.ciclo?.codigo_ciclo??'No disponible'}</td><td className="billing-money">{pen(r.monto)}</td><td>{r.matriculas_cubiertas}</td><td><StatusBadge value={r.estado_codigo}/></td></>})():tab===1?(()=>{const r=row as Invoice;return <><td>{reference(r)}{r.anulado_at&&<StatusBadge value="ANULADA"/>}</td><td>{r.fecha_emision}</td><td>{r.fecha_vencimiento}</td><td>{pen(r.importe)}</td><td>{r.estado_codigo.replaceAll('_',' ')}</td><td>{r.estado_financiero.replaceAll('_',' ')}</td><td>{pen(r.abonado)}</td><td>{pen(r.pendiente)}</td></>})():(()=>{const r=row as Transfer&{pago_patrocinador_aplicacion?:{factura_patrocinador:{serie:string;correlativo:string}}[]};return <><td>{r.fecha_efectiva}</td><td>{r.banco}</td><td>{r.referencia_operacion||'—'}</td><td>{pen(r.importe)}</td><td><StatusBadge value={r.estado_codigo}/></td><td>{r.pago_patrocinador_aplicacion?.map(a=>reference(a.factura_patrocinador)).join(', ')}<small>Consulta el detalle para ver todas las aplicaciones.</small></td></>})()}<td><button type="button" className="secondary" aria-label={'Consultar '+(tab===2?'transferencia de '+(row as Transfer).fecha_efectiva:reference(row as Order))} onClick={()=>setParams({[queryKeys[tab]]:row.id})}>Consultar</button></td></tr>)}{!list.rows.length&&<tr><td colSpan={tab===1?9:7}>No hay registros en esta página.</td></tr>}</tbody></table></div>}
 <Pager page={page} count={list.rows.length} disabled={busy||list.loading} onChange={setPage}/></>}
 </>}</div>)}</section>
}

function BillingDetail({company,id,kind,busy,call,changed,back}:{company:string;id:string;kind:Kind;busy:boolean;call:Call;changed:()=>void;back:()=>void}){
 const {client,state}=useSession(),index=kinds.indexOf(kind)
 const [page,setPage]=useState(0),[date,setDate]=useState(todayLima()),[reason,setReason]=useState(''),[annulling,setAnnulling]=useState(false),[error,setError]=useState(''),[review,setReview]=useState(false)
 const director=state.roles?.includes('DIRECTOR_ACADEMICO'),{ask,dialog}=useConfirmation(busy)
 const data=useRows<Data>(useCallback(()=>client.from(tables[index]).select(baseColumns[index]).eq('id',id).eq('empresa_patrocinadora_id',company).limit(1),[client,company,id,index]))
 const related=useRows<Record<string,unknown>>(useCallback(()=>client.from(relationTables[index]).select(relationFields[index]).eq(relationParents[index],id).order(relationOrder[index]).range(page*30,page*30+29),[client,index,id,page]))
 const row=data.rows[0]
 async function transition(){
  if(!row||review||!data.ready||busy)return
  const invoice=row as Invoice,next=steps[steps.indexOf(invoice.estado_codigo)+1]
  if(!next)return
  try{if(await call('avanzar_factura_patrocinador',{id,expected_updated_at:row.updated_at,destino:next,fecha:date})){data.reload();changed();setError('')}}
  catch(e){setError(billingError(e));setReview(true)}
 }
 async function annul(){
  if(!row||!data.ready||review||busy||!director)return
  if(!reason.trim()||reason.trim().length>500){setError('Indica un motivo de hasta 500 caracteres.');return}
  if(await ask({title:'Confirmar anulación',description:'Se conserva toda la historia. Los objetos dependientes deben regularizarse primero por sus propias reglas; no se anulan en cascada.',sensitive:true,confirmLabel:'Confirmar anulación'})===null)return
  try{if(await call(['anular_orden_servicio','anular_factura_patrocinador','anular_pago_patrocinador'][index],{id,expected_updated_at:row.updated_at,motivo:reason.trim()})){data.reload();changed();setAnnulling(false);setError('')}}
  catch(e){setError(billingError(e));setReview(true)}
 }
 const live=row&&(kind==='invoice'?!(row as Invoice).anulado_at:row.estado_codigo===(kind==='order'?'VIGENTE':'CONFIRMADO'))
 return <section className="billing-detail">{dialog}<EditorHeading>{kind==='order'?'Orden de servicio':kind==='invoice'?'Factura':'Transferencia'}</EditorHeading><button type="button" className="secondary" disabled={busy} onClick={back}>Volver al listado</button>
 {error&&<p role="alert" className="validation-errors">{error}</p>}{data.loading&&<p role="status">Consultando detalle…</p>}{data.error&&<p role="alert">{data.error}</p>}
 <button type="button" className="secondary" disabled={busy||data.loading} onClick={()=>{data.reload();related.reload();setReview(false);setError('')}}>Consultar estado actual</button>
 {data.ready&&!row&&<p role="alert">El registro no está disponible para este patrocinador.</p>}
 {row&&<><h3>{kind==='payment'?'Transferencia bancaria':reference(row as Order)}</h3><dl className="review-fields">{kind==='order'?<><div><dt>Fecha</dt><dd>{(row as Order).fecha}</dd></div><div><dt>Ciclo histórico</dt><dd>{(row as Order).ciclo?.codigo_ciclo??'No disponible'}</dd></div><div><dt>Monto manual</dt><dd>{pen((row as Order).monto)}</dd></div><div><dt>Estado</dt><dd>{row.estado_codigo}</dd></div></>:kind==='invoice'?<><div><dt>Estado operativo</dt><dd>{row.estado_codigo.replaceAll('_',' ')}</dd></div><div><dt>Condición</dt><dd>{(row as Invoice).anulado_at?'Anulada':'Vigente'}</dd></div><div><dt>Estado financiero</dt><dd>{(row as Invoice).estado_financiero.replaceAll('_',' ')}</dd></div><div><dt>Importe</dt><dd>{pen((row as Invoice).importe)}</dd></div><div><dt>Abonado</dt><dd>{pen((row as Invoice).abonado)}</dd></div><div><dt>Pendiente</dt><dd>{pen((row as Invoice).pendiente)}</dd></div></>:<><div><dt>Banco</dt><dd>{(row as Transfer).banco}</dd></div><div><dt>Fecha efectiva</dt><dd>{(row as Transfer).fecha_efectiva}</dd></div><div><dt>Referencia</dt><dd>{(row as Transfer).referencia_operacion||'—'}</dd></div><div><dt>Importe</dt><dd>{pen((row as Transfer).importe)}</dd></div><div><dt>Estado</dt><dd>{row.estado_codigo}</dd></div></>}</dl>
 {'observacion' in row&&typeof row.observacion==='string'&&<p>Observación: {row.observacion}</p>}{'motivo_anulacion' in row&&typeof row.motivo_anulacion==='string'&&<p>Motivo de anulación: {row.motivo_anulacion}</p>}
 {kind==='order'&&<><p>PDF de la orden: No adjunto</p><p>La cobertura siguiente conserva las matrículas originalmente seleccionadas, aunque su patrocinador o Ciclo actual haya cambiado. Los nombres y códigos se consultan actualmente.</p></>}
 {kind==='invoice'&&<dl className="review-fields">{[['Emisión',(row as Invoice).fecha_emision],['Vencimiento',(row as Invoice).fecha_vencimiento],['Registro en patrocinador',(row as Invoice).fecha_registrada_patrocinador],['Aprobación',(row as Invoice).fecha_aprobada],['Pendiente de desembolso',(row as Invoice).fecha_pendiente_desembolso]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Sin registrar'}</dd></div>)}</dl>}<h4>{kind==='order'?'Cobertura histórica':kind==='invoice'?'Órdenes relacionadas — detalle comercial':'Aplicaciones históricas'}</h4>
 {related.error&&<p role="alert">{related.error}</p>}{related.loading&&<p role="status">Consultando relaciones…</p>}<ul>{related.rows.map((r,i)=><li key={String(r.matricula_id??r.orden_servicio_id??r.factura_id??i)}>{kind==='order'?(()=>{const m=r.matricula as Candidate;return m?<Link to={'/matriculas/'+String(r.matricula_id)}>{studentName(m)} · {m.codigo_matricula}</Link>:'Matrícula no disponible'})():kind==='invoice'?(()=>{const o=r.orden_servicio as Order;return o?<Link to={'/empresas/'+company+'/facturacion?orden='+o.id}>{reference(o)} · {pen(o.monto)}</Link>:'Orden no disponible'})():(()=>{const f=r.factura_patrocinador as Invoice;return f?<><Link to={'/empresas/'+company+'/facturacion?factura='+f.id}>{reference(f)}</Link> · {pen(String(r.importe))}</>:'Factura no disponible'})()}</li>)}</ul><Pager page={page} count={related.rows.length} disabled={busy||related.loading} onChange={setPage}/>
 {kind==='invoice'&&live&&steps.indexOf(row.estado_codigo)<3&&<InlineForm onSubmit={()=>void transition()}><fieldset disabled={busy||review}><label>Fecha de la siguiente etapa<input type="date" required max={todayLima()} min={(row as Invoice).fecha_aprobada??(row as Invoice).fecha_registrada_patrocinador??(row as Invoice).fecha_emision} value={date} onChange={e=>setDate(e.target.value)}/></label><button>{stepLabels[steps.indexOf(row.estado_codigo)]}</button></fieldset></InlineForm>}
 {director&&live&&!annulling&&<button type="button" className="sensitive" disabled={busy||review} onClick={()=>setAnnulling(true)}>Anular {kind==='order'?'orden':kind==='invoice'?'factura':'transferencia'}</button>}
 {director&&live&&annulling&&<BillingForm submit={()=>void annul()} busy={busy} cancel={()=>setAnnulling(false)} error="" blocked={review} submitLabel="Revisar anulación"><EditorHeading>Motivo de anulación</EditorHeading><label>Motivo obligatorio<textarea required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label></BillingForm>}
 </>}
 </section>
}
