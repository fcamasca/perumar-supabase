import { paymentError } from '../payments/paymentError'
import { CycleTariffs } from '../enrollment/CycleTariffs'
import { CycleEnrollments } from '../enrollment/CycleEnrollments'
import { formTextValue } from '../lib/formText'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { EmptyState, InlineForm, StatusBadge, useConfirmation } from './AcademicUi'
import { AcademicAction, AcademicSearch, AcademicPagination, AcademicRecordHeader, AcademicTabs } from './AcademicLayout'
import { useSession } from '../security/SessionProvider'

type Ref = { id: string; nombre: string; active: boolean }
type Materia = Ref & { descripcion: string | null; updated_at: string }
type CarreraDicapi = { url_resolucion_malla: string; codigo_curso_dicapi: string; resolucion_malla_curricular: string; fecha_resolucion_malla: string; resolucion_autorizacion_centro: string; observaciones_normativas: string }
const blankDicapi: CarreraDicapi = { url_resolucion_malla:'',codigo_curso_dicapi:'',resolucion_malla_curricular:'',fecha_resolucion_malla:'',resolucion_autorizacion_centro:'',observaciones_normativas:'' }
type Carrera = Materia & Partial<CarreraDicapi> & { sigla: string; modalidad_id: string | null; con_experiencia: boolean }
type Valor = { id: string; catalogo_id: string; codigo: string; nombre: string; activo: boolean }
type Ciclo = { id: string; carrera_id: string; codigo_ciclo: string; fecha_inicio: string; fecha_fin: string; nombre_promocion: string | null; departamento_id: string; provincia_id: string; distrito_id: string; capitania_id: string; estado_codigo: string; updated_at: string }
type Relacion = { id: string; materia_id: string; activo: boolean; origen: string; motivo_inactivacion: string | null }
const materiaColumns = 'id,nombre,descripcion,active,updated_at'
const carreraColumns = `${materiaColumns},sigla,modalidad_id,con_experiencia,codigo_curso_dicapi,resolucion_malla_curricular,fecha_resolucion_malla,resolucion_autorizacion_centro,observaciones_normativas,url_resolucion_malla`
const cicloColumns = 'id,carrera_id,codigo_ciclo,fecha_inicio,fecha_fin,nombre_promocion,departamento_id,provincia_id,distrito_id,capitania_id,estado_codigo,updated_at'

export function academicError(error: { code?: string; message?: string } | null, entity: 'Asignatura' | 'Curso' | 'Ciclo' = 'Ciclo'): string {
  if(error?.message?.startsWith('PAYMENT_')) return paymentError(error)
  if (['PT409', '40001', '40P01'].includes(error?.code ?? '')) return 'El registro fue modificado por otro usuario. Actualiza la información antes de volver a guardar.'
  if (error?.code === '23505') {
    const field = /_codigo_key/.test(error.message ?? '') ? 'código' : /_nombre_key/.test(error.message ?? '') ? 'nombre' : entity === 'Curso' && /_sigla_key/.test(error.message ?? '') ? 'sigla' : null
    return field ? `El ${field} de ${entity} ya está utilizado, incluso en registros inactivos.` : entity === 'Asignatura' ? 'El nombre de Asignatura ya está utilizado, incluso en registros inactivos.' : entity === 'Curso' ? 'El nombre o sigla de Curso ya está utilizado, incluso en registros inactivos.' : 'La relación o el código ya está registrado.'
  }
  if (error?.code === '23514') {
    if (error.message === 'Materias de Ciclo con matrícula activa no editables') return 'Este Ciclo tiene matrículas activas. Solo el Director puede confirmar cambios en sus asignaturas. No se realizó ningún cambio.'
    if (/Cada Carrera requiere al menos|Seleccione al menos una Materia activa/.test(error.message ?? '')) return 'El Curso debe conservar al menos una Asignatura activa. Asocia primero otra Asignatura activa.'
    if (error.message === 'El Ciclo requiere una Materia activa') return 'El Ciclo debe tener al menos una Asignatura activa.'
    if (error.message === 'Valor de catálogo no válido o inactivo') return 'Selecciona un valor vigente del catálogo correspondiente.'
    if (/^carrera_(codigo_curso_dicapi|resolucion_malla_curricular|fecha_resolucion_malla|resolucion_autorizacion_centro|observaciones_normativas|url_resolucion_malla)_check$/.test((error.message??'').match(/check constraint "([^"]+)"/)?.[1]??'')) return 'Revisa el formato y la longitud de los datos DICAPI del Curso.'
    if (error.message === 'Detalle obligatorio para OTRO') return 'Indica el detalle del motivo OTRO.'
  }
  if (error?.code === '23P01') return 'Las fechas se superponen con otro Ciclo de el mismo Curso y Capitanía.'
  if (error?.code === '42501') return 'No tienes permiso para realizar esta operación.'
  return 'No se pudo guardar. Revisa campos, relaciones, asignaturas activas y estado; recarga si cambió la información.'
}
// Quote the PostgREST operand so punctuation cannot become filter operators.
const academicSearchPattern = (text: string) => JSON.stringify(`%${text.trim()}%`)
const siglaOrNameFilter = (text: string) => `sigla.ilike.${academicSearchPattern(text)},nombre.ilike.${academicSearchPattern(text)},codigo_curso_dicapi.ilike.${academicSearchPattern(text)}`
const academicDate = (date: string) => date ? date.split('-').reverse().join('/') : '—'
const academicLabel = (row?: { sigla?: string; nombre: string }) => row ? `${row.sigla ? row.sigla + ' — ' : ''}${row.nombre}` : 'Referencia no disponible'
export function suggestSigla(name: string) {
  const words = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z0-9]+/g) ?? []
  if (!words.length) return ''
  const significant = words.filter(word => !['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'EN', 'PARA'].includes(word))
  const tokens = significant.length ? significant : words
  let suggestion: string
  if (tokens.length > 1) suggestion = tokens.map(word => /[0-9]/.test(word) ? word : word[0]).join('')
  else {
    const word = tokens[0]
    suggestion = word[0] + word.slice(1).replace(/[AEIOU]/g, '').slice(0, 2)
    if (suggestion.length < 2) suggestion = word.slice(0, 2)
  }
  return (suggestion.length < 2 ? suggestion + suggestion : suggestion).slice(0, 10)
}

function Notice({ message }: { message: string }) { return message ? <p id="academic-message" role={/correctamente|^Ciclo declarado/.test(message) ? "status" : "alert"} className={/correctamente|^Ciclo declarado/.test(message) ? "success" : undefined}>{message}</p> : null }
export function AcademicOnly({ children }: { children: ReactNode }) {
  const { state } = useSession()
  return state.roles?.some(r => r === 'DIRECTOR_ACADEMICO' || r === 'COORDINADOR_ACADEMICO') ? children : <p role="alert">Acceso académico no autorizado.</p>
}

function useListFocus(open: boolean, entity: string) {
  const previous = useRef(false)
  useEffect(() => {
    if (previous.current && !open) (document.querySelector<HTMLElement>(`[data-create="${entity}"]`) ?? document.querySelector<HTMLElement>('[role=search] input'))?.focus()
    previous.current = open
  }, [open, entity])
}

export function Materias() {
  const [open, setOpen] = useState(false), [readOnly, setReadOnly] = useState(true), [page, setPage] = useState(0)
  useListFocus(open, 'Asignaturas')
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false)
  const { client, state } = useSession()
  const director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const [rows, setRows] = useState<Materia[]>([]), [revision, setRevision] = useState(0)
  const [search, setSearch] = useState(''), [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Materia | null>(null)
  const [nombre, setNombre] = useState(''), [descripcion, setDescripcion] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const { ask, dialog } = useConfirmation(busy)
  useEffect(() => {
    let current = true
    setLoading(true); setLoadError(false)
    let query = client.from('materia').select(materiaColumns).order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 30, page * 30 + 29)
    if (search.trim()) query = query.ilike('nombre', `%${search.trim()}%`)
    if (status) query = query.eq('active', status === 'active')
    void query.then(result => { if (current) { setLoading(false); setLoadError(!!result.error); setRows(result.error ? [] : result.data as Materia[]); if (result.error) setMessage('No se pudo consultar Asignaturas.') } })
    return () => { current = false }
  }, [client, revision, search, status, page])
  function edit(row: Materia | null, view = false) { setReadOnly(view || !director); setOpen(true); setSelected(row); setNombre(row?.nombre ?? ''); setDescripcion(row?.descripcion ?? ''); setMessage('') }
  async function save(event: FormEvent) {
    event.preventDefault(); if (readOnly || !director) return; setBusy(true); setMessage('')
    const result = await client.rpc('guardar_materia', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), nombre, descripcion: descripcion || null } })
    setBusy(false)
    if (result.error) { setMessage(academicError(result.error, 'Asignatura')); return }
    setOpen(false); setMessage(selected ? 'Asignatura actualizada correctamente.' : 'Asignatura creada correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Materia) {
    setMessage('')
    if (row.active) {
      setBusy(true)
      const [links, subjects, careers] = await Promise.all([client.from('carrera_materia').select('carrera_id,materia_id'), client.from('materia').select('id').eq('active', true), client.from('carrera').select('id,sigla,nombre')])
      setBusy(false)
      if (links.error || subjects.error || careers.error) { setMessage('No se pudo comprobar la viabilidad. Recarga e inténtalo de nuevo.'); return }
      const affected = careers.data.filter(c => links.data.some(l => l.carrera_id === c.id && l.materia_id === row.id) && !links.data.some(l => l.carrera_id === c.id && l.materia_id !== row.id && subjects.data.some(m => m.id === l.materia_id)))
      if (affected.length) { setMessage(`No se puede inactivar esta Asignatura porque dejaría un Curso sin Asignaturas activas: ${affected.map(academicLabel).join(', ')}. Asocia primero otra Asignatura activa.`); return }
    }
    const motivo = await ask({ title: `${row.active ? 'Inactivar' : 'Reactivar'} Asignatura`, description: `${academicLabel(row)}. ${row.active ? 'Dejará de cargarse para nuevos Ciclos. Se conservan las referencias existentes.' : 'Volverá a estar disponible para nuevas selecciones; no reactiva relaciones retiradas.'}`, reason: row.active, confirmLabel: row.active ? 'Inactivar' : 'Reactivar', sensitive: row.active })
    if (motivo === null) return
    setBusy(true)
    const result = await client.rpc('cambiar_active_materia', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo })
    setBusy(false); setMessage(result.error ? academicError(result.error, 'Asignatura') : `Asignatura ${row.active ? 'inactivada' : 'reactivada'} correctamente.`); if (!result.error) setRevision(x => x + 1)
  }
  function cancelEditing() { if (selected) edit(selected, true); else setOpen(false) }
  if (open) return <section className="academic-record">{dialog}<AcademicRecordHeader title={selected ? 'Ficha de Asignatura' : 'Nueva Asignatura'} name={selected ? academicLabel(selected) : undefined} status={selected && <StatusBadge value={selected.active ? 'Activo' : 'Inactivo'}/>} editing={!readOnly} busy={busy} backLabel="Volver a asignaturas" editLabel="Editar Asignatura" onBack={() => setOpen(false)} onEdit={readOnly && director ? () => setReadOnly(false) : undefined}/><Notice message={message}/>
    <InlineForm key={`${selected?.id ?? 'new'}-${readOnly}`} aria-describedby={message ? 'academic-message' : undefined} onSubmit={event => void save(event)}><fieldset className="academic-fields" disabled={busy}><legend>Datos de Asignatura</legend>
      <label><span className="field-label">Nombre de Asignatura{!readOnly && ' *'}</span>{!readOnly && <small>Máximo 150 caracteres</small>}<input aria-label="Nombre de Asignatura" readOnly={readOnly} required={!readOnly} maxLength={150} value={nombre} onChange={e => setNombre(formTextValue(e.currentTarget))}/></label>
      <label>Descripción de Asignatura{!readOnly && <small>Máximo 500 caracteres</small>}<textarea rows={2} aria-label="Descripción de Asignatura" readOnly={readOnly} maxLength={500} value={descripcion} onChange={e => setDescripcion(formTextValue(e.currentTarget))}/>{!readOnly && <small>{descripcion.length} / 500</small>}</label>
    </fieldset>{!readOnly && <div className="form-actions"><button className="secondary" disabled={busy} type="button" onClick={cancelEditing}>Cancelar</button><button disabled={busy}>Guardar Asignatura</button></div>}</InlineForm>
  </section>
  return <section>{dialog}<h2>Asignaturas</h2><div className="filters academic-toolbar" role="search" aria-label="Búsqueda de asignaturas"><AcademicSearch label="Buscar Asignatura por nombre" placeholder="Nombre" value={search} onChange={text => {setSearch(text);setPage(0)}}/><label>Estado de Asignatura<select value={status} onChange={e => {setStatus(e.currentTarget.value);setPage(0)}}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label><div className="record-header-actions">{director && <AcademicAction label="Crear Asignatura" createFor="Asignaturas" icon="new" disabled={busy} onClick={() => edit(null)}/>}</div></div><Notice message={message}/>
    {loading && <p role="status">Cargando asignaturas…</p>}<div className="table-scroll academic-grid"><table aria-label="Asignaturas"><thead><tr><th scope="col">Nombre</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{!loading && !loadError && rows.length === 0 && <tr><td colSpan={3}><EmptyState entity="Asignaturas" filtered={!!(search || status)} onCreate={director ? () => edit(null) : undefined}/></td></tr>}{rows.map(row => <tr key={row.id}><td><button className="student-row-name company-row-name" onClick={() => edit(row,true)}>{row.nombre}</button></td><td><StatusBadge value={row.active ? 'Activo' : 'Inactivo'}/></td><td><div className="student-row-actions"><AcademicAction label={`Ver ${row.nombre}`} icon="view" disabled={busy} onClick={() => edit(row,true)}/>{director && <><AcademicAction label={`Editar ${row.nombre}`} icon="edit" disabled={busy} onClick={() => edit(row)}/><AcademicAction label={`${row.active ? 'Inactivar' : 'Reactivar'} ${row.nombre}`} icon={row.active ? 'off' : 'on'} disabled={busy} onClick={() => void activate(row)}/></>}</div></td></tr>)}</tbody></table></div><AcademicPagination page={page} count={rows.length} disabled={busy || loading} onChange={setPage}/>
  </section>
}

