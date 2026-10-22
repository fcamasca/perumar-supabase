import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { InlineForm, useConfirmation } from './AcademicUi'
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
  return (words.length > 1 ? words.map(word => word[0]).join('') : words[0] ?? '').slice(0, 10)
}
function Notice({ message }: { message: string }) { return message ? <p id="academic-message" role={message.startsWith("Guardado") ? "status" : "alert"} className={message.startsWith("Guardado") ? "success" : undefined}>{message}</p> : null }
export function AcademicOnly({ children }: { children: ReactNode }) {
  const { state } = useSession()
  return state.roles?.some(r => r === 'DIRECTOR_ACADEMICO' || r === 'COORDINADOR_ACADEMICO') ? children : <p role="alert">Acceso académico no autorizado.</p>
}

export function Materias() {
  const { ask, dialog } = useConfirmation()
  const { client, state } = useSession()
  const director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const [rows, setRows] = useState<Materia[]>([]), [revision, setRevision] = useState(0)
  const [codeSearch, setCodeSearch] = useState('')
  const [search, setSearch] = useState(''), [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Materia | null>(null)
  const [codigo, setCodigo] = useState(''), [nombre, setNombre] = useState(''), [descripcion, setDescripcion] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  useEffect(() => {
    let current = true
    let query = client.from('materia').select(materiaColumns).order('nombre').limit(100)
    if (search) query = query.ilike('nombre', `%${search}%`)
    if (codeSearch) query = query.ilike('codigo', `%${codeSearch}%`)
    if (status) query = query.eq('active', status === 'active')
    void query.then(result => { if (current) { setRows(result.error ? [] : result.data as Materia[]); if (result.error) setMessage('No se pudo consultar Materias.') } })
    return () => { current = false }
  }, [client, revision, search, status, codeSearch])
  function edit(row: Materia | null) { setSelected(row); setCodigo(row?.codigo ?? ''); setNombre(row?.nombre ?? ''); setDescripcion(row?.descripcion ?? ''); setMessage('') }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    const result = await client.rpc('guardar_materia', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), codigo, nombre, descripcion: descripcion || null } })
    setBusy(false)
    if (result.error) { setMessage(academicError(result.error, 'Materia')); return }
    edit(null); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
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
    const motivo = await ask({ title: `${row.active ? 'Inactivar' : 'Reactivar'} Materia`, description: `${academicLabel(row)}. ${row.active ? 'Dejará de cargarse para nuevos Ciclos. Se conservan las referencias existentes.' : 'Volverá a estar disponible para nuevas selecciones; no reactiva relaciones retiradas.'}`, reason: row.active })
    if (motivo === null) return
    setBusy(true)
    const result = await client.rpc('cambiar_active_materia', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo })
    setBusy(false); setMessage(result.error ? academicError(result.error, 'Materia') : 'Guardado correctamente.'); if (!result.error) setRevision(x => x + 1)
  }
  return <section>{dialog}<h2>Materias</h2>
    <label>Buscar Materia por código<input value={codeSearch} onChange={e => setCodeSearch(e.target.value)} /></label>
    <label>Buscar Materia por nombre<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <label>Estado de Materia<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
    <button disabled={busy} onClick={() => { edit(null); setRevision(x => x + 1) }}>Recargar información</button><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    <div className="table-scroll"><table><caption>Materias — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.codigo}</td><td>{row.nombre}</td><td>{row.active ? 'Activo' : 'Inactivo'}</td><td>{director ? <><button disabled={busy} onClick={() => edit(row)}>Editar {row.codigo}</button><button disabled={busy} onClick={() => void activate(row)}>{row.active ? 'Inactivar' : 'Reactivar'} {row.codigo}</button></> : 'Solo lectura referencial'}</td></tr>)}</tbody></table></div>
    {director && <InlineForm aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><h3>{selected ? 'Editar Materia' : 'Nueva Materia'}</h3><fieldset disabled={busy}><legend>Datos de Materia</legend>
      <label>Código de Materia<small>Máximo 30 caracteres</small><input aria-label="Código de Materia" required maxLength={30} value={codigo} onChange={e => setCodigo(e.target.value)} /></label>
      <label>Nombre de Materia<small>Máximo 150 caracteres</small><input aria-label="Nombre de Materia" required maxLength={150} value={nombre} onChange={e => setNombre(e.target.value)} /></label>
      <label>Descripción de Materia<small>Máximo 500 caracteres</small><textarea aria-label="Descripción de Materia" maxLength={500} value={descripcion} onChange={e => setDescripcion(e.target.value)} /><small>{descripcion.length} / 500</small></label>
      <button disabled={busy}>Guardar Materia</button><button className="secondary" disabled={busy} type="button" onClick={() => edit(null)}>Cancelar</button></fieldset>
    </InlineForm>}
  </section>
}

