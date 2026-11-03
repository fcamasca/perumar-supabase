import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {useSession} from '../security/SessionProvider'
import {AcademicPagination,AcademicSearch} from '../academic/AcademicLayout'
import {StatusBadge} from '../academic/AcademicUi'
import {studentSearchFilter} from '../lib/studentSearch'
import {QuickEnrollmentSearch} from './QuickEnrollmentSearch'

type Cycle={id:string;codigo_ciclo:string;estado_codigo:string;updated_at:string}
type Enrollment={id:string;codigo_matricula:string;estado_codigo:string;alumno:{id:string;codigo_alumno:string;apellido_paterno:string;apellido_materno:string;nombres:string;numero_di:string}}
export function CycleEnrollments({cycle,blocked=false,blockedMessage,onPanelChange}:{cycle:Cycle;blocked?:boolean;blockedMessage?:string;onPanelChange?:(open:boolean)=>void}) {
 const {client,state}=useSession()
 const [rows,setRows]=useState<Enrollment[]>([]),[count,setCount]=useState(0),[filter,setFilter]=useState(''),[page,setPage]=useState(0),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [panelCycle,setPanelCycle]=useState<Cycle>(),[opening,setOpening]=useState(false)
 const trigger=useRef<HTMLButtonElement>(null),epoch=useRef(0)
 const academic=state.roles?.some(r=>r==='DIRECTOR_ACADEMICO'||r==='COORDINADOR_ACADEMICO')
 const eligible=['PROGRAMADO','EN_CURSO'].includes(cycle.estado_codigo)
 useEffect(()=>{onPanelChange?.(!!panelCycle);return()=>onPanelChange?.(false)},[panelCycle,onPanelChange])
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
   <div className="filters academic-toolbar" role="search" aria-label="Filtrar alumnos matriculados"><AcademicSearch label="Filtrar matriculados" placeholder="Filtrar matriculados…" value={filter} onChange={text=>{setFilter(text);setPage(0)}}/>{academic&&eligible&&<button type="button" ref={trigger} disabled={blocked||opening||!!panelCycle} onClick={()=>void openPanel()}>{opening?'Consultando…':'+ Matricular alumno'}</button>}</div>
   {blocked&&blockedMessage!==''&&<p className="help-text">{blockedMessage??'Guarda o cancela los cambios del Ciclo antes de matricular alumnos.'}</p>}
   {!eligible&&<p className="help-text">Este Ciclo solo permite consultar sus matrículas.</p>}
   {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}{loading&&<p role="status">Cargando matriculados…</p>}
   <div className="table-scroll"><table aria-label="Alumnos matriculados en el Ciclo"><thead><tr><th>Alumno</th><th>Documento</th><th>Código de matrícula</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{!loading&&!error&&rows.map(row=><tr key={row.id}><td>{row.alumno.apellido_paterno} {row.alumno.apellido_materno}, {row.alumno.nombres}<small className="secondary-text">{row.alumno.codigo_alumno}</small></td><td>{row.alumno.numero_di}</td><td>{row.codigo_matricula}</td><td><StatusBadge value={row.estado_codigo==='ACTIVO'?'Activa':'Anulada'}/></td><td><div className="record-header-actions"><Link to={`/matriculas/${row.id}`}>Ver matrícula</Link>{academic&&eligible&&row.estado_codigo==='ACTIVO'&&<Link to={`/matriculas/${row.id}?editar=1`}>Editar matrícula</Link>}</div></td></tr>)}{!loading&&!error&&!rows.length&&<tr><td colSpan={5}>{filter?'No hay matriculados que coincidan con el filtro.':'No hay alumnos matriculados en este Ciclo.'}</td></tr>}</tbody></table></div>
   <AcademicPagination page={page} count={rows.length} disabled={loading||!!panelCycle} onChange={setPage}/>
  </div>
  {panelCycle&&<QuickEnrollmentSearch cycle={panelCycle} close={closePanel} added={code=>{setNotice(`Matrícula ${code} registrada correctamente.`);setRevision(v=>v+1)}}/>}
 </section>
}
