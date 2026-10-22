import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
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

export function academicError(error: { code?: string } | null): string {
  if (error?.code === '40001') return 'El registro fue modificado por otro usuario. Actualiza la información antes de volver a guardar.'
  if (error?.code === '23505') return 'Código, nombre o sigla ya registrados. También se reservan los registros inactivos.'
  if (error?.code === '23P01') return 'Las fechas se superponen con otro Ciclo de la misma Carrera y Capitanía.'
  if (error?.code === '42501') return 'No tienes permiso para realizar esta operación.'
  return 'No se pudo guardar. Revisa campos, relaciones, materias activas y estado; recarga si cambió la información.'
}
function Notice({ message }: { message: string }) { return message ? <p id="academic-message" role={message.startsWith("Guardado") ? "status" : "alert"} className={message.startsWith("Guardado") ? "success" : undefined}>{message}</p> : null }
export function AcademicOnly({ children }: { children: ReactNode }) {
  const { state } = useSession()
  return state.roles?.some(r => r === 'DIRECTOR_ACADEMICO' || r === 'COORDINADOR_ACADEMICO') ? children : <p role="alert">Acceso académico no autorizado.</p>
}

export function Materias() {
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
    if (result.error) { setMessage(academicError(result.error)); return }
    edit(null); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Materia) {
    if (row.active && !window.confirm('Dejará de cargarse para nuevos Ciclos. Se conserva en Carreras y Ciclos existentes. No puedes inactivar la última Materia activa de una Carrera. ¿Continuar?')) return
    const motivo = row.active ? window.prompt('Motivo obligatorio de inactivación') : null
    if (row.active && !motivo?.trim()) { setMessage('Debes indicar el motivo de inactivación.'); return }
    setBusy(true)
    const result = await client.rpc('cambiar_active_materia', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo })
    setBusy(false); setMessage(result.error ? academicError(result.error) : ''); if (!result.error) setRevision(x => x + 1)
  }
  return <section><h2>Materias</h2>
    <label>Buscar Materia por código<input value={codeSearch} onChange={e => setCodeSearch(e.target.value)} /></label>
    <label>Buscar Materia por nombre<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <label>Estado de Materia<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
    <button onClick={() => { edit(null); setRevision(x => x + 1) }}>Recargar información</button><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    <div className="table-scroll"><table><caption>Materias — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.codigo}</td><td>{row.nombre}</td><td>{row.active ? 'Activo' : 'Inactivo'}</td><td>{director ? <><button disabled={busy} onClick={() => edit(row)}>Editar {row.codigo}</button><button disabled={busy} onClick={() => void activate(row)}>{row.active ? 'Inactivar' : 'Reactivar'} {row.codigo}</button></> : 'Solo lectura referencial'}</td></tr>)}</tbody></table></div>
    {director && <form aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><h3>{selected ? 'Editar Materia' : 'Nueva Materia'}</h3>
      <label>Código de Materia<input required maxLength={30} value={codigo} onChange={e => setCodigo(e.target.value)} /></label>
      <label>Nombre de Materia<input required maxLength={150} value={nombre} onChange={e => setNombre(e.target.value)} /></label>
      <label>Descripción de Materia<textarea maxLength={500} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></label>
      <button disabled={busy}>Guardar Materia</button><button type="button" onClick={() => edit(null)}>Cancelar</button>
    </form>}
  </section>
}

