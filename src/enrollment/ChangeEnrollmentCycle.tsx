import {useEffect,useState} from 'react'
import {useSession} from '../security/SessionProvider'
import {InlineForm} from '../academic/AcademicUi'
import {EnrollmentDrawer} from './EnrollmentDrawer'
import {enrollmentError} from '../lib/enrollmentError'
type Cycle={id:string;codigo_ciclo:string;estado_codigo:string;updated_at:string}
type Enrollment={id:string;codigo_matricula:string;updated_at:string;ciclo_id:string;estado_codigo:string}
export function ChangeEnrollmentCycle({id,source,close,changed}:{id:string;source:Cycle;close:()=>void;changed:()=>void}){
 const {client}=useSession()
 const [enrollment,setEnrollment]=useState<Enrollment>(),[cycles,setCycles]=useState<Cycle[]>([]),[destination,setDestination]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('Cargando matrícula y Ciclos…')
 useEffect(()=>{let active=true;void (async()=>{
  try{
   const [m,c]=await Promise.all([client.from('matricula').select('id,codigo_matricula,updated_at,ciclo_id,estado_codigo').eq('id',id).single(),client.from('ciclo').select('id,codigo_ciclo,estado_codigo,updated_at').in('estado_codigo',['PROGRAMADO','EN_CURSO']).order('codigo_ciclo')])
   if(!active)return
   if(m.error||c.error){setMessage('No se pudo cargar la matrícula o los Ciclos. Cierra y vuelve a abrir.');return}
   const current=m.data as Enrollment
   if(current.ciclo_id!==source.id||current.estado_codigo!=='ACTIVO'){setMessage('La matrícula cambió o ya no está activa. Cierra y revisa la grilla.');return}
   setEnrollment(current);setCycles((c.data as Cycle[]).filter(x=>x.id!==source.id));setMessage('')
  }catch{if(active)setMessage('No se pudo consultar la matrícula. Cierra y vuelve a abrir.')}
 })();return()=>{active=false}},[client,id,source.id])
 async function confirm(){
  const target=cycles.find(c=>c.id===destination)
  if(!enrollment||!target||busy)return
  setBusy(true);setMessage('')
  try{
   const r=await client.rpc('editar_matricula',{p:{id:enrollment.id,expected_updated_at:enrollment.updated_at,ciclo_id:target.id,expected_ciclo_updated_at:target.updated_at},opcionales:[]})
   if(r.error){if(!/^[0-9A-Z]{5}$/.test(r.error.code??'')){setEnrollment(undefined);setMessage('Respuesta no confirmada. Cierra y consulta la matrícula antes de intentar otro cambio.')}else setMessage(enrollmentError(r.error));return}
   changed()
  }catch{setEnrollment(undefined);setMessage('Respuesta no confirmada. Cierra y consulta la matrícula antes de intentar otro cambio.')}
  finally{setBusy(false)}
 }
 return <EnrollmentDrawer title="Cambiar Ciclo de matrícula" busy={busy} close={close}>
  <p><strong>{enrollment?.codigo_matricula}</strong></p><p>Ciclo actual: <strong>{source.codigo_ciclo}</strong></p>
  {message&&<p role="alert">{message}</p>}{enrollment&&!cycles.length&&<p>No hay otros Ciclos Programados o En curso disponibles.</p>}
  <InlineForm onSubmit={()=>void confirm()}><fieldset disabled={busy||!enrollment}><label>Ciclo destino<select required value={destination} onChange={e=>setDestination(e.currentTarget.value)}><option value="">Seleccionar</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.codigo_ciclo}</option>)}</select></label>
  <p>Se crearán los cargos obligatorios del Ciclo destino y se reiniciará el descuento. Los cargos anteriores quedarán en el historial. El código de matrícula se conserva.</p><p className="help-text">Los conceptos opcionales se pueden seleccionar después desde Editar matrícula, en Cargos.</p></fieldset>
  <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={close}>Cancelar</button><button disabled={busy||!enrollment||!destination}>{busy?'Cambiando…':'Confirmar cambio de Ciclo'}</button></div></InlineForm>
 </EnrollmentDrawer>
}
