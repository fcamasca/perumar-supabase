import { formTextValue } from '../lib/formText'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { EmptyState, InlineForm, StatusBadge, useConfirmation } from './AcademicUi'
import { AcademicAction, AcademicSearch, AcademicPagination, AcademicRecordHeader, AcademicTabs } from './AcademicLayout'
import { useSession } from '../security/SessionProvider'

type Ref = { id: string; nombre: string; active: boolean }
type Materia = Ref & { descripcion: string | null; updated_at: string }
type Carrera = Materia & { sigla: string; modalidad_id: string | null; con_experiencia: boolean }
type Valor = { id: string; catalogo_id: string; codigo: string; nombre: string; activo: boolean }
type Ciclo = { id: string; carrera_id: string; codigo_ciclo: string; fecha_inicio: string; fecha_fin: string; nombre_promocion: string | null; departamento_id: string; provincia_id: string; distrito_id: string; capitania_id: string; estado_codigo: string; updated_at: string }
type Relacion = { id: string; materia_id: string; activo: boolean; origen: string; motivo_inactivacion: string | null }
const materiaColumns = 'id,nombre,descripcion,active,updated_at'
const carreraColumns = `${materiaColumns},sigla,modalidad_id,con_experiencia`
const cicloColumns = 'id,carrera_id,codigo_ciclo,fecha_inicio,fecha_fin,nombre_promocion,departamento_id,provincia_id,distrito_id,capitania_id,estado_codigo,updated_at'