export function Carreras() {
  const { client, state } = useSession(), director = state.roles?.includes('DIRECTOR_ACADEMICO')
  const editEpoch = useRef(0)
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
    setSelected(row); setCodigo(row?.codigo ?? ''); setNombre(row?.nombre ?? ''); setDescripcion(row?.descripcion ?? ''); setSigla(row?.sigla ?? ''); setModalidad(row?.modalidad_id ?? ''); setChosen([]); setMessage('')
    if (row) { const r = await client.from('carrera_materia').select('materia_id').eq('carrera_id', row.id); if (request !== editEpoch.current) return; if (!r.error) setChosen(r.data.map(x => x.materia_id)); else setMessage('No se pudieron consultar las Materias de Carrera.') }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!chosen.some(id => materias.some(m => m.id === id && m.active))) { setMessage('Selecciona al menos una Materia activa.'); return }
    if (selected && selected.sigla !== sigla.trim().toUpperCase() && !window.confirm('El cambio de sigla actualizará los sufijos de los Ciclos PROGRAMADO/EN_CURSO afectados. Los terminales conservarán su código. ¿Confirmar?')) return
    setBusy(true)
    const r = await client.rpc('guardar_carrera', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), codigo, nombre, descripcion: descripcion || null, sigla, modalidad_id: modalidad }, materias: chosen })
    setBusy(false); if (r.error) { setMessage(academicError(r.error)); return }; void edit(null); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  async function activate(row: Carrera) {
    if (row.active && !window.confirm('La Carrera dejará de estar disponible para nuevos Ciclos. Se conservan las referencias existentes. ¿Continuar?')) return
    const motivo = row.active ? window.prompt('Motivo obligatorio de inactivación de Carrera') : null
    if (row.active && !motivo?.trim()) { setMessage('Debes indicar el motivo.'); return }
    setBusy(true); const r = await client.rpc('cambiar_active_carrera', { id: row.id, expected_updated_at: row.updated_at, active: !row.active, motivo }); setBusy(false)
    setMessage(r.error ? academicError(r.error) : ''); if (!r.error) setRevision(x => x + 1)
  }
  return <section><h2>Carreras</h2><label>Buscar Carrera por código<input value={codeSearch} onChange={e => setCodeSearch(e.target.value)} /></label><label>Estado de Carrera<select value={activeStatus} onChange={e => setActiveStatus(e.target.value)}><option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label><label>Buscar Carrera por nombre<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <button onClick={() => { void edit(null); setRevision(x => x + 1) }}>Recargar información</button><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    <div className="table-scroll"><table><caption>Carreras — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Nombre</th><th>Sigla</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.codigo}</td><td>{row.nombre}</td><td>{row.sigla}</td><td>{row.active ? 'Activo' : 'Inactivo'}</td><td>{director ? <><button disabled={busy} onClick={() => void edit(row)}>Editar {row.codigo}</button><button disabled={busy} onClick={() => void activate(row)}>{row.active ? 'Inactivar' : 'Reactivar'} {row.codigo}</button></> : 'Solo lectura referencial'}</td></tr>)}</tbody></table></div>
    {director && <form aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><h3>{selected ? 'Editar Carrera' : 'Nueva Carrera'}</h3>
      <label>Código de Carrera<input required maxLength={30} value={codigo} onChange={e => setCodigo(e.target.value)} /></label>
      <label>Nombre de Carrera<input required maxLength={150} value={nombre} onChange={e => setNombre(e.target.value)} /></label>
      <label>Descripción de Carrera<textarea maxLength={500} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></label>
      <label>Sigla<input required minLength={2} maxLength={10} pattern="[A-Za-z0-9]{2,10}" value={sigla} onChange={e => setSigla(e.target.value)} /></label>
      <label>Modalidad<select required value={modalidad} onChange={e => setModalidad(e.target.value)}><option value="">Seleccionar</option>{modalidades.filter(x => x.activo || x.id === modalidad).map(x => <option key={x.id} value={x.id}>{x.nombre}{!x.activo ? ' (inactivo histórico)' : ''}</option>)}</select></label>
      <fieldset><legend>Materias de Carrera — mínimo una activa</legend>{materias.map(m => <label key={m.id}><input type="checkbox" checked={chosen.includes(m.id)} disabled={!m.active && !chosen.includes(m.id)} onChange={e => setChosen(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id))} />{m.nombre} — {m.active ? 'Activo' : 'Inactivo histórico'}</label>)}</fieldset>
      <button disabled={busy}>Guardar Carrera y Materias</button><button type="button" onClick={() => void edit(null)}>Cancelar</button>
    </form>}
  </section>
}

