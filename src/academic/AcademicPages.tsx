import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { EditorHeading, EmptyState, InlineForm, StatusBadge, useConfirmation } from './AcademicUi'
import { useSession } from '../security/SessionProvider'

type Ref = { id: string; nombre: string; active: boolean }
type Materia = Ref & { codigo: string; descripcion: string | null; updated_at: string }
type Carrera = Materia & { sigla: string; modalidad_id: string }
type Valor = { id: string; catalogo_id: string; codigo: string; nombre: string; activo: boolean }
type Ciclo = { id: string; carrera_id: string; codigo_ciclo: string; fecha_inicio: string; fecha_fin: string; nombre_promocion: string | null; departamento_id: string; provincia_id: string; distrito_id: string; capitania_id: string; estado_codigo: string; updated_at: string }
type Relacion = { id: string; materia_id: string; activo: boolean; origen: string; motivo_inactivacion: string | null }
const materiaColumns = 'id,codigo,nombre,descripcion,active,updated_at'
const carreraColumns = `${materiaColumns},sigla,modalidad_id`
const cicloColumns = 'id,carrera_id,codigo_ciclo,fecha_inicio,fecha_fin,nombre_promocion,departamento_id,provincia_id,distrito_id,capitania_id,estado_codigo,updated_at'

export function academicError(error: { code?: string; message?: string } | null, entity: 'Materia' | 'Carrera' | 'Ciclo' = 'Ciclo'): string {
  if (error?.code === '40001') return 'El registro fue modificado por otro usuario. Actualiza la información antes de volver a guardar.'
  if (error?.code === '23505') {
    const field = /_codigo_key/.test(error.message ?? '') ? 'código' : /_nombre_key/.test(error.message ?? '') ? 'nombre' : entity === 'Carrera' && /_sigla_key/.test(error.message ?? '') ? 'sigla' : null
    return field ? `El ${field} de ${entity} ya está utilizado, incluso en registros inactivos.` : entity === 'Materia' ? 'El código o nombre de Materia ya está utilizado, incluso en registros inactivos.' : entity === 'Carrera' ? 'El código, nombre o sigla de Carrera ya está utilizado, incluso en registros inactivos.' : 'La relación o el código ya está registrado.'
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
const academicLabel = (row?: { codigo: string; nombre: string }) => row ? `${row.codigo} — ${row.nombre}` : 'Referencia no disponible'
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
    if (previous.current && !open) document.querySelector<HTMLButtonElement>(`[data-create="${entity}"]`)?.focus()
    previous.current = open
  }, [open, entity])
}

