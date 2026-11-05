import {useEffect,useState} from 'react'
import {useSession} from '../security/SessionProvider'
import {InlineForm} from '../academic/AcademicUi'
import {formTextValue} from '../lib/formText'
import {enrollmentError} from '../lib/enrollmentError'
type Cycle={id:string;estado_codigo:string;updated_at:string}
type Tariff={id:string;codigo:string;nombre:string;tipo:string;monto_por_defecto:string;activo:boolean}
type Config=Record<string,{importe:string;obligatorio:boolean}>
export function CycleTariffs({cycle,blocked=false,onChanged,onDirtyChange,onBusyChange,onReadyChange}:{cycle:Cycle;blocked?:boolean;onChanged:(saved:Cycle)=>void;onDirtyChange:(dirty:boolean)=>void;onBusyChange:(busy:boolean)=>void;onReadyChange:(ready:boolean|null)=>void}){
 const {client,state}=useSession(),director=state.roles?.includes('DIRECTOR_ACADEMICO')
 const [tariffs,setTariffs]=useState<Tariff[]>([]),[config,setConfig]=useState<Config>({}),[baseline,setBaseline]=useState<Config>({}),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[search,setSearch]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const dirty=JSON.stringify(config)!==JSON.stringify(baseline)
 const eligible=['PROGRAMADO','EN_CURSO'].includes(cycle.estado_codigo)
 const editable=!!director&&eligible&&status==='ready'&&!blocked
 const career=tariffs.filter(t=>t.activo&&t.tipo==='CARRERA'&&config[t.id])
 const valid=career.length===1&&config[career[0].id].obligatorio
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false)},[dirty,onDirtyChange])
 useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false)},[busy,onBusyChange])
 useEffect(()=>{onReadyChange(status==='ready'?valid&&!dirty:null);return()=>onReadyChange(null)},[status,valid,dirty,onReadyChange])
 useEffect(()=>{
  let active=true;setStatus('loading')
  void Promise.all([client.from('tarifa').select('id,codigo,nombre,tipo,monto_por_defecto,activo').order('nombre'),client.from('ciclo_tarifa').select('tarifa_id,importe,obligatorio,activo').eq('ciclo_id',cycle.id)]).then(([t,c])=>{
   if(!active)return
   if(t.error||c.error){setStatus('error');setMessage('No se pudieron cargar las tarifas del Ciclo. Vuelve a abrir la ficha; no se puede guardar una configuración incompleta.');return}
   const cfg:Config={};for(const row of c.data){if(row.activo)cfg[row.tarifa_id]={importe:String(row.importe),obligatorio:row.obligatorio}}
   setTariffs(t.data as Tariff[]);setConfig(cfg);setBaseline(cfg);setStatus('ready')
  });return()=>{active=false}
 },[client,cycle.id,cycle.updated_at])
 function add(t:Tariff){if(!editable||busy||config[t.id]||!t.activo)return;setConfig({...config,[t.id]:{importe:String(t.monto_por_defecto),obligatorio:t.tipo==='CARRERA'}});setSearch('');setMessage('')}
 async function save(){
  if(!editable||busy||!dirty)return
  setBusy(true);setMessage('')
  try{const r=await client.rpc('guardar_ciclo_tarifas',{ciclo_id:cycle.id,expected_updated_at:cycle.updated_at,configuracion:Object.entries(config).map(([tarifa_id,c])=>({tarifa_id,importe:c.importe,obligatorio:String(c.obligatorio)}))});if(r.error){setMessage(enrollmentError(r.error));return}setBaseline(config);setMessage('Tarifas del Ciclo guardadas correctamente.');onChanged(r.data as Cycle)}
  catch{setMessage('Respuesta no confirmada. Consulta la configuración del Ciclo antes de reintentar.')}
  finally{setBusy(false)}
 }
 const term=search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
 const matches=term?tariffs.filter(t=>t.activo&&!config[t.id]&&`${t.codigo} ${t.nombre}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().includes(term)):[]
 return <section><h3>Tarifas del Ciclo</h3>
  {status==='loading'&&<p role="status">Cargando tarifas del Ciclo…</p>}{message&&<p role={message.includes('correctamente')?'status':'alert'}>{message}</p>}
  {status==='ready'&&<>
   <p role={!eligible||valid&&!dirty?'status':'alert'} className="help-text">{!eligible?'Configuración histórica del Ciclo: solo consulta.':dirty?'Cambios pendientes: guarda la configuración antes de matricular.':valid?'Tarifas listas para matricular.':career.length===0?'Falta asignar una tarifa de Curso activa y obligatoria para matricular.':career.length>1?'Hay más de una tarifa de Curso activa. Debe quedar exactamente una para matricular.':'La tarifa de Curso debe ser obligatoria para matricular.'}</p>
   {blocked&&<p className="help-text">Guarda o cancela los cambios de Datos del Ciclo antes de modificar tarifas.</p>}
   {!director&&<p className="help-text">Solo el Director puede configurar las tarifas.</p>}{!eligible&&<p className="help-text">Este Ciclo permite únicamente consultar tarifas.</p>}
   {director&&eligible&&<div className="cycle-subject-search"><label>Agregar tarifa del catálogo<input type="search" placeholder="Buscar por código o nombre…" value={search} disabled={!editable||busy} onChange={e=>setSearch(formTextValue(e.currentTarget))}/></label>{term&&<div className="cycle-subject-results"><ul aria-label="Tarifas disponibles">{matches.slice(0,8).map(t=><li key={t.id}><button type="button" disabled={!editable||busy} onClick={()=>add(t)}>Agregar {t.codigo} — {t.nombre}</button></li>)}</ul>{!matches.length&&<p className="help-text">No hay tarifas activas disponibles para esta búsqueda.</p>}{matches.length>8&&<p className="help-text">Se muestran 8 coincidencias. Escribe más para precisar.</p>}</div>}</div>}
   <InlineForm className="cycle-tariffs-form" onSubmit={()=>void save()}><div className="table-scroll"><table aria-label="Tarifas del Ciclo"><thead><tr><th>Tarifa</th><th>Tipo</th><th>Importe (S/)</th><th>Aplicación</th>{director&&eligible&&<th>Acción</th>}</tr></thead><tbody>{Object.entries(config).map(([id,c])=>{const t=tariffs.find(t=>t.id===id);return <tr key={id}><td>{t?`${t.codigo} — ${t.nombre}`:'Referencia no disponible'}{t&&!t.activo&&' (Inactiva)'}</td><td>{t?.tipo==='CARRERA'?'Curso':t?.tipo==='OTRO'?'Otro':'—'}</td><td>{director&&eligible?<input aria-label={`Importe de ${t?.nombre??id}`} type="number" min="0" step="0.01" required disabled={!editable||busy} value={c.importe} onChange={e=>setConfig({...config,[id]:{...c,importe:e.currentTarget.value}})}/>:Number(c.importe).toFixed(2)}</td><td>{director&&eligible?<label><input type="checkbox" aria-label={`Obligatoria ${t?.nombre??id}`} disabled={!editable||busy} checked={c.obligatorio} onChange={e=>setConfig({...config,[id]:{...c,obligatorio:e.currentTarget.checked}})}/>Obligatoria</label>:c.obligatorio?'Obligatoria':'Opcional'}</td>{director&&eligible&&<td><button type="button" className="secondary" disabled={!editable||busy} onClick={()=>setConfig(current=>{const next={...current};delete next[id];return next})}>Retirar</button></td>}</tr>})}{!Object.keys(config).length&&<tr><td colSpan={director&&eligible?5:4}>No hay tarifas asignadas al Ciclo.</td></tr>}</tbody></table></div>
    <p className="help-text">El importe se aplica solo a este Ciclo. Guardar no cambia el catálogo ni recalcula cargos de matrículas existentes. Retirar conserva la historia.</p>
    {director&&eligible&&<div className="form-actions"><button type="button" className="secondary" disabled={!dirty||busy} onClick={()=>{setConfig(baseline);setSearch('');setMessage('')}}>Cancelar cambios</button><button disabled={!editable||busy||!dirty}>Guardar tarifas del Ciclo</button></div>}
   </InlineForm>
  </>}
 </section>
}
