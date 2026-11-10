import {useEffect,useId,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Link} from 'react-router-dom'
import {useSession} from '../security/SessionProvider'
import {AcademicPagination,AcademicSearch} from '../academic/AcademicLayout'
import {StatusBadge} from '../academic/AcademicUi'
import {studentSearchFilter} from '../lib/studentSearch'
import {ChangeEnrollmentCycle} from './ChangeEnrollmentCycle'
import {QuickEnrollmentSearch} from './QuickEnrollmentSearch'

type Cycle={id:string;codigo_ciclo:string;estado_codigo:string;updated_at:string}
type Enrollment={id:string;codigo_matricula:string;estado_codigo:string;alumno:{id:string;codigo_alumno:string;apellido_paterno:string;apellido_materno:string;nombres:string;numero_di:string}}
// Row-specific disclosure: the exceptional transfer action stays out of the main buttons.
function EnrollmentMoreActions({code,disabled,onChange}:{code:string;disabled:boolean;onChange:()=>void}) {
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),item=useRef<HTMLButtonElement>(null)
 const [position,setPosition]=useState<{top:number;left:number}|null>(null)
 function open(){if(disabled)return;const rect=trigger.current!.getBoundingClientRect();setPosition({top:rect.bottom+56>window.innerHeight?Math.max(8,rect.top-48):rect.bottom+4,left:Math.max(8,Math.min(window.innerWidth-188,rect.right-180))})}
 function close(restore=false){setPosition(null);if(restore)trigger.current?.focus()}
 useEffect(()=>{
  if(!position||disabled)return
  item.current?.focus()
  const outside=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))setPosition(null)}
  const dismiss=()=>setPosition(null)
  document.addEventListener('pointerdown',outside);window.addEventListener('resize',dismiss);window.addEventListener('scroll',dismiss,true)
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true)}
 },[position,disabled])
 return <><button ref={trigger} type="button" className="secondary enrollment-more-trigger" aria-label={`Más acciones de matrícula ${code}`} title="Más acciones" aria-haspopup="menu" aria-expanded={!!position&&!disabled} aria-controls={position&&!disabled?id:undefined} disabled={disabled} onClick={()=>position?close():open()} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open()}}}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
 {position&&!disabled&&createPortal(<div ref={menu} id={id} role="menu" aria-label={`Más acciones de matrícula ${code}`} className="enrollment-actions-menu" style={position} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))close()}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true)}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();item.current?.focus()}else if(event.key==='Tab')close(true)}}><button ref={item} type="button" role="menuitem" onClick={()=>{close(true);onChange()}}>Cambiar Ciclo…</button></div>,document.body)}</>
}