export function Carreras() {
  const { ask, dialog } = useConfirmation()
  const { client, state } = useSession(), director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const editEpoch = useRef(0), originalChosen = useRef<string[]>([])
  const siglaManual = useRef(false)
  const [rows, setRows] = useState<Carrera[]>([]), [materias, setMaterias] = useState<Materia[]>([]), [modalidades, setModalidades] = useState<Valor[]>([])
  const [selected, setSelected] = useState<Carrera | null>(null), [chosen, setChosen] = useState<string[]>([])
  const [codigo, setCodigo] = useState(''), [nombre, setNombre] = useState(''), [descripcion, setDescripcion] = useState(''), [sigla, setSigla] = useState(''), [modalidad, setModalidad] = useState('')
  const [codeSearch, setCodeSearch] = useState(''), [activeStatus, setActiveStatus] = useState('')
  const [search, setSearch] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  useEffect(() => {
    let current = true
    void (async () => {
      const [c, m, cat] = await Promise.all([client.from('carrera').select(carreraColumns).ilike('nombre', `%${search}%`).ilike('codigo', `%${codeSearch}%`).in('active', activeStatus ? [activeStatus === 'active'] : [true, false]).order('nombre').limit(100), client.from('materia').select(materiaColumns).order('nombre'), client.from('catalogo').select('id').eq('codigo', 'MODALIDAD_CARRERA').single()])
      if (!current) return
      if (c.error || m.error || cat.error) { setRows([]); setMessage('No se pudieron consultar las referencias de Carrera.'); return }
      const values = await client.from('catalogo_valor').select('id,catalogo_id,codigo,nombre,activo').eq('catalogo_id', cat.data.id)
      if (current) { setRows(c.data as Carrera[]); setMaterias(m.data as Materia[]); setModalidades(values.data ?? []) }
    })()
    return () => { current = false }
  }, [client, search, revision, codeSearch, activeStatus])
  async function edit(row: Carrera | null) {
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
    if (warnings.length && await ask({ title: 'Confirmar cambios de Carrera', description: `${academicLabel({ codigo, nombre })}. ${warnings.join(' ')}` }) === null) return
    setBusy(true)
    const r = await client.rpc('guardar_carrera', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), codigo, nombre, descripcion: descripcion || null, sigla, modalidad_id: modalidad }, materias: chosen })
    setBusy(false); if (r.error) { setMessage(academicError(r.error, 'Carrera')); return }; void edit(null); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Carrera) {
    const motivo = await ask({ title: `${row.active ? 'Inactivar' : 'Reactivar'} Carrera`, description: `${academicLabel(row)}. ${row.active ? 'Dejará de estar disponible para nuevos Ciclos. Se conservan las referencias existentes.' : 'Volverá a estar disponible para nuevos Ciclos.'}`, reason: row.active })
    if (motivo === null) return
    setBusy(true); const r = await client.rpc('cambiar_active_carrera', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo }); setBusy(false)
    setMessage(r.error ? academicError(r.error, 'Carrera') : 'Guardado correctamente.'); if (!r.error) setRevision(x => x + 1)
  }
  return <section>{dialog}<h2>Carreras</h2><label>Buscar Carrera por código<input value={codeSearch} onChange={e => setCodeSearch(e.target.value)} /></label><label>Estado de Carrera<select value={activeStatus} onChange={e => setActiveStatus(e.target.value)}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label><label>Buscar Carrera por nombre<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <button disabled={busy} onClick={() => { void edit(null); setRevision(x => x + 1) }}>Recargar información</button><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    <div className="table-scroll"><table><caption>Carreras — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Nombre</th><th>Sigla</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.codigo}</td><td>{row.nombre}</td><td>{row.sigla}</td><td>{row.active ? 'Activo' : 'Inactivo'}</td><td>{director ? <><button disabled={busy} onClick={() => void edit(row)}>Editar {row.codigo}</button><button disabled={busy} onClick={() => void activate(row)}>{row.active ? 'Inactivar' : 'Reactivar'} {row.codigo}</button></> : 'Solo lectura referencial'}</td></tr>)}</tbody></table></div>
    {director && <InlineForm aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><h3>{selected ? 'Editar Carrera' : 'Nueva Carrera'}</h3><fieldset disabled={busy}><legend>Datos de Carrera</legend>
      <label>Código de Carrera<small>Máximo 30 caracteres</small><input aria-label="Código de Carrera" required maxLength={30} value={codigo} onChange={e => setCodigo(e.target.value)} /></label>
      <label>Nombre de Carrera<small>Máximo 150 caracteres</small><input aria-label="Nombre de Carrera" required maxLength={150} value={nombre} onChange={e => { setNombre(e.target.value); if (!selected && !siglaManual.current) setSigla(suggestSigla(e.target.value)) }} /></label>
      <label>Descripción de Carrera<small>Máximo 500 caracteres</small><textarea aria-label="Descripción de Carrera" maxLength={500} value={descripcion} onChange={e => setDescripcion(e.target.value)} /><small>{descripcion.length} / 500</small></label>
      <label>Sigla<small>De 2 a 10 caracteres alfanuméricos</small><input aria-label="Sigla" required minLength={2} maxLength={10} pattern="[A-Za-z0-9]{2,10}" value={sigla} onChange={e => { siglaManual.current = true; setSigla(e.target.value) }} /></label>
      <label>Modalidad<select required value={modalidad} onChange={e => setModalidad(e.target.value)}><option value="">Seleccionar</option>{modalidades.filter(x => x.activo || x.id === modalidad).map(x => <option key={x.id} value={x.id}>{x.nombre}{!x.activo ? ' (inactivo histórico)' : ''}</option>)}</select></label>
      <fieldset><legend>Materias de Carrera — mínimo una activa</legend>{materias.map(m => <label key={m.id}><input type="checkbox" checked={chosen.includes(m.id)} disabled={!m.active && !chosen.includes(m.id)} onChange={e => setChosen(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id))} />{academicLabel(m)} — {m.active ? 'Activo' : 'Inactivo histórico'}</label>)}</fieldset>
      <button disabled={busy}>Guardar Carrera y Materias</button><button className="secondary" disabled={busy} type="button" onClick={() => void edit(null)}>Cancelar</button></fieldset>
    </InlineForm>}
  </section>
}