export function Carreras() {
  const [open, setOpen] = useState(false), [readOnly, setReadOnly] = useState(true), [page, setPage] = useState(0), [tab, setTab] = useState(0)
  const [subjectsStatus, setSubjectsStatus] = useState<'loading' | 'ready' | 'error'>('ready')
  useListFocus(open, 'Cursos')
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false)
  const { client, state } = useSession(), director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const editEpoch = useRef(0), originalChosen = useRef<string[]>([])
  const siglaManual = useRef(false)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [rows, setRows] = useState<Carrera[]>([]), [materias, setMaterias] = useState<Materia[]>([]), [modalidades, setModalidades] = useState<Valor[]>([])
  const [selected, setSelected] = useState<Carrera | null>(null), [chosen, setChosen] = useState<string[]>([])
  const [nombre, setNombre] = useState(''), [descripcion, setDescripcion] = useState(''), [sigla, setSigla] = useState(''), [modalidad, setModalidad] = useState('')
  const [experiencia, setExperiencia] = useState(false)
  const [dicapi,setDicapi]=useState<CarreraDicapi>({...blankDicapi})
  const [activeStatus, setActiveStatus] = useState('')
  const [search, setSearch] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  const { ask, dialog } = useConfirmation(busy)
  useEffect(() => {
    let current = true
    setLoading(true); setLoadError(false)
    void (async () => {
      let query = client.from('carrera').select(carreraColumns).in('active', activeStatus ? [activeStatus === 'active'] : [true, false]).order('created_at', { ascending:false }).order('id', { ascending:false }).range(page * 30, page * 30 + 29)
      if (search.trim()) query = query.or(siglaOrNameFilter(search))
      const [c, m, cat] = await Promise.all([query, client.from('materia').select(materiaColumns).order('nombre'), client.from('catalogo').select('id').eq('codigo', 'MODALIDAD_CARRERA').single()])
      if (!current) return
      if (c.error || m.error || cat.error) { setLoading(false); setLoadError(true); setRows([]); setMessage('No se pudieron consultar las referencias de Curso.'); return }
      const values = await client.from('catalogo_valor').select('id,catalogo_id,codigo,nombre,activo').eq('catalogo_id', cat.data.id)
      if (current) { setLoading(false); if (values.error) { setLoadError(true); setMessage('No se pudo consultar la modalidad. Recarga la información.'); return }; setRows(c.data as Carrera[]); setMaterias(m.data as Materia[]); setModalidades(values.data ?? []) }
    })()
    return () => { current = false }
  }, [client, search, revision, activeStatus, page])
  async function edit(row: Carrera | null, view = false, section = 0) {
    setReadOnly(view || !director); setTab(section); setSubjectsStatus(row ? 'loading' : 'ready')
    setOpen(true); setSubjectSearch('')
    const request = ++editEpoch.current
    setDicapi(Object.fromEntries(Object.keys(blankDicapi).map(key=>[key,row?.[key as keyof CarreraDicapi]??''])) as CarreraDicapi)
    setSelected(row); setNombre(row?.nombre ?? ''); setDescripcion(row?.descripcion ?? ''); setSigla(row?.sigla ?? ''); siglaManual.current = !!row; originalChosen.current = []; setModalidad(row ? row.modalidad_id ?? '' : modalidades.find(x => x.codigo === 'PRESENCIAL' && x.activo)?.id ?? ''); setExperiencia(row?.con_experiencia ?? false); setChosen([]); setMessage('')
    if (row) { const r = await client.from('carrera_materia').select('materia_id').eq('carrera_id', row.id); if (request !== editEpoch.current) return; if (!r.error) { originalChosen.current = r.data.map(x => x.materia_id); setChosen(originalChosen.current); setSubjectsStatus('ready') } else { setSubjectsStatus('error'); setMessage('No se pudieron consultar las Asignaturas del Curso. Vuelve a la lista y abre la ficha para recargar.') } }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (readOnly || !director || subjectsStatus !== 'ready') return
    if (!chosen.some(id => materias.some(m => m.id === id && m.active))) { setTab(1); setMessage('Selecciona al menos una Asignatura activa.'); return }
    const warnings: string[] = []
    if (selected && selected.sigla !== sigla.trim().toUpperCase()) warnings.push('El cambio de sigla actualizará los sufijos de los Ciclos PROGRAMADO/EN_CURSO afectados. Los terminales conservarán su código histórico.')
    if (selected && chosen.some(id => !originalChosen.current.includes(id) && materias.some(m => m.id === id && m.active))) {
      setBusy(true)
      const cycles = await client.from('ciclo').select('id').eq('carrera_id', selected.id).in('estado_codigo', ['PROGRAMADO', 'EN_CURSO'])
      setBusy(false)
      if (cycles.error) { setMessage('No se pudieron comprobar los Ciclos afectados. Recarga e inténtalo de nuevo.'); return }
      if (cycles.data.length) warnings.push(`Este Curso tiene ${cycles.data.length} Ciclos modificables asociados. Las nuevas Asignaturas se agregarán únicamente donde falten en PROGRAMADO y EN_CURSO. Las Asignaturas retiradas manualmente no se reactivarán ni se reclasificarán y los Ciclos terminales no serán modificados.`)
    }
    if (warnings.length && await ask({ title: 'Confirmar cambios de Curso', confirmLabel: 'Guardar cambios', description: `${academicLabel({ sigla, nombre })}. ${warnings.join(' ')}` }) === null) return
    setBusy(true)
    const r = await client.rpc('guardar_carrera', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), nombre, descripcion: descripcion || null, sigla, modalidad_id: modalidad || null, con_experiencia: experiencia, ...Object.fromEntries(Object.entries(dicapi).map(([key,text])=>[key,text.trim()||null])) }, materias: chosen })
    setBusy(false); if (r.error) { setMessage(academicError(r.error, 'Curso')); return }; ++editEpoch.current; setOpen(false); setMessage(selected ? 'Curso actualizado correctamente.' : 'Curso creado correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Carrera) {
    const motivo = await ask({ title: `${row.active ? 'Inactivar' : 'Reactivar'} Curso`, description: `${academicLabel(row)}. ${row.active ? 'Dejará de estar disponible para nuevos Ciclos. Se conservan las referencias existentes.' : 'Volverá a estar disponible para nuevos Ciclos.'}`, reason: row.active, confirmLabel: row.active ? 'Inactivar' : 'Reactivar', sensitive: row.active })
    if (motivo === null) return
    setBusy(true); const r = await client.rpc('cambiar_active_carrera', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo }); setBusy(false)
    setMessage(r.error ? academicError(r.error, 'Curso') : `Curso ${row.active ? 'inactivado' : 'reactivado'} correctamente.`); if (!r.error) setRevision(x => x + 1)
  }
  function cancelEditing() { if (selected) void edit(selected, true, tab); else { ++editEpoch.current; setOpen(false) } }
  if (open) return <section className="academic-record career-record">{dialog}<AcademicRecordHeader title={selected ? 'Ficha de Curso' : 'Nuevo Curso'} name={selected ? academicLabel(selected) : undefined} status={selected && <StatusBadge value={selected.active ? 'Activo' : 'Inactivo'}/>} editing={!readOnly} busy={busy} backLabel="Volver a cursos" editLabel="Editar Curso" onBack={() => {++editEpoch.current;setOpen(false)}} onEdit={readOnly && director && subjectsStatus === 'ready' ? () => setReadOnly(false) : undefined}/><Notice message={message}/><AcademicTabs id="career-sections" names={['Datos generales','Asignaturas','Información DICAPI']} active={tab} disabled={busy} onChange={setTab}/>
    <InlineForm className="academic-record-form" key={`${selected?.id ?? 'new'}-${readOnly}`} aria-describedby={message ? 'academic-message' : undefined} onInvalidField={field => setTab(Number(field.closest<HTMLElement>('[data-academic-tab]')?.dataset.academicTab ?? 0))} onSubmit={event => void save(event)}>
      <div hidden={tab !== 0} data-academic-tab="0" role="tabpanel" tabIndex={0} id="career-sections-panel-0" aria-labelledby="career-sections-tab-0" className="student-section-panel"><fieldset className="academic-fields" disabled={busy}><legend>Datos de Curso</legend>
      <label><span className="field-label">Nombre de Curso{!readOnly && ' *'}</span>{!readOnly && <small>Máximo 150 caracteres</small>}<input aria-label="Nombre de Curso" readOnly={readOnly} required={!readOnly} maxLength={150} value={nombre} onChange={e => {setNombre(formTextValue(e.currentTarget));if (!selected && !siglaManual.current) setSigla(suggestSigla(formTextValue(e.currentTarget)))}}/></label>
      <label><span className="field-label">Sigla{!readOnly && ' *'}</span>{!readOnly && <small>De 2 a 10 caracteres alfanuméricos</small>}<input aria-label="Sigla" readOnly={readOnly} required={!readOnly} minLength={2} maxLength={10} pattern="[A-Za-z0-9]{2,10}" value={sigla} onChange={e => {siglaManual.current=true;setSigla(formTextValue(e.currentTarget))}}/></label>
      <label><span className="field-label">Modalidad (opcional)</span>{readOnly ? <input aria-label="Modalidad" readOnly value={modalidad ? modalidades.find(x => x.id === modalidad)?.nombre ?? 'Referencia no disponible' : 'No indicado'}/> : <select aria-label="Modalidad" value={modalidad} onChange={e => setModalidad(formTextValue(e.currentTarget))}><option value="">Sin modalidad</option>{modalidades.filter(x => x.activo || x.id === modalidad).map(x => <option key={x.id} value={x.id}>{x.nombre}{!x.activo ? ' (inactivo histórico)' : ''}</option>)}</select>}</label>
      <label className="experience-field"><span className="field-label">Con experiencia</span><span className="experience-switch"><input aria-label="Con experiencia" type="checkbox" role="switch" checked={experiencia} disabled={readOnly} onChange={e => setExperiencia(e.currentTarget.checked)}/><span aria-hidden="true" className="switch-track"/><span>{experiencia ? 'Sí' : 'No'}</span></span></label>
      <label>Descripción de Curso{!readOnly && <small>Máximo 500 caracteres</small>}<textarea rows={2} aria-label="Descripción de Curso" readOnly={readOnly} maxLength={500} value={descripcion} onChange={e => setDescripcion(formTextValue(e.currentTarget))}/>{!readOnly && <small>{descripcion.length} / 500</small>}</label>
      </fieldset></div>
      <div hidden={tab !== 1} data-academic-tab="1" role="tabpanel" tabIndex={0} id="career-sections-panel-1" aria-labelledby="career-sections-tab-1" className="student-section-panel"><h3>Asignaturas del Curso</h3>{subjectsStatus === 'loading' && <p role="status">Cargando Asignaturas del Curso…</p>}{readOnly ? <div className="table-scroll"><table aria-label="Asignaturas del Curso"><thead><tr><th scope="col">Nombre</th><th scope="col">Estado</th></tr></thead><tbody>{materias.filter(m => chosen.includes(m.id)).map(m => <tr key={m.id}><td>{m.nombre}</td><td><StatusBadge value={m.active ? 'Activo' : 'Inactivo'}/></td></tr>)}</tbody></table></div> : <fieldset className="subject-picker" disabled={busy || subjectsStatus !== 'ready'}><legend>Asignaturas del Curso — mínimo una activa</legend><label>Localizar Asignatura<input type="search" value={subjectSearch} onChange={e => setSubjectSearch(formTextValue(e.currentTarget))}/></label><p>{chosen.length} seleccionadas</p><div className="subject-options">{materias.filter(m => academicLabel(m).toLocaleLowerCase().includes(subjectSearch.toLocaleLowerCase())).map(m => <label key={m.id}><input type="checkbox" checked={chosen.includes(m.id)} disabled={!m.active && !chosen.includes(m.id)} onChange={e => setChosen(ids => e.target.checked ? [...ids,m.id] : ids.filter(id => id !== m.id))}/><span>{academicLabel(m)}<small>{chosen.includes(m.id) ? 'Seleccionada · ' : ''}{m.active ? 'Activa' : 'Inactiva histórica'}</small></span></label>)}</div></fieldset>}</div>
      <div hidden={tab!==2} data-academic-tab="2" role="tabpanel" tabIndex={0} id="career-sections-panel-2" aria-labelledby="career-sections-tab-2" className="student-section-panel"><fieldset className="academic-fields" disabled={busy}><legend>Información DICAPI (opcional)</legend>
        <label>Código de curso DICAPI<input maxLength={30} pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*" data-pattern-error="Usa el código oficial, por ejemplo MAM-009." aria-label="Código de curso DICAPI" readOnly={readOnly} value={dicapi.codigo_curso_dicapi} onChange={e=>{const text=formTextValue(e.currentTarget);setDicapi(d=>({...d,codigo_curso_dicapi:text}))}}/></label>
        <label>Resolución de malla curricular<input maxLength={150} aria-label="Resolución de malla curricular" readOnly={readOnly} value={dicapi.resolucion_malla_curricular} onChange={e=>{const text=formTextValue(e.currentTarget);setDicapi(d=>({...d,resolucion_malla_curricular:text}))}}/></label>
        <label>Fecha de resolución de malla<input type="date" min="1900-01-01" max="9999-12-31" aria-label="Fecha de resolución de malla" readOnly={readOnly} value={dicapi.fecha_resolucion_malla} onChange={e=>{const text=e.currentTarget.value;setDicapi(d=>({...d,fecha_resolucion_malla:text}))}}/></label>
        <label>Resolución de autorización del centro<input maxLength={150} aria-label="Resolución de autorización del centro" readOnly={readOnly} value={dicapi.resolucion_autorizacion_centro} onChange={e=>{const text=formTextValue(e.currentTarget);setDicapi(d=>({...d,resolucion_autorizacion_centro:text}))}}/></label>
        <label>URL de resolución de malla<input type="url" pattern="https://.*" data-pattern-error="Usa un enlace HTTPS completo." maxLength={2048} aria-label="URL de resolución de malla" readOnly={readOnly} value={dicapi.url_resolucion_malla} onChange={e=>{const text=e.currentTarget.value;setDicapi(d=>({...d,url_resolucion_malla:text}))}}/>{/^https:\/\//.test(dicapi.url_resolucion_malla)&&<a href={dicapi.url_resolucion_malla} target="_blank" rel="noopener noreferrer">Abrir resolución de malla</a>}</label>
        <label>Observaciones normativas<textarea rows={3} maxLength={2000} aria-label="Observaciones normativas" readOnly={readOnly} value={dicapi.observaciones_normativas} onChange={e=>{const text=formTextValue(e.currentTarget);setDicapi(d=>({...d,observaciones_normativas:text}))}}/></label>
      </fieldset><p className="help-text">La resolución de la malla curricular y la autorización del centro son documentos distintos. Estos datos no modifican las asignaturas de Ciclos existentes.</p></div>
      {!readOnly && <div className="form-actions"><button className="secondary" disabled={busy} type="button" onClick={cancelEditing}>Cancelar</button><button disabled={busy || subjectsStatus !== 'ready'}>Guardar Curso y Asignaturas</button></div>}
    </InlineForm>
  </section>
  return <section>{dialog}<h2>Cursos</h2><div className="filters academic-toolbar" role="search" aria-label="Búsqueda de cursos"><AcademicSearch label="Buscar Curso por sigla, nombre o código DICAPI" placeholder="Sigla, nombre o código DICAPI" value={search} onChange={text => {setSearch(text);setPage(0)}}/><label>Estado de Curso<select value={activeStatus} onChange={e => {setActiveStatus(e.currentTarget.value);setPage(0)}}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label><div className="record-header-actions">{director && <AcademicAction label="Crear Curso" createFor="Cursos" icon="new" disabled={busy} onClick={() => void edit(null)}/>}</div></div><Notice message={message}/>{loading && <p role="status">Cargando cursos…</p>}
    <div className="table-scroll academic-grid"><table aria-label="Cursos"><thead><tr><th scope="col">Nombre</th><th scope="col">Sigla</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{!loading && !loadError && rows.length === 0 && <tr><td colSpan={4}><EmptyState entity="Cursos" filtered={!!(search || activeStatus)} onCreate={director ? () => void edit(null) : undefined}/></td></tr>}{rows.map(row => <tr key={row.id}><td><button className="student-row-name company-row-name" onClick={() => void edit(row,true)}>{row.nombre}</button></td><td>{row.sigla}</td><td><StatusBadge value={row.active ? 'Activo' : 'Inactivo'}/></td><td><div className="student-row-actions"><AcademicAction label={`Ver ${row.nombre}`} icon="view" disabled={busy} onClick={() => void edit(row,true)}/>{director && <><AcademicAction label={`Editar ${row.nombre}`} icon="edit" disabled={busy} onClick={() => void edit(row)}/><AcademicAction label={`${row.active ? 'Inactivar' : 'Reactivar'} ${row.nombre}`} icon={row.active ? 'off' : 'on'} disabled={busy} onClick={() => void activate(row)}/></>}</div></td></tr>)}</tbody></table></div><AcademicPagination page={page} count={rows.length} disabled={busy || loading} onChange={setPage}/>
  </section>
}