export function Materias() {
  const [open, setOpen] = useState(false)
  useListFocus(open, 'Materias')
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false)
  const { client, state } = useSession()
  const director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const [rows, setRows] = useState<Materia[]>([]), [revision, setRevision] = useState(0)
  const [codeSearch, setCodeSearch] = useState('')
  const [search, setSearch] = useState(''), [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Materia | null>(null)
  const [codigo, setCodigo] = useState(''), [nombre, setNombre] = useState(''), [descripcion, setDescripcion] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const { ask, dialog } = useConfirmation(busy)
  useEffect(() => {
    let current = true
    setLoading(true); setLoadError(false)
    let query = client.from('materia').select(materiaColumns).order('nombre').limit(100)
    if (search) query = query.ilike('nombre', `%${search}%`)
    if (codeSearch) query = query.ilike('codigo', `%${codeSearch}%`)
    if (status) query = query.eq('active', status === 'active')
    void query.then(result => { if (current) { setLoading(false); setLoadError(!!result.error); setRows(result.error ? [] : result.data as Materia[]); if (result.error) setMessage('No se pudo consultar Materias.') } })
    return () => { current = false }
  }, [client, revision, search, status, codeSearch])
  function edit(row: Materia | null) { setOpen(true); setSelected(row); setCodigo(row?.codigo ?? ''); setNombre(row?.nombre ?? ''); setDescripcion(row?.descripcion ?? ''); setMessage('') }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    const result = await client.rpc('guardar_materia', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), codigo, nombre, descripcion: descripcion || null } })
    setBusy(false)
    if (result.error) { setMessage(academicError(result.error, 'Materia')); return }
    edit(null); setOpen(false); setMessage(selected ? 'Materia actualizada correctamente.' : 'Materia creada correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Materia) {
    setMessage('')
    if (row.active) {
      setBusy(true)
      const [links, subjects, careers] = await Promise.all([client.from('carrera_materia').select('carrera_id,materia_id'), client.from('materia').select('id').eq('active', true), client.from('carrera').select('id,codigo,nombre')])
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
  return <section>{dialog}<div className="page-heading"><div><h2>Materias</h2><p>Consulta las materias disponibles para organizar Carreras y Ciclos.</p></div>{director && <button data-create="Materias" disabled={busy} onClick={() => edit(null)}>Crear Materia</button>}</div>
    <div className="filters" role="group" aria-label="Filtrar Materias"><label>Buscar Materia por código<input value={codeSearch} onChange={e => setCodeSearch(e.target.value)} /></label>
    <label>Buscar Materia por nombre<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <label>Estado de Materia<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
    <button disabled={busy} onClick={() => { edit(null); setRevision(x => x + 1) ; setOpen(false) }}>Recargar información</button></div><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    {loading && <p role="status">Cargando materias…</p>}<div className="table-scroll"><table><caption>Materias — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{!loading && !loadError && rows.length === 0 && <tr><td colSpan={4}><EmptyState entity="Materias" filtered={!!(codeSearch || search || status)} onCreate={director ? () => edit(null) : undefined} /></td></tr>}{rows.map(row => <tr className={open && selected?.id === row.id ? 'selected-row' : undefined} key={row.id}><td>{row.codigo}</td><td>{row.nombre}</td><td><StatusBadge value={row.active ? 'Activo' : 'Inactivo'} /></td><td>{director ? <><button disabled={busy} aria-label={`Editar ${row.codigo}`} onClick={() => edit(row)}>Editar</button><button disabled={busy} className={row.active ? 'sensitive' : 'secondary'} aria-label={`${row.active ? 'Inactivar' : 'Reactivar'} ${row.codigo}`} onClick={() => void activate(row)}>{row.active ? 'Inactivar' : 'Reactivar'}</button></> : 'Solo consulta'}</td></tr>)}</tbody></table></div>
    {director && open && <InlineForm key={selected?.id ?? 'new'} aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><EditorHeading>{selected ? `Editando ${academicLabel(selected)}` : 'Nueva Materia'}</EditorHeading><p className="help-text">Los campos marcados con * son obligatorios.</p><fieldset disabled={busy}><legend>Datos de Materia</legend>
      <label><span className="field-label">Código de Materia<span aria-hidden="true"> *</span></span><small>Máximo 30 caracteres</small><input aria-label="Código de Materia" required maxLength={30} value={codigo} onChange={e => setCodigo(e.target.value)} /></label>
      <label><span className="field-label">Nombre de Materia<span aria-hidden="true"> *</span></span><small>Máximo 150 caracteres</small><input aria-label="Nombre de Materia" required maxLength={150} value={nombre} onChange={e => setNombre(e.target.value)} /></label>
      <label>Descripción de Materia<small>Máximo 500 caracteres</small><textarea aria-label="Descripción de Materia" maxLength={500} value={descripcion} onChange={e => setDescripcion(e.target.value)} /><small>{descripcion.length} / 500</small></label>
      <div className="form-actions"><button disabled={busy}>Guardar Materia</button><button className="secondary" disabled={busy} type="button" onClick={() => { edit(null); setOpen(false) }}>Cancelar</button></div></fieldset>
    </InlineForm>}
  </section>
}

export function Carreras() {
  const [open, setOpen] = useState(false)
  useListFocus(open, 'Carreras')
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false)
  const { client, state } = useSession(), director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const editEpoch = useRef(0), originalChosen = useRef<string[]>([])
  const siglaManual = useRef(false)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [rows, setRows] = useState<Carrera[]>([]), [materias, setMaterias] = useState<Materia[]>([]), [modalidades, setModalidades] = useState<Valor[]>([])
  const [selected, setSelected] = useState<Carrera | null>(null), [chosen, setChosen] = useState<string[]>([])
  const [codigo, setCodigo] = useState(''), [nombre, setNombre] = useState(''), [descripcion, setDescripcion] = useState(''), [sigla, setSigla] = useState(''), [modalidad, setModalidad] = useState('')
  const [codeSearch, setCodeSearch] = useState(''), [activeStatus, setActiveStatus] = useState('')
  const [search, setSearch] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  const { ask, dialog } = useConfirmation(busy)
  useEffect(() => {
    let current = true
    setLoading(true); setLoadError(false)
    void (async () => {
      const [c, m, cat] = await Promise.all([client.from('carrera').select(carreraColumns).ilike('nombre', `%${search}%`).ilike('codigo', `%${codeSearch}%`).in('active', activeStatus ? [activeStatus === 'active'] : [true, false]).order('nombre').limit(100), client.from('materia').select(materiaColumns).order('nombre'), client.from('catalogo').select('id').eq('codigo', 'MODALIDAD_CARRERA').single()])
      if (!current) return
      if (c.error || m.error || cat.error) { setLoading(false); setLoadError(true); setRows([]); setMessage('No se pudieron consultar las referencias de Carrera.'); return }
      const values = await client.from('catalogo_valor').select('id,catalogo_id,codigo,nombre,activo').eq('catalogo_id', cat.data.id)
      if (current) { setLoading(false); if (values.error) { setLoadError(true); setMessage('No se pudo consultar la modalidad. Recarga la información.'); return }; setRows(c.data as Carrera[]); setMaterias(m.data as Materia[]); setModalidades(values.data ?? []) }
    })()
    return () => { current = false }
  }, [client, search, revision, codeSearch, activeStatus])
  async function edit(row: Carrera | null) {
    setOpen(true); setSubjectSearch('')
    const request = ++editEpoch.current
    setSelected(row); setCodigo(row?.codigo ?? ''); setNombre(row?.nombre ?? ''); setDescripcion(row?.descripcion ?? ''); setSigla(row?.sigla ?? ''); siglaManual.current = !!row; originalChosen.current = []; setModalidad(row?.modalidad_id ?? ''); setChosen([]); setMessage('')
    if (row) { const r = await client.from('carrera_materia').select('materia_id').eq('carrera_id', row.id); if (request !== editEpoch.current) return; if (!r.error) { originalChosen.current = r.data.map(x => x.materia_id); setChosen(originalChosen.current) } else setMessage('No se pudieron consultar las Materias de Carrera.') }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!chosen.some(id => materias.some(m => m.id === id && m.active))) { setMessage('Selecciona al menos una Materia activa.'); return }
    const warnings: string[] = []
    if (selected && selected.sigla !== sigla.trim().toUpperCase()) warnings.push('El cambio de sigla actualizará los sufijos de los Ciclos PROGRAMADO/EN_CURSO afectados. Los terminales conservarán su código histórico.')
    if (selected && chosen.some(id => !originalChosen.current.includes(id) && materias.some(m => m.id === id && m.active))) {
      setBusy(true)
      const cycles = await client.from('ciclo').select('id').eq('carrera_id', selected.id).in('estado_codigo', ['PROGRAMADO', 'EN_CURSO'])
      setBusy(false)
      if (cycles.error) { setMessage('No se pudieron comprobar los Ciclos afectados. Recarga e inténtalo de nuevo.'); return }
      if (cycles.data.length) warnings.push(`Esta Carrera tiene ${cycles.data.length} Ciclos modificables asociados. Las nuevas Materias se agregarán únicamente donde falten en PROGRAMADO y EN_CURSO. Las Materias retiradas manualmente no se reactivarán ni se reclasificarán y los Ciclos terminales no serán modificados.`)
    }
    if (warnings.length && await ask({ title: 'Confirmar cambios de Carrera', confirmLabel: 'Guardar cambios', description: `${academicLabel({ codigo, nombre })}. ${warnings.join(' ')}` }) === null) return
    setBusy(true)
    const r = await client.rpc('guardar_carrera', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), codigo, nombre, descripcion: descripcion || null, sigla, modalidad_id: modalidad }, materias: chosen })
    setBusy(false); if (r.error) { setMessage(academicError(r.error, 'Carrera')); return }; void edit(null); setOpen(false); setMessage(selected ? 'Carrera actualizada correctamente.' : 'Carrera creada correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Carrera) {
    const motivo = await ask({ title: `${row.active ? 'Inactivar' : 'Reactivar'} Carrera`, description: `${academicLabel(row)}. ${row.active ? 'Dejará de estar disponible para nuevos Ciclos. Se conservan las referencias existentes.' : 'Volverá a estar disponible para nuevos Ciclos.'}`, reason: row.active, confirmLabel: row.active ? 'Inactivar' : 'Reactivar', sensitive: row.active })
    if (motivo === null) return
    setBusy(true); const r = await client.rpc('cambiar_active_carrera', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo }); setBusy(false)
    setMessage(r.error ? academicError(r.error, 'Carrera') : `Carrera ${row.active ? 'inactivada' : 'reactivada'} correctamente.`); if (!r.error) setRevision(x => x + 1)
  }
  return <section>{dialog}<div className="page-heading"><div><h2>Carreras</h2><p>Organiza la formación y las materias asociadas a cada Carrera.</p></div>{director && <button data-create="Carreras" disabled={busy} onClick={() => void edit(null)}>Crear Carrera</button>}</div><div className="filters" role="group" aria-label="Filtrar Carreras"><label>Buscar Carrera por código<input value={codeSearch} onChange={e => setCodeSearch(e.target.value)} /></label><label>Estado de Carrera<select value={activeStatus} onChange={e => setActiveStatus(e.target.value)}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label><label>Buscar Carrera por nombre<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <button disabled={busy} onClick={() => { void edit(null); setRevision(x => x + 1) ; setOpen(false) }}>Recargar información</button></div><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    {loading && <p role="status">Cargando carreras…</p>}<div className="table-scroll"><table><caption>Carreras — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Nombre</th><th>Sigla</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{!loading && !loadError && rows.length === 0 && <tr><td colSpan={5}><EmptyState entity="Carreras" filtered={!!(codeSearch || search || activeStatus)} onCreate={director ? () => void edit(null) : undefined} /></td></tr>}{rows.map(row => <tr className={open && selected?.id === row.id ? 'selected-row' : undefined} key={row.id}><td>{row.codigo}</td><td>{row.nombre}</td><td>{row.sigla}</td><td><StatusBadge value={row.active ? 'Activo' : 'Inactivo'} /></td><td>{director ? <><button disabled={busy} aria-label={`Editar ${row.codigo}`} onClick={() => void edit(row)}>Editar</button><button disabled={busy} className={row.active ? 'sensitive' : 'secondary'} aria-label={`${row.active ? 'Inactivar' : 'Reactivar'} ${row.codigo}`} onClick={() => void activate(row)}>{row.active ? 'Inactivar' : 'Reactivar'}</button></> : 'Solo consulta'}</td></tr>)}</tbody></table></div>
    {director && open && <InlineForm key={selected?.id ?? 'new'} aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><EditorHeading>{selected ? `Editando ${academicLabel(selected)}` : 'Nueva Carrera'}</EditorHeading><p className="help-text">Los campos marcados con * son obligatorios.</p><fieldset disabled={busy}><legend>Datos de Carrera</legend>
      <label><span className="field-label">Código de Carrera<span aria-hidden="true"> *</span></span><small>Máximo 30 caracteres</small><input aria-label="Código de Carrera" required maxLength={30} value={codigo} onChange={e => setCodigo(e.target.value)} /></label>
      <label><span className="field-label">Nombre de Carrera<span aria-hidden="true"> *</span></span><small>Máximo 150 caracteres</small><input aria-label="Nombre de Carrera" required maxLength={150} value={nombre} onChange={e => { setNombre(e.target.value); if (!selected && !siglaManual.current) setSigla(suggestSigla(e.target.value)) }} /></label>
      <label>Descripción de Carrera<small>Máximo 500 caracteres</small><textarea aria-label="Descripción de Carrera" maxLength={500} value={descripcion} onChange={e => setDescripcion(e.target.value)} /><small>{descripcion.length} / 500</small></label>
      <label><span className="field-label">Sigla<span aria-hidden="true"> *</span></span><small>De 2 a 10 caracteres alfanuméricos</small><input aria-label="Sigla" required minLength={2} maxLength={10} pattern="[A-Za-z0-9]{2,10}" value={sigla} onChange={e => { siglaManual.current = true; setSigla(e.target.value) }} /></label>
      <label><span className="field-label">Modalidad<span aria-hidden="true"> *</span></span><select aria-label="Modalidad" required value={modalidad} onChange={e => setModalidad(e.target.value)}><option value="">Seleccionar</option>{modalidades.filter(x => x.activo || x.id === modalidad).map(x => <option key={x.id} value={x.id}>{x.nombre}{!x.activo ? ' (inactivo histórico)' : ''}</option>)}</select></label>
      <fieldset className="subject-picker"><legend>Materias de Carrera — mínimo una activa</legend><label>Localizar Materia<input type="search" value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} /></label><p>{chosen.length} seleccionadas</p><div className="subject-options">{materias.filter(m => academicLabel(m).toLocaleLowerCase().includes(subjectSearch.toLocaleLowerCase())).map(m => <label key={m.id}><input type="checkbox" checked={chosen.includes(m.id)} disabled={!m.active && !chosen.includes(m.id)} onChange={e => setChosen(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id))} /><span>{academicLabel(m)}<small>{chosen.includes(m.id) ? 'Seleccionada · ' : ''}{m.active ? 'Activa' : 'Inactiva histórica'}</small></span></label>)}</div></fieldset>
      <div className="form-actions"><button disabled={busy}>Guardar Carrera y Materias</button><button className="secondary" disabled={busy} type="button" onClick={() => { void edit(null); setOpen(false) }}>Cancelar</button></div></fieldset>
    </InlineForm>}
  </section>
}