type CicloDraft = Omit<Ciclo, 'id' | 'codigo_ciclo' | 'estado_codigo' | 'updated_at'>
const blankCiclo: CicloDraft = { carrera_id: '', fecha_inicio: '', fecha_fin: '', nombre_promocion: '', departamento_id: '', provincia_id: '', distrito_id: '', capitania_id: '' }
export function Ciclos() {
  const { ask, dialog } = useConfirmation()
  const { client, state } = useSession(), director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const editEpoch = useRef(0)
  const [rows, setRows] = useState<Ciclo[]>([]), [carreras, setCarreras] = useState<Carrera[]>([]), [materias, setMaterias] = useState<Materia[]>([])
  const [departamentos, setDepartamentos] = useState<Ref[]>([]), [provincias, setProvincias] = useState<(Ref & { departamento_id: string })[]>([]), [distritos, setDistritos] = useState<(Ref & { provincia_id: string })[]>([]), [capitanias, setCapitanias] = useState<Ref[]>([]), [motivos, setMotivos] = useState<Valor[]>([])
  const [selected, setSelected] = useState<Ciclo | null>(null), [draft, setDraft] = useState<CicloDraft>(blankCiclo), [relations, setRelations] = useState<Relacion[]>([]), [inherited, setInherited] = useState<string[]>([]), [additional, setAdditional] = useState<string[]>([])
  const [search, setSearch] = useState(''), [estado, setEstado] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  const [destino, setDestino] = useState(''), [motivoId, setMotivoId] = useState(''), [detalle, setDetalle] = useState('')
  const editable = !selected || ['PROGRAMADO', 'EN_CURSO'].includes(selected.estado_codigo)
  useEffect(() => {
    let current = true
    void (async () => {
      let q = client.from('ciclo').select(cicloColumns).ilike('codigo_ciclo', `%${search}%`).order('created_at', { ascending: false }).limit(100)
      if (estado) q = q.eq('estado_codigo', estado)
      const [c, ca, ma, de, pr, cp, cat] = await Promise.all([q, client.from('carrera').select(carreraColumns).order('nombre'), client.from('materia').select(materiaColumns).order('nombre'), client.from('departamento').select('id,nombre,active').order('nombre'), client.from('provincia').select('id,nombre,active,departamento_id').order('nombre'), client.from('capitania').select('id,nombre,active').order('nombre'), client.from('catalogo').select('id').eq('codigo', 'MOTIVO_CICLO_DESIERTO').single()])
      if (!current) return
      if (c.error || ca.error || ma.error || de.error || pr.error || cp.error || cat.error) { setRows([]); setMessage('No se pudieron consultar Ciclos y referencias.'); return }
      const mv = await client.from('catalogo_valor').select('id,catalogo_id,codigo,nombre,activo').eq('catalogo_id', cat.data.id)
      if (current) { setRows(c.data as Ciclo[]); setCarreras(ca.data as Carrera[]); setMaterias(ma.data as Materia[]); setDepartamentos(de.data); setProvincias(pr.data); setCapitanias(cp.data); setMotivos(mv.data ?? []) }
    })()
    return () => { current = false }
  }, [client, revision, search, estado])
  useEffect(() => {
    let current = true; setDistritos([])
    if (draft.provincia_id) void client.from('distrito').select('id,nombre,active,provincia_id').eq('provincia_id', draft.provincia_id).order('nombre').then(r => { if (current && !r.error) setDistritos(r.data) })
    return () => { current = false }
  }, [client, draft.provincia_id])
  useEffect(() => {
    let current = true; setInherited([])
    if (draft.carrera_id) void client.from('carrera_materia').select('materia_id').eq('carrera_id', draft.carrera_id).then(r => { if (current && !r.error) setInherited(r.data.map(x => x.materia_id)) })
    return () => { current = false }
  }, [client, draft.carrera_id, revision])
  async function edit(row: Ciclo | null) {
    const request = ++editEpoch.current
    setSelected(row); setDraft(row ? { carrera_id: row.carrera_id, fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin, nombre_promocion: row.nombre_promocion ?? '', departamento_id: row.departamento_id, provincia_id: row.provincia_id, distrito_id: row.distrito_id, capitania_id: row.capitania_id } : blankCiclo)
    setAdditional([]); setRelations([]); setMessage(''); setDestino(''); setMotivoId(''); setDetalle('')
    if (row) { const r = await client.from('ciclo_materia').select('id,materia_id,activo,origen,motivo_inactivacion').eq('ciclo_id', row.id); if (request !== editEpoch.current) return; if (!r.error) setRelations(r.data); else setMessage('No se pudieron consultar materias del Ciclo.') }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!selected && !materias.some(m => m.active && (inherited.includes(m.id) || additional.includes(m.id)))) { setMessage('Selecciona una Carrera con Materias activas o añade al menos una Materia activa.'); return }
    if (selected && selected.carrera_id !== draft.carrera_id && await ask({ title: 'Cambiar Carrera del Ciclo', description: `${academicLabel(carreras.find(c => c.id === draft.carrera_id)!)}. Las heredadas anteriores se inactivan y las adicionales se conservan. Solo se agregan faltantes; las retiradas no se reactivan.` }) === null) return
    setBusy(true)
    const r = await client.rpc('guardar_ciclo', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), ...draft, nombre_promocion: draft.nombre_promocion || null }, adicionales: additional })
    setBusy(false); if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  async function relation(row: Relacion) {
    if (!selected) return
    if (await ask({ title: row.activo ? 'Retirar Materia del Ciclo' : 'Reactivar Materia del Ciclo', description: `${academicLabel(materias.find(m => m.id === row.materia_id)!)}. ${row.activo ? 'La relación se conservará como RETIRO_MANUAL; la sincronización no la reactivará.' : 'Se reactivará explícitamente esta relación conservando su origen.'}` }) === null) return
    setBusy(true); const r = await client.rpc('cambiar_materia_ciclo', { ciclo_id: selected.id, materia_id: row.materia_id, expected_updated_at: selected.updated_at, activo: !row.activo }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  async function transition(event: FormEvent) {
    event.preventDefault(); if (!selected) return
    if (await ask({ title: `Cambiar estado a ${destino}`, description: `${selected.codigo_ciclo}. Los estados terminales no se reabren. Confirma el estado y el motivo indicado antes de continuar.` }) === null) return
    setBusy(true); const r = await client.rpc('cambiar_estado_ciclo', { id: selected.id, expected_updated_at: selected.updated_at, destino, motivo: detalle || null, motivo_desierto_id: destino === 'DESIERTO' ? motivoId : null }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  const referenceOptions = (options: Ref[], value: string) => options.filter(x => x.active || x.id === value).map(x => <option key={x.id} value={x.id}>{'codigo' in x ? academicLabel(x as Carrera) : x.nombre}{!x.active ? ' (inactivo histórico)' : ''}</option>)
  return <section>{dialog}<h2>Ciclos</h2><label>Buscar código de Ciclo<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <label>Estado del listado<select value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos</option>{['PROGRAMADO', 'EN_CURSO', 'CERRADO', 'DESIERTO', 'ANULADO'].map(x => <option key={x}>{x}</option>)}</select></label>
    <button disabled={busy} onClick={() => { void edit(null); setRevision(x => x + 1) }}>Recargar información / nuevo Ciclo</button><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    <div className="table-scroll"><table><caption>Ciclos — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Consulta</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.codigo_ciclo}</td><td>{row.fecha_inicio}</td><td>{row.fecha_fin}</td><td>{row.estado_codigo}</td><td><button disabled={busy} onClick={() => void edit(row)}>Consultar {row.codigo_ciclo}</button></td></tr>)}</tbody></table></div>
    <InlineForm aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><h3>{selected ? selected.codigo_ciclo : 'Nuevo Ciclo'}</h3>{selected && <p>Estado: {selected.estado_codigo}. Código generado; no editable.</p>}
      <fieldset disabled={!editable || busy}><legend>Datos del Ciclo</legend>
        <label>Carrera<select required value={draft.carrera_id} onChange={e => setDraft({ ...draft, carrera_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(carreras, draft.carrera_id)}</select></label>
        <label>Fecha de inicio<input required type="date" value={draft.fecha_inicio} onChange={e => setDraft({ ...draft, fecha_inicio: e.target.value })} /></label>
        <label>Fecha de fin<input required type="date" min={draft.fecha_inicio} value={draft.fecha_fin} onChange={e => setDraft({ ...draft, fecha_fin: e.target.value })} /></label>
        <label>Nombre de promoción (opcional)<small>Máximo 150 caracteres</small><input aria-label="Nombre de promoción (opcional)" maxLength={150} value={draft.nombre_promocion ?? ''} onChange={e => setDraft({ ...draft, nombre_promocion: e.target.value })} /></label>
        <label>Departamento<select required value={draft.departamento_id} onChange={e => setDraft({ ...draft, departamento_id: e.target.value, provincia_id: '', distrito_id: '' })}><option value="">Seleccionar</option>{referenceOptions(departamentos, draft.departamento_id)}</select></label>
        <label>Provincia<select required value={draft.provincia_id} onChange={e => setDraft({ ...draft, provincia_id: e.target.value, distrito_id: '' })}><option value="">Seleccionar</option>{referenceOptions(provincias.filter(x => x.departamento_id === draft.departamento_id), draft.provincia_id)}</select></label>
        <label>Distrito<select required value={draft.distrito_id} onChange={e => setDraft({ ...draft, distrito_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(distritos, draft.distrito_id)}</select></label>
        <label>Capitanía<select required value={draft.capitania_id} onChange={e => setDraft({ ...draft, capitania_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(capitanias, draft.capitania_id)}</select></label>
        <p>Precarga de Carrera (solo activas): {materias.filter(x => x.active && inherited.includes(x.id)).map(academicLabel).join(', ') || 'Selecciona una Carrera con Materias activas.'}</p>
        <fieldset><legend>Añadir Materias activas adicionales</legend>{materias.filter(m => m.active && !inherited.includes(m.id) && !relations.some(r => r.materia_id === m.id)).map(m => <label key={m.id}><input type="checkbox" checked={additional.includes(m.id)} onChange={e => setAdditional(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id))} />{academicLabel(m)}</label>)}</fieldset>
        <button disabled={busy}>Guardar Ciclo</button>
    {selected && <div className="cycle-subjects"><h3>Materias del Ciclo</h3><p>Relaciones persistidas. Retirar conserva la historia; reactivar es una acción explícita.</p><ul>{relations.map(r => <li key={r.id}>{materias.find(m => m.id === r.materia_id) ? academicLabel(materias.find(m => m.id === r.materia_id)!) : r.materia_id} — {r.origen} — {r.activo ? 'Asociación activa' : `Retirada: ${r.motivo_inactivacion}`}{editable && <button type="button" disabled={busy} onClick={() => void relation(r)}>{r.activo ? 'Retirar' : 'Reactivar explícitamente'}</button>}</li>)}</ul></div>}
      </fieldset><button className="secondary" disabled={busy} type="button" onClick={() => void edit(null)}>{selected ? 'Volver / nuevo formulario' : 'Cancelar / descartar formulario'}</button>
    </InlineForm>

    {selected && editable && director && <InlineForm onSubmit={event => void transition(event)}><h3>Transición manual</h3>
      <label>Nuevo estado<select required value={destino} onChange={e => setDestino(e.target.value)}><option value="">Seleccionar</option>{(selected.estado_codigo === 'PROGRAMADO' ? ['EN_CURSO', 'DESIERTO', 'ANULADO'] : ['CERRADO', 'DESIERTO']).map(x => <option key={x}>{x}</option>)}</select></label>
      {destino === 'DESIERTO' && <label>Motivo de Ciclo Desierto<select required value={motivoId} onChange={e => setMotivoId(e.target.value)}><option value="">Seleccionar</option>{motivos.filter(x => x.activo).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>}
      {(destino === 'ANULADO' || destino === 'DESIERTO') && <label>Detalle / motivo{destino === 'ANULADO' || motivos.find(x => x.id === motivoId)?.codigo === 'OTRO' ? ' (obligatorio)' : ' (opcional)'}<textarea required={destino === 'ANULADO' || motivos.find(x => x.id === motivoId)?.codigo === 'OTRO'} value={detalle} onChange={e => setDetalle(e.target.value)} /></label>}
      <button disabled={busy}>Confirmar transición</button>
    </InlineForm>}
  </section>
}

type Audit = { id: string; entidad: string; registro_id: string; accion: string; actor: string; fecha: string; motivo: string | null; old_values: unknown; new_values: unknown }
export function Auditoria() {
  const { client } = useSession()
  const [rows, setRows] = useState<Audit[]>([]), [desde, setDesde] = useState(''), [hasta, setHasta] = useState(''), [actor, setActor] = useState(''), [entidad, setEntidad] = useState(''), [accion, setAccion] = useState(''), [message, setMessage] = useState('')
  useEffect(() => {
    let current = true
    let q = client.from('auditoria').select('id,entidad,registro_id,accion,actor,fecha,motivo,old_values,new_values').order('fecha', { ascending: false }).limit(100)
    if (desde) q = q.gte('fecha', `${desde}T00:00:00-05:00`)
    if (hasta) q = q.lte('fecha', `${hasta}T23:59:59.999999-05:00`)
    if (actor) q = q.eq('actor', actor)
    if (entidad) q = q.eq('entidad', entidad)
    if (accion) q = q.eq('accion', accion)
    void q.then(r => { if (current) { setRows(r.error ? [] : r.data as Audit[]); setMessage(r.error ? 'No se pudo consultar auditoría. Revisa los filtros.' : '') } })
    return () => { current = false }
  }, [client, desde, hasta, actor, entidad, accion])
  return <section><h2>Auditoría</h2><p>Consulta de solo lectura; hasta 100 eventos recientes por filtro.</p>
    <label>Desde (Lima)<input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label>Hasta (Lima)<input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label>
    <label>UUID del actor<input value={actor} onChange={e => setActor(e.target.value)} /></label><label>Entidad<select value={entidad} onChange={e => setEntidad(e.target.value)}><option value="">Todas</option>{['materia', 'carrera', 'carrera_materia', 'ciclo', 'ciclo_materia'].map(x => <option key={x}>{x}</option>)}</select></label><label>Acción<input value={accion} onChange={e => setAccion(e.target.value)} /></label><Notice message={message} />
    <div className="table-scroll"><table><caption>Eventos de auditoría</caption><thead><tr><th>Fecha</th><th>Actor</th><th>Entidad / registro</th><th>Acción / motivo</th><th>Cambios</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.fecha}</td><td>{r.actor}</td><td>{r.entidad}<br />{r.registro_id}</td><td>{r.accion}<br />{r.motivo}</td><td><details><summary>Antes / después</summary><pre>{JSON.stringify({ antes: r.old_values, despues: r.new_values }, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
  </section>
}
