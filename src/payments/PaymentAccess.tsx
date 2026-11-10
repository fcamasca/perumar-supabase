import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AcademicPagination, AcademicSearch, AcademicTabs } from '../academic/AcademicLayout'
import { StatusBadge } from '../academic/AcademicUi'
import { studentSearchFilter } from '../lib/studentSearch'
import { useSession } from '../security/SessionProvider'
import { EnrollmentPayments } from './EnrollmentPayments'
import { pen } from './money'

type Student = { id: string; codigo_alumno: string; apellido_paterno: string; apellido_materno: string; nombres: string; numero_di: string }
type Cycle = { id: string; codigo_ciclo: string; estado_codigo: string; carrera: { nombre: string } }
type PaymentRow = Omit<Student, 'id'> & { matricula_id: string; alumno_id: string; ciclo_id: string; codigo_matricula: string; matricula_estado: string; matricula_updated_at: string; codigo_ciclo: string; ciclo_estado: string; curso_nombre: string; base: string; abonado: string; pendiente: string }
type SearchContext = { mode: number; studentQuery: string; studentId: string; studentPage: number; cycleQuery: string; cycleId: string; cyclePage: number; filter: string; page: number }
const blank: SearchContext = { mode: 0, studentQuery: '', studentId: '', studentPage: 0, cycleQuery: '', cycleId: '', cyclePage: 0, filter: '', page: 0 }
const eligibleStates = ['PROGRAMADO', 'EN_CURSO', 'CERRADO']
const columns = 'matricula_id,alumno_id,ciclo_id,codigo_matricula,matricula_estado,matricula_updated_at,codigo_alumno,apellido_paterno,apellido_materno,nombres,numero_di,codigo_ciclo,ciclo_estado,curso_nombre,base::text,abonado::text,pendiente::text'
const fullName = (s: Pick<Student, 'apellido_paterno' | 'apellido_materno' | 'nombres'>) => `${s.apellido_paterno} ${s.apellido_materno}, ${s.nombres}`
const payable = (r: PaymentRow) => r.matricula_estado === 'ACTIVO' && eligibleStates.includes(r.ciclo_estado) && !/^0(?:\.0+)?$/.test(r.pendiente)

// Search context lives only in the mounted /pagos/* workspace, scoped to identity.
// History state carries only a UI open-form hint, never search text, PII or balances.
export function PaymentsPage() {
  const { '*': id } = useParams(), { state } = useSession()
  return <PaymentWorkspace key={state.userId} id={id}/>
}
function PaymentWorkspace({id}:{id?:string}) {
  const [context,setContext]=useState<SearchContext>({...blank})
  return id ? <PaymentRecord key={id} id={id} context={context}/> : <PaymentSearch context={context} setContext={setContext}/>
}

