import { useEffect, useId, useRef, useState } from 'react'
import { useSession } from '../security/SessionProvider'
import { documentFileBlob } from './documentFileResponse'

type PhotoProps = { enrollment: string; enrollmentState: string; cycleState: string; student?: never } | { student: string; enrollment?: never; enrollmentState?: never; cycleState?: never }
export function StudentPhoto({ student }: { student: string }) { return <EnrollmentPhoto student={student} /> }

export function EnrollmentPhoto({ enrollment, enrollmentState, cycleState, student }: PhotoProps) {
  const { client, state } = useSession(), heading = useId(), dialog = useRef<HTMLDialogElement>(null)
  const [photo, setPhoto] = useState(''), [loading, setLoading] = useState(true), [failed, setFailed] = useState(false), [revision, setRevision] = useState(0)
  const [provenance, setProvenance] = useState('')
  const allowed = (!!student || (enrollmentState === 'ACTIVO' && ['PROGRAMADO', 'EN_CURSO', 'CERRADO'].includes(cycleState ?? '')))
    && !!state.roles?.some(role => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(role))
  useEffect(() => {
    let alive = true, url = ''
    setPhoto(''); setProvenance(''); setFailed(false); setLoading(allowed)
    if (!allowed) return
    void (async () => {
      try {
        let documentId: string, fileId: string, historical = false, caption = ''
        if (student) {
          const result = await client.from('matricula_documento_archivo')
            .select('id,confirmado_at,documento:matricula_documento!matricula_documento_archivo_matricula_documento_id_fkey!inner(id,activo,contexto_vigente,ultimo_archivo_confirmado_id,matricula:matricula!inner(alumno_id,codigo_matricula,estado_codigo,ciclo:ciclo!inner(estado_codigo)))')
            .eq('estado_tecnico', 'CONFIRMADO').eq('documento.codigo', 'FOTO_ALUMNO')
            .eq('documento.matricula.alumno_id', student).in('mime', ['image/jpeg', 'image/png'])
            .order('confirmado_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle()
          if (!alive) return
          if (result.error) throw result.error
          if (!result.data) return
          const file = result.data as unknown as { id: string; confirmado_at: string; documento: { id: string; activo: boolean; contexto_vigente: boolean; ultimo_archivo_confirmado_id: string; matricula: { codigo_matricula: string; estado_codigo: string; ciclo: { estado_codigo: string } } } }
          const d = file.documento, m = d.matricula
          documentId = d.id; fileId = file.id
          historical = !d.activo || !d.contexto_vigente || d.ultimo_archivo_confirmado_id !== file.id || m.estado_codigo !== 'ACTIVO' || ['DESIERTO', 'ANULADO'].includes(m.ciclo.estado_codigo)
          caption = `Matrícula ${m.codigo_matricula} · ${new Date(file.confirmado_at).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}${historical ? ' · Histórica' : ''}`
        } else {
          const result = await client.from('matricula_documento')
          .select('id,ultimo_archivo_confirmado_id')
          .eq('matricula_id', enrollment).eq('codigo', 'FOTO_ALUMNO')
          .eq('activo', true).eq('contexto_vigente', true).eq('estado', 'CARGADO').maybeSingle()
        if (!alive) return
        if (result.error) throw result.error
        if (!result.data?.ultimo_archivo_confirmado_id) return
          documentId = result.data.id; fileId = result.data.ultimo_archivo_confirmado_id
        }
        const response = await client.functions.invoke('expediente-descargar', { body: {
          documento_id: documentId, archivo_id: fileId, historico: historical,
        } })
        if (!alive) return
        if (response.error) throw response.error
        const blob = documentFileBlob(response.data, response.response)
        if (!['image/jpeg', 'image/png'].includes(blob.type)) throw new Error('photo format')
        url = URL.createObjectURL(blob)
        setPhoto(url)
        setProvenance(caption)
      } catch { if (alive) setFailed(true) }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [client, enrollment, student, state.userId, allowed, revision])
  return <aside className="enrollment-photo" aria-label="Foto del alumno">
    {photo && allowed ? <>
      <button type="button" className="enrollment-photo-image" aria-label="Ampliar foto del alumno" onClick={() => dialog.current?.showModal()}>
        <img src={photo} alt="Foto del alumno" />
      </button>
      <small>{student ? 'Última foto cargada' : 'Foto del alumno'}</small>
      {provenance && <small>{provenance}</small>}
      <dialog ref={dialog} className="enrollment-photo-dialog" aria-labelledby={heading}>
        <header><h2 id={heading}>Foto del alumno</h2><button type="button" className="secondary" onClick={() => dialog.current?.close()}>Cerrar foto</button></header>
        <img src={photo} alt="Foto del alumno ampliada" />
        {provenance && <p>{provenance}</p>}
      </dialog>
    </> : <div className="enrollment-photo-placeholder">
      <span role={loading ? 'status' : undefined}>{loading ? 'Consultando foto…' : failed ? 'No se pudo consultar la foto' : 'Sin foto'}</span>
      {failed && <button type="button" className="secondary" onClick={() => setRevision(value => value + 1)}>Consultar foto</button>}
    </div>}
  </aside>
}
