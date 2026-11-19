import { useEffect, useState } from 'react'
import { useSession } from '../security/SessionProvider'
import { useConfirmation } from '../academic/AcademicUi'
import { documentError, type AppliedDocument } from './contracts'

export function BulkDocumentRetirement({
  cycleId,
  enrollments,
  disabled,
  onChanged,
  onBusyChange,
}: {
  cycleId: string
  enrollments: string[]
  disabled: boolean
  onChanged: () => void
  onBusyChange: (v: boolean) => void
}) {
  const { client } = useSession(),
    [rows, setRows] = useState<AppliedDocument[]>([]),
    [choice, setChoice] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [message, setMessage] = useState('')
  const { ask, dialog } = useConfirmation(busy),
    ids = enrollments.join(',')
  useEffect(() => {
    onBusyChange(busy)
    return () => onBusyChange(false)
  }, [busy, onBusyChange])
  useEffect(() => {
    let alive = true
    setRows([])
    setChoice('')
    setMessage('')
    if (!ids) return
    setLoading(true)
    void client
      .from('matricula_documento')
      .select('*')
      .in('matricula_id', ids.split(','))
      .eq('contexto_vigente', true)
      .eq('activo', true)
      .eq('obligatorio', false)
      .order('id')
      .then((r) => {
        if (!alive) return
        setLoading(false)
        if (r.error) setMessage('No se pudieron consultar los opcionales seleccionados.')
        else setRows(r.data as AppliedDocument[])
      })
    return () => {
      alive = false
    }
  }, [client, ids])
  const options = [...new Map(rows.map((d) => [d.ciclo_documento_id, d])).values()],
    affected = rows.filter((d) => d.ciclo_documento_id === choice)
  async function retire() {
    if (disabled || busy || !affected.length || affected.length > 50) return
    const reason = await ask({
      title: 'Retirar documento de alumnos seleccionados',
      description: `${affected[0].nombre}: ${affected.length} matrículas con este opcional activo, de ${enrollments.length} seleccionadas. Se conservan archivos e historia. No se modifican otros alumnos ni la configuración del Ciclo.`,
      reason: true,
      confirmLabel: 'Retirar de la selección',
    })
    if (reason === null) return
    setBusy(true)
    setMessage('')
    const r = await client.rpc('retirar_documentos_opcionales', {
      p_ciclo_id: cycleId,
      p_documentos: affected.map((d) => ({ id: d.id, expected_updated_at: d.updated_at })),
      p_motivo: reason,
    })
    setBusy(false)
    if (r.error) setMessage(documentError(r.error))
    else {
      onChanged()
      setMessage('Documentos retirados correctamente.')
    }
  }
  if (!enrollments.length) return null
  return (
    <div>
      {dialog}
      <div className="form-actions">
        <span>{enrollments.length} alumnos seleccionados en esta página</span>
        <label>
          Documento opcional
          <select
            aria-label="Documento opcional a retirar"
            value={choice}
            disabled={disabled || busy || loading}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">Seleccionar documento</option>
            {options.map((d) => (
              <option key={d.ciclo_documento_id} value={d.ciclo_documento_id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary"
          disabled={disabled || busy || loading || !affected.length || affected.length > 50}
          onClick={() => void retire()}
        >
          Retirar opcional de {affected.length} alumnos
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  )
}