export function CycleEnrollments({cycle,blocked=false,blockedMessage,onPanelChange}:{cycle:Cycle;blocked?:boolean;blockedMessage?:string;onPanelChange?:(open:boolean)=>void}) {
 const {client,state}=useSession()
 const [rows,setRows]=useState<Enrollment[]>([]),[count,setCount]=useState(0),[filter,setFilter]=useState(''),[page,setPage]=useState(0),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [panelCycle,setPanelCycle]=useState<Cycle>(),[opening,setOpening]=useState(false)
 const [changingEnrollment,setChangingEnrollment]=useState<string>()
 const trigger=useRef<HTMLButtonElement>(null),epoch=useRef(0)
 const academic=state.roles?.some(r=>r==='DIRECTOR_ACADEMICO'||r==='COORDINADOR_ACADEMICO')
 const eligible=['PROGRAMADO','EN_CURSO'].includes(cycle.estado_codigo)
 useEffect(()=>{onPanelChange?.(!!panelCycle||!!changingEnrollment);return()=>onPanelChange?.(false)},[panelCycle,changingEnrollment,onPanelChange])
 useEffect(()=>()=>{++epoch.current},[])
 useEffect(()=>{
  let active=true;setLoading(true);setError('')
  let query=client.from('matricula').select('id,codigo_matricula,estado_codigo,alumno!inner(id,codigo_alumno,apellido_paterno,apellido_materno,nombres,numero_di)',{count:'exact'}).eq('ciclo_id',cycle.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*30,page*30+29)
  if(filter.trim())query=query.or(studentSearchFilter(filter),{referencedTable:'alumno'})
  void query.then(r=>{if(!active)return;setLoading(false);if(r.error){setRows([]);setCount(0);setError('No se pudieron cargar las matrículas del Ciclo. Cambia el filtro o vuelve a abrir la ficha.')}else{setRows(r.data as unknown as Enrollment[]);setCount(r.count??0)}})
  return()=>{active=false}
 },[client,cycle.id,filter,page,revision])
 async function openPanel(){
  if(!academic||!eligible||blocked||opening)return
  const request=++epoch.current;setOpening(true);setNotice('')
  const r=await client.from('ciclo').select('id,codigo_ciclo,estado_codigo,updated_at').eq('id',cycle.id).single()
  if(request!==epoch.current)return
  setOpening(false)
  if(r.error){setNotice('No se pudo consultar el Ciclo. Vuelve a abrir la ficha.');return}
  if(!['PROGRAMADO','EN_CURSO'].includes(r.data.estado_codigo)){setNotice('El Ciclo ya no permite nuevas matrículas. Vuelve a abrir la ficha para consultar su estado.');return}
  setPanelCycle(r.data as Cycle)
 }
 function closePanel(){setPanelCycle(undefined);setTimeout(()=>trigger.current?.focus(),0)}
 return <section className="cycle-enrollments">
  <div>
   <h3>Alumnos matriculados · {count}</h3>
   <div className="filters academic-toolbar" role="search" aria-label="Filtrar alumnos matriculados"><AcademicSearch label="Filtrar matriculados" placeholder="Filtrar matriculados…" value={filter} onChange={text=>{setFilter(text);setPage(0)}}/>{academic&&eligible&&<button type="button" ref={trigger} disabled={blocked||opening||!!panelCycle||!!changingEnrollment} onClick={()=>void openPanel()}>{opening?'Consultando…':'+ Matricular alumno'}</button>}</div>
   {blocked&&blockedMessage!==''&&<p className="help-text">{blockedMessage??'Guarda o cancela los cambios del Ciclo antes de matricular alumnos.'}</p>}
   {!eligible&&<p className="help-text">Este Ciclo solo permite consultar sus matrículas.</p>}
   {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}{loading&&<p role="status">Cargando matriculados…</p>}
   <div className="table-scroll"><table aria-label="Alumnos matriculados en el Ciclo"><thead><tr><th>Alumno</th><th>Documento</th><th>Código de matrícula</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{!loading&&!error&&rows.map(row=><tr key={row.id}><td>{row.alumno.apellido_paterno} {row.alumno.apellido_materno}, {row.alumno.nombres}<small className="secondary-text">{row.alumno.codigo_alumno}</small></td><td>{row.alumno.numero_di}</td><td>{row.codigo_matricula}</td><td><StatusBadge value={row.estado_codigo==='ACTIVO'?'Activa':'Anulada'}/></td><td><div className="cycle-enrollment-actions"><Link to={`/matriculas/${row.id}`}>Ver matrícula</Link>{academic&&eligible&&row.estado_codigo==='ACTIVO'&&<><Link aria-label="Editar matrícula" to={`/matriculas/${row.id}?editar=1`}>Editar</Link><EnrollmentMoreActions code={row.codigo_matricula} disabled={blocked||opening||!!panelCycle||!!changingEnrollment} onChange={()=>setChangingEnrollment(row.id)}/></>}</div></td></tr>)}{!loading&&!error&&!rows.length&&<tr><td colSpan={5}>{filter?'No hay matriculados que coincidan con el filtro.':'No hay alumnos matriculados en este Ciclo.'}</td></tr>}</tbody></table></div>
   <nav aria-label="Páginas de matriculados">{(count>30||page>0)&&<AcademicPagination page={page} count={rows.length} disabled={loading||!!panelCycle} onChange={setPage} labels={{previous:'Página anterior',next:'Página siguiente'}}/>}</nav>
  </div>
  {changingEnrollment&&<ChangeEnrollmentCycle id={changingEnrollment} source={cycle} close={()=>setChangingEnrollment(undefined)} changed={()=>{setChangingEnrollment(undefined);setNotice('Matrícula trasladada. El código se conserva; consulta sus cargos en el Ciclo destino.');setRevision(v=>v+1)}}/>}
  {panelCycle&&<QuickEnrollmentSearch cycle={panelCycle} close={closePanel} added={code=>{setNotice(`Matrícula ${code} registrada correctamente.`);setRevision(v=>v+1)}}/>}
 </section>
}