type CicloDraft = Omit<Ciclo, 'id' | 'codigo_ciclo' | 'estado_codigo' | 'updated_at'>
const blankCiclo: CicloDraft = { carrera_id: '', fecha_inicio: '', fecha_fin: '', nombre_promocion: '', departamento_id: '', provincia_id: '', distrito_id: '', capitania_id: '' }
export function Ciclos() {
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
    if (selected && selected.carrera_id !== draft.carrera_id && !window.confirm('Cambiar Carrera inactiva las materias heredadas anteriores y conserva adicionales. Solo agrega relaciones faltantes; no reactiva las retiradas. ¿Continuar?')) return
    setBusy(true)
    const r = await client.rpc('guardar_ciclo', { p: { ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}), ...draft, nombre_promocion: draft.nombre_promocion || null }, adicionales: additional })
    setBusy(false); if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  async function relation(row: Relacion) {
    if (!selected) return
    setBusy(true); const r = await client.rpc('cambiar_materia_ciclo', { ciclo_id: selected.id, materia_id: row.materia_id, expected_updated_at: selected.updated_at, activo: !row.activo }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  async function transition(event: FormEvent) {
    event.preventDefault(); if (!selected || !window.confirm(`¿Confirmar ${destino}? Los estados terminales no se reabren.`)) return
    setBusy(true); const r = await client.rpc('cambiar_estado_ciclo', { id: selected.id, expected_updated_at: selected.updated_at, destino, motivo: detalle || null, motivo_desierto_id: destino === 'DESIERTO' ? motivoId : null }); setBusy(false)
    if (r.error) { setMessage(academicError(r.error)); return }; void edit(r.data as Ciclo); setMessage('Guardado correctamente.'); setRevision(x => x + 1)
  }
  const referenceOptions = (options: Ref[], value: string) => options.filter(x => x.active || x.id === value).map(x => <option key={x.id} value={x.id}>{x.nombre}{!x.active ? ' (inactivo histórico)' : ''}</option>)
  return <section><h2>Ciclos</h2><label>Buscar código de Ciclo<input value={search} onChange={e => setSearch(e.target.value)} /></label>
    <label>Estado del listado<select value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos</option>{['PROGRAMADO', 'EN_CURSO', 'CERRADO', 'DESIERTO', 'ANULADO'].map(x => <option key={x}>{x}</option>)}</select></label>
    <button onClick={() => { void edit(null); setRevision(x => x + 1) }}>Recargar información / nuevo Ciclo</button><Notice message={message} /><p role="status">{busy ? 'Guardando…' : ''}</p>
    <div className="table-scroll"><table><caption>Ciclos — hasta 100 resultados por búsqueda</caption><thead><tr><th>Código</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Consulta</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.codigo_ciclo}</td><td>{row.fecha_inicio}</td><td>{row.fecha_fin}</td><td>{row.estado_codigo}</td><td><button disabled={busy} onClick={() => void edit(row)}>Consultar {row.codigo_ciclo}</button></td></tr>)}</tbody></table></div>
    <form aria-describedby={message ? "academic-message" : undefined} onSubmit={event => void save(event)}><h3>{selected ? selected.codigo_ciclo : 'Nuevo Ciclo'}</h3>{selected && <p>Estado: {selected.estado_codigo}. Código generado; no editable.</p>}
      <fieldset disabled={!editable || busy}><legend>Datos del Ciclo</legend>
        <label>Carrera<select required value={draft.carrera_id} onChange={e => setDraft({ ...draft, carrera_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(carreras, draft.carrera_id)}</select></label>
        <label>Fecha de inicio<input required type="date" value={draft.fecha_inicio} onChange={e => setDraft({ ...draft, fecha_inicio: e.target.value })} /></label>
        <label>Fecha de fin<input required type="date" min={draft.fecha_inicio} value={draft.fecha_fin} onChange={e => setDraft({ ...draft, fecha_fin: e.target.value })} /></label>
        <label>Nombre de promoción (opcional)<input maxLength={150} value={draft.nombre_promocion ?? ''} onChange={e => setDraft({ ...draft, nombre_promocion: e.target.value })} /></label>
        <label>Departamento<select required value={draft.departamento_id} onChange={e => setDraft({ ...draft, departamento_id: e.target.value, provincia_id: '', distrito_id: '' })}><option value="">Seleccionar</option>{referenceOptions(departamentos, draft.departamento_id)}</select></label>
        <label>Provincia<select required value={draft.provincia_id} onChange={e => setDraft({ ...draft, provincia_id: e.target.value, distrito_id: '' })}><option value="">Seleccionar</option>{referenceOptions(provincias.filter(x => x.departamento_id === draft.departamento_id), draft.provincia_id)}</select></label>
        <label>Distrito<select required value={draft.distrito_id} onChange={e => setDraft({ ...draft, distrito_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(distritos, draft.distrito_id)}</select></label>
        <label>Capitanía<select required value={draft.capitania_id} onChange={e => setDraft({ ...draft, capitania_id: e.target.value })}><option value="">Seleccionar</option>{referenceOptions(capitanias, draft.capitania_id)}</select></label>
        <p>Precarga de Carrera (solo activas): {materias.filter(x => x.active && inherited.includes(x.id)).map(x => x.nombre).join(', ') || 'Selecciona una Carrera con Materias activas.'}</p>
        <fieldset><legend>Añadir Materias activas adicionales</legend>{materias.filter(m => m.active && !inherited.includes(m.id) && !relations.some(r => r.materia_id === m.id)).map(m => <label key={m.id}><input type="checkbox" checked={additional.includes(m.id)} onChange={e => setAdditional(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id))} />{m.nombre}</label>)}</fieldset>
        <button disabled={busy}>Guardar Ciclo</button>
      </fieldset><button type="button" onClick={() => void edit(null)}>{selected ? 'Volver / nuevo formulario' : 'Cancelar / descartar formulario'}</button>
    </form>
    {selected && <><h3>Materias del Ciclo</h3><ul>{relations.map(r => <li key={r.id}>{materias.find(m => m.id === r.materia_id)?.nombre ?? r.materia_id} — {r.origen} — {r.activo ? 'Asociación activa' : `Retirada: ${r.motivo_inactivacion}`}{editable && <button disabled={busy} onClick={() => void relation(r)}>{r.activo ? 'Retirar' : 'Reactivar explícitamente'}</button>}</li>)}</ul></>}
    {selected && editable && director && <form onSubmit={event => void transition(event)}><h3>Transición manual</h3>
      <label>Nuevo estado<select required value={destino} onChange={e => setDestino(e.target.value)}><option value="">Seleccionar</option>{(selected.estado_codigo === 'PROGRAMADO' ? ['EN_CURSO', 'DESIERTO', 'ANULADO'] : ['CERRADO', 'DESIERTO']).map(x => <option key={x}>{x}</option>)}</select></label>
      {destino === 'DESIERTO' && <label>Motivo de Ciclo Desierto<select required value={motivoId} onChange={e => setMotivoId(e.target.value)}><option value="">Seleccionar</option>{motivos.filter(x => x.activo).map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>}
      {(destino === 'ANULADO' || destino === 'DESIERTO') && <label>Detalle / motivo{destino === 'ANULADO' || motivos.find(x => x.id === motivoId)?.codigo === 'OTRO' ? ' (obligatorio)' : ' (opcional)'}<textarea required={destino === 'ANULADO' || motivos.find(x => x.id === motivoId)?.codigo === 'OTRO'} value={detalle} onChange={e => setDetalle(e.target.value)} /></label>}
      <button disabled={busy}>Confirmar transición</button>
    </form>}
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