function PaymentSearch({context,setContext}:{context:SearchContext;setContext:Dispatch<SetStateAction<SearchContext>>}) {
  const { client } = useSession(), navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([]), [cycles, setCycles] = useState<Cycle[]>([]), [rows, setRows] = useState<PaymentRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(''), [searchError, setSearchError] = useState('')
  function change(patch: Partial<SearchContext>) { setContext(c => ({ ...c, ...patch })) }
  useEffect(() => {
    let active = true
    setStudents([]); setCycles([]); setSearchError('')
    const isStudent = context.mode === 0
    if (isStudent && !context.studentQuery.trim()) { setSearchLoading(false); return }
    setSearchLoading(true)
    let query = isStudent
      ? client.from('alumno').select('id,codigo_alumno,apellido_paterno,apellido_materno,nombres,numero_di').or(studentSearchFilter(context.studentQuery)).order('apellido_paterno').order('apellido_materno').order('nombres').order('id').range(context.studentPage * 30, context.studentPage * 30 + 29)
      : client.from('ciclo').select('id,codigo_ciclo,estado_codigo,carrera(nombre)').in('estado_codigo', eligibleStates).order('fecha_inicio', { ascending: false }).order('id', { ascending: false }).range(context.cyclePage * 30, context.cyclePage * 30 + 29)
    if (!isStudent && context.cycleQuery.trim()) query = query.ilike('codigo_ciclo', `%${context.cycleQuery.trim()}%`)
    void Promise.resolve(query).then(r => {
      if (!active) return
      if (r.error) throw new Error('search')
      if (isStudent) setStudents(r.data as unknown as Student[])
      else setCycles(r.data as unknown as Cycle[])
    }).catch(() => { if (active) setSearchError('No se pudo realizar la búsqueda. Vuelve a consultar.') }).finally(() => { if (active) setSearchLoading(false) })
    return () => { active = false }
  }, [client, context.mode, context.studentQuery, context.studentPage, context.cycleQuery, context.cyclePage])
  useEffect(() => {
    let active = true
    setRows([]); setError('')
    const selected = context.mode === 0 ? context.studentId : context.cycleId
    if (!selected) { setLoading(false); return }
    setLoading(true)
    let query = client.from('matricula_pago_listado').select(columns).eq(context.mode === 0 ? 'alumno_id' : 'ciclo_id', selected)
      .order('pendiente', { ascending: false }).order('ciclo_fecha_inicio', { ascending: false }).order('matricula_created_at', { ascending: false }).order('matricula_id', { ascending: false })
      .range(context.page * 30, context.page * 30 + 29)
    if (context.mode === 1 && context.filter.trim()) query = query.or(studentSearchFilter(context.filter))
    void Promise.resolve(query).then(r => {
      if (!active) return
      if (r.error) throw new Error('list')
      setRows(r.data as unknown as PaymentRow[])
    }).catch(() => { if (active) setError('No se pudieron consultar las matrículas y sus saldos. No se muestran importes anteriores.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [client, context.mode, context.studentId, context.cycleId, context.filter, context.page])
  function open(row: PaymentRow) { navigate(`/pagos/${row.matricula_id}`, { state: { register: payable(row) } }) }
  const selected = context.mode === 0 ? context.studentId : context.cycleId
  const selectedStudent=students.find(s=>s.id===context.studentId)??rows[0]
  const selectedCycle=cycles.find(c=>c.id===context.cycleId)?.codigo_ciclo??rows[0]?.codigo_ciclo
  return <section className="academic-record payments"><h2>Pagos</h2>
    <p>Localiza la matrícula para consultar su saldo o registrar un pago.</p>
    <AcademicTabs id="payment-search" names={['Por Alumno', 'Por Ciclo']} active={context.mode} disabled={false} onChange={mode => change({ mode, page: 0 })}/>
    <div role="tabpanel" id={`payment-search-panel-${context.mode}`} aria-labelledby={`payment-search-tab-${context.mode}`} className="student-section-panel">
      <div className="filters academic-toolbar" role="search" aria-label={context.mode === 0 ? 'Buscar Alumno para pagos' : 'Buscar Ciclo para pagos'}><AcademicSearch label={context.mode === 0 ? 'Buscar Alumno' : 'Buscar Ciclo'} placeholder={context.mode === 0 ? 'Código, documento, nombres o apellidos' : 'Código de Ciclo'} value={context.mode === 0 ? context.studentQuery : context.cycleQuery} onChange={value => change(context.mode === 0 ? { studentQuery: value, studentPage: 0, studentId: '', page: 0 } : { cycleQuery: value, cyclePage: 0, cycleId: '', page: 0 })}/></div>
      {searchLoading && <p role="status">Buscando…</p>}{searchError && <p role="alert">{searchError}</p>}
      {context.mode === 0 && !context.studentQuery.trim() && <p className="help-text">Busca un alumno para ver sus matrículas, incluidas las que ya no tienen pendiente.</p>}
      {!searchLoading && !searchError && (context.mode === 0 ? !!context.studentQuery.trim() : true) && <>
        <div className="table-scroll"><table aria-label={context.mode === 0 ? 'Resultados de alumnos' : 'Ciclos cobrables'}><thead><tr>{context.mode === 0 ? <><th>Código Alumno</th><th>Alumno</th><th>Documento</th></> : <><th>Ciclo</th><th>Curso</th><th>Estado</th></>}<th>Acción</th></tr></thead><tbody>
          {context.mode === 0 ? students.map(s => <tr key={s.id}><td>{s.codigo_alumno}</td><td>{fullName(s)}</td><td>{s.numero_di}</td><td><button type="button" className="secondary" aria-label={`Ver matrículas de ${fullName(s)}`} onClick={() => change({ studentId: s.id, page: 0 })}>Ver matrículas</button></td></tr>) : cycles.map(c => <tr key={c.id}><td>{c.codigo_ciclo}</td><td>{c.carrera.nombre}</td><td><StatusBadge value={c.estado_codigo}/></td><td><button type="button" className="secondary" aria-label={`Ver alumnos de ${c.codigo_ciclo}`} onClick={() => change({ cycleId: c.id, filter: '', page: 0 })}>Ver alumnos</button></td></tr>)}
          {!(context.mode === 0 ? students.length : cycles.length) && <tr><td colSpan={4}>No hay resultados para esta búsqueda.</td></tr>}
        </tbody></table></div>
        <AcademicPagination page={context.mode === 0 ? context.studentPage : context.cyclePage} count={context.mode === 0 ? students.length : cycles.length} disabled={searchLoading} onChange={page => change(context.mode === 0 ? { studentPage: page } : { cyclePage: page })}/>
      </>}
      {selected && <section aria-label="Matrículas para pagos"><h3>{context.mode === 0 ? 'Matrículas del Alumno' : 'Alumnos del Ciclo'}</h3>
        {context.mode===0&&selectedStudent&&<p><strong>{fullName(selectedStudent)}</strong> · {selectedStudent.codigo_alumno} · {selectedStudent.numero_di}</p>}{context.mode===1&&selectedCycle&&<p><strong>{selectedCycle}</strong></p>}
        {context.mode === 1 && <AcademicSearch label="Filtrar alumnos del Ciclo" placeholder="Código, documento, nombres o apellidos" value={context.filter} onChange={filter => change({ filter, page: 0 })}/>}
        {loading && <p role="status">Consultando saldos…</p>}{error && <p role="alert">{error}</p>}
        <div className="table-scroll"><table aria-label="Matrículas y saldos"><thead><tr>{context.mode === 0 ? <><th>Ciclo</th><th>Curso</th><th>Estado del Ciclo</th></> : <><th>Código Alumno</th><th>Alumno</th><th>Documento</th></>}<th className="payment-money">Base</th><th className="payment-money">Abonado</th><th className="payment-money">Pendiente</th><th>Acción</th></tr></thead><tbody>
          {!loading && !error && rows.map(r => <tr key={r.matricula_id}>{context.mode === 0 ? <><td>{r.codigo_ciclo}</td><td>{r.curso_nombre}</td><td><StatusBadge value={r.ciclo_estado}/>{r.matricula_estado === 'ANULADO' && <small>Matrícula anulada</small>}</td></> : <><td>{r.codigo_alumno}</td><td>{fullName(r)}{r.matricula_estado === 'ANULADO' && <small>Matrícula anulada</small>}</td><td>{r.numero_di}</td></>}<td className="payment-money">{pen(r.base)}</td><td className="payment-money">{pen(r.abonado)}</td><td className="payment-money"><strong>{pen(r.pendiente)}</strong></td><td><button type="button" className={payable(r) ? undefined : 'secondary'} aria-label={`${payable(r) ? 'Pagar' : 'Ver'} matrícula ${r.codigo_matricula}`} onClick={() => open(r)}>{payable(r) ? 'Pagar' : 'Ver'}</button></td></tr>)}
          {!loading && !error && !rows.length && <tr><td colSpan={7}>No hay matrículas para este filtro.</td></tr>}
        </tbody></table></div><AcademicPagination page={context.page} count={rows.length} disabled={loading} onChange={page => change({ page })}/>
      </section>}
    </div>
  </section>
}

function PaymentRecord({ id, context }: { id: string;context:SearchContext }) {
  const { client, state } = useSession(), location = useLocation(), navigate = useNavigate()
  const [row, setRow] = useState<PaymentRow>(), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const heading=useRef<HTMLHeadingElement>(null)
  useEffect(()=>{if(row)heading.current?.focus()},[row?.matricula_id])
  useEffect(() => {
    let active = true
    setError('')
    void Promise.resolve(client.from('matricula_pago_listado').select(columns).eq('matricula_id', id).single()).then(r => {
      if (!active) return
      if (r.error || !r.data) throw new Error('record')
      setRow(r.data as unknown as PaymentRow)
    }).catch(() => { if (active) { setRow(undefined); setError('Matrícula no disponible o sin acceso. Vuelve a la búsqueda.') } })
    return () => { active = false }
  }, [client, id, state.userId, revision])
  const back = () => navigate('/pagos')
  if (!row) return <section><h2>Pagos de matrícula</h2>{error ? <p role="alert">{error}</p> : <p role="status">Consultando matrícula…</p>}<button type="button" className="secondary" onClick={back}>Volver a resultados</button></section>
  return <section className="academic-record payments">
    <header className="payment-record-header"><div className="payment-record-title"><h2 ref={heading} tabIndex={-1}>Pagos de matrícula · {row.codigo_matricula}</h2><StatusBadge value={row.matricula_estado === 'ACTIVO' ? 'Activa' : 'Anulada'}/></div><button type="button" className="secondary" aria-label={context.mode === 1 ? 'Volver a alumnos del Ciclo' : 'Volver a matrículas del Alumno'} onClick={back}>← Volver a resultados</button></header>
    <div className="payment-record-context"><p><strong>{fullName(row)}</strong><span>{row.codigo_alumno} · DI {row.numero_di}</span></p><p><strong>{row.curso_nombre}</strong><span>Ciclo {row.codigo_ciclo} · {row.ciclo_estado.replaceAll('_',' ')}</span></p></div>
    <EnrollmentPayments enrollment={row.matricula_id} version={row.matricula_updated_at} enrollmentState={row.matricula_estado} cycleState={row.ciclo_estado} initialRegister={location.state?.register === true && payable(row)} onChanged={() => setRevision(v => v + 1)}/>
  </section>
}