type CicloDraft = Omit<Ciclo, 'id' | 'codigo_ciclo' | 'estado_codigo' | 'updated_at'>
const blankCiclo: CicloDraft = { carrera_id: '', fecha_inicio: '', fecha_fin: '', nombre_promocion: '', departamento_id: '', provincia_id: '', distrito_id: '', capitania_id: '' }
export function Ciclos() {
  const [open, setOpen] = useState(false)
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
  const [inheritedStatus, setInheritedStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  useEffect(() => {
    let current = true
    setLoading(true); setLoadError(false)
    void (async () => {
      let q = client.from('ciclo').select(cicloColumns).ilike('codigo_ciclo', `%${search}%`).order('created_at', { ascending: false }).limit(100)
      if (estado) q = q.eq('estado_codigo', estado)
      const [c, ca, ma, de, pr, cp, cat] = await Promise.all([q, client.from('carrera').select(carreraColumns).order('nombre'), client.from('materia').select(materiaColumns).order('nombre'), client.from('departamento').select('id,nombre,active').order('nombre'), client.from('provincia').select('id,nombre,active,departamento_id').order('nombre'), client.from('capitania').select('id,nombre,active').order('nombre'), client.from('catalogo').select('id').eq('codigo', 'MOTIVO_CICLO_DESIERTO').single()])
      if (!current) return
      if (c.error || ca.error || ma.error || de.error || pr.error || cp.error || cat.error) { setLoading(false); setLoadError(true); setRows([]); setMessage('No se pudieron consultar Ciclos y referencias.'); return }
      const mv = await client.from('catalogo_valor').select('id,catalogo_id,codigo,nombre,activo').eq('catalogo_id', cat.data.id)
      if (current) { setLoading(false); if (mv.error) { setLoadError(true); setMessage('No se pudieron consultar los motivos. Recarga la información.'); return }; setRows(c.data as Ciclo[]); setCarreras(ca.data as Carrera[]); setMaterias(ma.data as Materia[]); setDepartamentos(de.data); setProvincias(pr.data); setCapitanias(cp.data); setMotivos(mv.data ?? []) }
    })()
    return () => { current = false }
  }, [client, revision, search, estado])
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
  async function edit(row: Ciclo | null) {
    setOpen(true)
    const request = ++editEpoch.current
    setSelected(row); setDraft(row ? { carrera_id: row.carrera_id, fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin, nombre_promocion: row.nombre_promocion ?? '', departamento_id: row.departamento_id, provincia_id: row.provincia_id, distrito_id: row.distrito_id, capitania_id: row.capitania_id } : blankCiclo)
    setAdditional([]); setRelations([]); setMessage(''); setDestino(''); setMotivoId(''); setDetalle('')
    if (row) { const r = await client.from('ciclo_materia').select('id,materia_id,activo,origen,motivo_inactivacion').eq('ciclo_id', row.id); if (request !== editEpoch.current) return; if (!r.error) setRelations(r.data); else setMessage('No se pudieron consultar materias del Ciclo.') }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!selected && !materias.some(m => m.active && (inherited.includes(m.id) || additional.includes(m.id)))) { setMessage('Selecciona una Carrera con Materias activas o añade al menos una Materia activa.'); return }
    if (selected && selected.carrera_id !== draft.carrera_id && await ask({ title: 'Cambiar Carrera del Ciclo', confirmLabel: 'Cambiar Carrera', description: `${academicLabel(carreras.find(c => c.id === draft.carrera_id)!)}. Las materias heredadas de la Carrera actual se retirarán del Ciclo. Las materias adicionales se conservarán y se agregarán las materias faltantes de la nueva Carrera. Las retiradas no se reactivarán.` }) === null) return
    setBusy(true)
    const r = await client.rpc('guardar_ciclo', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), ...draft, nombre_promocion: draft.nombre_promocion || null }, adicionales: additional })
    setBusy(false); if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage(selected ? 'Ciclo actualizado correctamente.' : 'Ciclo creado correctamente.'); setRevision(x => x + 1)
  }
  async function relation(row: Relacion) {
    if (!selected) return
    if (await ask({ title: row.activo ? 'Retirar Materia del Ciclo' : 'Reactivar Materia del Ciclo', confirmLabel: row.activo ? 'Retirar Materia' : 'Reactivar Materia', sensitive: row.activo, description: `${academicLabel(materias.find(m => m.id === row.materia_id)!)}. ${row.activo ? 'La Materia quedará retirada, sin borrar su historial. Los cambios de la Carrera no la reactivarán.' : 'Se reactivará explícitamente esta relación conservando su origen.'}` }) === null) return
    setBusy(true); const r = await client.rpc('cambiar_materia_ciclo', { ciclo_id: selected.id, materia_id: row.materia_id, expected_updated_at: selected.updated_at, activo: !row.activo }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage(`Materia ${row.activo ? 'retirada' : 'reactivada'} correctamente.`); setRevision(x => x + 1)
  }
  async function transition(event: FormEvent) {
    event.preventDefault(); if (!selected) return
    if (await ask({ title: `Cambiar estado a ${destino}`, confirmLabel: destino === 'ANULADO' ? 'Anular Ciclo' : destino === 'DESIERTO' ? 'Declarar desierto' : destino === 'CERRADO' ? 'Cerrar Ciclo' : 'Iniciar Ciclo', sensitive: ['ANULADO', 'DESIERTO'].includes(destino), description: `${selected.codigo_ciclo}. ${['CERRADO', 'DESIERTO', 'ANULADO'].includes(destino) ? 'Este cambio es definitivo: el Ciclo quedará solo para consulta y no podrá reabrirse.' : 'El Ciclo pasará a estar en curso.'} Revisa el motivo indicado antes de continuar.` }) === null) return
    setBusy(true); const r = await client.rpc('cambiar_estado_ciclo', { id: selected.id, expected_updated_at: selected.updated_at, destino, motivo: detalle || null, motivo_desierto_id: destino === 'DESIERTO' ? motivoId : null }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage(`Ciclo declarado ${destino}.`); setRevision(x => x + 1)
  }
  const relationsTable = selected && <div className="cycle-subjects"><h3>Materias del Ciclo</h3>{loading && <p role="status">Cargando ciclos…</p>}<div className="table-scroll"><table><caption>Materias actuales e historial de retiros</caption><thead><tr><th>Código</th><th>Nombre</th><th>Origen</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{relations.length === 0 && <tr><td colSpan={5}>No se encontraron materias para este Ciclo.</td></tr>}{relations.map(r => { const m = materias.find(m => m.id === r.materia_id); return <tr key={r.id}><td>{m?.codigo ?? '—'}</td><td>{m?.nombre ?? 'Referencia no disponible'}</td><td>{r.origen}</td><td>{r.activo ? 'Activa' : r.motivo_inactivacion === 'CAMBIO_CARRERA' ? 'Retirada por cambio de Carrera' : 'Retirada manualmente'}</td><td>{editable ? <button type="button" className={r.activo ? 'sensitive' : 'secondary'} disabled={busy} onClick={() => void relation(r)}>{r.activo ? 'Retirar' : 'Reactivar explícitamente'}</button> : 'Solo consulta'}</td></tr> })}</tbody></table></div></div>
  const referenceOptions = (options: Ref[], value: string) => options.filter(x => x.active || x.id === value).map(x => <option key={x.id} value={x.id}>{'codigo' in x ? academicLabel(x as Carrera) : x.nombre}{!x.active ? ' (inactivo histórico)' : ''}</option>)
  return <section>{dialog}<div className="page-heading"><div><h2>Ciclos</h2><p>Consulta o prepara un Ciclo: fechas, ubicación y materias.</p></div>{canModify && <button data-create="Ciclos" disabled={busy} onClick={() => void edit(null)}>Crear Ciclo</button>}</div><div className="filters" role="group" aria-label="Filtrar Ciclos"><label>Buscar código de Ciclo<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <label>Estado del listado<select value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos</option>{['PROGRAMADO', 'EN_CURSO', 'CERRADO', 'DESIERTO', 'ANULADO'].map(x => <option key={x} value={x}>{x.replaceAll('_', ' ')}</option>)}</select></label>
    <button disabled={busy} onClick={() => { void edit(null); setRevision(x => x + 1) ; setOpen(false) }}>Recargar información</button></div><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    <div className="table-scroll"><table><caption>Ciclos — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Carrera</th><th>Capitanía</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{!loading && !loadError && rows.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>{search || estado ? 'No hay Ciclos que coincidan con los filtros.' : 'No hay Ciclos registrados.'}</p>{canModify && !search && !estado && <button onClick={() => void edit(null)}>Crear primer Ciclo</button>}</div></td></tr>}{rows.map(row => <tr className={open && selected?.id === row.id ? 'selected-row' : undefined} key={row.id}><td><strong>{row.codigo_ciclo}</strong></td><td>{academicLabel(carreras.find(c => c.id === row.carrera_id))}</td><td>{capitanias.find(c => c.id === row.capitania_id)?.nombre ?? '—'}</td><td>{row.fecha_inicio}</td><td>{row.fecha_fin}</td><td><StatusBadge value={row.estado_codigo} /></td><td><button disabled={busy} aria-label={`${canEditCycle(row) ? 'Editar' : 'Consultar'} ${row.codigo_ciclo}`} onClick={() => void edit(row)}>{canEditCycle(row) ? 'Editar' : 'Consultar'}</button></td></tr>)}</tbody></table></div>
    {open && selected && !editable && <article className="record-detail"><EditorHeading>{selected.codigo_ciclo}</EditorHeading><StatusBadge value={selected.estado_codigo} /><p>{['PROGRAMADO', 'EN_CURSO'].includes(selected.estado_codigo) ? 'Solo consulta. Tu acceso no permite modificar este Ciclo.' : 'Solo consulta. Este Ciclo ya no admite cambios y no puede reabrirse.'}</p><dl className="record-summary"><dt>Carrera</dt><dd>{academicLabel(carreras.find(c => c.id === selected.carrera_id))}</dd><dt>Capitanía</dt><dd>{capitanias.find(c => c.id === selected.capitania_id)?.nombre}</dd><dt>Fechas</dt><dd>{selected.fecha_inicio} — {selected.fecha_fin}</dd><dt>Promoción</dt><dd>{selected.nombre_promocion || 'Sin promoción indicada'}</dd><dt>Ubicación</dt><dd>{departamentos.find(x => x.id === selected.departamento_id)?.nombre} / {provincias.find(x => x.id === selected.provincia_id)?.nombre} / {distritos.find(x => x.id === selected.distrito_id)?.nombre}</dd></dl>{relationsTable}<button className="secondary" disabled={busy} onClick={() => { void edit(null); setOpen(false) }}>Volver al listado</button></article>}
    {open && editable && <InlineForm key={selected?.id ?? 'new'} aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><EditorHeading>{selected ? selected.codigo_ciclo : 'Nuevo Ciclo'}</EditorHeading>{selected && <p><StatusBadge value={selected.estado_codigo} /> · Editando Ciclo</p>}<p className="help-text">Los campos marcados con * son obligatorios.</p>
      <fieldset disabled={!editable || busy}><legend>Datos del Ciclo</legend><fieldset className="field-grid"><legend>Datos principales</legend>
        <label><span className="field-label">Carrera<span aria-hidden="true"> *</span></span><select aria-label="Carrera" required value={draft.carrera_id} onChange={e => setDraft({ ...draft, carrera_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(carreras, draft.carrera_id)}</select></label>
        <label><span className="field-label">Fecha de inicio<span aria-hidden="true"> *</span></span><input aria-label="Fecha de inicio" required type="date" value={draft.fecha_inicio} onChange={e => setDraft({ ...draft, fecha_inicio: e.target.value })} /></label>
        <label><span className="field-label">Fecha de fin<span aria-hidden="true"> *</span></span><input aria-label="Fecha de fin" required type="date" min={draft.fecha_inicio} value={draft.fecha_fin} onChange={e => setDraft({ ...draft, fecha_fin: e.target.value })} /></label>
        <label>Nombre de promoción (opcional)<small>Máximo 150 caracteres</small><input aria-label="Nombre de promoción (opcional)" maxLength={150} value={draft.nombre_promocion ?? ''} onChange={e => setDraft({ ...draft, nombre_promocion: e.target.value })} /></label>
        </fieldset><fieldset className="field-grid"><legend>Ubicación</legend><label><span className="field-label">Departamento<span aria-hidden="true"> *</span></span><select aria-label="Departamento" required value={draft.departamento_id} onChange={e => setDraft({ ...draft, departamento_id: e.target.value, provincia_id: '', distrito_id: '' })}><option value="">Seleccionar</option>{referenceOptions(departamentos, draft.departamento_id)}</select></label>
        <label><span className="field-label">Provincia<span aria-hidden="true"> *</span></span><select aria-label="Provincia" required value={draft.provincia_id} onChange={e => setDraft({ ...draft, provincia_id: e.target.value, distrito_id: '' })}><option value="">Seleccionar</option>{referenceOptions(provincias.filter(x => x.departamento_id === draft.departamento_id), draft.provincia_id)}</select></label>
        <label><span className="field-label">Distrito<span aria-hidden="true"> *</span></span><select aria-label="Distrito" required value={draft.distrito_id} onChange={e => setDraft({ ...draft, distrito_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(distritos, draft.distrito_id)}</select></label>
        <label><span className="field-label">Capitanía<span aria-hidden="true"> *</span></span><select aria-label="Capitanía" required value={draft.capitania_id} onChange={e => setDraft({ ...draft, capitania_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(capitanias, draft.capitania_id)}</select></label>
        </fieldset><fieldset><legend>Materias de la Carrera</legend>
          {inheritedStatus === 'idle' && <p>Selecciona una Carrera para ver sus Materias.</p>}
          {inheritedStatus === 'loading' && <p role="status">Cargando Materias de la Carrera…</p>}
          {inheritedStatus === 'error' && <p role="alert">No se pudieron consultar las Materias de la Carrera. Recarga la información.</p>}
          {inheritedStatus === 'ready' && <div className="table-scroll"><table><caption>Materias activas de la Carrera seleccionada</caption><thead><tr><th>Código</th><th>Nombre</th></tr></thead><tbody>{materias.filter(m => m.active && inherited.includes(m.id)).map(m => <tr key={m.id}><td>{m.codigo}</td><td>{m.nombre}</td></tr>)}{!materias.some(m => m.active && inherited.includes(m.id)) && <tr><td colSpan={2}>Esta Carrera no tiene Materias activas disponibles.</td></tr>}</tbody></table></div>}
        </fieldset>
        <fieldset><legend>Materias adicionales disponibles</legend>
          {loading || inheritedStatus === 'loading' ? <p role="status">Cargando Materias adicionales…</p> : inheritedStatus === 'error' ? <p>No se pueden determinar las Materias adicionales hasta cargar la Carrera.</p> : <>
            {materias.filter(m => m.active && !inherited.includes(m.id) && !relations.some(r => r.materia_id === m.id)).map(m => <label key={m.id}><input type="checkbox" checked={additional.includes(m.id)} onChange={e => setAdditional(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id))} />{academicLabel(m)}</label>)}
            {!materias.some(m => m.active && !inherited.includes(m.id) && !relations.some(r => r.materia_id === m.id)) && <p>No hay materias activas adicionales disponibles para agregar a este Ciclo.</p>}
          </>}
        </fieldset>
    {relationsTable}
      </fieldset><div className="form-actions"><button disabled={busy}>Guardar Ciclo</button><button className="secondary" disabled={busy} type="button" onClick={() => { void edit(null); setOpen(false) }}>{selected ? 'Volver al listado' : 'Cancelar / descartar formulario'}</button></div>
    </InlineForm>}

    {open && selected && editable && director && <InlineForm onSubmit={event => void transition(event)}><h3>Estado del Ciclo</h3><p>Elige el siguiente estado. Cerrar, declarar desierto o anular son cambios definitivos.</p><fieldset disabled={busy}><legend>Cambiar estado</legend>
      <label><span className="field-label">Nuevo estado<span aria-hidden="true"> *</span></span><select aria-label="Nuevo estado" required value={destino} onChange={e => setDestino(e.target.value)}><option value="">Seleccionar</option>{(selected.estado_codigo === 'PROGRAMADO' ? ['EN_CURSO', 'DESIERTO', 'ANULADO'] : ['CERRADO', 'DESIERTO']).map(x => <option key={x} value={x}>{x.replaceAll('_', ' ')}</option>)}</select></label>
      {destino === 'DESIERTO' && <label><span className="field-label">Motivo de Ciclo Desierto<span aria-hidden="true"> *</span></span><select aria-label="Motivo de Ciclo Desierto" required value={motivoId} onChange={e => setMotivoId(e.target.value)}><option value="">Seleccionar</option>{motivos.filter(x => x.activo).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>}
      {(destino === 'ANULADO' || destino === 'DESIERTO') && <label>Detalle / motivo{destino === 'ANULADO' || motivos.find(x => x.id === motivoId)?.codigo === 'OTRO' ? ' (obligatorio)' : ' (opcional)'}<textarea required={destino === 'ANULADO' || motivos.find(x => x.id === motivoId)?.codigo === 'OTRO'} value={detalle} onChange={e => setDetalle(e.target.value)} /></label>}
      <button className={destino === 'ANULADO' || destino === 'DESIERTO' ? 'sensitive' : undefined} disabled={busy}>Confirmar transición</button></fieldset>
    </InlineForm>}
  </section>
}

type Audit = { id: string; entidad: string; registro_id: string; accion: string; actor: string; fecha: string; motivo: string | null; old_values: unknown; new_values: unknown }
const fieldNames: Record<string, string> = { codigo: 'Código', nombre: 'Nombre', descripcion: 'Descripción', active: 'Activo', activo: 'Activo', sigla: 'Sigla', fecha_inicio: 'Inicio', fecha_fin: 'Fin', estado_codigo: 'Estado', nombre_promocion: 'Promoción', carrera_id: 'Carrera', materia_id: 'Materia', modalidad_id: 'Modalidad', capitania_id: 'Capitanía', departamento_id: 'Departamento', provincia_id: 'Provincia', distrito_id: 'Distrito', origen: 'Origen', motivo_inactivacion: 'Motivo de retiro', updated_at: 'Actualización', created_at: 'Creación', id: 'Identificador' }
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
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => !['id', 'created_at', 'updated_at'].includes(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
  return <details><summary>Ver cambios ({changed.length})</summary><dl className="audit-changes">{changed.map(key => <div key={key}><dt>{fieldNames[key] ?? key.replaceAll('_', ' ')}</dt><dd><span>Antes: {auditValue(before[key])}</span><span>Después: {auditValue(after[key])}</span></dd></div>)}</dl><details className="technical-details"><summary>Detalle técnico completo</summary><p>Evento: <code className="identifier">{row.id}</code><br />Registro: <code className="identifier">{row.registro_id}</code></p><pre>{JSON.stringify({ antes: row.old_values, despues: row.new_values }, null, 2)}</pre></details></details>
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
    <div className="filters" role="group" aria-label="Filtrar auditoría"><label>Desde (Lima)<input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label>Hasta (Lima)<input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label>
    <label>Identificador de cuenta<input value={actor} onChange={e => setActor(e.target.value)} /></label><label>Entidad<select value={entidad} onChange={e => setEntidad(e.target.value)}><option value="">Todas</option>{Object.entries(entityNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Acción<select value={accion} onChange={e => setAccion(e.target.value)}><option value="">Todas</option>{Object.entries(actionNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><Notice message={message} />
    {loading && <p role="status">Cargando eventos…</p>}
    <div className="table-scroll"><table><caption>Últimos 100 eventos por filtro · hora de Lima</caption><thead><tr><th>Fecha / hora</th><th>Cuenta</th><th>Entidad</th><th>Acción</th><th>Motivo</th><th>Cambios</th></tr></thead><tbody>{!loading && !message && !rows.length && <tr><td colSpan={6}><div className="empty-state">No hay eventos que coincidan con los filtros.</div></td></tr>}{rows.map(r => <tr key={r.id}><td><time dateTime={r.fecha}>{new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(r.fecha))}</time></td><td>{r.actor === state.userId ? 'Mi cuenta' : `Cuenta …${r.actor.slice(-8)}`}<details><summary>Ver identificador</summary><code className="identifier">{r.actor}</code></details></td><td>{entityNames[r.entidad] ?? r.entidad}<small className="secondary-text">{auditValue((r.new_values as Record<string, unknown> | null)?.codigo ?? (r.new_values as Record<string, unknown> | null)?.codigo_ciclo ?? (r.old_values as Record<string, unknown> | null)?.codigo)}</small></td><td>{actionNames[r.accion] ?? r.accion}</td><td>{r.motivo || 'Sin motivo adicional'}</td><td><AuditChanges row={r} /></td></tr>)}</tbody></table></div>
  </section>
}
