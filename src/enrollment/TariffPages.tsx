import {useEffect,useRef,useState} from 'react'
import {useSession} from '../security/SessionProvider'
import {AcademicAction,AcademicPagination,AcademicRecordHeader,AcademicSearch} from '../academic/AcademicLayout'
import {InlineForm,StatusBadge,useConfirmation} from '../academic/AcademicUi'
import {formTextValue} from '../lib/formText'
import {enrollmentError} from '../lib/enrollmentError'
type Row={id:string;updated_at:string;codigo:string;nombre:string;descripcion:string|null;tipo:string;monto_por_defecto:string;activo:boolean}
type Cycle={id:string;codigo_ciclo:string;estado_codigo:string;updated_at:string}
type Draft={codigo:string;nombre:string;descripcion:string;tipo:string;monto_por_defecto:string}
const blank:Draft={codigo:'',nombre:'',descripcion:'',tipo:'OTRO',monto_por_defecto:'0'}
export function Tariffs(){
 const {client,state}=useSession(),director=state.roles?.includes('DIRECTOR_ACADEMICO')
 const [rows,setRows]=useState<Row[]>([]),[search,setSearch]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(0),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const [selected,setSelected]=useState<Row>(),[draft,setDraft]=useState<Draft>(blank),[mode,setMode]=useState<'view'|'edit'|'new'|null>(null),[cycleView,setCycleView]=useState(false)
 const previous=useRef(false),{ask,dialog}=useConfirmation(busy)
 useEffect(()=>{const open=!!mode||cycleView;if(previous.current&&!open)(document.querySelector<HTMLElement>('[data-create="Tarifas"]:not(:disabled)')??document.querySelector<HTMLElement>('[role=search] input'))?.focus();previous.current=open},[mode,cycleView])
 useEffect(()=>{
  let active=true;setLoading(true);setLoadError(false)
  let query=client.from('tarifa').select('id,codigo,nombre,descripcion,tipo,monto_por_defecto,activo,updated_at').order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*30,page*30+29)
  if(search.trim()){const pattern=JSON.stringify(`%${search.trim()}%`);query=query.or(`codigo.ilike.${pattern},nombre.ilike.${pattern}`)}
  if(status)query=query.eq('activo',status==='active')
  void query.then(r=>{if(!active)return;setLoading(false);setLoadError(!!r.error);setRows(r.error?[]:r.data as Row[]);if(r.error)setMessage('No se pudieron cargar las tarifas.');else setMessage(current=>current==='No se pudieron cargar las tarifas.'?'':current)})
  return()=>{active=false}
 },[client,search,status,page,revision])
 function open(row?:Row,edit=false){setSelected(row);setDraft(row?{codigo:row.codigo,nombre:row.nombre,descripcion:row.descripcion??'',tipo:row.tipo,monto_por_defecto:String(row.monto_por_defecto)}:blank);setMode(row?edit&&director?'edit':'view':'new');setMessage('')}
 async function save(){
  if(!director||mode==='view')return
  setBusy(true);setMessage('')
  try{const r=await client.rpc('guardar_tarifa',{p:{...draft,descripcion:draft.descripcion||null,...(selected?{id:selected.id,expected_updated_at:selected.updated_at}:{})}});if(r.error){setMessage(enrollmentError(r.error));return}setMode(null);setRevision(v=>v+1);setMessage('Tarifa guardada correctamente.')}
  catch{setMessage('No se confirmó el guardado. Consulta la grilla antes de reintentar.')}
  finally{setBusy(false)}
 }
 async function activate(row:Row){
  if(!director)return
  if(await ask({title:row.activo?'Inactivar tarifa':'Activar tarifa',description:`${row.codigo} — ${row.nombre}. Se conservan los cargos históricos; este cambio no recalcula matrículas existentes.`,confirmLabel:row.activo?'Inactivar':'Activar',sensitive:row.activo})===null)return
  setBusy(true);const r=await client.rpc('cambiar_activo_tarifa',{id:row.id,expected_updated_at:row.updated_at,activo:!row.activo});setBusy(false);setMessage(r.error?enrollmentError(r.error):'Estado de tarifa actualizado.');if(!r.error)setRevision(v=>v+1)
 }
 if(cycleView)return <CycleTariffs back={()=>{setCycleView(false);setMessage('')}}/>
 const readOnly=mode==='view'||!director
 if(mode)return <section className="academic-record tariff-record">{dialog}<AcademicRecordHeader title={selected?'Ficha de Tarifa':'Nueva tarifa'} name={selected?`${selected.codigo} — ${selected.nombre}`:undefined} status={selected&&<StatusBadge value={selected.activo?'Activo':'Inactivo'}/>} editing={!readOnly} busy={busy} backLabel="Volver a tarifas" editLabel="Editar tarifa" onBack={()=>setMode(null)} onEdit={readOnly&&director?()=>setMode('edit'):undefined}/>{message&&<p role="alert">{message}</p>}
  <InlineForm onSubmit={()=>void save()}><fieldset className="academic-fields" disabled={busy}><legend>Datos de tarifa</legend>
   <label>Código tarifa{!readOnly&&' *'}<input aria-label="Código tarifa" readOnly={readOnly} required={!readOnly} maxLength={30} value={draft.codigo} onChange={e=>setDraft({...draft,codigo:formTextValue(e.currentTarget)})}/></label>
   <label>Nombre tarifa{!readOnly&&' *'}<input aria-label="Nombre tarifa" readOnly={readOnly} required={!readOnly} maxLength={150} value={draft.nombre} onChange={e=>setDraft({...draft,nombre:formTextValue(e.currentTarget)})}/></label>
   <label>Tipo{readOnly?<input aria-label="Tipo" readOnly value={draft.tipo}/>:<select aria-label="Tipo" value={draft.tipo} onChange={e=>setDraft({...draft,tipo:e.currentTarget.value})}><option>CARRERA</option><option>OTRO</option></select>}</label>
   <label>Monto por defecto (S/){!readOnly&&' *'}<input aria-label="Monto por defecto (S/)" type={readOnly?'text':'number'} readOnly={readOnly} required={!readOnly} min="0" step="0.01" value={draft.monto_por_defecto} onChange={e=>setDraft({...draft,monto_por_defecto:e.currentTarget.value})}/></label>
   <label>Descripción<textarea aria-label="Descripción" rows={2} readOnly={readOnly} maxLength={500} value={draft.descripcion} onChange={e=>setDraft({...draft,descripcion:formTextValue(e.currentTarget)})}/></label>
  </fieldset>{!readOnly&&<div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>selected?open(selected):setMode(null)}>Cancelar</button><button disabled={busy}>Guardar tarifa</button></div>}</InlineForm>
 </section>
 return <section>{dialog}<h2>Tarifas</h2><div className="filters academic-toolbar" role="search" aria-label="Búsqueda de tarifas"><AcademicSearch label="Buscar tarifa por código o nombre" placeholder="Código o nombre" value={search} onChange={v=>{setSearch(v);setPage(0)}}/><label>Estado de tarifa<select value={status} onChange={e=>{setStatus(e.currentTarget.value);setPage(0)}}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label><div className="record-header-actions"><button type="button" className="secondary" onClick={()=>setCycleView(true)}>Tarifas por Ciclo</button>{director&&<AcademicAction label="Nueva tarifa" createFor="Tarifas" icon="new" disabled={busy||loading} onClick={()=>open()}/>}</div></div>
  {message&&<p role={loadError||/No |cambió/.test(message)?'alert':'status'}>{message}</p>}{loading&&<p role="status">Cargando tarifas…</p>}
  <div className="table-scroll academic-grid"><table aria-label="Tarifas"><thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Monto por defecto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{!loading&&!loadError&&!rows.length&&<tr><td colSpan={6}>No hay tarifas {search||status?'que coincidan con los filtros.':'registradas.'}</td></tr>}{rows.map(row=><tr key={row.id}><td>{row.codigo}</td><td><button className="student-row-name company-row-name" onClick={()=>open(row)}>{row.nombre}</button></td><td>{row.tipo}</td><td>S/{Number(row.monto_por_defecto).toFixed(2)}</td><td><StatusBadge value={row.activo?'Activo':'Inactivo'}/></td><td><div className="student-row-actions"><AcademicAction label={`Ver ${row.nombre}`} icon="view" disabled={busy} onClick={()=>open(row)}/>{director&&<><AcademicAction label={`Editar ${row.nombre}`} icon="edit" disabled={busy} onClick={()=>open(row,true)}/><AcademicAction label={`${row.activo?'Inactivar':'Activar'} ${row.nombre}`} icon={row.activo?'off':'on'} disabled={busy} onClick={()=>void activate(row)}/></>}</div></td></tr>)}</tbody></table></div>
  <AcademicPagination page={page} count={rows.length} disabled={busy||loading} onChange={setPage}/>
 </section>
}

