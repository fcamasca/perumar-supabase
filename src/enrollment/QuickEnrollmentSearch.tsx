import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {useSession} from '../security/SessionProvider'
import {formTextValue} from '../lib/formText'
import {studentSearchFilter} from '../lib/studentSearch'
import {EnrollmentDrawer} from './EnrollmentDrawer'
import {enrollmentError} from '../lib/enrollmentError'

type Cycle={id:string;codigo_ciclo:string;estado_codigo:string;updated_at:string}
type Pupil={id:string;codigo_alumno:string;apellido_paterno:string;apellido_materno:string;nombres:string;numero_di:string}
export function QuickEnrollmentSearch({cycle,close,added}:{cycle:Cycle;close:()=>void;added:(code:string)=>void}) {
 const {client}=useSession()
 const [search,setSearch]=useState(''),[found,setFound]=useState<Pupil[]>([]),[status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle'),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[failed,setFailed]=useState<Pupil>(),[uncertain,setUncertain]=useState('')
 const registered=useRef(new Set<string>()),searchInput=useRef<HTMLInputElement>(null)
 useEffect(()=>{
  let active=true;setFound([])
  if(search.trim().length<2){setStatus('idle');return}
  setStatus('loading')
  const timer=setTimeout(()=>{void (async()=>{
   try{
    const r=await client.from('alumno').select('id,codigo_alumno,apellido_paterno,apellido_materno,nombres,numero_di').or(studentSearchFilter(search)).order('apellido_paterno').order('nombres').limit(20)
    if(!active)return
    if(r.error)throw new Error()
    const pupils=r.data as Pupil[]
    const existing=pupils.length?await client.from('matricula').select('alumno_id').eq('ciclo_id',cycle.id).in('alumno_id',pupils.map(p=>p.id)):{data:[],error:null}
    if(!active)return
    if(existing.error)throw new Error()
    const enrolled=new Set(existing.data.map(row=>String(row.alumno_id)))
    setFound(pupils.filter(p=>!enrolled.has(p.id)&&!registered.current.has(p.id)));setStatus('ready')
   }catch{if(active){setFound([]);setStatus('error')}}
  })()},300)
  return()=>{active=false;clearTimeout(timer)}
 },[client,cycle.id,search])
 async function add(pupil:Pupil){
  if(busy||registered.current.has(pupil.id)||uncertain===pupil.id)return
  setBusy(pupil.id);setFailed(undefined);setMessage('')
  let submitted=false
  try{
   const [c,a]=await Promise.all([client.from('ciclo').select('id,estado_codigo,updated_at').eq('id',cycle.id).single(),client.from('alumno').select('id,updated_at').eq('id',pupil.id).single()])
   if(c.error||a.error){setMessage('No se pudo consultar el Ciclo o Alumno. Cambia la búsqueda y vuelve a revisar.');return}
   if(!['PROGRAMADO','EN_CURSO'].includes(c.data.estado_codigo)){setMessage('El Ciclo ya no permite matrículas. Cierra el buscador y revisa su estado.');return}
   submitted=true
   const r=await client.rpc('registrar_matricula',{p:{ciclo_id:cycle.id,expected_ciclo_updated_at:c.data.updated_at,alumno_id:pupil.id,expected_alumno_updated_at:a.data.updated_at,empresa_patrocinadora_id:null},opcionales:[]})
   if(r.error){if(!/^[0-9A-Z]{5}$/.test(r.error.code??'')){setUncertain(pupil.id);setMessage('Respuesta no confirmada. Cierra el buscador y consulta la grilla antes de volver a agregar este Alumno.')}else{setMessage(enrollmentError(r.error));setFailed(pupil)}return}
   registered.current.add(pupil.id);setFound(rows=>rows.filter(row=>row.id!==pupil.id));setMessage(`Matrícula ${String(r.data.codigo_matricula)} registrada.`);added(String(r.data.codigo_matricula));setTimeout(()=>searchInput.current?.focus(),0)
  }catch{if(submitted){setUncertain(pupil.id);setMessage('Respuesta no confirmada. Cierra el buscador y consulta la grilla antes de volver a agregar este Alumno.')}else setMessage('No se pudo consultar el Alumno. Revisa la conexión antes de volver a intentar.')}
  finally{setBusy('')}
 }
 const returnCycle=encodeURIComponent(cycle.id)
 return <EnrollmentDrawer title={`Agregar alumnos a ${cycle.codigo_ciclo}`} busy={!!busy} close={close}>
  <label>Buscar Alumno<input ref={searchInput} type="search" maxLength={150} value={search} disabled={!!busy} placeholder="Apellidos, nombres o número de documento" onChange={e=>setSearch(formTextValue(e.currentTarget))}/></label>
  <small>Agregar registra la matrícula con los cargos obligatorios. Los demás datos se completan desde Editar matrícula.</small>
  {message&&<p role={message.startsWith('Matrícula ')?'status':'alert'}>{message}</p>}
  {failed&&<p><Link to={`/alumnos/${failed.id}?editar=1&ciclo=${returnCycle}`} onClick={close}>Completar ficha de {failed.apellido_paterno} {failed.nombres}</Link></p>}
  {status==='idle'&&<p className="help-text">Escribe al menos 2 caracteres.</p>}{status==='loading'&&<p role="status">Buscando alumnos…</p>}{status==='error'&&<p role="alert">No se pudo buscar alumnos. Modifica la búsqueda para consultar de nuevo.</p>}
  {status==='ready'&&<div className="table-scroll enrollment-search-results"><table aria-label="Resultados para agregar"><thead><tr><th scope="col">Alumno</th><th scope="col">DI</th><th scope="col">Acciones</th></tr></thead><tbody>{found.map(p=><tr key={p.id}><td><strong>{p.apellido_paterno} {p.apellido_materno}, {p.nombres}</strong></td><td>{p.numero_di}</td><td><button type="button" disabled={!!busy||uncertain===p.id} onClick={()=>void add(p)}>{busy===p.id?'Agregando…':'Agregar'}</button></td></tr>)}{!found.length&&<tr><td colSpan={3}>No hay alumnos disponibles para esta búsqueda.</td></tr>}</tbody></table></div>}
  <Link className="back-link" to={`/alumnos/nuevo?ciclo=${returnCycle}`} aria-disabled={!!busy} tabIndex={busy?-1:undefined} onClick={event=>{if(busy)event.preventDefault();else close()}}>Registrar nuevo Alumno</Link>
 </EnrollmentDrawer>
}