export function academicError(error: { code?: string; message?: string } | null, entity: 'Materia' | 'Carrera' | 'Ciclo' = 'Ciclo'): string {
  if (error?.code === '40001') return 'El registro fue modificado por otro usuario. Actualiza la información antes de volver a guardar.'
  if (error?.code === '23505') {
    const field = /_codigo_key/.test(error.message ?? '') ? 'código' : /_nombre_key/.test(error.message ?? '') ? 'nombre' : entity === 'Carrera' && /_sigla_key/.test(error.message ?? '') ? 'sigla' : null
    return field ? `El ${field} de ${entity} ya está utilizado, incluso en registros inactivos.` : entity === 'Materia' ? 'El nombre de Materia ya está utilizado, incluso en registros inactivos.' : entity === 'Carrera' ? 'El nombre o sigla de Carrera ya está utilizado, incluso en registros inactivos.' : 'La relación o el código ya está registrado.'
  }
  if (error?.code === '23514') {
    if (/Cada Carrera requiere al menos|Seleccione al menos una Materia activa/.test(error.message ?? '')) return 'La Carrera debe conservar al menos una Materia activa. Asocia primero otra Materia activa.'
    if (error.message === 'El Ciclo requiere una Materia activa') return 'El Ciclo debe tener al menos una Materia activa.'
    if (error.message === 'Valor de catálogo no válido o inactivo') return 'Selecciona un valor vigente del catálogo correspondiente.'
    if (error.message === 'Detalle obligatorio para OTRO') return 'Indica el detalle del motivo OTRO.'
  }
  if (error?.code === '23P01') return 'Las fechas se superponen con otro Ciclo de la misma Carrera y Capitanía.'
  if (error?.code === '42501') return 'No tienes permiso para realizar esta operación.'
  return 'No se pudo guardar. Revisa campos, relaciones, materias activas y estado; recarga si cambió la información.'
}
// Quote the PostgREST operand so punctuation cannot become filter operators.
const academicSearchPattern = (text: string) => JSON.stringify(`%${text.trim()}%`)
const siglaOrNameFilter = (text: string) => `sigla.ilike.${academicSearchPattern(text)},nombre.ilike.${academicSearchPattern(text)}`
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
  useListFocus(open, 'Materias')
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
    void query.then(result => { if (current) { setLoading(false); setLoadError(!!result.error); setRows(result.error ? [] : result.data as Materia[]); if (result.error) setMessage('No se pudo consultar Materias.') } })
    return () => { current = false }
  }, [client, revision, search, status, page])
  function edit(row: Materia | null, view = false) { setReadOnly(view || !director); setOpen(true); setSelected(row); setNombre(row?.nombre ?? ''); setDescripcion(row?.descripcion ?? ''); setMessage('') }
  async function save(event: FormEvent) {
    event.preventDefault(); if (readOnly || !director) return; setBusy(true); setMessage('')
    const result = await client.rpc('guardar_materia', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), nombre, descripcion: descripcion || null } })
    setBusy(false)
    if (result.error) { setMessage(academicError(result.error, 'Materia')); return }
    setOpen(false); setMessage(selected ? 'Materia actualizada correctamente.' : 'Materia creada correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Materia) {
    setMessage('')
    if (row.active) {
      setBusy(true)
      const [links, subjects, careers] = await Promise.all([client.from('carrera_materia').select('carrera_id,materia_id'), client.from('materia').select('id').eq('active', true), client.from('carrera').select('id,sigla,nombre')])
      setBusy(false)
      if (links.error || subjects.error || careers.error) { setMessage('No se pudo comprobar la viabilidad. Recarga e inténtalo de nuevo.'); return }
      const affected = careers.data.filter(c => links.data.some(l => l.carrera_id === c.id && l.materia_id === row.id) && !links.data.some(l => l.carrera_id === c.id && l.materia_id !== row.id && subjects.data.some(m => m.id === l.materia_id)))
      if (affected.length) { setMessage(`No se puede inactivar esta Materia porque dejaría una Carrera sin Materias activas: ${affected.map(academicLabel).join(', ')}. Asocia primero otra Materia activa.`); return }
    }
    const motivo = await ask({ title: `${row.active ? 'Inactivar' : 'Reactivar'} Materia`, description: `${academicLabel(row)}. ${row.active ? 'Dejará de cargarse para nuevos Ciclos. Se conservan las referencias existentes.' : 'Volverá a estar disponible para nuevas selecciones; no reactiva relaciones retiradas.'}`, reason: row.active, confirmLabel: row.active ? 'Inactivar' : 'Reactivar', sensitive: row.active })
    if (motivo === null) return
    setBusy(true)
    const result = await client.rpc('cambiar_active_materia', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo })
    setBusy(false); setMessage(result.error ? academicError(result.error, 'Materia') : `Materia ${row.active ? 'inactivada' : 'reactivada'} correctamente.`); if (!result.error) setRevision(x => x + 1)
  }
  function cancelEditing() { if (selected) edit(selected, true); else setOpen(false) }
  if (open) return <section className="academic-record">{dialog}<AcademicRecordHeader title={selected ? 'Ficha de Materia' : 'Nueva Materia'} name={selected ? academicLabel(selected) : undefined} status={selected && <StatusBadge value={selected.active ? 'Activo' : 'Inactivo'}/>} editing={!readOnly} busy={busy} backLabel="Volver a materias" editLabel="Editar Materia" onBack={() => setOpen(false)} onEdit={readOnly && director ? () => setReadOnly(false) : undefined}/><Notice message={message}/>
    <InlineForm key={`${selected?.id ?? 'new'}-${readOnly}`} aria-describedby={message ? 'academic-message' : undefined} onSubmit={event => void save(event)}><fieldset className="academic-fields" disabled={busy}><legend>Datos de Materia</legend>
      <label><span className="field-label">Nombre de Materia{!readOnly && ' *'}</span>{!readOnly && <small>Máximo 150 caracteres</small>}<input aria-label="Nombre de Materia" readOnly={readOnly} required={!readOnly} maxLength={150} value={nombre} onChange={e => setNombre(formTextValue(e.currentTarget))}/></label>
      <label>Descripción de Materia{!readOnly && <small>Máximo 500 caracteres</small>}<textarea rows={2} aria-label="Descripción de Materia" readOnly={readOnly} maxLength={500} value={descripcion} onChange={e => setDescripcion(formTextValue(e.currentTarget))}/>{!readOnly && <small>{descripcion.length} / 500</small>}</label>
    </fieldset>{!readOnly && <div className="form-actions"><button className="secondary" disabled={busy} type="button" onClick={cancelEditing}>Cancelar</button><button disabled={busy}>Guardar Materia</button></div>}</InlineForm>
  </section>
  return <section>{dialog}<h2>Materias</h2><div className="filters academic-toolbar" role="search" aria-label="Búsqueda de materias"><AcademicSearch label="Buscar Materia por nombre" placeholder="Nombre" value={search} onChange={text => {setSearch(text);setPage(0)}}/><label>Estado de Materia<select value={status} onChange={e => {setStatus(e.currentTarget.value);setPage(0)}}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label><div className="record-header-actions">{director && <AcademicAction label="Crear Materia" createFor="Materias" icon="new" disabled={busy} onClick={() => edit(null)}/>}</div></div><Notice message={message}/>
    {loading && <p role="status">Cargando materias…</p>}<div className="table-scroll academic-grid"><table aria-label="Materias"><thead><tr><th scope="col">Nombre</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{!loading && !loadError && rows.length === 0 && <tr><td colSpan={3}><EmptyState entity="Materias" filtered={!!(search || status)} onCreate={director ? () => edit(null) : undefined}/></td></tr>}{rows.map(row => <tr key={row.id}><td><button className="student-row-name company-row-name" onClick={() => edit(row,true)}>{row.nombre}</button></td><td><StatusBadge value={row.active ? 'Activo' : 'Inactivo'}/></td><td><div className="student-row-actions"><AcademicAction label={`Ver ${row.nombre}`} icon="view" disabled={busy} onClick={() => edit(row,true)}/>{director && <><AcademicAction label={`Editar ${row.nombre}`} icon="edit" disabled={busy} onClick={() => edit(row)}/><AcademicAction label={`${row.active ? 'Inactivar' : 'Reactivar'} ${row.nombre}`} icon={row.active ? 'off' : 'on'} disabled={busy} onClick={() => void activate(row)}/></>}</div></td></tr>)}</tbody></table></div><AcademicPagination page={page} count={rows.length} disabled={busy || loading} onChange={setPage}/>
  </section>
}

