import { DocumentMoreActions } from './DocumentMoreActions'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '../security/SessionProvider'
import { AcademicPagination, AcademicSearch } from '../academic/AcademicLayout'
import { InlineForm, useConfirmation } from '../academic/AcademicUi'
import { formTextValue } from '../lib/formText'
import { documentError, type AppliedDocument, type DocumentFile } from './contracts'

function DocumentDialog({
  close,
  busy,
  children,
}: {
  close: () => void
  busy: boolean
  children: ReactNode
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
        className="confirm-dialog"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Archivo del expediente"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) close()
          if (e.key === 'Tab') {
            const items = [
              ...panel.current!.querySelectorAll<HTMLElement>(
                'input:not(:disabled),select:not(:disabled),button:not(:disabled),[tabindex="0"]',
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
}: {
  enrollment: string
  cycleId: string
  enrollmentState: string
  cycleState: string
  blocked?: boolean
  onBusyChange?: (v: boolean) => void
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
  const [lastFiles, setLastFiles] = useState<Record<string, DocumentFile>>({}),
    [capitania, setCapitania] = useState<string | null>(null)
  const { ask, dialog } = useConfirmation(busy),
    lock = useRef(false),
    mounted = useRef(true)
  const eligible =
    enrollmentState === 'ACTIVO' && ['PROGRAMADO', 'EN_CURSO', 'CERRADO'].includes(cycleState)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
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
      const [d, s, f, c] = await Promise.all([
        query.order('nombre').order('id').range(page*30,page*30+29),
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
      ])
      if (!alive) return
      setLoading(false)
      if (d.error || s.error) {
        setRows([]);setSummary(null);setSourceKnown(false);setLastFiles({})
        setFailure(true)
        setMessage('No se pudo consultar el expediente completo.')
        return
      }
      const docs = d.data as AppliedDocument[]
      setRows(docs)
      setSummary(s.data)
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
  async function invoke(name: string, body: Record<string, unknown> | FormData) {
    const r = await client.functions.invoke(name, { body })
    if (r.error) {
      let code = ''
      try {
        if (r.error.context instanceof Response) code = (await r.error.context.json()).code ?? ''
      } catch {
        /* no raw platform response */
      }
      throw new Error(documentError({ code }))
    }
    return r.data
  }
  async function submit() {
    if (!editing || !eligible || blocked) return
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
      f.plantilla_version !== `h6-1:${d.codigo}` ||
      f.datos_generacion.capitania_nombre !== capitania
      ? 'Fuente o plantilla cambiada'
      : ''
  }
  const filtered = rows.filter(
    (d) =>
      (showHistory || (d.contexto_vigente && d.activo)) &&
      (!missingOnly || d.estado === 'PENDIENTE') &&
      (d.codigo + ' ' + d.nombre).toUpperCase().includes(search.trim().toUpperCase()),
  )
  return (
    <section>
      {dialog}
      <h3>Expediente</h3>
      {summary && (
        <p role="status">
          {summary.completados} de {summary.aplicables} documentos completos · {summary.pendientes}{' '}
          pendientes
        </p>
      )}
      {!eligible && <p>Solo consulta e historia. No se permiten nuevas modificaciones.</p>}
      {blocked && <p>Completa o cancela los otros cambios antes de modificar documentos.</p>}
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
        <label>
          <input
            type="checkbox"
            checked={missingOnly}
          onChange={(e) => {setMissingOnly(e.target.checked);setPage(0)}}
          />
          Solo faltantes
        </label>
        <label>
          <input
            type="checkbox"
            checked={showHistory}
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
                  <tr key={d.id}>
                    <td>
                      {d.nombre}
                      <small className="secondary-text">
                        {d.origen === 'SUBIDO' ? 'Subido' : 'Generado'}
                      </small>
                    </td>
                    <td>
                      {d.obligatorio ? 'Obligatorio' : 'Opcional'}
                      {!d.activo && <small> · Retirado</small>}
                      {!d.contexto_vigente && <small> · Contexto anterior</small>}
                    </td>
                    <td>
                      {d.estado}
                      {status && <small className="secondary-text">{status}</small>}
                    </td>
                    <td>
                      <div className="record-header-actions">
                        {canMutate && (
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy}
                            onClick={() => open(d)}
                          >
                            {d.origen === 'SUBIDO'
                              ? d.estado === 'PENDIENTE'
                                ? 'Cargar'
                                : 'Reemplazar'
                              : d.estado === 'PENDIENTE'
                                ? 'Generar'
                                : 'Regenerar'}
                          </button>
                        )}
                        {d.ultimo_archivo_confirmado_id && (
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy}
                            onClick={() =>
                              void download(
                                d,
                                d.ultimo_archivo_confirmado_id!,
                                status === 'Histórico' || status === 'Fuente o plantilla cambiada',
                              )
                            }
                          >
                            {status === 'Histórico' || status === 'Fuente o plantilla cambiada'
                              ? 'Descargar histórico'
                              : 'Descargar'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => {
                            setHistoryDoc(d)
                            setFilePage(0)
                          }}
                          title={`Historia y operaciones de ${d.nombre}`}
                          aria-label={`Historia y operaciones de ${d.nombre}`}
                        >
                          Historia
                        </button>
                        {canMutate && (
                          <DocumentMoreActions
                            name={d.nombre}
                            mandatory={d.obligatorio}
                            busy={busy}
                            onRetire={() => void withdraw(d)}
                          />
                        )}
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
      {editing && (
        <DocumentDialog busy={busy} close={() => setEditing(null)}>
          <h2>
            {editing.origen === 'SUBIDO' ? 'Cargar documento' : 'Generar documento'}:{' '}
            {editing.nombre}
          </h2>
          <p className="help-text">
            Se conservarán las versiones anteriores. La operación no se reintenta automáticamente.
          </p>
          {message && failure && (
            <p role="alert" className="validation-message">
              {message}
            </p>
          )}
          <InlineForm onSubmit={() => void submit()}>
            <fieldset disabled={busy}>
              {editing.origen === 'SUBIDO' ? (
                <label>
                  Archivo (máximo 5 MiB)
                  <input
                    type="file"
                    aria-label="Archivo (máximo 5 MiB)"
                    required
                    accept={
                      editing.codigo === 'FOTO_PASAPORTE'
                        ? 'image/jpeg,image/png'
                        : 'application/pdf,image/jpeg,image/png'
                    }
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <small>
                    PDF simple de hasta 20 páginas, JPEG o PNG de hasta 20 megapíxeles. Los PDF
                    cifrados, con contenido activo o estructuras comprimidas no verificables se
                    rechazan.
                  </small>
                </label>
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
              ) : (
                <p>
                  La fecha y edad corresponden a esta generación. La fuente vigente o fotografía
                  final se determina en el servidor.
                </p>
              )}
            </fieldset>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button disabled={busy}>
                {busy
                  ? 'Procesando…'
                  : editing.origen === 'SUBIDO'
                    ? 'Confirmar carga'
                    : 'Confirmar generación'}
              </button>
            </div>
          </InlineForm>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => {
              setHistoryDoc(editing)
              setFilePage(0)
            }}
          >
            Consultar resultado de la operación
          </button>
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