type CicloDraft = Omit<Ciclo, 'id' | 'codigo_ciclo' | 'estado_codigo' | 'updated_at'>
const blankCiclo: CicloDraft = { carrera_id: '', fecha_inicio: '', fecha_fin: '', nombre_promocion: '', departamento_id: '', provincia_id: '', distrito_id: '', capitania_id: '' }
export function Ciclos({initialCycleId}:{initialCycleId?:string}={}) {
  const [open, setOpen] = useState(false), [readOnly, setReadOnly] = useState(true), [page, setPage] = useState(0), [tab, setTab] = useState(0)
  useListFocus(open, 'Ciclos')
  const cycleFormId=useId(),[tariffsReset,setTariffsReset]=useState(0)
  const [enrollmentPanelOpen,setEnrollmentPanelOpen]=useState(false)
  const [tariffsDirty,setTariffsDirty]=useState(false),[tariffsBusy,setTariffsBusy]=useState(false),[tariffsReady,setTariffsReady]=useState<boolean|null>(null)
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false)
  const { client, state } = useSession(), director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const editEpoch = useRef(0)
  const [rows, setRows] = useState<Ciclo[]>([]), [carreras, setCarreras] = useState<Carrera[]>([]), [materias, setMaterias] = useState<Materia[]>([])
  const [departamentos, setDepartamentos] = useState<Ref[]>([]), [provincias, setProvincias] = useState<(Ref & { departamento_id: string })[]>([]), [distritos, setDistritos] = useState<(Ref & { provincia_id: string })[]>([]), [capitanias, setCapitanias] = useState<Ref[]>([]), [motivos, setMotivos] = useState<Valor[]>([])
  const [selected, setSelected] = useState<Ciclo | null>(null), [draft, setDraft] = useState<CicloDraft>(blankCiclo), [relations, setRelations] = useState<Relacion[]>([]), [inherited, setInherited] = useState<string[]>([]), [additional, setAdditional] = useState<string[]>([])
  const [search, setSearch] = useState(''), [estado, setEstado] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  const { ask, dialog } = useConfirmation(busy)
  const [subjectSearch, setSubjectSearch] = useState(''), [subjectId, setSubjectId] = useState(''), [showRetired, setShowRetired] = useState(false)
  const [hasActiveEnrollments, setHasActiveEnrollments] = useState<boolean | null>(null)
  const activeSubjectWarning = 'Este Ciclo tiene matrículas activas. El cambio afectará la lista vigente de asignaturas para los alumnos matriculados. Los códigos, cargos y datos históricos de las matrículas se conservarán. ¿Deseas continuar?'
  const [relationsStatus, setRelationsStatus] = useState<'loading' | 'ready' | 'error'>('ready')
  const [destino, setDestino] = useState(''), [motivoId, setMotivoId] = useState(''), [detalle, setDetalle] = useState('')
  const canModify = state.roles?.some(role => role === 'DIRECTOR_ACADEMICO' || role === 'COORDINADOR_ACADEMICO') ?? false
  const canEditCycle = (row: Ciclo) => canModify && ['PROGRAMADO', 'EN_CURSO'].includes(row.estado_codigo)
  const editable = canModify && (!selected || canEditCycle(selected))
  const dirty = !!selected && (Object.keys(blankCiclo).some(key => draft[key as keyof CicloDraft] !== (selected[key as keyof CicloDraft] ?? '')) || additional.length > 0)
  const [inheritedStatus, setInheritedStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  useEffect(() => {
    let current = true
    setLoading(true); setLoadError(false)
    void (async () => {
      const [ca, ma, de, pr, cp, cat] = await Promise.all([client.from('carrera').select(carreraColumns).order('nombre'), client.from('materia').select(materiaColumns).order('nombre'), client.from('departamento').select('id,nombre,active').order('nombre'), client.from('provincia').select('id,nombre,active,departamento_id').order('nombre'), client.from('capitania').select('id,nombre,active').order('nombre'), client.from('catalogo').select('id').eq('codigo', 'MOTIVO_CICLO_DESIERTO').single()])
      if (!current) return
      if (ca.error || ma.error || de.error || pr.error || cp.error || cat.error) { setLoading(false); setLoadError(true); setRows([]); setMessage('No se pudieron consultar Ciclos y referencias.'); return }
      let q = client.from('ciclo').select(cicloColumns).order('created_at', { ascending:false }).order('id', { ascending:false }).range(page * 30, page * 30 + 29)
      if (search.trim()) {
        const pattern = academicSearchPattern(search), term = search.trim().toUpperCase()
        const careerIds = ca.data.filter(c => c.nombre.toUpperCase().includes(term)).map(c => c.id)
        const alternatives = [`codigo_ciclo.ilike.${pattern}`]
        if (careerIds.length) alternatives.push(`carrera_id.in.(${careerIds.join(',')})`)
        q = q.or(alternatives.join(','))
      }
      if (estado) q = q.eq('estado_codigo', estado)
      const [c,mv] = await Promise.all([q,client.from('catalogo_valor').select('id,catalogo_id,codigo,nombre,activo').eq('catalogo_id', cat.data.id)])
      if (current) { setLoading(false); if (c.error || mv.error) { setLoadError(true);setRows([]);setMessage('No se pudieron consultar Ciclos y motivos. Recarga la información.');return }; setRows(c.data as Ciclo[]); setCarreras(ca.data as Carrera[]); setMaterias(ma.data as Materia[]); setDepartamentos(de.data); setProvincias(pr.data); setCapitanias(cp.data); setMotivos(mv.data ?? []) }
    })()
    return () => { current = false }
  }, [client, revision, search, estado, page])
  useEffect(() => {
    let current = true; setDistritos([])
    if (draft.provincia_id) void client.from('distrito').select('id,nombre,active,provincia_id').eq('provincia_id', draft.provincia_id).order('nombre').then(r => { if (current && !r.error) setDistritos(r.data) })
    return () => { current = false }
  }, [client, draft.provincia_id])
  useEffect(() => {
    let current = true; setInherited([]); setInheritedStatus(draft.carrera_id ? 'loading' : 'idle')
    if (draft.carrera_id) void client.from('carrera_materia').select('materia_id').eq('carrera_id', draft.carrera_id).then(r => { if (current) { setInheritedStatus(r.error ? 'error' : 'ready'); if (!r.error) setInherited(r.data.map(x => x.materia_id)) } })
    return () => { current = false }
  }, [client, draft.carrera_id, revision])
  useEffect(()=>{
    if(!initialCycleId)return
    let active=true
    void client.from('ciclo').select(cicloColumns).eq('id',initialCycleId).single().then(r=>{if(!active)return;if(r.error)setMessage('No se pudo abrir el Ciclo solicitado.');else void edit(r.data as Ciclo,true,3)})
    return()=>{active=false}
  },[client,initialCycleId])
  async function edit(row: Ciclo | null, view = false, section = 0) {
    setReadOnly(view || (!!row && !canEditCycle(row)) || !canModify); setTab(section)
    setOpen(true); setSubjectSearch(''); setSubjectId(''); if(section !== 1) setShowRetired(false); setRelationsStatus(row ? 'loading' : 'ready'); setHasActiveEnrollments(row ? null : false)
    const request = ++editEpoch.current
    setSelected(row); setDraft(row ? { carrera_id: row.carrera_id, fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin, nombre_promocion: row.nombre_promocion ?? '', departamento_id: row.departamento_id, provincia_id: row.provincia_id, distrito_id: row.distrito_id, capitania_id: row.capitania_id } : blankCiclo)
    setAdditional([]); setRelations([]); setMessage(''); setDestino(''); setMotivoId(''); setDetalle('')
    if (row) { const [r,enrolled] = await Promise.all([client.from('ciclo_materia').select('id,materia_id,activo,origen,motivo_inactivacion').eq('ciclo_id', row.id),client.from('matricula').select('id').eq('ciclo_id',row.id).eq('estado_codigo','ACTIVO').limit(1)]); if (request !== editEpoch.current) return; if (!r.error && !enrolled.error) { setRelations(r.data); setHasActiveEnrollments(enrolled.data.length>0); setRelationsStatus('ready') } else { setRelationsStatus('error'); setMessage('No se pudieron consultar asignaturas y matrículas del Ciclo.') } }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (readOnly || !editable || tariffsDirty || inheritedStatus === 'loading' || inheritedStatus === 'error') return
    if (!selected && !materias.some(m => m.active && (inherited.includes(m.id) || additional.includes(m.id)))) { setMessage('Selecciona un Curso con Asignaturas activas o añade al menos una Asignatura activa.'); return }
    if (selected && selected.carrera_id !== draft.carrera_id && await ask({ title: 'Cambiar Curso del Ciclo', confirmLabel: 'Cambiar Curso', description: `${academicLabel(carreras.find(c => c.id === draft.carrera_id)!)}. Las asignaturas heredadas del Curso actual se retirarán del Ciclo. Las asignaturas adicionales se conservarán y se agregarán las asignaturas faltantes de la nuevo Curso. Las retiradas no se reactivarán.` }) === null) return
    setBusy(true)
    const r = await client.rpc('guardar_ciclo', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), ...draft, nombre_promocion: draft.nombre_promocion || null }, adicionales: additional })
    setBusy(false); if (r.error) { setMessage(academicError(r.error)); return }; ++editEpoch.current; setOpen(false); setMessage(selected ? 'Ciclo actualizado correctamente.' : 'Ciclo creado correctamente.'); setRevision(x => x + 1)
  }
  async function changeSubject(subject: string, active: boolean, confirmed = false) {
    if (!selected) return
    setBusy(true); setMessage('')
    const r = await client.rpc('cambiar_materia_ciclo', { ciclo_id: selected.id, materia_id: subject, expected_updated_at: selected.updated_at, activo: active, ...(confirmed ? {confirmar_matriculas_activas:true} : {}) })
    setBusy(false)
    if (r.error?.code==='23514' && r.error.message==='Confirmación requerida para asignaturas con matrículas activas' && director && !confirmed) {
      setHasActiveEnrollments(true)
      if(await ask({title:'Modificar asignaturas con matrículas activas',description:activeSubjectWarning,confirmLabel:'Continuar',sensitive:true})!==null) await changeSubject(subject,active,true)
      return
    }
    if (r.error) { setMessage(academicError(r.error)); return }
    void edit(r.data as Ciclo,false,1); setMessage('Asignaturas del Ciclo actualizadas correctamente.'); setRevision(x=>x+1)
  }
  async function relation(row: Relacion) {
    if (!selected || readOnly || !editable || dirty || tariffsDirty || relationsStatus !== 'ready' || (hasActiveEnrollments && !director)) return
    if (await ask({ title: row.activo ? 'Retirar Asignatura del Ciclo' : 'Reactivar Asignatura del Ciclo', confirmLabel: row.activo ? 'Retirar Asignatura' : 'Reactivar Asignatura', sensitive: row.activo || !!hasActiveEnrollments, description: `${academicLabel(materias.find(m => m.id === row.materia_id)!)}. ${hasActiveEnrollments ? activeSubjectWarning : row.activo ? (row.origen === 'HEREDADA' ? 'Continuará perteneciendo a el Curso, pero dejará de estar activa únicamente en este Ciclo. Se conserva su historial y los cambios del Curso no la reactivarán.' : 'Dejará de estar activa únicamente en este Ciclo, sin borrar su historial.') : 'Se reactivará explícitamente esta relación conservando su origen.'}` }) === null) return
    await changeSubject(row.materia_id,!row.activo,hasActiveEnrollments===true)
  }
  async function transition(event: FormEvent) {
    event.preventDefault(); if (!selected || !director || !editable || readOnly || dirty || tariffsDirty) return
    if (await ask({ title: `Cambiar estado a ${destino}`, confirmLabel: destino === 'ANULADO' ? 'Anular Ciclo' : destino === 'DESIERTO' ? 'Declarar desierto' : destino === 'CERRADO' ? 'Cerrar Ciclo' : 'Iniciar Ciclo', sensitive: ['ANULADO', 'DESIERTO'].includes(destino), description: `${selected.codigo_ciclo}. ${['CERRADO', 'DESIERTO', 'ANULADO'].includes(destino) ? 'Este cambio es definitivo: el Ciclo quedará solo para consulta y no podrá reabrirse.' : 'El Ciclo pasará a estar en curso.'} Revisa el motivo indicado antes de continuar.` }) === null) return
    setBusy(true); const r = await client.rpc('cambiar_estado_ciclo', { id: selected.id, expected_updated_at: selected.updated_at, destino, motivo: detalle || null, motivo_desierto_id: destino === 'DESIERTO' ? motivoId : null }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo, true, 4); setMessage(`Ciclo declarado ${destino}.`); setRevision(x => x + 1)
  }
  const referenceOptions = (options: Ref[], current: string) => options.filter(x => x.active || x.id === current).map(x => <option key={x.id} value={x.id}>{'sigla' in x ? academicLabel(x as Carrera) : x.nombre}{!x.active ? ' (inactivo histórico)' : ''}</option>)
  function cancelEditing() { setTariffsReset(v=>v+1); if (selected) void edit(selected, true, tab); else {++editEpoch.current;setOpen(false)} }
  const previewRelations: Relacion[] = selected ? relations : [
    ...materias.filter(m=>m.active && inherited.includes(m.id)).map(m=>({id:`career-${m.id}`,materia_id:m.id,activo:true,origen:'HEREDADA',motivo_inactivacion:null})),
    ...additional.filter(id=>!materias.some(m=>m.id===id && m.active && inherited.includes(id))).map(id=>({id:`additional-${id}`,materia_id:id,activo:true,origen:'ADICIONAL',motivo_inactivacion:null})),
  ]
  const availableSubjects = materias.filter(m=>m.active && !previewRelations.some(r=>r.materia_id===m.id))
  const normalizedSubjectSearch = subjectSearch.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()
  const matchingSubjects = normalizedSubjectSearch && !subjectId ? availableSubjects.filter(m=>m.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(normalizedSubjectSearch)) : []
  const canAddSubject = !readOnly && editable && !busy && !dirty && !tariffsDirty && relationsStatus==='ready' && inheritedStatus==='ready' && (!selected || hasActiveEnrollments!==null) && (!hasActiveEnrollments || director)
  async function addSubject() {
    if (!canAddSubject || !availableSubjects.some(m=>m.id===subjectId)) return
    if (!selected) { setAdditional(ids=>[...ids,subjectId]); setSubjectSearch(''); setSubjectId(''); return }
    if(hasActiveEnrollments && await ask({title:'Agregar asignatura con matrículas activas',description:activeSubjectWarning,confirmLabel:'Agregar Asignatura',sensitive:true})===null) return
    await changeSubject(subjectId,true,hasActiveEnrollments===true)
  }

  const cycleSubjects = <>
    <h3>Asignaturas del Ciclo</h3>
    <p className="help-text">Las asignaturas del Curso se incorporan automáticamente al crear el Ciclo. Puedes agregar asignaturas adicionales o retirar una asignatura únicamente de este Ciclo.</p>
    {hasActiveEnrollments && <p role="note" className="help-text">{director ? 'Este Ciclo tiene matrículas activas. Cambiar sus asignaturas requiere tu confirmación.' : 'Este Ciclo tiene matrículas activas. Solo el Director puede modificar sus asignaturas.'}</p>}
    {!selected && <p className="help-text">Esta lista se guardará al crear el Ciclo.</p>}
    {!readOnly && dirty && <p className="help-text">Guarda o cancela los cambios del Ciclo para modificar sus asignaturas.</p>}
    {(relationsStatus==='loading' || inheritedStatus==='loading') && <p role="status">Cargando asignaturas del Ciclo…</p>}
    {(relationsStatus==='error' || inheritedStatus==='error') && <p role="alert">No se pudieron consultar las asignaturas. Vuelve a abrir la ficha antes de modificarlas.</p>}
    {inheritedStatus==='idle' && <p>Selecciona un Curso para ver sus Asignaturas.</p>}
    {!readOnly && editable && <div className="cycle-subject-search">
      <label>Agregar asignatura adicional<input type="search" placeholder="Buscar asignatura adicional…" value={subjectSearch} disabled={!canAddSubject} onChange={e=>{setSubjectSearch(formTextValue(e.currentTarget));setSubjectId('')}} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();if(e.key==='Escape'){setSubjectSearch('');setSubjectId('')}}}/></label>
      <button type="button" disabled={!canAddSubject || !subjectId} onClick={()=>void addSubject()}>Agregar</button>
      {canAddSubject && normalizedSubjectSearch && !subjectId && <div className="cycle-subject-results"><ul aria-label="Resultados de asignaturas adicionales">{matchingSubjects.slice(0,8).map(m=><li key={m.id}><button type="button" onClick={()=>{setSubjectId(m.id);setSubjectSearch(m.nombre)}}>{m.nombre}</button></li>)}</ul><p className="help-text" role="status">{matchingSubjects.length ? matchingSubjects.length>8 ? 'Se muestran 8 resultados. Escribe más para precisar la búsqueda.' : `${matchingSubjects.length} coincidencias` : 'No hay asignaturas activas disponibles que coincidan.'}</p></div>}
    </div>}
    {relationsStatus==='ready' && inheritedStatus!=='loading' && inheritedStatus!=='error' && <div className="table-scroll"><table aria-label="Asignaturas del Ciclo"><thead><tr><th scope="col">Asignatura</th><th scope="col">Origen</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead><tbody>
      {previewRelations.filter(r=>showRetired || r.activo).map(r=>{const m=materias.find(m=>m.id===r.materia_id);return <tr key={r.id}><td>{m?.nombre ?? 'Referencia no disponible'}</td><td>{r.origen==='HEREDADA'?'Curso':'Adicional'}</td><td><span title={!r.activo ? r.motivo_inactivacion==='CAMBIO_CARRERA'?'Retirada por cambio de Curso':'Retirada manualmente':undefined}>{r.activo?'Activa':'Retirada'}</span></td><td>{!readOnly && editable ? selected ? <button type="button" className="secondary" disabled={busy || dirty || tariffsDirty || relationsStatus!=='ready' || (!!hasActiveEnrollments && !director)} onClick={()=>void relation(r)}>{r.activo?'Retirar':'Reactivar'}</button> : r.origen==='ADICIONAL' ? <button type="button" className="secondary" disabled={busy} onClick={()=>setAdditional(ids=>ids.filter(id=>id!==r.materia_id))}>Quitar</button> : 'Al crear el Ciclo' : 'Solo consulta'}</td></tr>})}
      {!previewRelations.some(r=>showRetired || r.activo) && <tr><td colSpan={4}>{showRetired?'No hay asignaturas registradas.':'No hay asignaturas activas en este Ciclo.'}</td></tr>}
    </tbody></table></div>}
    {selected && <label className="show-retired-subjects"><input type="checkbox" checked={showRetired} onChange={e=>setShowRetired(e.currentTarget.checked)}/>Mostrar retiradas</label>}
  </>
  if(open) return <section className="academic-record cycle-record">{dialog}<AcademicRecordHeader title={selected ? 'Ficha de Ciclo' : 'Nuevo Ciclo'} name={selected?.codigo_ciclo} status={selected && <StatusBadge value={selected.estado_codigo}/>} editing={!readOnly} busy={busy||enrollmentPanelOpen||tariffsBusy} backLabel="Volver a ciclos" editLabel="Editar Ciclo" onBack={()=>{++editEpoch.current;setOpen(false)}} onEdit={readOnly && selected && canEditCycle(selected) ? ()=>setReadOnly(false) : undefined}/><Notice message={message}/>
    {selected && !editable && <p>{['PROGRAMADO','EN_CURSO'].includes(selected.estado_codigo) ? 'Solo consulta. Tu acceso no permite modificar este Ciclo.' : 'Solo consulta. Este Ciclo ya no admite cambios y no puede reabrirse.'}</p>}
    <AcademicTabs id="cycle-sections" names={selected ? ['Datos','Asignaturas','Tarifas','Matrículas','Estado'] : ['Datos','Asignaturas']} active={tab} disabled={busy||enrollmentPanelOpen||tariffsBusy} onChange={setTab}/>
    <div hidden={tab>=2}><InlineForm id={cycleFormId} className="academic-record-form" key={`${selected?.id ?? 'new'}-${readOnly}`} aria-describedby={message ? 'academic-message' : undefined} onInvalidField={field=>setTab(Number(field.closest<HTMLElement>('[data-academic-tab]')?.dataset.academicTab ?? 0))} onSubmit={event=>void save(event)}>
      <div hidden={tab!==0} data-academic-tab="0" role="tabpanel" tabIndex={0} id="cycle-sections-panel-0" aria-labelledby="cycle-sections-tab-0" className="student-section-panel cycle-data-panel"><fieldset className="cycle-data" disabled={busy}><legend>Datos del Ciclo</legend><fieldset className="academic-fields" aria-label="Datos principales">
        <label><span className="field-label">Curso{!readOnly && ' *'}</span>{readOnly ? <input aria-label="Curso" readOnly value={academicLabel(carreras.find(c=>c.id===draft.carrera_id))}/> : <select aria-label="Curso" required value={draft.carrera_id} onChange={e=>setDraft({...draft,carrera_id:formTextValue(e.currentTarget)})}><option value="">Seleccionar</option>{referenceOptions(carreras,draft.carrera_id)}</select>}</label>
        <label>Nombre de promoción (opcional)<input aria-label="Nombre de promoción (opcional)" readOnly={readOnly} maxLength={150} value={draft.nombre_promocion ?? ''} onChange={e=>setDraft({...draft,nombre_promocion:formTextValue(e.currentTarget)})}/></label>
        <label><span className="field-label">Fecha de inicio{!readOnly && ' *'}</span><input aria-label="Fecha de inicio" readOnly={readOnly} required={!readOnly} type={readOnly?'text':'date'} value={readOnly?academicDate(draft.fecha_inicio):draft.fecha_inicio} onChange={e=>setDraft({...draft,fecha_inicio:formTextValue(e.currentTarget)})}/></label>
        <label><span className="field-label">Fecha de fin{!readOnly && ' *'}</span><input aria-label="Fecha de fin" readOnly={readOnly} required={!readOnly} type={readOnly?'text':'date'} min={readOnly?undefined:draft.fecha_inicio} value={readOnly?academicDate(draft.fecha_fin):draft.fecha_fin} onChange={e=>setDraft({...draft,fecha_fin:formTextValue(e.currentTarget)})}/></label>
      </fieldset><fieldset className="academic-fields"><legend>Ubicación</legend>
        <label><span className="field-label">Departamento{!readOnly && ' *'}</span>{readOnly?<input aria-label="Departamento" readOnly value={departamentos.find(x=>x.id===draft.departamento_id)?.nombre ?? 'Referencia no disponible'}/>:<select aria-label="Departamento" required value={draft.departamento_id} onChange={e=>setDraft({...draft,departamento_id:formTextValue(e.currentTarget),provincia_id:'',distrito_id:''})}><option value="">Seleccionar</option>{referenceOptions(departamentos,draft.departamento_id)}</select>}</label>
        <label><span className="field-label">Provincia{!readOnly && ' *'}</span>{readOnly?<input aria-label="Provincia" readOnly value={provincias.find(x=>x.id===draft.provincia_id)?.nombre ?? 'Referencia no disponible'}/>:<select aria-label="Provincia" required value={draft.provincia_id} onChange={e=>setDraft({...draft,provincia_id:formTextValue(e.currentTarget),distrito_id:''})}><option value="">Seleccionar</option>{referenceOptions(provincias.filter(x=>x.departamento_id===draft.departamento_id),draft.provincia_id)}</select>}</label>
        <label><span className="field-label">Distrito{!readOnly && ' *'}</span>{readOnly?<input aria-label="Distrito" readOnly value={distritos.find(x=>x.id===draft.distrito_id)?.nombre ?? 'Referencia no disponible'}/>:<select aria-label="Distrito" required value={draft.distrito_id} onChange={e=>setDraft({...draft,distrito_id:formTextValue(e.currentTarget)})}><option value="">Seleccionar</option>{referenceOptions(distritos,draft.distrito_id)}</select>}</label>
        <label><span className="field-label">Capitanía{!readOnly && ' *'}</span>{readOnly?<input aria-label="Capitanía" readOnly value={capitanias.find(x=>x.id===draft.capitania_id)?.nombre ?? 'Referencia no disponible'}/>:<select aria-label="Capitanía" required value={draft.capitania_id} onChange={e=>setDraft({...draft,capitania_id:formTextValue(e.currentTarget)})}><option value="">Seleccionar</option>{referenceOptions(capitanias,draft.capitania_id)}</select>}</label>
      </fieldset></fieldset></div>
      <div hidden={tab!==1} data-academic-tab="1" role="tabpanel" tabIndex={0} id="cycle-sections-panel-1" aria-labelledby="cycle-sections-tab-1" className="student-section-panel cycle-subject-panel">{cycleSubjects}</div>

    </InlineForm></div>
    {selected && <div hidden={tab!==2} role="tabpanel" tabIndex={0} id="cycle-sections-panel-2" aria-labelledby="cycle-sections-tab-2" className="student-section-panel"><CycleTariffs key={`${selected.id}-${tariffsReset}`} cycle={selected} blocked={dirty||busy} onDirtyChange={setTariffsDirty} onBusyChange={setTariffsBusy} onReadyChange={setTariffsReady} onChanged={saved=>{setSelected(current=>current?{...current,updated_at:saved.updated_at}:current);setRevision(v=>v+1)}}/></div>}
    {selected && <div hidden={tab!==3} role="tabpanel" tabIndex={0} id="cycle-sections-panel-3" aria-labelledby="cycle-sections-tab-3" className="student-section-panel">{tab===3&&<>{tariffsReady!==true&&['PROGRAMADO','EN_CURSO'].includes(selected.estado_codigo)&&<p role="alert">{tariffsDirty?'Guarda o cancela los cambios de Tarifas antes de matricular.':tariffsReady===null?'La configuración de tarifas todavía no está disponible.':'El Ciclo requiere exactamente una tarifa de Curso activa y obligatoria.'} <button type="button" className="secondary" onClick={()=>setTab(2)}>Revisar tarifas del Ciclo</button></p>}<CycleEnrollments cycle={selected} blocked={dirty||busy||tariffsDirty||tariffsReady!==true} blockedMessage={tariffsReady!==true?'':undefined} onPanelChange={setEnrollmentPanelOpen}/></>}</div>}
    {selected && <div hidden={tab!==4} role="tabpanel" tabIndex={0} id="cycle-sections-panel-4" aria-labelledby="cycle-sections-tab-4" className="student-section-panel cycle-state-panel"><header className="cycle-state-heading"><h3>Estado del Ciclo</h3><StatusBadge value={selected.estado_codigo}/></header>{!readOnly && editable && director ? <>{dirty && <p>Guarda o cancela los cambios del Ciclo antes de cambiar su estado.</p>}<InlineForm className="cycle-state-form" onSubmit={event=>void transition(event)}><p>Elige el siguiente estado. Cerrar, declarar desierto o anular son cambios definitivos.</p><fieldset className="academic-fields" disabled={busy||dirty||tariffsDirty} aria-label="Cambiar estado">
      <label><span className="field-label">Nuevo estado *</span><select aria-label="Nuevo estado" required value={destino} onChange={e=>setDestino(formTextValue(e.currentTarget))}><option value="">Seleccionar</option>{(selected.estado_codigo==='PROGRAMADO'?['EN_CURSO','DESIERTO','ANULADO']:['CERRADO','DESIERTO']).map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
      {destino==='DESIERTO'&&<label><span className="field-label">Motivo de Ciclo Desierto *</span><select aria-label="Motivo de Ciclo Desierto" required value={motivoId} onChange={e=>setMotivoId(formTextValue(e.currentTarget))}><option value="">Seleccionar</option>{motivos.filter(x=>x.activo).map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>}
      {(destino==='ANULADO'||destino==='DESIERTO')&&<label>Detalle / motivo{destino==='ANULADO'||motivos.find(x=>x.id===motivoId)?.codigo==='OTRO'?' (obligatorio)':' (opcional)'}<textarea rows={2} required={destino==='ANULADO'||motivos.find(x=>x.id===motivoId)?.codigo==='OTRO'} value={detalle} onChange={e=>setDetalle(formTextValue(e.currentTarget))}/></label>}
    </fieldset><div className="form-actions"><button className={destino==='ANULADO'||destino==='DESIERTO'?'sensitive':undefined} disabled={busy||dirty||tariffsDirty}>Confirmar transición</button></div>
    </InlineForm></> : <p>{!editable ? 'Este Ciclo permanece solo para consulta.' : director?'Para cambiar el estado, selecciona Editar Ciclo.':'Solo el Director puede cambiar el estado.'}</p>}</div>}
    {!readOnly&&<div className="form-actions cycle-record-actions"><button type="button" className="secondary" disabled={busy||tariffsBusy||enrollmentPanelOpen} onClick={cancelEditing}>{selected?'Cancelar':'Cancelar / descartar formulario'}</button><button type="submit" form={cycleFormId} disabled={busy||tariffsBusy||tariffsDirty||enrollmentPanelOpen||inheritedStatus==='loading'||inheritedStatus==='error'}>Guardar Ciclo</button>{tariffsDirty&&<small>Guarda o cancela primero los cambios de Tarifas.</small>}</div>}

  </section>
  return <section>{dialog}<h2>Ciclos</h2><div className="filters academic-toolbar" role="search" aria-label="Búsqueda de ciclos"><AcademicSearch label="Buscar Ciclo por código o Curso" placeholder="Código de Ciclo o nombre de Curso" value={search} onChange={text=>{setSearch(text);setPage(0)}}/><label>Estado del listado<select value={estado} onChange={e=>{setEstado(e.currentTarget.value);setPage(0)}}><option value="">Todos</option>{['PROGRAMADO','EN_CURSO','CERRADO','DESIERTO','ANULADO'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><div className="record-header-actions">{canModify&&<AcademicAction label="Crear Ciclo" createFor="Ciclos" icon="new" disabled={busy} onClick={()=>void edit(null)}/>}</div></div><Notice message={message}/>{loading&&<p role="status">Cargando ciclos…</p>}
    <div className="table-scroll academic-grid"><table aria-label="Ciclos"><thead><tr><th scope="col">Código</th><th scope="col">Curso</th><th scope="col">Capitanía</th><th scope="col">Inicio</th><th scope="col">Fin</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{!loading&&!loadError&&rows.length===0&&<tr><td colSpan={7}><div className="empty-state"><p>{search||estado?'No hay Ciclos que coincidan con los filtros.':'No hay Ciclos registrados.'}</p>{canModify&&!search&&!estado&&<button onClick={()=>void edit(null)}>Crear primer Ciclo</button>}</div></td></tr>}{rows.map(row=><tr key={row.id}><td><button className="student-row-name company-row-name" onClick={()=>void edit(row,true)}>{row.codigo_ciclo}</button></td><td>{academicLabel(carreras.find(c=>c.id===row.carrera_id))}</td><td>{capitanias.find(c=>c.id===row.capitania_id)?.nombre??'—'}</td><td>{academicDate(row.fecha_inicio)}</td><td>{academicDate(row.fecha_fin)}</td><td><StatusBadge value={row.estado_codigo}/></td><td><div className="student-row-actions"><AcademicAction label={`Ver ${row.codigo_ciclo}`} icon="view" disabled={busy} onClick={()=>void edit(row,true)}/>{canEditCycle(row)&&<AcademicAction label={`Editar ${row.codigo_ciclo}`} icon="edit" disabled={busy} onClick={()=>void edit(row)}/>}</div></td></tr>)}</tbody></table></div><AcademicPagination page={page} count={rows.length} disabled={busy||loading} onChange={setPage}/>
  </section>
}

type Audit = { id: string; entidad: string; registro_id: string; accion: string; actor: string; fecha: string; motivo: string | null; old_values: unknown; new_values: unknown }
const fieldNames: Record<string, string> = { codigo: 'Código', nombre: 'Nombre', descripcion: 'Descripción', active: 'Activo', activo: 'Activo', sigla: 'Sigla', fecha_inicio: 'Inicio', fecha_fin: 'Fin', estado_codigo: 'Estado', nombre_promocion: 'Promoción', carrera_id: 'Curso', materia_id: 'Asignatura', modalidad_id: 'Modalidad', con_experiencia: 'Con experiencia', codigo_curso_dicapi: 'Código de curso DICAPI', resolucion_malla_curricular: 'Resolución de malla curricular', fecha_resolucion_malla: 'Fecha de resolución de malla', resolucion_autorizacion_centro: 'Resolución de autorización del centro', observaciones_normativas: 'Observaciones normativas', url_resolucion_malla: 'URL de resolución de malla', capitania_id: 'Capitanía', departamento_id: 'Departamento', provincia_id: 'Provincia', distrito_id: 'Distrito', origen: 'Origen', motivo_inactivacion: 'Motivo de retiro', updated_at: 'Actualización', created_at: 'Creación', id: 'Identificador' }
const entityNames: Record<string, string> = { materia: 'Asignatura', carrera: 'Curso', ciclo: 'Ciclo', carrera_materia: 'Asignaturas del Curso', ciclo_materia: 'Asignaturas del Ciclo' }
const actionNames: Record<string, string> = { CREATE: 'Creación', UPDATE: 'Actualización', INACTIVATE: 'Inactivación', REACTIVATE: 'Reactivación', ASOCIACION_RETIRADA: 'Asociación retirada', EN_CURSO: 'Inicio de Ciclo', CERRADO: 'Cierre de Ciclo', DESIERTO: 'Ciclo desierto', ANULADO: 'Anulación de Ciclo' }
function auditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)) return `Referencia …${value.slice(-8)}`
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
function AuditChanges({ row }: { row: Audit }) {
  const before = row.old_values && typeof row.old_values === 'object' ? row.old_values as Record<string, unknown> : {}
  const after = row.new_values && typeof row.new_values === 'object' ? row.new_values as Record<string, unknown> : {}
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => !['id', 'created_at', 'updated_at', ...(['materia','carrera'].includes(row.entidad) ? ['codigo'] : [])].includes(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
  return <details><summary>Ver cambios ({changed.length})</summary><dl className="audit-changes">{changed.map(key => <div key={key}><dt>{fieldNames[key] ?? key.replaceAll('_', ' ')}</dt><dd><span>Antes: {auditValue(before[key])}</span><span>Después: {auditValue(after[key])}</span></dd></div>)}</dl><details className="technical-details"><summary>Detalle técnico completo</summary><p>Evento: <code className="identifier">{row.id}</code><br />Registro: <code className="identifier">{row.registro_id}</code></p><pre>{JSON.stringify({ antes: Object.fromEntries(Object.entries(before).filter(([key]) => key !== 'codigo' || !['materia','carrera'].includes(row.entidad))), despues: Object.fromEntries(Object.entries(after).filter(([key]) => key !== 'codigo' || !['materia','carrera'].includes(row.entidad))) }, null, 2)}</pre></details></details>
}
export function Auditoria() {
  const { client, state } = useSession()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Audit[]>([]), [desde, setDesde] = useState(''), [hasta, setHasta] = useState(''), [actor, setActor] = useState(''), [entidad, setEntidad] = useState(''), [accion, setAccion] = useState(''), [message, setMessage] = useState('')
  useEffect(() => {
    let current = true
    setLoading(true)
    let q = client.from('auditoria').select('id,entidad,registro_id,accion,actor,fecha,motivo,old_values,new_values').order('fecha', { ascending: false }).limit(100)
    if (desde) q = q.gte('fecha', `${desde}T00:00:00-05:00`)
    if (hasta) q = q.lte('fecha', `${hasta}T23:59:59.999999-05:00`)
    if (actor) q = q.eq('actor', actor)
    if (entidad) q = q.eq('entidad', entidad)
    if (accion) q = q.eq('accion', accion)
    void q.then(r => { if (current) { setLoading(false); setRows(r.error ? [] : r.data as Audit[]); setMessage(r.error ? 'No se pudo consultar auditoría. Revisa los filtros.' : '') } })
    return () => { current = false }
  }, [client, desde, hasta, actor, entidad, accion])
  return <section><div className="page-heading"><div><h2>Auditoría</h2><p>Revisa quién cambió la información, cuándo y por qué. Solo consulta.</p></div></div>
    <div className="filters" role="group" aria-label="Filtrar auditoría"><label>Desde (Lima)<input type="date" value={desde} onChange={e => setDesde(formTextValue(e.currentTarget))} /></label><label>Hasta (Lima)<input type="date" value={hasta} onChange={e => setHasta(formTextValue(e.currentTarget))} /></label>
    <label>Identificador de cuenta<input value={actor} onChange={e => setActor(formTextValue(e.currentTarget))} /></label><label>Entidad<select value={entidad} onChange={e => setEntidad(formTextValue(e.currentTarget))}><option value="">Todas</option>{Object.entries(entityNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Acción<select value={accion} onChange={e => setAccion(formTextValue(e.currentTarget))}><option value="">Todas</option>{Object.entries(actionNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><Notice message={message} />
    {loading && <p role="status">Cargando eventos…</p>}
    <div className="table-scroll"><table><caption>Últimos 100 eventos por filtro · hora de Lima</caption><thead><tr><th>Fecha / hora</th><th>Cuenta</th><th>Entidad</th><th>Acción</th><th>Motivo</th><th>Cambios</th></tr></thead><tbody>{!loading && !message && !rows.length && <tr><td colSpan={6}><div className="empty-state">No hay eventos que coincidan con los filtros.</div></td></tr>}{rows.map(r => <tr key={r.id}><td><time dateTime={r.fecha}>{new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(r.fecha))}</time></td><td>{r.actor === state.userId ? 'Mi cuenta' : `Cuenta …${r.actor.slice(-8)}`}<details><summary>Ver identificador</summary><code className="identifier">{r.actor}</code></details></td><td>{entityNames[r.entidad] ?? r.entidad}<small className="secondary-text">{auditValue(['materia','carrera'].includes(r.entidad) ? (r.new_values as Record<string, unknown> | null)?.nombre ?? (r.old_values as Record<string, unknown> | null)?.nombre : (r.new_values as Record<string, unknown> | null)?.codigo_ciclo)}</small></td><td>{actionNames[r.accion] ?? r.accion}</td><td>{r.motivo || 'Sin motivo adicional'}</td><td><AuditChanges row={r} /></td></tr>)}</tbody></table></div>
  </section>
}
