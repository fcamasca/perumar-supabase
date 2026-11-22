import { useEffect, useRef, useState } from 'react'
import { useSession } from '../security/SessionProvider'
import { DocumentDialog } from './EnrollmentDocuments'
import { PreviewHeader } from './PreviewHeader'
import { downloadPrintFiles, loadPrintPlan, printName, printOrder, type PrintPlan } from './printExpedienteData'

export function PrintExpediente({ cycle, enrollments, close }: { cycle: string; enrollments: string[]; close: () => void }) {
  const { client, state } = useSession()
  const allowed = !!state.roles?.some(r => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(r))
  const [plan, setPlan] = useState<PrintPlan>(), [chosen, setChosen] = useState<string[]>([]), [duplex, setDuplex] = useState(true)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('')
  const [preview, setPreview] = useState<Blob>(), [url, setUrl] = useState('')
  const controller = useRef<AbortController | null>(null), lock = useRef(false)
  const selection = enrollments.join(',')
  useEffect(() => {
    const abort = new AbortController(); controller.current = abort
    setPlan(undefined); setPreview(undefined); setError(''); setLoading(true)
    if (allowed) void loadPrintPlan(client, cycle, selection.split(','), abort.signal).then(p => {
      if (!abort.signal.aborted) { setPlan(p); setChosen([...new Set(p.documents.map(d => d.codigo))]) }
    }).catch(() => { if (!abort.signal.aborted) setError('No se pudo consultar la selección. Verifica el estado del Ciclo, las matrículas y tu acceso.') })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    else setLoading(false)
    return () => abort.abort()
  }, [client, allowed, state.userId, cycle, selection])
  useEffect(() => {
    if (!preview) { setUrl(''); return }
    const objectUrl = URL.createObjectURL(preview); setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [preview])
  const documents = plan?.documents.filter(d => chosen.includes(d.codigo)) ?? []
  const available = documents.filter(d => d.printStatus === 'Disponible'), missing = documents.filter(d => d.printStatus !== 'Disponible')
  const kinds = [...new Map(plan?.documents.map(d => [d.codigo, d.nombre])).entries()].sort(([a, an], [b, bn]) => {
    const index = (code: string) => printOrder.includes(code) ? printOrder.indexOf(code) : printOrder.length
    return index(a) - index(b) || an.localeCompare(bn, 'es')
  })
  async function prepare() {
    if (!plan || !allowed || lock.current || !available.length) return
    lock.current = true; setBusy(true); setError(''); setProgress('Comprobando vigencia…')
    const signal = controller.current!.signal
    try {
      const files = await downloadPrintFiles(client, cycle, plan, chosen, signal, (done, total) => { if (!signal.aborted) setProgress(`Preparando ${done} de ${total} documentos…`) })
      const { mergePrintPdfs } = await import('./mergePrintPdfs')
      const blob = await mergePrintPdfs(files, duplex, signal)
      if (!signal.aborted) setPreview(blob)
    } catch (e) { if (!signal.aborted) setError(`${e instanceof Error ? e.message : 'No se pudo preparar el expediente.'} No se abrió un paquete parcial.`) }
    finally { lock.current = false; if (!signal.aborted) { setBusy(false); setProgress('') } }
  }
  return <DocumentDialog wide busy={false} label={preview ? 'Vista previa: Expedientes' : 'Imprimir expedientes'} close={close}>
    {preview && allowed ? <><PreviewHeader name="Expedientes" close={close}/>{url && <iframe title="PDF de expedientes" src={url}/>}<button type="button" className="secondary" onClick={() => setPreview(undefined)}>Volver a la selección</button></> : <>
      <header className="preview-heading"><h2>Imprimir expedientes</h2><button type="button" className="secondary preview-close" aria-label="Cerrar impresión" onClick={close}>×</button></header>
      {!allowed ? <p role="alert">No tienes acceso académico a los expedientes.</p> : <>
        <p>Solo documentos generados del expediente vigente. No se generan ni regeneran documentos al imprimir.</p>
        {loading && <p role="status">Consultando expedientes…</p>}
        {plan && <>
          <p role="status"><strong>{plan.students.length} {plan.students.length === 1 ? 'alumno' : 'alumnos'} · {available.length} {available.length === 1 ? 'documento disponible' : 'documentos disponibles'} · {missing.length} {missing.length === 1 ? 'pendiente' : 'pendientes'} de generar o regenerar</strong></p>
          <fieldset disabled={busy}><legend>Documentos a imprimir</legend>
            <label><input type="checkbox" checked={!!kinds.length && chosen.length === kinds.length} ref={el => { if (el) el.indeterminate = chosen.length > 0 && chosen.length < kinds.length }} onChange={e => setChosen(e.target.checked ? kinds.map(([code]) => code) : [])}/>Seleccionar todos los documentos</label>
            {kinds.map(([code, name]) => <label key={code}><input type="checkbox" checked={chosen.includes(code)} onChange={e => setChosen(e.target.checked ? [...chosen, code] : chosen.filter(c => c !== code))}/>{name}</label>)}
            <label><input type="checkbox" checked={duplex} onChange={e => setDuplex(e.target.checked)}/>Cada alumno empieza en una hoja nueva al imprimir a doble cara</label>
          </fieldset>
          {!kinds.length && <p>No hay documentos generados aplicados a esta selección.</p>}
          <details open={missing.length > 0}><summary>Alumnos y documentos pendientes</summary>
            {plan.students.map(s => <div key={s.id}><strong>{printName(s)} · {s.codigo_matricula}</strong>
              <ul>{documents.filter(d => d.matricula_id === s.id && d.printStatus !== 'Disponible').map(d => <li key={d.id}>{d.nombre}: {d.printStatus}</li>)}</ul>
              {!available.some(d => d.matricula_id === s.id) && <p className="help-text">No se incluirá: sin documentos disponibles de los tipos seleccionados.</p>}
            </div>)}
          </details>
          <p className="help-text">Se comprueba la vigencia en el servidor. Los pendientes no se incluyen. Para imprimirlos, genéralos o regenéralos desde el expediente y vuelve a abrir esta selección.</p>
          <div className="form-actions"><button type="button" disabled={busy || !available.length} onClick={() => void prepare()}>{busy ? 'Preparando…' : `Preparar vista previa (${available.length})`}</button></div>
        </>}
      </>}
      {busy && <p role="status">{progress}</p>}
      {error && <p role="alert" className="validation-message">{error}</p>}
    </>}
  </DocumentDialog>
}