function CycleTariffs({back}:{back:()=>void}){
 const {client,state}=useSession(),director=state.roles?.includes('DIRECTOR_ACADEMICO')
 const [tariffs,setTariffs]=useState<Row[]>([]),[cycles,setCycles]=useState<Cycle[]>([]),[cycle,setCycle]=useState<Cycle>(),[loading,setLoading]=useState(true),[configStatus,setConfigStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const [config,setConfig]=useState<Record<string,{selected:boolean;importe:string;obligatorio:boolean}>>({})
 useEffect(()=>{let active=true;void Promise.all([client.from('tarifa').select('*').order('nombre'),client.from('ciclo').select('id,codigo_ciclo,estado_codigo,updated_at').order('codigo_ciclo')]).then(([t,c])=>{if(!active)return;setLoading(false);if(t.error||c.error){setMessage('No se pudieron cargar tarifas y Ciclos.');return}setTariffs(t.data as Row[]);setCycles(c.data as Cycle[])});return()=>{active=false}},[client])
 useEffect(()=>{
  let active=true;setConfig({});if(!cycle){setConfigStatus('idle');return}setConfigStatus('loading')
  void client.from('ciclo_tarifa').select('*').eq('ciclo_id',cycle.id).then(r=>{if(!active)return;if(r.error){setConfigStatus('error');setMessage('No se pudo cargar la configuración. Vuelve a seleccionar el Ciclo.');return}const cfg:typeof config={};for(const t of tariffs){const old=r.data.find(v=>v.tarifa_id===t.id);cfg[t.id]={selected:old?.activo??false,importe:old?String(old.importe):String(t.monto_por_defecto),obligatorio:old?.obligatorio??t.tipo==='CARRERA'}}setConfig(cfg);setConfigStatus('ready')});return()=>{active=false}
 },[client,cycle,tariffs])
 const editable=!!director&&!!cycle&&['PROGRAMADO','EN_CURSO'].includes(cycle.estado_codigo)&&configStatus==='ready'
 async function save(){
  if(!cycle||!editable)return;setBusy(true);setMessage('')
  const r=await client.rpc('guardar_ciclo_tarifas',{ciclo_id:cycle.id,expected_updated_at:cycle.updated_at,configuracion:Object.entries(config).filter(([,v])=>v.selected).map(([tarifa_id,v])=>({tarifa_id,importe:v.importe,obligatorio:String(v.obligatorio)}))});setBusy(false)
  if(r.error){setMessage(enrollmentError(r.error));return}setCycle(r.data as Cycle);setMessage('Tarifas del Ciclo guardadas correctamente.')
 }
 return <section className="academic-record"><AcademicRecordHeader title="Tarifas por Ciclo" editing={false} busy={busy} backLabel="Volver a tarifas" editLabel="" onBack={back}/>{message&&<p role={message.includes('correctamente')?'status':'alert'}>{message}</p>}
  <label>Ciclo<select aria-label="Ciclo" disabled={loading||busy} value={cycle?.id??''} onChange={e=>{setCycle(cycles.find(c=>c.id===e.currentTarget.value));setMessage('')}}><option value="">Seleccionar Ciclo</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.codigo_ciclo} — {c.estado_codigo}</option>)}</select></label>
  {configStatus==='loading'&&<p role="status">Cargando configuración…</p>}{cycle&&!editable&&configStatus==='ready'&&<p>Solo consulta. La configuración requiere Director y un Ciclo PROGRAMADO o EN_CURSO.</p>}
  {cycle&&configStatus==='ready'&&<InlineForm className="cycle-tariffs-form" onSubmit={()=>void save()}><p className="help-text">Para matricular debe existir exactamente una tarifa Carrera activa y obligatoria. Los cambios no recalculan cargos históricos.</p><div className="table-scroll"><table aria-label="Tarifas del Ciclo"><thead><tr><th>Tarifa</th><th>Tipo</th><th>Seleccionada</th><th>Importe (S/)</th><th>Obligatoria</th></tr></thead><tbody>{tariffs.map(t=>{const c=config[t.id];return c&&<tr key={t.id}><td>{t.codigo} — {t.nombre}{!t.activo&&' (Inactiva)'}</td><td>{t.tipo}</td><td><input type="checkbox" aria-label={`Seleccionar ${t.nombre}`} disabled={busy||!editable||!t.activo} checked={c.selected} onChange={e=>setConfig({...config,[t.id]:{...c,selected:e.currentTarget.checked}})}/></td><td><input aria-label={`Importe de ${t.nombre}`} type="number" min="0" step="0.01" disabled={busy||!editable} value={c.importe} onChange={e=>setConfig({...config,[t.id]:{...c,importe:e.currentTarget.value}})}/></td><td><input type="checkbox" aria-label={`Obligatoria ${t.nombre}`} disabled={busy||!editable} checked={c.obligatorio} onChange={e=>setConfig({...config,[t.id]:{...c,obligatorio:e.currentTarget.checked}})}/></td></tr>})}</tbody></table></div>{editable&&<div className="form-actions"><button disabled={busy}>Guardar tarifas del Ciclo</button></div>}</InlineForm>}
 </section>
}
