import { useEffect, useRef, useState } from 'react'
import { useSession } from '../security/SessionProvider'

const errors: Record<string, string> = {
  SESSION: 'La sesión venció. Inicia sesión nuevamente.', ACCESS: 'Tu acceso no permite generar esta ficha.',
  SOURCE: 'No se pudo consultar la ficha. Recarga y verifica la matrícula.',
  VERSION: 'La matrícula cambió. Recarga y decide nuevamente.', STATE: 'La matrícula o el Ciclo ya no permiten generar o descargar la ficha.',
  EXPIRED: 'La ficha venció. Puedes generar una nueva.', ARTIFACT: 'La ficha no está disponible. Puedes generar una nueva.',
  GLYPH: 'La ficha contiene un carácter que no puede representarse. Revisa los datos.',
  LIMIT: 'La ficha supera el límite permitido. Solicita revisión.', SNAPSHOT: 'La información histórica no está completa. Solicita revisión.',
}
export function FichaPdfAction({ enrollment, version, enrollmentState, cycleState, disabled = false }: { enrollment: string; version: string; enrollmentState: string; cycleState: string; disabled?: boolean }) {
  const { client, state } = useSession()
  const [artifact, setArtifact] = useState<string>(), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(false)
  const lock = useRef(false), epoch = useRef(0), focus = useRef<HTMLParagraphElement>(null)
  useEffect(() => { ++epoch.current; setArtifact(undefined); setMessage(''); return () => { ++epoch.current } }, [enrollment, state.userId])
  useEffect(() => { if (error) focus.current?.focus() }, [error, message])
  const eligible = enrollmentState === 'ACTIVO' && ['PROGRAMADO', 'EN_CURSO', 'CERRADO'].includes(cycleState)
  const allowed = state.roles?.some(r => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(r))
  async function run(download: boolean) {
    if (lock.current) return
    lock.current = true; setBusy(true); setMessage(''); setError(false)
    const current = epoch.current
    try {
      const { data, error } = await client.functions.invoke('ficha-matricula', { body: { matricula_id: enrollment, expected_updated_at: version, ...(download ? { artefacto_id: artifact } : {}) } })
      if (current !== epoch.current) return
      if (error) {
        let code = ''
        try { if (error.context instanceof Response) code = (await error.context.json()).code ?? '' } catch { /* safe fallback; no raw platform message */ }
        throw new Error(errors[code] ?? 'No se pudo completar la operación. Consulta el estado y decide nuevamente; no se reintentó automáticamente.')
      }
      if (download) {
        if (!(data instanceof Blob) || data.type !== 'application/pdf') throw new Error('No se recibió un PDF válido.')
        const url = URL.createObjectURL(data), anchor = document.createElement('a')
        try { anchor.href = url; anchor.download = 'ficha-matricula.pdf'; anchor.click() }
        finally { setTimeout(() => URL.revokeObjectURL(url), 1000) }
        setMessage('Descarga iniciada.')
      } else {
        if (typeof data?.artefacto_id !== 'string') throw new Error('No se pudo confirmar la generación. Consulta antes de generar nuevamente.')
        setArtifact(data.artefacto_id); setMessage('Ficha generada. Disponible durante 24 horas, mientras la matrícula y el Ciclo lo permitan.')
      }
    } catch (failure) {
      if (current === epoch.current) { setError(true); setMessage(failure instanceof Error ? failure.message : 'No se pudo completar la operación.') }
    } finally { lock.current = false; if (current === epoch.current) setBusy(false) }
  }
  if (!allowed) return null
  return <div className="ficha-pdf-action"><div className="record-header-actions"><button type="button" className="secondary" disabled={disabled || busy || !eligible} onClick={() => void run(false)}>{busy ? 'Procesando ficha…' : artifact ? 'Regenerar ficha PDF' : 'Generar ficha PDF'}</button>{artifact && <button type="button" className="secondary" disabled={disabled || busy || !eligible} onClick={() => void run(true)}>Descargar ficha PDF</button>}</div>{!eligible && <p className="help-text">Ficha PDF disponible solo para matrícula activa y Ciclo programado, en curso o cerrado.</p>}{message && <p ref={focus} tabIndex={-1} role={error ? 'alert' : 'status'} className={error ? 'validation-message' : 'help-text'}>{message}</p>}</div>
}
