import { useEffect, useState } from 'react'
import { useSession } from '../security/SessionProvider'
import { useConfirmation } from '../academic/AcademicUi'
import { AcademicSearch } from '../academic/AcademicLayout'
import { documentError, type CycleDocument, type DocumentType } from './contracts'
type Cycle = { id: string; updated_at: string; estado_codigo: string }
export function CycleDocuments({
  cycle,
  blocked = false,
  onDirtyChange,
  onBusyChange,
}: {
  cycle: Cycle
  blocked?: boolean
  onDirtyChange?: (v: boolean) => void
  onBusyChange?: (v: boolean) => void
}) {
  const { client } = useSession(),
    [types, setTypes] = useState<DocumentType[]>([]),
    [saved, setSaved] = useState<CycleDocument[]>([]),
    [draft, setDraft] = useState<CycleDocument[]>([])
  const [search, setSearch] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [failure, setFailure] = useState(false),
    [revision, setRevision] = useState(0)
  const { ask, dialog } = useConfirmation(busy)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved),
    eligible = ['PROGRAMADO', 'EN_CURSO', 'CERRADO'].includes(cycle.estado_codigo)
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])
  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])
  useEffect(() => {
    let alive = true
    setLoading(true)
    void Promise.all([
      client.from('tipo_documento').select('*').order('nombre'),
      client.from('ciclo_documento').select('*').eq('ciclo_id', cycle.id).order('id'),
    ]).then(([t, c]) => {
      if (!alive) return
      setLoading(false)
      if (t.error || c.error) {
        setFailure(true)
        setMessage('No se pudo consultar la configuración documental.')
        return
      }
      setTypes(t.data as DocumentType[])
      setSaved(c.data as CycleDocument[])
      setDraft(c.data as CycleDocument[])
    })
    return () => {
      alive = false
    }
  }, [client, cycle.id, revision])
  function change(t: DocumentType, key: 'activo' | 'obligatorio', v: boolean) {
    setDraft((old) => {
      const found = old.find((c) => c.tipo_documento_id === t.id)
      return found
        ? old.map((c) => (c === found ? { ...c, [key]: v } : c))
        : [
            ...old,
            {
              id: '',
              updated_at: '',
              tipo_documento_id: t.id,
              activo: key === 'activo' ? v : false,
              obligatorio: key === 'obligatorio' ? v : false,
            },
          ]
    })
  }
  async function save(regularize = false) {
    if (blocked || busy || !eligible || loading) return
    if (
      (await ask({
        title: regularize ? 'Regularizar expedientes existentes' : 'Guardar documentos del Ciclo',
        description:
          'Se actualizarán en una sola operación todas las matrículas activas del Ciclo. Se conservarán archivos e historia. Los documentos activados se aplican inicialmente a todos; los opcionales pueden retirarse por alumno.',
        confirmLabel: regularize ? 'Regularizar' : 'Guardar y sincronizar',
      })) === null
    )
      return
    setBusy(true)
    setMessage('')
    const args = {
      p_ciclo_id: cycle.id,
      p_expected_updated_at: cycle.updated_at,
      p_expected_config: saved.map(({ id, updated_at }) => ({ id, updated_at })),
    }
    const r = regularize
      ? await client.rpc('regularizar_expedientes_ciclo', args)
      : await client.rpc('guardar_documentos_ciclo', {
          ...args,
          p_documentos: draft.map((c) => ({
            tipo_documento_id: c.tipo_documento_id,
            activo: String(c.activo),
            obligatorio: String(c.obligatorio),
          })),
        })
    setBusy(false)
    setFailure(!!r.error)
    if (r.error) setMessage(documentError(r.error))
    else {
      setRevision((v) => v + 1)
      setMessage(
        regularize
          ? 'Expedientes regularizados correctamente.'
          : 'Documentos guardados y sincronizados correctamente.',
      )
    }
  }
  return (
    <section>
      {dialog}
      <h3>Documentos del Ciclo</h3>
      <p className="help-text">
        Todos los documentos activos se aplican a las matrículas activas. Obligatorio impide el
        retiro individual; opcional permite retirarlo conservando su historia.
      </p>
      {blocked && <p>Guarda o cancela los otros cambios antes de configurar documentos.</p>}
      {message && (
        <p
          role={failure ? 'alert' : 'status'}
          className={failure ? 'validation-message' : 'success'}
        >
          {message}
        </p>
      )}
      <AcademicSearch
        label="Buscar documento"
        value={search}
        onChange={setSearch}
        placeholder="Código o nombre"
      />
      {loading ? (
        <p role="status">Cargando configuración…</p>
      ) : (
        <div className="table-scroll">
          <table aria-label="Configuración documental del Ciclo">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Origen</th>
                <th>Aplicar</th>
                <th>Obligatorio</th>
              </tr>
            </thead>
            <tbody>
              {types
                .filter((t) => (t.codigo + ' ' + t.nombre).includes(search.trim().toUpperCase()))
                .map((t) => {
                  const c = draft.find((c) => c.tipo_documento_id === t.id)
                  return (
                    <tr key={t.id}>
                      <td>
                        {t.nombre}
                        {!t.activo && <small> · Tipo inactivo</small>}
                      </td>
                      <td>{t.origen === 'SUBIDO' ? 'Subido' : 'Generado'}</td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Aplicar ${t.nombre}`}
                          checked={c?.activo ?? false}
                          disabled={blocked || busy || !eligible || (!t.activo && !c?.activo)}
                          onChange={(e) => change(t, 'activo', e.target.checked)}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Obligatorio ${t.nombre}`}
                          checked={c?.obligatorio ?? false}
                          disabled={blocked || busy || !eligible}
                          onChange={(e) => change(t, 'obligatorio', e.target.checked)}
                        />
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
      {eligible && (
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy || !dirty}
            onClick={() => {
              setDraft(saved)
              setMessage('')
            }}
          >
            Cancelar cambios
          </button>
          <button
            type="button"
            disabled={blocked || busy || loading || !dirty}
            onClick={() => void save()}
          >
            Guardar documentos del Ciclo
          </button>
          <button
            type="button"
            className="secondary"
            disabled={blocked || busy || loading || dirty}
            onClick={() => void save(true)}
          >
            Regularizar expedientes existentes
          </button>
        </div>
      )}
      {!eligible && <p>Solo consulta: este estado no permite modificar documentos.</p>}
    </section>
  )
}
