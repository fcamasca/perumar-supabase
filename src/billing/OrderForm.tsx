import { useCallback, useId, useRef, useState } from 'react'
import { useSession } from '../security/SessionProvider'
import { EditorHeading } from '../academic/AcademicUi'
import { cents, pen } from '../payments/money'
import { BillingForm, Pager, useRows } from './BillingUi'
import { billingError, maxCents, todayLima } from './contracts'
import type { Call, Kind } from './BillingForms'

type CycleBalance = { id:string; codigo_ciclo:string; anio:number; curso_nombre:string; capitania_nombre:string; updated_at:string; total_matriculas:string; cubierto_os:string; saldo_por_cubrir:string; matriculas_activas:number }
type Student = { matricula_id:string; codigo_matricula:string; apellido_paterno:string; apellido_materno:string; nombres:string; base:string }
const cycleColumns='id,codigo_ciclo,anio,curso_nombre,capitania_nombre,updated_at,total_matriculas::text,cubierto_os::text,saldo_por_cubrir::text,matriculas_activas'

export function OrderForm({company,busy,call,saved,cancel}:{company:string;busy:boolean;call:Call;saved:(kind:Kind,id:string)=>void;cancel:()=>void}) {
 const {client}=useSession(), flight=useRef(false), amountHint=useId()
 const [cycle,setCycle]=useState(''),[page,setPage]=useState(0),[review,setReview]=useState(false),[error,setError]=useState('')
 const [draft,setDraft]=useState({serie:'',correlativo:'',fecha:todayLima(),monto:'',observacion:''})
 const cycles=useRows<CycleBalance>(useCallback(async()=>{
  const all:CycleBalance[]=[]
  for(let offset=0;;offset+=200){
   const r=await client.from('ciclo_orden_servicio_saldo').select(cycleColumns).eq('empresa_patrocinadora_id',company).in('estado_codigo',['PROGRAMADO','EN_CURSO','CERRADO']).gt('saldo_por_cubrir',0).order('codigo_ciclo').order('id').range(offset,offset+199)
   if(r.error)return {data:null,error:r.error}
   all.push(...r.data as CycleBalance[])
   if(r.data.length<200)return {data:all,error:null}
  }
 },[client,company]))
 const selected=cycles.rows.find(c=>c.id===cycle)
 const roster=useRows<Student>(useCallback(()=>cycle?client.from('matricula_pago_listado').select('matricula_id,codigo_matricula,apellido_paterno,apellido_materno,nombres,base::text').eq('ciclo_id',cycle).eq('matricula_estado','ACTIVO').order('apellido_paterno').order('apellido_materno').order('nombres').order('matricula_id').range(page*30,page*30+29):Promise.resolve({data:[],error:null}),[client,cycle,page]))
 const remaining=selected?cents(String(selected.saldo_por_cubrir)):null
 const subtotal=roster.rows.reduce<bigint|null>((sum,s)=>{const amount=cents(String(s.base));return sum===null||amount===null?null:sum+amount},0n)
 const change=(key:keyof typeof draft,value:string)=>setDraft(d=>({...d,[key]:value}))
 async function submit(){
  if(busy||flight.current||review||!cycles.ready||!selected)return
  const amount=cents(draft.monto)
  if(amount===null||amount<=0n||amount>maxCents||remaining===null||amount>remaining){setError('Indica un monto positivo, con hasta dos decimales, que no supere el saldo por cubrir.');return}
  flight.current=true
  try {
   const r=await call('registrar_orden_servicio',{p:{...draft,serie:draft.serie.trim().toUpperCase(),correlativo:draft.correlativo.trim(),observacion:draft.observacion.trim()||null,empresa_patrocinadora_id:company,ciclo_id:selected.id,expected_ciclo_updated_at:selected.updated_at}})
   if(r)saved('order',String(r.id))
  }catch(e){setError(billingError(e));setReview(true)}finally{flight.current=false}
 }
 return <section className="order-form"><EditorHeading>Nueva orden de servicio</EditorHeading>
 <p>La orden incluye a todos los alumnos con matrícula activa del Ciclo. El monto cubre parte o todo el saldo disponible.</p>
 <BillingForm submit={()=>void submit()} busy={busy} cancel={cancel} cancelLabel="Cancelar" submitLabel="Guardar orden de servicio" error={error} blocked={review||!cycles.ready||!selected}>
  <label>Ciclo<select required disabled={cycles.loading} value={cycle} onChange={e=>{setCycle(e.target.value);setPage(0);setError('')}}><option value="">Seleccionar Ciclo</option>{cycle&&!selected&&<option value={cycle}>Ciclo no disponible; actualiza y selecciona otro</option>}{cycles.rows.map(c=><option key={c.id} value={c.id}>{c.codigo_ciclo} · {c.curso_nombre}</option>)}</select></label>
  {cycles.loading&&<p role="status">Consultando Ciclos con saldo por cubrir…</p>}{cycles.error&&<p role="alert">{cycles.error}</p>}
  {cycles.ready&&!cycles.rows.length&&<p>No hay Ciclos de esta empresa con saldo por cubrir.</p>}
  {selected&&<>
   <dl className="order-context"><div><dt>Curso</dt><dd>{selected.curso_nombre}</dd></div><div><dt>Año</dt><dd>{selected.anio}</dd></div><div><dt>Capitanía</dt><dd>{selected.capitania_nombre}</dd></div></dl>
   <dl className="order-totals"><div><dt>Total de matrículas</dt><dd>{pen(selected.total_matriculas)}</dd></div><div><dt>Cubierto por OS vigentes</dt><dd>{pen(selected.cubierto_os)}</dd></div><div><dt>Saldo por cubrir</dt><dd>{pen(selected.saldo_por_cubrir)}</dd></div></dl>
  </>}
  <div className="order-fields">
   <label>Serie<input required maxLength={20} pattern="[a-zA-Z0-9]{1,20}" value={draft.serie} onChange={e=>change('serie',e.target.value)}/></label>
   <label>Correlativo<input required inputMode="numeric" maxLength={20} pattern="[0-9]{1,20}" value={draft.correlativo} onChange={e=>change('correlativo',e.target.value)}/></label>
   <label>Fecha<input required type="date" value={draft.fecha} onChange={e=>change('fecha',e.target.value)}/></label>
   <div><label>Monto (S/)<input required inputMode="decimal" aria-describedby={amountHint} value={draft.monto} onChange={e=>change('monto',e.target.value)}/></label><small id={amountHint}>{selected?`Saldo disponible: ${pen(selected.saldo_por_cubrir)}`:'Selecciona un Ciclo para consultar el saldo.'}</small></div>
  </div>
  {selected&&<section className="order-roster" aria-label="Alumnos incluidos en la orden"><h4>Alumnos del Ciclo · {selected.matriculas_activas}</h4><p className="help-text">Lista referencial. Se incluyen todos, también los de otras páginas. No se distribuye el monto de la OS por alumno.</p>
   {roster.loading&&<p role="status">Consultando alumnos…</p>}{roster.error&&<p role="alert">{roster.error}</p>}
   {roster.ready&&<div className="table-scroll"><table aria-label="Alumnos del Ciclo"><thead><tr><th>Alumno</th><th>Matrícula</th><th>Total matrícula</th></tr></thead><tbody>{roster.rows.map(s=><tr key={s.matricula_id}><td>{s.apellido_paterno} {s.apellido_materno}, {s.nombres}</td><td>{s.codigo_matricula}</td><td className="billing-money">{pen(s.base)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>{selected.matriculas_activas>30?'Subtotal de esta página':'Subtotal'}</th><td className="billing-money">{subtotal===null?'No disponible':pen(subtotal)}</td></tr></tfoot></table></div>}
   {(page>0||roster.rows.length===30)&&<Pager page={page} count={roster.rows.length} disabled={roster.loading} onChange={setPage}/>}
  </section>}
  <label className="order-observation">Observación (opcional)<textarea rows={3} maxLength={500} value={draft.observacion} onChange={e=>change('observacion',e.target.value)}/></label>
  <button type="button" className="secondary" disabled={cycles.loading||roster.loading} onClick={()=>{cycles.reload();roster.reload();setReview(false);setError('')}}>Actualizar datos del Ciclo</button>
 </BillingForm></section>
}