export function Carreras() {
  const [open, setOpen] = useState(false), [readOnly, setReadOnly] = useState(true), [page, setPage] = useState(0), [tab, setTab] = useState(0)
  const [subjectsStatus, setSubjectsStatus] = useState<'loading' | 'ready' | 'error'>('ready')
  useListFocus(open, 'Carreras')
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false)
  const { client, state } = useSession(), director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const editEpoch = useRef(0), originalChosen = useRef<string[]>([])
  const siglaManual = useRef(false)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [rows, setRows] = useState<Carrera[]>([]), [materias, setMaterias] = useState<Materia[]>([]), [modalidades, setModalidades] = useState<Valor[]>([])
  const [selected, setSelected] = useState<Carrera | null>(null), [chosen, setChosen] = useState<string[]>([])
  const [nombre, setNombre] = useState(''), [descripcion, setDescripcion] = useState(''), [sigla, setSigla] = useState(''), [modalidad, setModalidad] = useState('')
  const [experiencia, setExperiencia] = useState(false)
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
      if (c.error || m.error || cat.error) { setLoading(false); setLoadError(true); setRows([]); setMessage('No se pudieron consultar las referencias de Carrera.'); return }
      const values = await client.from('catalogo_valor').select('id,catalogo_id,codigo,nombre,activo').eq('catalogo_id', cat.data.id)
      if (current) { setLoading(false); if (values.error) { setLoadError(true); setMessage('No se pudo consultar la modalidad. Recarga la información.'); return }; setRows(c.data as Carrera[]); setMaterias(m.data as Materia[]); setModalidades(values.data ?? []) }
    })()
    return () => { current = false }
  }, [client, search, revision, activeStatus, page])
  async function edit(row: Carrera | null, view = false, section = 0) {
    setReadOnly(view || !director); setTab(section); setSubjectsStatus(row ? 'loading' : 'ready')
    setOpen(true); setSubjectSearch('')
    const request = ++editEpoch.current
    setSelected(row); setNombre(row?.nombre ?? ''); setDescripcion(row?.descripcion ?? ''); setSigla(row?.sigla ?? ''); siglaManual.current = !!row; originalChosen.current = []; setModalidad(row ? row.modalidad_id ?? '' : modalidades.find(x => x.codigo === 'PRESENCIAL' && x.activo)?.id ?? ''); setExperiencia(row?.con_experiencia ?? false); setChosen([]); setMessage('')
    if (row) { const r = await client.from('carrera_materia').select('materia_id').eq('carrera_id', row.id); if (request !== editEpoch.current) return; if (!r.error) { originalChosen.current = r.data.map(x => x.materia_id); setChosen(originalChosen.current); setSubjectsStatus('ready') } else { setSubjectsStatus('error'); setMessage('No se pudieron consultar las Materias de Carrera. Vuelve a la lista y abre la ficha para recargar.') } }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (readOnly || !director || subjectsStatus !== 'ready') return
    if (!chosen.some(id => materias.some(m => m.id === id && m.active))) { setTab(1); setMessage('Selecciona al menos una Materia activa.'); return }
    const warnings: string[] = []
    if (selected && selected.sigla !== sigla.trim().toUpperCase()) warnings.push('El cambio de sigla actualizará los sufijos de los Ciclos PROGRAMADO/EN_CURSO afectados. Los terminales conservarán su código histórico.')
    if (selected && chosen.some(id => !originalChosen.current.includes(id) && materias.some(m => m.id === id && m.active))) {
      setBusy(true)
      const cycles = await client.from('ciclo').select('id').eq('carrera_id', selected.id).in('estado_codigo', ['PROGRAMADO', 'EN_CURSO'])
      setBusy(false)
      if (cycles.error) { setMessage('No se pudieron comprobar los Ciclos afectados. Recarga e inténtalo de nuevo.'); return }
      if (cycles.data.length) warnings.push(`Esta Carrera tiene ${cycles.data.length} Ciclos modificables asociados. Las nuevas Materias se agregarán únicamente donde falten en PROGRAMADO y EN_CURSO. Las Materias retiradas manualmente no se reactivarán ni se reclasificarán y los Ciclos terminales no serán modificados.`)
    }
    if (warnings.length && await ask({ title: 'Confirmar cambios de Carrera', confirmLabel: 'Guardar cambios', description: `${academicLabel({ sigla, nombre })}. ${warnings.join(' ')}` }) === null) return
    setBusy(true)
    const r = await client.rpc('guardar_carrera', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), nombre, descripcion: descripcion || null, sigla, modalidad_id: modalidad || null, con_experiencia: experiencia }, materias: chosen })
    setBusy(false); if (r.error) { setMessage(academicError(r.error, 'Carrera')); return }; ++editEpoch.current; setOpen(false); setMessage(selected ? 'Carrera actualizada correctamente.' : 'Carrera creada correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Carrera) {
    const motivo = await ask({ title: `${row.active ? 'Inactivar' : 'Reactivar'} Carrera`, description: `${academicLabel(row)}. ${row.active ? 'Dejará de estar disponible para nuevos Ciclos. Se conservan las referencias existentes.' : 'Volverá a estar disponible para nuevos Ciclos.'}`, reason: row.active, confirmLabel: row.active ? 'Inactivar' : 'Reactivar', sensitive: row.active })
    if (motivo === null) return
    setBusy(true); const r = await client.rpc('cambiar_active_carrera', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo }); setBusy(false)
    setMessage(r.error ? academicError(r.error, 'Carrera') : `Carrera ${row.active ? 'inactivada' : 'reactivada'} correctamente.`); if (!r.error) setRevision(x => x + 1)
  }
  function cancelEditing() { if (selected) void edit(selected, true, tab); else { ++editEpoch.current; setOpen(false) } }
  if (open) return <section className="academic-record career-record">{dialog}<AcademicRecordHeader title={selected ? 'Ficha de Carrera' : 'Nueva Carrera'} name={selected ? academicLabel(selected) : undefined} status={selected && <StatusBadge value={selected.active ? 'Activo' : 'Inactivo'}/>} editing={!readOnly} busy={busy} backLabel="Volver a carreras" editLabel="Editar Carrera" onBack={() => {++editEpoch.current;setOpen(false)}} onEdit={readOnly && director && subjectsStatus === 'ready' ? () => setReadOnly(false) : undefined}/><Notice message={message}/><AcademicTabs id="career-sections" names={['Datos generales','Materias']} active={tab} disabled={busy} onChange={setTab}/>
    <InlineForm className="academic-record-form" key={`${selected?.id ?? 'new'}-${readOnly}`} aria-describedby={message ? 'academic-message' : undefined} onInvalidField={field => setTab(Number(field.closest<HTMLElement>('[data-academic-tab]')?.dataset.academicTab ?? 0))} onSubmit={event => void save(event)}>
      <div hidden={tab !== 0} data-academic-tab="0" role="tabpanel" tabIndex={0} id="career-sections-panel-0" aria-labelledby="career-sections-tab-0" className="student-section-panel"><fieldset className="academic-fields" disabled={busy}><legend>Datos de Carrera</legend>
      <label><span className="field-label">Nombre de Carrera{!readOnly && ' *'}</span>{!readOnly && <small>Máximo 150 caracteres</small>}<input aria-label="Nombre de Carrera" readOnly={readOnly} required={!readOnly} maxLength={150} value={nombre} onChange={e => {setNombre(formTextValue(e.currentTarget));if (!selected && !siglaManual.current) setSigla(suggestSigla(formTextValue(e.currentTarget)))}}/></label>
      <label><span className="field-label">Sigla{!readOnly && ' *'}</span>{!readOnly && <small>De 2 a 10 caracteres alfanuméricos</small>}<input aria-label="Sigla" readOnly={readOnly} required={!readOnly} minLength={2} maxLength={10} pattern="[A-Za-z0-9]{2,10}" value={sigla} onChange={e => {siglaManual.current=true;setSigla(formTextValue(e.currentTarget))}}/></label>
      <label><span className="field-label">Modalidad (opcional)</span>{readOnly ? <input aria-label="Modalidad" readOnly value={modalidad ? modalidades.find(x => x.id === modalidad)?.nombre ?? 'Referencia no disponible' : 'No indicado'}/> : <select aria-label="Modalidad" value={modalidad} onChange={e => setModalidad(formTextValue(e.currentTarget))}><option value="">Sin modalidad</option>{modalidades.filter(x => x.activo || x.id === modalidad).map(x => <option key={x.id} value={x.id}>{x.nombre}{!x.activo ? ' (inactivo histórico)' : ''}</option>)}</select>}</label>
      <label className="experience-field"><span className="field-label">Con experiencia</span><span className="experience-switch"><input aria-label="Con experiencia" type="checkbox" role="switch" checked={experiencia} disabled={readOnly} onChange={e => setExperiencia(e.currentTarget.checked)}/><span aria-hidden="true" className="switch-track"/><span>{experiencia ? 'Sí' : 'No'}</span></span></label>
      <label>Descripción de Carrera{!readOnly && <small>Máximo 500 caracteres</small>}<textarea rows={2} aria-label="Descripción de Carrera" readOnly={readOnly} maxLength={500} value={descripcion} onChange={e => setDescripcion(formTextValue(e.currentTarget))}/>{!readOnly && <small>{descripcion.length} / 500</small>}</label>
      </fieldset></div>
      <div hidden={tab !== 1} data-academic-tab="1" role="tabpanel" tabIndex={0} id="career-sections-panel-1" aria-labelledby="career-sections-tab-1" className="student-section-panel"><h3>Materias de Carrera</h3>{subjectsStatus === 'loading' && <p role="status">Cargando Materias de Carrera…</p>}{readOnly ? <div className="table-scroll"><table aria-label="Materias de Carrera"><thead><tr><th scope="col">Nombre</th><th scope="col">Estado</th></tr></thead><tbody>{materias.filter(m => chosen.includes(m.id)).map(m => <tr key={m.id}><td>{m.nombre}</td><td><StatusBadge value={m.active ? 'Activo' : 'Inactivo'}/></td></tr>)}</tbody></table></div> : <fieldset className="subject-picker" disabled={busy || subjectsStatus !== 'ready'}><legend>Materias de Carrera — mínimo una activa</legend><label>Localizar Materia<input type="search" value={subjectSearch} onChange={e => setSubjectSearch(formTextValue(e.currentTarget))}/></label><p>{chosen.length} seleccionadas</p><div className="subject-options">{materias.filter(m => academicLabel(m).toLocaleLowerCase().includes(subjectSearch.toLocaleLowerCase())).map(m => <label key={m.id}><input type="checkbox" checked={chosen.includes(m.id)} disabled={!m.active && !chosen.includes(m.id)} onChange={e => setChosen(ids => e.target.checked ? [...ids,m.id] : ids.filter(id => id !== m.id))}/><span>{academicLabel(m)}<small>{chosen.includes(m.id) ? 'Seleccionada · ' : ''}{m.active ? 'Activa' : 'Inactiva histórica'}</small></span></label>)}</div></fieldset>}</div>
      {!readOnly && <div className="form-actions"><button className="secondary" disabled={busy} type="button" onClick={cancelEditing}>Cancelar</button><button disabled={busy || subjectsStatus !== 'ready'}>Guardar Carrera y Materias</button></div>}
    </InlineForm>
  </section>
  return <section>{dialog}<h2>Carreras</h2><div className="filters academic-toolbar" role="search" aria-label="Búsqueda de carreras"><AcademicSearch label="Buscar Carrera por sigla o nombre" placeholder="Sigla o nombre" value={search} onChange={text => {setSearch(text);setPage(0)}}/><label>Estado de Carrera<select value={activeStatus} onChange={e => {setActiveStatus(e.currentTarget.value);setPage(0)}}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label><div className="record-header-actions">{director && <AcademicAction label="Crear Carrera" createFor="Carreras" icon="new" disabled={busy} onClick={() => void edit(null)}/>}</div></div><Notice message={message}/>{loading && <p role="status">Cargando carreras…</p>}
    <div className="table-scroll academic-grid"><table aria-label="Carreras"><thead><tr><th scope="col">Nombre</th><th scope="col">Sigla</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{!loading && !loadError && rows.length === 0 && <tr><td colSpan={4}><EmptyState entity="Carreras" filtered={!!(search || activeStatus)} onCreate={director ? () => void edit(null) : undefined}/></td></tr>}{rows.map(row => <tr key={row.id}><td><button className="student-row-name company-row-name" onClick={() => void edit(row,true)}>{row.nombre}</button></td><td>{row.sigla}</td><td><StatusBadge value={row.active ? 'Activo' : 'Inactivo'}/></td><td><div className="student-row-actions"><AcademicAction label={`Ver ${row.nombre}`} icon="view" disabled={busy} onClick={() => void edit(row,true)}/>{director && <><AcademicAction label={`Editar ${row.nombre}`} icon="edit" disabled={busy} onClick={() => void edit(row)}/><AcademicAction label={`${row.active ? 'Inactivar' : 'Reactivar'} ${row.nombre}`} icon={row.active ? 'off' : 'on'} disabled={busy} onClick={() => void activate(row)}/></>}</div></td></tr>)}</tbody></table></div><AcademicPagination page={page} count={rows.length} disabled={busy || loading} onChange={setPage}/>
  </section>
}

