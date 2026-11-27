import { DocumentMoreActions } from './DocumentMoreActions'
import { PreviewHeader } from './PreviewHeader'
import { PrintExpediente } from './PrintExpediente'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '../security/SessionProvider'
import { AcademicAction, AcademicPagination, AcademicSearch } from '../academic/AcademicLayout'
import { InlineForm, useConfirmation } from '../academic/AcademicUi'
import { formTextValue } from '../lib/formText'
import { documentError, type AppliedDocument, type DocumentFile } from './contracts'
import { uploadSizeError } from './uploadLimits'
import { optimizeImage } from './optimizeImage'
import { documentFileBlob } from './documentFileResponse'

export function DocumentDialog({
  close,
  busy,
  children,
  wide = false,
  label = 'Archivo del expediente',
}: {
  close: () => void
  busy: boolean
  children: ReactNode
  wide?: boolean
  label?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement,
      background = [...document.body.children].filter(
        (x) => !x.contains(panel.current),
      ) as HTMLElement[],
      previous = background.map((x) => x.inert)
    background.forEach((x) => {
      x.inert = true
    })
    panel.current?.querySelector<HTMLElement>('input,select,button')?.focus()
    return () => {
      background.forEach((x, i) => {
        x.inert = previous[i]
      })
      if (opener?.isConnected) opener.focus()
    }
  }, [])
  return createPortal(
    <div className="dialog-backdrop">
      <div
        className={`confirm-dialog${wide ? ' document-file-preview' : ''}`}
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) close()
          if (e.key === 'Tab') {
            const items = [
              ...panel.current!.querySelectorAll<HTMLElement>(
                'input:not(:disabled),select:not(:disabled),button:not(:disabled),a[href],iframe,[tabindex="0"]',
              ),
            ]
            if (e.shiftKey && document.activeElement === items[0]) {
              e.preventDefault()
              items.at(-1)?.focus()
            } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
              e.preventDefault()
              items[0]?.focus()
            }
          }
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
export function EnrollmentDocuments({
  enrollment,
  cycleId,
  enrollmentState,
  cycleState,
  blocked = false,
  onBusyChange,
  allowWord = false,
}: {
  enrollment: string
  cycleId: string
  enrollmentState: string
  cycleState: string
  blocked?: boolean
  onBusyChange?: (v: boolean) => void
  allowWord?: boolean
}) {
  const { client, state } = useSession(),
    [rows, setRows] = useState<AppliedDocument[]>([]),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(false),
    [message, setMessage] = useState('')
  const [search, setSearch] = useState(''),
    [showHistory, setShowHistory] = useState(false),
    [missingOnly, setMissingOnly] = useState(false),
    [page,setPage]=useState(0)
  const [editing, setEditing] = useState<AppliedDocument | null>(null),
    [file, setFile] = useState<File | null>(null),
    [proxy, setProxy] = useState({
      apoderado_nombre: '',
      apoderado_tipo_di_id: '',
      apoderado_numero_di: '',
    }),
    [types, setTypes] = useState<{ id: string; nombre: string }[]>([])
  const [fileError, setFileError] = useState('')
  const [storedPreview, setStoredPreview] = useState<{ name: string; blob?: Blob; historical: boolean } | null>(null), [storedPreviewUrl, setStoredPreviewUrl] = useState('')
  const [printing, setPrinting] = useState(false)
  const wordAbort = useRef<AbortController | null>(null)
  const previewAbort = useRef<AbortController | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false), [previewError, setPreviewError] = useState('')
  const [originalFile, setOriginalFile] = useState<File | null>(null), [optimizing, setOptimizing] = useState(false), [optimized, setOptimized] = useState(false), [imagePreview, setImagePreview] = useState('')
  const fileHintId = useId(), fileErrorId = useId()
  const [historyDoc, setHistoryDoc] = useState<AppliedDocument | null>(null),
    [files, setFiles] = useState<DocumentFile[]>([]),
    [filePage, setFilePage] = useState(0),
    [fileLoading, setFileLoading] = useState(false),
    [fileRevision, setFileRevision] = useState(0)
  const [summary, setSummary] = useState<{
      aplicables: number
      completados: number
      pendientes: number
    } | null>(null),
    [source, setSource] = useState<string | null>(null),
    [sourceKnown, setSourceKnown] = useState(false)
  const [requiredPending, setRequiredPending] = useState<number | null>(null)
  const [lastFiles, setLastFiles] = useState<Record<string, DocumentFile>>({}),
    [capitania, setCapitania] = useState<string | null>(null)
  const { ask, dialog } = useConfirmation(busy),
    lock = useRef(false),
    mounted = useRef(true)
  const eligible =
    enrollmentState === 'ACTIVO' && ['PROGRAMADO', 'EN_CURSO', 'CERRADO'].includes(cycleState)
  useEffect(() => {
    if (!storedPreview?.blob) { setStoredPreviewUrl(''); return }
    const url = URL.createObjectURL(storedPreview.blob)
    setStoredPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [storedPreview])
  useEffect(() => {
    if (!editing || !optimized || !file) { setImagePreview(''); return }
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [editing, optimized, file])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      wordAbort.current?.abort()
      previewAbort.current?.abort()
    }
  }, [])
  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])
  useEffect(() => {
    let alive = true
    setLoading(true)
    void (async () => {
      let query=client.from('matricula_documento').select('*').eq('matricula_id',enrollment)
      if(!showHistory||missingOnly)query=query.eq('contexto_vigente',true).eq('activo',true)
      if(missingOnly)query=query.eq('estado','PENDIENTE')
      if(search.trim()){
        const pattern=JSON.stringify(`%${search.trim()}%`)
        query=query.or(`codigo.ilike.${pattern},nombre.ilike.${pattern}`)
      }
      const [d, s, f, c, required] = await Promise.all([
        query.order('contexto_vigente', { ascending: false }).order('activo', { ascending: false })
          .order('estado', { ascending: false }).order('obligatorio', { ascending: false })
          .order('nombre').order('id').range(page*30,page*30+29),
        client
          .from('matricula_expediente_resumen')
          .select('aplicables,completados,pendientes')
          .eq('matricula_id', enrollment)
          .maybeSingle(),
        client
          .from('matricula_ficha_fuente')
          .select('source_fingerprint')
          .eq('id', enrollment)
          .maybeSingle(),
        client.from('ciclo').select('capitania(nombre)').eq('id', cycleId).maybeSingle(),
        client.from('matricula_documento').select('id', { count: 'exact', head: true })
          .eq('matricula_id', enrollment).eq('contexto_vigente', true).eq('activo', true)
          .eq('estado', 'PENDIENTE').eq('obligatorio', true),
      ])
      if (!alive) return
      setLoading(false)
      if (d.error || s.error) {
        setRows([]);setSummary(null);setRequiredPending(null);setSourceKnown(false);setLastFiles({})
        setFailure(true)
        setMessage('No se pudo consultar el expediente completo.')
        return
      }
      const docs = d.data as AppliedDocument[]
      setRows(docs)
      setSummary(s.data)
      setRequiredPending(!required.error && typeof required.count === 'number' ? required.count : null)
      setSourceKnown(!f.error && typeof f.data?.source_fingerprint === 'string')
      setSource(f.data?.source_fingerprint ?? null)
      const ref = c.data?.capitania as unknown as { nombre: string } | null
      setCapitania(!c.error ? (ref?.nombre ?? null) : null)
      const ids = docs.flatMap((x) =>
        x.ultimo_archivo_confirmado_id ? [x.ultimo_archivo_confirmado_id] : [],
      )
      if (ids.length) {
        const versions = await client
          .from('matricula_documento_archivo')
          .select(
            'id,matricula_documento_id,estado_tecnico,plantilla_version,fuente_base_fingerprint,datos_generacion,mime,bytes,confirmado_at',
          )
          .in('id', ids)
        if (alive)
          setLastFiles(
            versions.error
              ? {}
              : Object.fromEntries(versions.data.map((v) => [v.id, v as DocumentFile])),
          )
      } else setLastFiles({})
    })()
    return () => {
      alive = false
    }
  }, [client, enrollment, cycleId, revision,showHistory,missingOnly,search,page])
  useEffect(() => {
    if (!historyDoc) return
    let alive = true
    setFileLoading(true)
    void client
      .from('matricula_documento_archivo')
      .select(
        'id,matricula_documento_id,estado_tecnico,iniciado_por,iniciado_at,confirmado_at,plantilla_version,fuente_base_fingerprint,datos_generacion,mime,bytes',
      )
      .eq('matricula_documento_id', historyDoc.id)
      .order('iniciado_at', { ascending: false })
      .order('id', { ascending: false })
      .range(filePage * 30, filePage * 30 + 29)
      .then((r) => {
        if (!alive) return
        setFileLoading(false)
        if (r.error) {
          setFailure(true)
          setMessage('No se pudieron consultar las versiones.')
          setFiles([])
        } else setFiles(r.data as DocumentFile[])
      })
    return () => {
      alive = false
    }
  }, [client, historyDoc, filePage, fileRevision])
  function open(d: AppliedDocument) {
    setFileError('')
    setOriginalFile(null); setOptimized(false)
    setEditing(d)
    setFile(null)
    setProxy({ apoderado_nombre: '', apoderado_tipo_di_id: '', apoderado_numero_di: '' })
    setMessage('')
    if (d.codigo === 'CARTA_PODER')
      void (async () => {
        const c = await client
          .from('catalogo')
          .select('id')
          .eq('codigo', 'TIPO_DI')
          .eq('activo', true)
          .single()
        if (c.error) {
          setFailure(true)
          setMessage('No se pudieron consultar los tipos de DI.')
          return
        }
        const t = await client
          .from('catalogo_valor')
          .select('id,nombre')
          .eq('catalogo_id', c.data.id)
          .eq('activo', true)
          .order('nombre')
        if (t.error) {
          setFailure(true)
          setMessage('No se pudieron consultar los tipos de DI.')
        } else setTypes(t.data)
      })()
  }
  async function operation(task: () => Promise<string>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setMessage('')
    setFailure(false)
    try {
      const success = await task()
      if (mounted.current) {
        setMessage(success)
        setRevision((v) => v + 1)
        setFileRevision((v) => v + 1)
      }
    } catch (e) {
      if (mounted.current) {
        setFailure(true)
        setMessage(e instanceof Error ? e.message : 'No se pudo completar la operación.')
      }
    } finally {
      lock.current = false
      if (mounted.current) setBusy(false)
    }
  }
  async function invoke(name: string, body: Record<string, unknown> | FormData, signal?: AbortSignal) {
    const r = await client.functions.invoke(name, { body, ...(signal ? { signal } : {}) })
    if (r.error) {
      let code = ''
      try {
        if (r.error.context instanceof Response) code = (await r.error.context.json()).code ?? ''
      } catch {
        /* no raw platform response */
      }
      if (code === 'DOCUMENT_FILE_INVALID' && editing?.codigo === 'FOTO_ALUMNO')
        code = 'DOCUMENT_IMAGE_INVALID'
      throw new Error(documentError({ code }))
    }
    return name === 'expediente-descargar' ? documentFileBlob(r.data, r.response) : r.data
  }
  async function submit() {
    if (!editing || !eligible || blocked) return
    if (editing.origen === 'SUBIDO' && (fileError || optimizing)) return
    const d = editing
    await operation(async () => {
      let body: FormData | Record<string, unknown>
      if (d.origen === 'SUBIDO') {
        if (!file) throw new Error('Selecciona un archivo.')
        body = new FormData()
        body.set('documento_id', d.id)
        body.set('expected_updated_at', d.updated_at)
        body.set('archivo', file)
      } else
        body = {
          documento_id: d.id,
          expected_updated_at: d.updated_at,
          datos_generacion: d.codigo === 'CARTA_PODER' ? proxy : {},
        }
      const result = await invoke(
        d.origen === 'SUBIDO' ? 'expediente-cargar' : 'expediente-generar',
        body,
      )
      if (result?.estado_tecnico !== 'CONFIRMADO')
        throw new Error(
          'No se pudo confirmar el resultado. Consulta las operaciones antes de volver a intentar.',
        )
      setEditing(null)
      return 'Documento guardado correctamente. La versión anterior se conserva en Historia.'
    })
  }
  async function download(d: AppliedDocument, id: string, historical: boolean) {
    await operation(async () => {
      const data = await invoke('expediente-descargar', {
        documento_id: d.id,
        archivo_id: id,
        historico: historical,
      })
      if (!(data instanceof Blob)) throw new Error('No se recibió un archivo válido.')
      const url = URL.createObjectURL(data),
        a = document.createElement('a')
      try {
        a.href = url
        a.download = `documento.${data.type === 'application/pdf' ? 'pdf' : data.type === 'image/png' ? 'png' : 'jpg'}`
        a.click()
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      return historical ? 'Descarga histórica iniciada.' : 'Descarga iniciada.'
    })
  }
  async function downloadWord(d: AppliedDocument) {
    if (!allowWord || !eligible || blocked || d.origen !== 'GENERADO' || !d.ultimo_archivo_confirmado_id) return
    await operation(async () => {
      const controller = new AbortController(); wordAbort.current = controller
      try {
        const { buildWordDownload } = await import('./wordDownload')
        const blob = await buildWordDownload(client, enrollment, d.id, d.ultimo_archivo_confirmado_id!, controller.signal)
        if (!mounted.current || controller.signal.aborted) return ''
        const url = URL.createObjectURL(blob), link = document.createElement('a')
        link.href = url; link.download = `${d.codigo.toLowerCase()}.docx`; link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        return 'Word descargado. Las ediciones de esa copia no modifican el documento ni los datos del sistema.'
      } finally { wordAbort.current = null }
    })
  }
  function closeStoredPreview() {
    previewAbort.current?.abort()
    setStoredPreview(null); setPreviewLoading(false); setPreviewError('')
  }
  async function previewStoredFile(d: AppliedDocument, id: string, historical: boolean) {
    await operation(async () => {
      const controller = new AbortController(); previewAbort.current = controller
      let timedOut = false
      const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 25000)
      setStoredPreview({ name: d.nombre, historical }); setPreviewLoading(true); setPreviewError('')
      try {
        const blob = await invoke('expediente-descargar', { documento_id: d.id, archivo_id: id, historico: historical }, controller.signal)
        if (timedOut) throw new Error('La vista previa tardó demasiado. Intenta de nuevo.')
        if (controller.signal.aborted || !mounted.current) return ''
        if (!(blob instanceof Blob) || !['application/pdf', 'image/jpeg', 'image/png'].includes(blob.type))
          throw new Error('No se recibió un archivo válido para la vista previa.')
        setStoredPreview({ name: d.nombre, blob, historical })
        return ''
      } catch (error) {
        if (mounted.current) { setStoredPreview(null); setPreviewLoading(false) }
        if (timedOut) throw new Error('La vista previa tardó demasiado. Intenta de nuevo.', { cause: error })
        if (controller.signal.aborted) return ''
        throw error
      } finally {
        clearTimeout(timeout)
        if (previewAbort.current === controller) previewAbort.current = null
      }
    })
  }
  async function withdraw(d: AppliedDocument) {
    const reason = await ask({
      title: 'Retirar documento opcional',
      description: `${d.nombre}. Se retirará de esta matrícula conservando estado, archivos e historia.`,
      reason: true,
      confirmLabel: 'Retirar documento',
    })
    if (reason === null) return
    await operation(async () => {
      const r = await client.rpc('retirar_documentos_opcionales', {
        p_ciclo_id: cycleId,
        p_documentos: [{ id: d.id, expected_updated_at: d.updated_at }],
        p_motivo: reason,
      })
      if (r.error) throw new Error(documentError(r.error))
      return 'Documento retirado correctamente; su historia se conserva.'
    })
  }
  function diagnostic(d: AppliedDocument) {
    if (!d.activo || !d.contexto_vigente || !eligible) return 'Histórico'
    if (d.origen === 'SUBIDO' || !d.ultimo_archivo_confirmado_id) return ''
    const f = lastFiles[d.ultimo_archivo_confirmado_id]
    if (!f || !sourceKnown || capitania === null) return 'Vigencia por consultar'
    return f.fuente_base_fingerprint !== source ||
      f.plantilla_version !== `${d.codigo === 'FICHA_MATRICULA' ? 'h6-1' : 'h6-2'}:${d.codigo}` ||
      f.datos_generacion.capitania_nombre !== capitania
      ? 'Fuente o plantilla cambiada'
      : ''
  }
  const filtered = rows.filter(
    (d) =>
      (showHistory || (d.contexto_vigente && d.activo)) &&
      (!missingOnly || d.estado === 'PENDIENTE') &&
      (d.codigo + ' ' + d.nombre).toUpperCase().includes(search.trim().toUpperCase()),
  ).sort((a, b) =>
    Number(b.contexto_vigente) - Number(a.contexto_vigente)
    || Number(b.activo) - Number(a.activo)
    || b.estado.localeCompare(a.estado, 'es')
    || Number(b.obligatorio) - Number(a.obligatorio)
    || a.nombre.localeCompare(b.nombre, 'es') || a.id.localeCompare(b.id),
  )
  return (
    <section>
      {dialog}
      <h3>Expediente</h3>
      {eligible && state.roles?.some(r => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(r)) && <button type="button" className="secondary" disabled={busy || blocked || loading} onClick={() => setPrinting(true)}>Imprimir expediente</button>}
      {printing && <PrintExpediente cycle={cycleId} enrollments={[enrollment]} close={() => setPrinting(false)}/>}
      {summary && (
        <p role="status" className="document-summary">
          <span className="document-summary-pending"><strong>{summary.pendientes}</strong> {summary.pendientes === 1 ? 'pendiente' : 'pendientes'}</span>
          <span>{requiredPending === null ? 'Obligatorios pendientes: por consultar' : <><strong>{requiredPending}</strong> {requiredPending === 1 ? 'obligatorio pendiente' : 'obligatorios pendientes'}</>}</span>
          <span className="document-summary-complete"><strong>{summary.completados}</strong> {summary.completados === 1 ? 'completo' : 'completos'}</span>
        </p>
      )}
      {!eligible && <p>Solo consulta e historia. No se permiten nuevas modificaciones.</p>}
      {blocked && !busy && <p>Completa o cancela los otros cambios antes de modificar documentos.</p>}
      {message && (
        <p
          role={failure ? 'alert' : 'status'}
          className={failure ? 'validation-message' : 'success'}
        >
          {message}
        </p>
      )}
      <div className="filters academic-toolbar">
        <AcademicSearch
          label="Buscar documento del expediente"
          value={search}
          onChange={v=>{setSearch(v);setPage(0)}}
        />
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Consultar estado
        </button>
      </div>
      <div className="document-filters">
        <div role="group" aria-label="Estado de documentos" className="document-status-filters">
          <button type="button" className="secondary" aria-pressed={missingOnly} disabled={loading || busy} onClick={() => { setMissingOnly(true); setShowHistory(false); setPage(0) }}>Pendientes{summary ? ` (${summary.pendientes})` : ''}</button>
          <button type="button" className="secondary" aria-pressed={!missingOnly} disabled={loading || busy} onClick={() => { setMissingOnly(false); setPage(0) }}>Todos{summary ? ` (${summary.aplicables})` : ''}</button>
        </div>
        <label>
          <input
            type="checkbox"
            checked={showHistory}
            disabled={missingOnly || busy}
          onChange={(e) => {setShowHistory(e.target.checked);setPage(0)}}
          />
          Mostrar retirados y contextos anteriores
        </label>
      </div>
      {loading ? (
        <p role="status">Cargando expediente…</p>
      ) : (
        <div className="table-scroll document-grid">
          <table aria-label="Documentos de la matrícula">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Condición</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const status = diagnostic(d),
                  canMutate = eligible && d.activo && d.contexto_vigente && !blocked
                return (
                  <tr key={d.id} className={d.estado === 'PENDIENTE' && d.obligatorio && d.activo && d.contexto_vigente ? 'document-pending-required' : undefined}>
                    <td>
                      {d.nombre}
                      {!d.activo && <span className="document-retired-badge">
                        <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="7.5"/><path d="M6 10h8"/></svg>
                        Retirado
                      </span>}
                      <small className="secondary-text">
                        {d.origen === 'SUBIDO' ? 'Subido' : 'Generado'}
                      </small>
                    </td>
                    <td>
                      {d.obligatorio ? 'Obligatorio' : 'Opcional'}
                      {!d.contexto_vigente && <small> · Contexto anterior</small>}
                    </td>
                    <td>
                      <span className={`document-state-badge ${d.estado === 'PENDIENTE' ? 'document-state-pending' : 'document-state-complete'}`}>
                        <span aria-hidden="true">{d.estado === 'PENDIENTE' ? '○' : '✓'}</span> {d.estado}
                      </span>
                      {status && <small className="secondary-text document-file-diagnostic">{status}</small>}
                    </td>
                    <td>
                      <div className="record-header-actions">
                        {canMutate && (
                          <AcademicAction
                            icon={d.origen === 'SUBIDO' ? 'upload' : 'generate'}
                            label={d.origen === 'SUBIDO' ? d.estado === 'PENDIENTE' ? 'Cargar' : 'Reemplazar' : d.estado === 'PENDIENTE' ? 'Generar' : 'Regenerar'}
                            disabled={busy}
                            onClick={() => open(d)}
                          />
                        )}
                        <AcademicAction
                          icon="preview"
                          label={status === 'Histórico' || status === 'Fuente o plantilla cambiada' ? 'Vista previa histórica' : 'Vista previa'}
                          disabled={busy || !d.ultimo_archivo_confirmado_id}
                          onClick={() => d.ultimo_archivo_confirmado_id && void previewStoredFile(d, d.ultimo_archivo_confirmado_id, status === 'Histórico' || status === 'Fuente o plantilla cambiada')}
                        />
                          <AcademicAction
                            icon="download"
                            label={status === 'Histórico' || status === 'Fuente o plantilla cambiada' ? 'Descargar histórico' : 'Descargar'}
                            disabled={busy || !d.ultimo_archivo_confirmado_id}
                            onClick={() => d.ultimo_archivo_confirmado_id && void download(d, d.ultimo_archivo_confirmado_id, status === 'Histórico' || status === 'Fuente o plantilla cambiada')}
                          />
                          <DocumentMoreActions
                            name={d.nombre}
                            mandatory={d.obligatorio}
                            busy={busy}
                            onHistory={() => { setHistoryDoc(d); setFilePage(0) }}
                            onWord={allowWord && eligible && d.origen === 'GENERADO' && d.activo && d.contexto_vigente && state.roles?.some(r => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(r)) ? () => void downloadWord(d) : undefined}
                            wordDisabled={blocked || !d.ultimo_archivo_confirmado_id || d.estado !== 'GENERADO' || status !== ''}
                            onRetire={canMutate ? () => void withdraw(d) : undefined}
                          />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={4}>
                    No hay documentos para estos filtros. La configuración y regularización se
                    realizan desde el Ciclo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {(page>0||rows.length===30)&&<AcademicPagination page={page} count={rows.length} disabled={busy||loading} onChange={setPage}/>}
      {storedPreview && <DocumentDialog wide busy={false} label={`Vista previa: ${storedPreview.name}`} close={closeStoredPreview}>
        <PreviewHeader name={storedPreview.name} close={closeStoredPreview}/>
        {previewLoading && <p role="status" aria-live="polite">Cargando vista previa…</p>}
        {previewError && <p role="alert">{previewError}</p>}
        {storedPreview.historical && <p className="help-text">Versión histórica: puede no reflejar los datos actuales.</p>}
        {storedPreviewUrl && !previewError && (storedPreview.blob?.type === 'application/pdf'
          ? <iframe title={`Archivo de ${storedPreview.name}`} src={storedPreviewUrl} onLoad={()=>setPreviewLoading(false)} onError={()=>{setPreviewLoading(false);setPreviewError('No se pudo mostrar la vista previa. Cierra e intenta de nuevo.')}} />
          : <img alt={`Archivo de ${storedPreview.name}`} src={storedPreviewUrl} onLoad={()=>setPreviewLoading(false)} onError={()=>{setPreviewLoading(false);setPreviewError('No se pudo mostrar la vista previa. Cierra e intenta de nuevo.')}} />)}
      </DocumentDialog>}
      {editing && (
        <DocumentDialog busy={busy || optimizing} close={() => setEditing(null)}>
          <h2>
            {editing.origen === 'SUBIDO' ? 'Cargar documento' : 'Generar documento'}:{' '}
            {editing.nombre}
          </h2>
          <p className="help-text">
            {editing.origen === 'SUBIDO' ? 'El archivo se guardará en el expediente.' : 'Se creará un PDF con los datos del alumno.'}
          </p>
          {message && failure && (
            <p role="alert" className="validation-message">
              {message}
            </p>
          )}
          <InlineForm className="document-action-form" onSubmit={() => void submit()}>
            <fieldset disabled={busy || optimizing}>
              {editing.origen === 'SUBIDO' ? (
                <>
                <label>
                  Archivo (máximo 5 MiB)
                  <input
                    type="file"
                    aria-label="Archivo (máximo 5 MiB)"
                    required
                    aria-invalid={!!fileError}
                    aria-describedby={fileError ? `${fileHintId} ${fileErrorId}` : fileHintId}
                    accept={
                      editing.codigo === 'FOTO_ALUMNO'
                        ? 'image/jpeg,image/png'
                        : 'application/pdf,image/jpeg,image/png'
                    }
                    onChange={(e) => {
                      const selected = e.target.files?.[0] ?? null
                      setFile(selected)
                      setOriginalFile(selected); setOptimized(false)
                      setMessage(''); setFailure(false)
                      setFileError(selected ? uploadSizeError(selected) : '')
                    }}
                  />
                  <small id={fileHintId}>
                    {editing.codigo === 'FOTO_ALUMNO'
                      ? 'Solo JPG/JPEG o PNG, hasta 5 MiB. No se admite PDF.'
                      : 'PDF simple de hasta 20 páginas, JPG/JPEG o PNG, hasta 5 MiB. Los PDF cifrados, con contenido activo o estructuras comprimidas no verificables se rechazan.'}
                  </small>
                </label>
                {fileError && <p id={fileErrorId} role="alert" className="validation-message">{fileError}</p>}
                {originalFile && ['image/jpeg', 'image/png'].includes(originalFile.type) && (
                  <div>
                    <button type="button" className="secondary" disabled={busy || optimizing} onClick={async () => {
                      setOptimizing(true)
                      try {
                        const copy = await optimizeImage(originalFile)
                        if (!mounted.current) return
                        setFile(copy); setOptimized(true); setFileError('')
                        setMessage(''); setFailure(false)
                      } catch (error) {
                        if (mounted.current) { setMessage(error instanceof Error ? error.message : 'No se pudo optimizar la imagen.'); setFailure(true) }
                      } finally { if (mounted.current) setOptimizing(false) }
                    }}>{optimizing ? 'Preparando copia…' : 'Optimizar imagen'}</button>
                    <p className="help-text">Comprime una copia para que no supere 5 MiB. El archivo original se conserva en tu equipo. Revisa la legibilidad antes de confirmar.</p>
                    {optimized && file && <>
                      <p role="status">Se cargará la copia optimizada: {file.name} · {(file.size / 1048576).toFixed(2)} MiB.</p>
                      {imagePreview && <a href={imagePreview} target="_blank" rel="noopener noreferrer">Ver imagen optimizada</a>}
                      <button type="button" className="secondary" disabled={busy || optimizing} onClick={() => { setFile(originalFile); setOptimized(false); setFileError(uploadSizeError(originalFile)) }}>Usar archivo original</button>
                    </>}
                  </div>
                )}
                </>
              ) : editing.codigo === 'CARTA_PODER' ? (
                <>
                  <label>
                    Nombre completo del apoderado
                    <input
                      required
                      maxLength={150}
                      value={proxy.apoderado_nombre}
                      onChange={(e) =>
                        setProxy({ ...proxy, apoderado_nombre: formTextValue(e.currentTarget) })
                      }
                    />
                  </label>
                  <label>
                    Tipo de DI del apoderado
                    <select
                      required
                      value={proxy.apoderado_tipo_di_id}
                      onChange={(e) => setProxy({ ...proxy, apoderado_tipo_di_id: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Número de DI del apoderado
                    <input
                      required
                      maxLength={30}
                      value={proxy.apoderado_numero_di}
                      onChange={(e) =>
                        setProxy({ ...proxy, apoderado_numero_di: formTextValue(e.currentTarget) })
                      }
                    />
                  </label>
                </>
              ) : null}
            </fieldset>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy || optimizing}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button disabled={busy || optimizing || (editing.origen === 'SUBIDO' && !!fileError)}>
                {busy
                  ? editing.origen === 'SUBIDO' ? 'Guardando…' : 'Generando PDF…'
                  : editing.origen === 'SUBIDO'
                    ? 'Confirmar carga'
                    : 'Generar PDF'}
              </button>
            </div>
          </InlineForm>
          {failure && <button
            type="button"
            className="secondary"
            disabled={busy || optimizing}
            onClick={() => {
              setHistoryDoc(editing)
              setFilePage(0)
            }}
          >
            Ver versiones
          </button>}
        </DocumentDialog>
      )}
      {historyDoc && (
        <DocumentDialog busy={busy} close={() => setHistoryDoc(null)}>
          <h2>Historia: {historyDoc.nombre}</h2>
          <p>
            Las versiones confirmadas se conservan. Descargar desde aquí identifica el archivo como
            histórico.
          </p>
          {message && (
            <p
              role={failure ? 'alert' : 'status'}
              className={failure ? 'validation-message' : 'success'}
            >
              {message}
            </p>
          )}
          {fileLoading ? (
            <p role="status">Consultando versiones…</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Operación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id}>
                      <td>
                        {new Date(f.confirmado_at ?? f.iniciado_at).toLocaleString('es-PE', {
                          timeZone: 'America/Lima',
                        })}
                      </td>
                      <td>{f.estado_tecnico}</td>
                      <td>
                        {f.estado_tecnico === 'CONFIRMADO' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void download(historyDoc, f.id, true)}
                          >
                            Descargar histórico
                          </button>
                        ) : f.estado_tecnico === 'PREPARADO' && f.iniciado_por === state.userId ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void operation(async () => {
                                await invoke(
                                  historyDoc.origen === 'SUBIDO'
                                    ? 'expediente-cargar'
                                    : 'expediente-generar',
                                  { cancelar_reserva: f.id },
                                )
                                return 'Reserva cancelada. No se eliminó ninguna versión confirmada.'
                              })
                            }
                          >
                            Cancelar reserva pendiente
                          </button>
                        ) : (
                          'Sin acción'
                        )}
                      </td>
                    </tr>
                  ))}
                  {!files.length && (
                    <tr>
                      <td colSpan={3}>No hay versiones ni operaciones registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <AcademicPagination
            page={filePage}
            count={files.length}
            disabled={busy || fileLoading}
            onChange={setFilePage}
          />
          <div className="form-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setFileRevision((v) => v + 1)}
            >
              Consultar operaciones
            </button>
            <button type="button" disabled={busy} onClick={() => setHistoryDoc(null)}>
              Cerrar historia
            </button>
          </div>
        </DocumentDialog>
      )}
    </section>
  )
}
