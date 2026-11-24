import { useCallback, useRef, useState } from 'react'
import { useSession } from '../security/SessionProvider'
import { EditorHeading } from '../academic/AcademicUi'
import { cents, decimal, pen } from '../payments/money'
import { BillingForm, DocumentFields, Pager, Selection, useRows } from './BillingUi'
import { billingError, isDefinite, maxCents, orderColumns, invoiceColumns, readRecovery, recoveryKey, reference, todayLima, type Order, type Invoice } from './contracts'
export type Kind = 'order'|'invoice'|'payment'
export type Call = (name:string,args:Record<string,unknown>)=>Promise<Record<string,unknown>|null>
type Props={company:string;busy:boolean;call:Call;saved:(kind:Kind,id:string)=>void;cancel:()=>void}
const positive=(raw:string)=>{const n=cents(raw);return n!==null&&n>0n&&n<=maxCents?n:null}
const chosen=<T extends {id:string}>(ids:string[],rows:T[])=>rows.filter(r=>ids.includes(r.id))
const readNotice=(error:string,loading:boolean)=><>{loading&&<p role="status">Consultando…</p>}{error&&<p role="alert">{error}</p>}</>

export { OrderForm } from './OrderForm'

export function InvoiceForm({company,busy,call,saved,cancel}:Props){
 const {client}=useSession()
 const [page,setPage]=useState(0),[selected,setSelected]=useState<string[]>([]),[manual,setManual]=useState(false),[confirmed,setConfirmed]=useState(false)
 const [draft,setDraft]=useState<Record<string,string>>({serie:'',correlativo:'',fecha_emision:todayLima(),fecha_vencimiento:todayLima(),importe:'',observacion:''})
 const [error,setError]=useState(''),[review,setReview]=useState(false)
 const list=useRows<Order>(useCallback(()=>client.from('orden_servicio_resumen').select(orderColumns).eq('empresa_patrocinadora_id',company).eq('estado_codigo','VIGENTE').order('fecha',{ascending:false}).order('id').range(page*30,page*30+29),[client,company,page]))
 const rows=chosen(selected,list.rows),sum=rows.reduce((n,r)=>n+(cents(r.monto)??0n),0n),amount=cents(draft.importe),different=amount!==null&&amount!==sum
 function select(ids:string[]){setSelected(ids);setConfirmed(false);if(!manual)setDraft(d=>({...d,importe:decimal(chosen(ids,list.rows).reduce((n,r)=>n+(cents(r.monto)??0n),0n))}))}
 async function submit(){
  if(busy||review||!list.ready)return
  if(!rows.length||rows.length!==selected.length||positive(draft.importe)===null){setError('Selecciona órdenes vigentes e indica un importe positivo de hasta dos decimales.');return}
  if(different&&!confirmed){setError('Confirma explícitamente la diferencia para registrar este importe.');return}
  try{
   const r=await call('registrar_factura_patrocinador',{p:{...draft,serie:draft.serie.trim().toUpperCase(),correlativo:draft.correlativo.trim(),observacion:draft.observacion.trim()||null,empresa_patrocinadora_id:company,confirmar_diferencia:different&&confirmed?'true':'false',ordenes:rows.map(r=>({id:r.id,expected_updated_at:r.updated_at}))}})
   if(r)saved('invoice',String(r.id))
  }catch(e){setError(billingError(e));setReview(true);setConfirmed(false)}
 }
 return <section><EditorHeading>Nueva factura</EditorHeading><BillingForm submit={()=>void submit()} busy={busy} cancel={cancel} error={error} blocked={review||!list.ready}>
 {readNotice(list.error,list.loading)}{list.ready&&<Selection rows={list.rows} selected={selected} change={select} label="órdenes de servicio" name={reference}>{r=><>{reference(r)} · {pen(r.monto)}</>}</Selection>}
 <Pager page={page} count={list.rows.length} disabled={list.loading} onChange={n=>{setPage(n);select([])}}/>
 <p>Total referencial OS: <strong>{pen(sum)}</strong></p>
 <DocumentFields invoice draft={draft} change={(key,value)=>{setDraft(d=>({...d,[key]:value}));setConfirmed(false);if(key==='importe')setManual(true)}}/>
 {different&&<div className="billing-difference" role="status"><p>El importe de la factura difiere del total de las órdenes seleccionadas.</p><dl><div><dt>Total OS</dt><dd>{pen(sum)}</dd></div><div><dt>Importe factura</dt><dd>{pen(amount!)}</dd></div><div><dt>Diferencia</dt><dd>{amount!<sum?'−':'+'}{pen(amount!<sum?sum-amount!:amount!-sum)}</dd></div></dl><label className="billing-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirmo registrar la factura con esta diferencia</label></div>}
 <p>Las órdenes son el detalle comercial. El importe no se reparte entre órdenes o alumnos.</p>
 <button type="button" className="secondary" onClick={()=>{list.reload();setReview(false);setConfirmed(false);setError('')}}>Volver a consultar órdenes</button>
 </BillingForm></section>
}

export function TransferForm({company,busy,call,saved,cancel}:Props){
 const {client,state}=useSession(),user=state.userId??''
 const [page,setPage]=useState(0),[selected,setSelected]=useState<string[]>([]),[amounts,setAmounts]=useState<Record<string,string>>({})
 const [bank,setBank]=useState(''),[date,setDate]=useState(todayLima()),[referenceOp,setReference]=useState(''),[notes,setNotes]=useState('')
 const [error,setError]=useState(''),[review,setReview]=useState(false),[consulting,setConsulting]=useState(false)
 const [pending,setPending]=useState<string|null>(()=>{try{return readRecovery(user,company)}catch{return 'unavailable'}})
 const flight=useRef(false),attempt=useRef<Record<string,unknown>|null>(null)
 const uncertain=useRef(!!pending)
 const [lookedUp,setLookedUp]=useState(false)
 const [reconstructing,setReconstructing]=useState(false),[confirmedReconstruction,setConfirmedReconstruction]=useState(false)
 const list=useRows<Invoice>(useCallback(()=>client.from('factura_patrocinador_saldo').select(invoiceColumns).eq('empresa_patrocinadora_id',company).eq('estado_codigo','PENDIENTE_DESEMBOLSO').is('anulado_at',null).gt('pendiente',0).order('fecha_emision').order('id').range(page*30,page*30+29),[client,company,page]))
 const rows=chosen(selected,list.rows),total=rows.reduce((n,r)=>n+(cents(amounts[r.id]??'')??0n),0n)
 async function consult(){
  if(busy||flight.current||consulting||pending==='unavailable'||!pending)return
  setConsulting(true);setLookedUp(false)
  try{
   const r=await client.from('pago_patrocinador').select('id').eq('empresa_patrocinadora_id',company).eq('idempotency_key',pending).maybeSingle()
   if(r.error)throw r.error
   if(!r.data){setLookedUp(true);setError('Todavía no se encontró un pago con esa referencia. El resultado sigue sin confirmar; no se generará otra clave ni se reenviará el pago automáticamente.');return}
   sessionStorage.removeItem(recoveryKey(user,company));setPending(null);uncertain.current=false;attempt.current=null;setReconstructing(false);saved('payment',r.data.id)
  }catch{setError('No se pudo confirmar el resultado. La referencia se conserva; no se reenvió el pago.')}
  finally{setConsulting(false)}
 }
 async function submit(){
  if(busy||flight.current||review||(pending&&!reconstructing)||!list.ready)return
  if(reconstructing&&(!pending||!confirmedReconstruction)){setError('Confirma que los datos corresponden al mismo intento original.');return}
  if(!rows.length||rows.length!==selected.length||!bank.trim()||!date||date>todayLima()||total<=0n||total>maxCents){setError('Selecciona facturas, banco, fecha válida e importes positivos dentro del límite permitido.');return}
  const invalid=rows.find(r=>positive(amounts[r.id]??'')===null||(cents(amounts[r.id])??0n)>(cents(r.pendiente)??0n)||date<r.fecha_emision)
  if(invalid){setError('Revisa la fecha e importes: hasta dos decimales, sin superar el pendiente ni preceder la emisión de ninguna factura.');return}
  flight.current=true
  const key=pending??crypto.randomUUID(),payload={empresa_patrocinadora_id:company,idempotency_key:key,importe:decimal(total),fecha_efectiva:date,banco:bank.trim(),referencia_operacion:referenceOp.trim()||null,observacion:notes.trim()||null,aplicaciones:rows.map(r=>({factura_id:r.id,importe:decimal(cents(amounts[r.id])!),expected_updated_at:r.updated_at}))}
  if(pending)uncertain.current=true
  try{sessionStorage.setItem(recoveryKey(user,company),key);setPending(key)}
  catch{setError('No se pudo conservar la referencia de recuperación. La transferencia no fue enviada.');flight.current=false;return}
  attempt.current=payload;setLookedUp(false);setReconstructing(false);setConfirmedReconstruction(false)
  await sendAttempt(payload)
 }
 async function sendAttempt(payload:Record<string,unknown>){
  try{
   const r=await call('registrar_pago_patrocinador',{p:payload})
   if(r){sessionStorage.removeItem(recoveryKey(user,company));setPending(null);uncertain.current=false;attempt.current=null;saved('payment',String(r.id))}
  }catch(e){
   setError(billingError(e))
   // A failure of this retry says nothing about an older, uncertain request.
   // Keep its identity until an authoritative lookup or same-key success resolves it.
   if(isDefinite(e)&&!uncertain.current&&(e as {message?:string})?.message!=='H7_IDEMPOTENCY_CONFLICT'){
    try{sessionStorage.removeItem(recoveryKey(user,company));setPending(null);setReview(true)}catch{/* Keep blocked if reference cannot be cleared. */}
   }else{uncertain.current=true;setReview(true)}
  }finally{flight.current=false}
 }
 return <section><EditorHeading>Registrar transferencia</EditorHeading><p>Transferencia bancaria</p>
 {pending&&<div className="billing-notice"><p role="status">Existe un intento sin confirmar. Se conserva la referencia para evitar duplicados.</p><button type="button" disabled={busy||consulting||pending==='unavailable'} onClick={()=>void consult()}>Consultar resultado del intento</button>{lookedUp&&attempt.current&&!reconstructing&&<button type="button" className="secondary" disabled={busy||consulting} onClick={()=>{if(flight.current)return;flight.current=true;setLookedUp(false);void sendAttempt(attempt.current!)}}>Reenviar el mismo intento con la misma clave</button>}{lookedUp&&!reconstructing&&<button type="button" className="secondary" disabled={busy||consulting} onClick={()=>{setReconstructing(true);setConfirmedReconstruction(false);setReview(false);setError('');list.reload()}}>Revisar el mismo intento con la misma clave</button>}{pending==='unavailable'&&<p role="alert">No se pudo leer la referencia de recuperación. Consulta el historial antes de operar.</p>}</div>}
 <BillingForm submit={()=>void submit()} busy={busy||(!!pending&&!reconstructing)||consulting} cancel={cancel} error={error} blocked={review||!list.ready}>
 {reconstructing&&<div className="billing-notice"><p role="status">Introduce los datos originales del intento. Se conserva la misma clave; si el pago ya existe, no se creará otro. Una diferencia será rechazada por el servidor.</p><label className="billing-check"><input type="checkbox" checked={confirmedReconstruction} onChange={e=>setConfirmedReconstruction(e.target.checked)}/>Confirmo que estos datos corresponden al mismo intento original</label></div>}
 {readNotice(list.error,list.loading)}{list.ready&&<Selection rows={list.rows} selected={selected} change={ids=>{setSelected(ids);setConfirmedReconstruction(false)}} label="facturas pendientes" name={reference}>{r=><><strong>{reference(r)}</strong><p>Importe {pen(r.importe)} · Abonado {pen(r.abonado)} · Pendiente {pen(r.pendiente)}</p><label>Aplicar a {reference(r)} (S/)<input type="text" inputMode="decimal" value={amounts[r.id]??''} aria-invalid={selected.includes(r.id)&&amounts[r.id]!==undefined&&(positive(amounts[r.id])===null||(cents(amounts[r.id])??0n)>(cents(r.pendiente)??0n))} onChange={e=>{setAmounts(a=>({...a,[r.id]:e.target.value}));setConfirmedReconstruction(false)}}/></label></>}</Selection>}
 <Pager page={page} count={list.rows.length} disabled={list.loading} onChange={n=>{setPage(n);setSelected([]);setConfirmedReconstruction(false)}}/>
 <p>Total de la transferencia: <strong>{pen(total)}</strong></p>
 <div className="billing-fields"><label>Banco<input required maxLength={150} value={bank} onChange={e=>{setBank(e.target.value);setConfirmedReconstruction(false)}}/></label><label>Fecha efectiva<input type="date" required max={todayLima()} value={date} onChange={e=>{setDate(e.target.value);setConfirmedReconstruction(false)}}/></label><label>Referencia de operación (opcional)<input maxLength={150} value={referenceOp} onChange={e=>{setReference(e.target.value);setConfirmedReconstruction(false)}}/></label><label>Observación (opcional)<textarea maxLength={500} value={notes} onChange={e=>{setNotes(e.target.value);setConfirmedReconstruction(false)}}/></label></div>
 <button type="button" className="secondary" onClick={()=>{list.reload();setReview(false);setError('')}}>Volver a consultar facturas</button>
 </BillingForm>{pending&&<button type="button" className="secondary" disabled={busy||consulting} onClick={cancel}>Volver sin reenviar</button>}</section>
}