type CicloDraft = Omit<Ciclo, 'id' | 'codigo_ciclo' | 'estado_codigo' | 'updated_at'>
const blankCiclo: CicloDraft = { carrera_id: '', fecha_inicio: '', fecha_fin: '', nombre_promocion: '', departamento_id: '', provincia_id: '', distrito_id: '', capitania_id: '' }
export function Ciclos() {
  const [open, setOpen] = useState(false), [readOnly, setReadOnly] = useState(true), [page, setPage] = useState(0), [tab, setTab] = useState(0)
  useListFocus(open, 'Ciclos')
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false)
  const { client, state } = useSession(), director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const editEpoch = useRef(0)
  const [rows, setRows] = useState<Ciclo[]>([]), [carreras, setCarreras] = useState<Carrera[]>([]), [materias, setMaterias] = useState<Materia[]>([])
  const [departamentos, setDepartamentos] = useState<Ref[]>([]), [provincias, setProvincias] = useState<(Ref & { departamento_id: string })[]>([]), [distritos, setDistritos] = useState<(Ref & { provincia_id: string })[]>([]), [capitanias, setCapitanias] = useState<Ref[]>([]), [motivos, setMotivos] = useState<Valor[]>([])
  const [selected, setSelected] = useState<Ciclo | null>(null), [draft, setDraft] = useState<CicloDraft>(blankCiclo), [relations, setRelations] = useState<Relacion[]>([]), [inherited, setInherited] = useState<string[]>([]), [additional, setAdditional] = useState<string[]>([])
  const [search, setSearch] = useState(''), [estado, setEstado] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  const { ask, dialog } = useConfirmation(busy)
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
  async function edit(row: Ciclo | null, view = false, section = 0) {
    setReadOnly(view || (!!row && !canEditCycle(row)) || !canModify); setTab(section)
    setOpen(true)
    const request = ++editEpoch.current
    setSelected(row); setDraft(row ? { carrera_id: row.carrera_id, fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin, nombre_promocion: row.nombre_promocion ?? '', departamento_id: row.departamento_id, provincia_id: row.provincia_id, distrito_id: row.distrito_id, capitania_id: row.capitania_id } : blankCiclo)
    setAdditional([]); setRelations([]); setMessage(''); setDestino(''); setMotivoId(''); setDetalle('')
    if (row) { const r = await client.from('ciclo_materia').select('id,materia_id,activo,origen,motivo_inactivacion').eq('ciclo_id', row.id); if (request !== editEpoch.current) return; if (!r.error) setRelations(r.data); else setMessage('No se pudieron consultar materias del Ciclo.') }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (readOnly || !editable || inheritedStatus === 'loading' || inheritedStatus === 'error') return
    if (!selected && !materias.some(m => m.active && (inherited.includes(m.id) || additional.includes(m.id)))) { setMessage('Selecciona una Carrera con Materias activas o añade al menos una Materia activa.'); return }
    if (selected && selected.carrera_id !== draft.carrera_id && await ask({ title: 'Cambiar Carrera del Ciclo', confirmLabel: 'Cambiar Carrera', description: `${academicLabel(carreras.find(c => c.id === draft.carrera_id)!)}. Las materias heredadas de la Carrera actual se retirarán del Ciclo. Las materias adicionales se conservarán y se agregarán las materias faltantes de la nueva Carrera. Las retiradas no se reactivarán.` }) === null) return
    setBusy(true)
    const r = await client.rpc('guardar_ciclo', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), ...draft, nombre_promocion: draft.nombre_promocion || null }, adicionales: additional })
    setBusy(false); if (r.error) { setMessage(academicError(r.error)); return }; ++editEpoch.current; setOpen(false); setMessage(selected ? 'Ciclo actualizado correctamente.' : 'Ciclo creado correctamente.'); setRevision(x => x + 1)
  }
  async function relation(row: Relacion) {
    if (!selected || readOnly || !editable || dirty) return
    if (await ask({ title: row.activo ? 'Retirar Materia del Ciclo' : 'Reactivar Materia del Ciclo', confirmLabel: row.activo ? 'Retirar Materia' : 'Reactivar Materia', sensitive: row.activo, description: `${academicLabel(materias.find(m => m.id === row.materia_id)!)}. ${row.activo ? 'La Materia quedará retirada, sin borrar su historial. Los cambios de la Carrera no la reactivarán.' : 'Se reactivará explícitamente esta relación conservando su origen.'}` }) === null) return
    setBusy(true); const r = await client.rpc('cambiar_materia_ciclo', { ciclo_id: selected.id, materia_id: row.materia_id, expected_updated_at: selected.updated_at, activo: !row.activo }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo, false, 1); setMessage(`Materia ${row.activo ? 'retirada' : 'reactivada'} correctamente.`); setRevision(x => x + 1)
  }
  async function transition(event: FormEvent) {
    event.preventDefault(); if (!selected || !director || !editable || readOnly || dirty) return
    if (await ask({ title: `Cambiar estado a ${destino}`, confirmLabel: destino === 'ANULADO' ? 'Anular Ciclo' : destino === 'DESIERTO' ? 'Declarar desierto' : destino === 'CERRADO' ? 'Cerrar Ciclo' : 'Iniciar Ciclo', sensitive: ['ANULADO', 'DESIERTO'].includes(destino), description: `${selected.codigo_ciclo}. ${['CERRADO', 'DESIERTO', 'ANULADO'].includes(destino) ? 'Este cambio es definitivo: el Ciclo quedará solo para consulta y no podrá reabrirse.' : 'El Ciclo pasará a estar en curso.'} Revisa el motivo indicado antes de continuar.` }) === null) return
    setBusy(true); const r = await client.rpc('cambiar_estado_ciclo', { id: selected.id, expected_updated_at: selected.updated_at, destino, motivo: detalle || null, motivo_desierto_id: destino === 'DESIERTO' ? motivoId : null }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo, true, 2); setMessage(`Ciclo declarado ${destino}.`); setRevision(x => x + 1)
  }
  const referenceOptions = (options: Ref[], current: string) => options.filter(x => x.active || x.id === current).map(x => <option key={x.id} value={x.id}>{'sigla' in x ? academicLabel(x as Carrera) : x.nombre}{!x.active ? ' (inactivo histórico)' : ''}</option>)
  function cancelEditing() { if (selected) void edit(selected, true, tab); else {++editEpoch.current;setOpen(false)} }
  const relationsTable = selected && <div className="cycle-subjects"><h3>Materias del Ciclo</h3>{!readOnly && dirty && <p className="help-text">Guarda o cancela los cambios del Ciclo para modificar sus materias.</p>}<div className="table-scroll"><table><caption>Materias actuales e historial de retiros</caption><thead><tr><th scope="col">Nombre</th><th scope="col">Origen</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{relations.length === 0 && <tr><td colSpan={4}>No se encontraron materias para este Ciclo.</td></tr>}{relations.map(r => { const m=materias.find(m=>m.id===r.materia_id);return <tr key={r.id}><td>{m?.nombre ?? 'Referencia no disponible'}</td><td>{r.origen}</td><td>{r.activo ? 'Activa' : r.motivo_inactivacion === 'CAMBIO_CARRERA' ? 'Retirada por cambio de Carrera' : 'Retirada manualmente'}</td><td><div className="student-row-actions">{!readOnly && editable ? <AcademicAction label={r.activo ? 'Retirar' : 'Reactivar explícitamente'} icon={r.activo ? 'off' : 'on'} disabled={busy || dirty} onClick={()=>void relation(r)}/> : 'Solo consulta'}</div></td></tr>})}</tbody></table></div></div>
  if(open) return <section className="academic-record cycle-record">{dialog}<AcademicRecordHeader title={selected ? 'Ficha de Ciclo' : 'Nuevo Ciclo'} name={selected?.codigo_ciclo} status={selected && <StatusBadge value={selected.estado_codigo}/>} editing={!readOnly} busy={busy} backLabel="Volver a ciclos" editLabel="Editar Ciclo" onBack={()=>{++editEpoch.current;setOpen(false)}} onEdit={readOnly && selected && canEditCycle(selected) ? ()=>setReadOnly(false) : undefined}/><Notice message={message}/>
    {selected && !editable && <p>{['PROGRAMADO','EN_CURSO'].includes(selected.estado_codigo) ? 'Solo consulta. Tu acceso no permite modificar este Ciclo.' : 'Solo consulta. Este Ciclo ya no admite cambios y no puede reabrirse.'}</p>}
    <AcademicTabs id="cycle-sections" names={selected ? ['Datos','Materias','Estado'] : ['Datos','Materias']} active={tab} disabled={busy} onChange={setTab}/>
    <div hidden={tab===2}><InlineForm className="academic-record-form" key={`${selected?.id ?? 'new'}-${readOnly}`} aria-describedby={message ? 'academic-message' : undefined} onInvalidField={field=>setTab(Number(field.closest<HTMLElement>('[data-academic-tab]')?.dataset.academicTab ?? 0))} onSubmit={event=>void save(event)}>
      <div hidden={tab!==0} data-academic-tab="0" role="tabpanel" tabIndex={0} id="cycle-sections-panel-0" aria-labelledby="cycle-sections-tab-0" className="student-section-panel cycle-data-panel"><fieldset className="cycle-data" disabled={busy}><legend>Datos del Ciclo</legend><fieldset className="academic-fields" aria-label="Datos principales">
        <label><span className="field-label">Carrera{!readOnly && ' *'}</span>{readOnly ? <input aria-label="Carrera" readOnly value={academicLabel(carreras.find(c=>c.id===draft.carrera_id))}/> : <select aria-label="Carrera" required value={draft.carrera_id} onChange={e=>setDraft({...draft,carrera_id:formTextValue(e.currentTarget)})}><option value="">Seleccionar</option>{referenceOptions(carreras,draft.carrera_id)}</select>}</label>
        <label>Nombre de promoción (opcional)<input aria-label="Nombre de promoción (opcional)" readOnly={readOnly} maxLength={150} value={draft.nombre_promocion ?? ''} onChange={e=>setDraft({...draft,nombre_promocion:formTextValue(e.currentTarget)})}/></label>
        <label><span className="field-label">Fecha de inicio{!readOnly && ' *'}</span><input aria-label="Fecha de inicio" readOnly={readOnly} required={!readOnly} type={readOnly?'text':'date'} value={readOnly?academicDate(draft.fecha_inicio):draft.fecha_inicio} onChange={e=>setDraft({...draft,fecha_inicio:formTextValue(e.currentTarget)})}/></label>
        <label><span className="field-label">Fecha de fin{!readOnly && ' *'}</span><input aria-label="Fecha de fin" readOnly={readOnly} required={!readOnly} type={readOnly?'text':'date'} min={readOnly?undefined:draft.fecha_inicio} value={readOnly?academicDate(draft.fecha_fin):draft.fecha_fin} onChange={e=>setDraft({...draft,fecha_fin:formTextValue(e.currentTarget)})}/></label>
      </fieldset><fieldset className="academic-fields"><legend>Ubicación</legend>
        <label><span className="field-label">Departamento{!readOnly && ' *'}</span>{readOnly?<input aria-label="Departamento" readOnly value={departamentos.find(x=>x.id===draft.departamento_id)?.nombre ?? 'Referencia no disponible'}/>:<select aria-label="Departamento" required value={draft.departamento_id} onChange={e=>setDraft({...draft,departamento_id:formTextValue(e.currentTarget),provincia_id:'',distrito_id:''})}><option value="">Seleccionar</option>{referenceOptions(departamentos,draft.departamento_id)}</select>}</label>
        <label><span className="field-label">Provincia{!readOnly && ' *'}</span>{readOnly?<input aria-label="Provincia" readOnly value={provincias.find(x=>x.id===draft.provincia_id)?.nombre ?? 'Referencia no disponible'}/>:<select aria-label="Provincia" required value={draft.provincia_id} onChange={e=>setDraft({...draft,provincia_id:formTextValue(e.currentTarget),distrito_id:''})}><option value="">Seleccionar</option>{referenceOptions(provincias.filter(x=>x.departamento_id===draft.departamento_id),draft.provincia_id)}</select>}</label>
        <label><span className="field-label">Distrito{!readOnly && ' *'}</span>{readOnly?<input aria-label="Distrito" readOnly value={distritos.find(x=>x.id===draft.distrito_id)?.nombre ?? 'Referencia no disponible'}/>:<select aria-label="Distrito" required value={draft.distrito_id} onChange={e=>setDraft({...draft,distrito_id:formTextValue(e.currentTarget)})}><option value="">Seleccionar</option>{referenceOptions(distritos,draft.distrito_id)}</select>}</label>
        <label><span className="field-label">Capitanía{!readOnly && ' *'}</span>{readOnly?<input aria-label="Capitanía" readOnly value={capitanias.find(x=>x.id===draft.capitania_id)?.nombre ?? 'Referencia no disponible'}/>:<select aria-label="Capitanía" required value={draft.capitania_id} onChange={e=>setDraft({...draft,capitania_id:formTextValue(e.currentTarget)})}><option value="">Seleccionar</option>{referenceOptions(capitanias,draft.capitania_id)}</select>}</label>
      </fieldset></fieldset></div>
      <div hidden={tab!==1} data-academic-tab="1" role="tabpanel" tabIndex={0} id="cycle-sections-panel-1" aria-labelledby="cycle-sections-tab-1" className="student-section-panel"><h3>Materias</h3><fieldset disabled={busy}>
        <fieldset><legend>Materias de la Carrera</legend>{inheritedStatus==='idle'&&<p>Selecciona una Carrera para ver sus Materias.</p>}{inheritedStatus==='loading'&&<p role="status">Cargando Materias de la Carrera…</p>}{inheritedStatus==='error'&&<p role="alert">No se pudieron consultar las Materias de la Carrera. Recarga la información.</p>}{inheritedStatus==='ready'&&<div className="table-scroll"><table><caption>Materias activas de la Carrera seleccionada</caption><thead><tr><th scope="col">Nombre</th></tr></thead><tbody>{materias.filter(m=>m.active&&inherited.includes(m.id)).map(m=><tr key={m.id}><td>{m.nombre}</td></tr>)}{!materias.some(m=>m.active&&inherited.includes(m.id))&&<tr><td colSpan={1}>Esta Carrera no tiene Materias activas disponibles.</td></tr>}</tbody></table></div>}</fieldset>
        {!readOnly && <fieldset><legend>Materias adicionales disponibles</legend>{inheritedStatus==='loading'?<p role="status">Cargando Materias adicionales…</p>:inheritedStatus==='error'?<p>No se pueden determinar las Materias adicionales hasta cargar la Carrera.</p>:<>{materias.filter(m=>m.active&&!inherited.includes(m.id)&&!relations.some(r=>r.materia_id===m.id)).map(m=><label key={m.id}><input type="checkbox" checked={additional.includes(m.id)} onChange={e=>setAdditional(ids=>e.target.checked?[...ids,m.id]:ids.filter(id=>id!==m.id))}/>{academicLabel(m)}</label>)}{!materias.some(m=>m.active&&!inherited.includes(m.id)&&!relations.some(r=>r.materia_id===m.id))&&<p>No hay materias activas adicionales disponibles para agregar a este Ciclo.</p>}</>}</fieldset>}
        {relationsTable}
      </fieldset></div>
      {!readOnly && <div className="form-actions"><button className="secondary" disabled={busy} type="button" onClick={cancelEditing}>{selected?'Cancelar':'Cancelar / descartar formulario'}</button><button disabled={busy||inheritedStatus==='loading'||inheritedStatus==='error'}>Guardar Ciclo</button></div>}
    </InlineForm></div>
    {selected && <div hidden={tab!==2} role="tabpanel" tabIndex={0} id="cycle-sections-panel-2" aria-labelledby="cycle-sections-tab-2" className="student-section-panel"><h3>Estado del Ciclo</h3><p><StatusBadge value={selected.estado_codigo}/></p>{!readOnly && editable && director ? <>{dirty && <p>Guarda o cancela los cambios del Ciclo antes de cambiar su estado.</p>}<InlineForm onSubmit={event=>void transition(event)}><p>Elige el siguiente estado. Cerrar, declarar desierto o anular son cambios definitivos.</p><fieldset disabled={busy||dirty}><legend>Cambiar estado</legend>
      <label><span className="field-label">Nuevo estado *</span><select aria-label="Nuevo estado" required value={destino} onChange={e=>setDestino(formTextValue(e.currentTarget))}><option value="">Seleccionar</option>{(selected.estado_codigo==='PROGRAMADO'?['EN_CURSO','DESIERTO','ANULADO']:['CERRADO','DESIERTO']).map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
      {destino==='DESIERTO'&&<label><span className="field-label">Motivo de Ciclo Desierto *</span><select aria-label="Motivo de Ciclo Desierto" required value={motivoId} onChange={e=>setMotivoId(formTextValue(e.currentTarget))}><option value="">Seleccionar</option>{motivos.filter(x=>x.activo).map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>}
      {(destino==='ANULADO'||destino==='DESIERTO')&&<label>Detalle / motivo{destino==='ANULADO'||motivos.find(x=>x.id===motivoId)?.codigo==='OTRO'?' (obligatorio)':' (opcional)'}<textarea required={destino==='ANULADO'||motivos.find(x=>x.id===motivoId)?.codigo==='OTRO'} value={detalle} onChange={e=>setDetalle(formTextValue(e.currentTarget))}/></label>}
    </fieldset><div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={cancelEditing}>Cancelar edición</button><button className={destino==='ANULADO'||destino==='DESIERTO'?'sensitive':undefined} disabled={busy||dirty}>Confirmar transición</button></div>
    </InlineForm></> : <p>{!editable ? 'Este Ciclo permanece solo para consulta.' : director?'Para cambiar el estado, selecciona Editar Ciclo.':'Solo el Director puede cambiar el estado.'}</p>}</div>}
  </section>
  return <section>{dialog}<h2>Ciclos</h2><div className="filters academic-toolbar" role="search" aria-label="Búsqueda de ciclos"><AcademicSearch label="Buscar Ciclo por código o Carrera" placeholder="Código de Ciclo o nombre de Carrera" value={search} onChange={text=>{setSearch(text);setPage(0)}}/><label>Estado del listado<select value={estado} onChange={e=>{setEstado(e.currentTarget.value);setPage(0)}}><option value="">Todos</option>{['PROGRAMADO','EN_CURSO','CERRADO','DESIERTO','ANULADO'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label><div className="record-header-actions">{canModify&&<AcademicAction label="Crear Ciclo" createFor="Ciclos" icon="new" disabled={busy} onClick={()=>void edit(null)}/>}</div></div><Notice message={message}/>{loading&&<p role="status">Cargando ciclos…</p>}
    <div className="table-scroll academic-grid"><table aria-label="Ciclos"><thead><tr><th scope="col">Código</th><th scope="col">Carrera</th><th scope="col">Capitanía</th><th scope="col">Inicio</th><th scope="col">Fin</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{!loading&&!loadError&&rows.length===0&&<tr><td colSpan={7}><div className="empty-state"><p>{search||estado?'No hay Ciclos que coincidan con los filtros.':'No hay Ciclos registrados.'}</p>{canModify&&!search&&!estado&&<button onClick={()=>void edit(null)}>Crear primer Ciclo</button>}</div></td></tr>}{rows.map(row=><tr key={row.id}><td><button className="student-row-name company-row-name" onClick={()=>void edit(row,true)}>{row.codigo_ciclo}</button></td><td>{academicLabel(carreras.find(c=>c.id===row.carrera_id))}</td><td>{capitanias.find(c=>c.id===row.capitania_id)?.nombre??'—'}</td><td>{academicDate(row.fecha_inicio)}</td><td>{academicDate(row.fecha_fin)}</td><td><StatusBadge value={row.estado_codigo}/></td><td><div className="student-row-actions"><AcademicAction label={`Ver ${row.codigo_ciclo}`} icon="view" disabled={busy} onClick={()=>void edit(row,true)}/>{canEditCycle(row)&&<AcademicAction label={`Editar ${row.codigo_ciclo}`} icon="edit" disabled={busy} onClick={()=>void edit(row)}/>}</div></td></tr>)}</tbody></table></div><AcademicPagination page={page} count={rows.length} disabled={busy||loading} onChange={setPage}/>
  </section>
}

type Audit = { id: string; entidad: string; registro_id: string; accion: string; actor: string; fecha: string; motivo: string | null; old_values: unknown; new_values: unknown }
const fieldNames: Record<string, string> = { codigo: 'Código', nombre: 'Nombre', descripcion: 'Descripción', active: 'Activo', activo: 'Activo', sigla: 'Sigla', fecha_inicio: 'Inicio', fecha_fin: 'Fin', estado_codigo: 'Estado', nombre_promocion: 'Promoción', carrera_id: 'Carrera', materia_id: 'Materia', modalidad_id: 'Modalidad', con_experiencia: 'Con experiencia', capitania_id: 'Capitanía', departamento_id: 'Departamento', provincia_id: 'Provincia', distrito_id: 'Distrito', origen: 'Origen', motivo_inactivacion: 'Motivo de retiro', updated_at: 'Actualización', created_at: 'Creación', id: 'Identificador' }
const entityNames: Record<string, string> = { materia: 'Materia', carrera: 'Carrera', ciclo: 'Ciclo', carrera_materia: 'Materias de Carrera', ciclo_materia: 'Materias del Ciclo' }
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
