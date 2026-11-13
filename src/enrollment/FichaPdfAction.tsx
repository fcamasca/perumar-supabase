import { useEffect, useRef, useState } from 'react'
import { useSession } from '../security/SessionProvider'

const errors: Record<string, string> = {
  SESSION: 'La sesión venció. Inicia sesión nuevamente.', ACCESS: 'Tu acceso no permite generar esta ficha.',
  SOURCE: 'No se pudo consultar la ficha. Recarga y verifica la matrícula.',
  SOURCE_CHANGED: 'Los datos de la ficha cambiaron. Genera una nueva ficha PDF antes de descargar.',
  VERSION: 'La matrícula cambió. Recarga y decide nuevamente.', STATE: 'La matrícula o el Ciclo ya no permiten generar o descargar la ficha.',
  EXPIRED: 'La ficha venció. Puedes generar una nueva.', ARTIFACT: 'La ficha no está disponible. Puedes generar una nueva.',
  GLYPH: 'La ficha contiene un carácter que no puede representarse. Revisa los datos.',
  LIMIT: 'La ficha supera el límite permitido. Solicita revisión.', SNAPSHOT: 'La información histórica no está completa. Solicita revisión.',
}
export function FichaPdfAction({ enrollment, version, enrollmentState, cycleState, disabled = false }: { enrollment: string; version: string; enrollmentState: string; cycleState: string; disabled?: boolean }) {
  const { client, state } = useSession()
  const [artifact, setArtifact] = useState<string>(), [hasGenerated, setHasGenerated] = useState<boolean>(), [checking, setChecking] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(false)
  const lock = useRef(false), epoch = useRef(0), focus = useRef<HTMLParagraphElement>(null)
  const eligible = enrollmentState === 'ACTIVO' && ['PROGRAMADO', 'EN_CURSO', 'CERRADO'].includes(cycleState)
  const allowed = !!state.roles?.some(r => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(r))
  useEffect(() => {
    const current = ++epoch.current
    let active = true
    lock.current = false; setBusy(false); setArtifact(undefined); setHasGenerated(undefined); setMessage(''); setError(false)
    if (!allowed || !eligible) { setChecking(false); return () => { active = false; ++epoch.current } }
    setChecking(true)
    void (async () => {
      try {
        // Recover only minimal metadata under the current JWT/RLS; never persist PII or URLs locally.
        const [history, source] = await Promise.all([
          client.from('auditoria').select('new_values').eq('entidad', 'ficha_pdf').eq('registro_id', enrollment).eq('accion', 'FICHA_PDF_GENERADA').order('fecha', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle(),
          client.from('matricula_ficha_fuente').select('source_fingerprint').eq('id', enrollment).maybeSingle(),
        ])
        if (!active || current !== epoch.current) return
        if (history.error) throw new Error('lookup')
        const manifest = history.data?.new_values as { artefacto_id?: string; source_fingerprint?: string; expires_at?: string } | undefined
        const exists = typeof manifest?.artefacto_id === 'string'
        setHasGenerated(exists)
        if (source.error) throw new Error('lookup')
        if (exists && manifest.source_fingerprint && manifest.source_fingerprint === source.data?.source_fingerprint && Date.parse(manifest.expires_at ?? '') > Date.now()) {
          setArtifact(manifest.artefacto_id)
          setMessage('Ficha anterior recuperada. Su disponibilidad se verificará al descargar.')
        } else if (exists) setMessage('La ficha anterior venció o cambió su fuente. Regenera la ficha para descargarla.')
      } catch {
        if (active && current === epoch.current) { setError(true); setMessage('No se pudo consultar la ficha anterior. Puedes solicitar una nueva generación explícitamente.') }
      } finally { if (active && current === epoch.current) setChecking(false) }
    })()
    return () => { active = false; ++epoch.current }
  }, [client, enrollment, state.userId, allowed, eligible, version])
  useEffect(() => { if (error) focus.current?.focus() }, [error, message])
  async function run(download: boolean) {
    if (lock.current || checking) return
    lock.current = true; setBusy(true); setMessage(''); setError(false)
    const current = epoch.current
    try {
      const { data, error } = await client.functions.invoke('ficha-matricula', { body: { matricula_id: enrollment, expected_updated_at: version, ...(download ? { artefacto_id: artifact } : {}) } })
      if (current !== epoch.current) return
      if (error) {
        let code = ''
        try { if (error.context instanceof Response) code = (await error.context.json()).code ?? ''; if (['SOURCE_CHANGED', 'EXPIRED', 'ARTIFACT'].includes(code) && current === epoch.current) setArtifact(undefined) } catch { /* safe fallback; no raw platform message */ }
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
        setArtifact(data.artefacto_id); setHasGenerated(true); setMessage('Ficha generada. Disponible durante 24 horas, mientras la matrícula, el Ciclo y los datos de origen lo permitan. Regenera si cambian los datos.')
      }
    } catch (failure) {
      if (current === epoch.current) { setError(true); setMessage(failure instanceof Error ? failure.message : 'No se pudo completar la operación.') }
    } finally { if (current === epoch.current) { lock.current = false; setBusy(false) } }
  }
  if (!allowed) return null
  return <div className="ficha-pdf-action"><div className="record-header-actions"><button type="button" className="secondary" disabled={disabled || busy || checking || !eligible} onClick={() => void run(false)}>{busy ? 'Procesando ficha…' : checking && eligible ? 'Consultando ficha…' : hasGenerated === true ? 'Regenerar ficha PDF' : hasGenerated === false || !eligible ? 'Generar ficha PDF' : 'Generar nueva ficha PDF'}</button>{artifact && <button type="button" className="secondary" disabled={disabled || busy || checking || !eligible} onClick={() => void run(true)}>Descargar ficha PDF</button>}</div>{!eligible && <p className="help-text">Ficha PDF disponible solo para matrícula activa y Ciclo programado, en curso o cerrado.</p>}{message && <p ref={focus} tabIndex={-1} role={error ? 'alert' : 'status'} className={error ? 'validation-message' : 'help-text'}>{message}</p>}</div>
}
