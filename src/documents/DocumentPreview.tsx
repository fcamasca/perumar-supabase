import { useEffect, useId, useRef, useState } from 'react'
import { PreviewHeader } from './PreviewHeader'

export function DocumentPreview({ code, name, onClose }: { code: string; name: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), headingId = useId()
  const [url, setUrl] = useState(''), [error, setError] = useState(false)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const panel = dialog.current
    panel?.showModal()
    return () => { panel?.close(); if (opener?.isConnected) opener.focus() }
  }, [])
  useEffect(() => {
    let alive = true, objectUrl = ''
    setUrl(''); setError(false)
    void import('./previewPdf').then(({ buildDocumentPreview }) => buildDocumentPreview(code)).then(blob => {
      if (!alive) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => { if (alive) setError(true) })
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [code])
  return <dialog ref={dialog} className="document-preview" aria-labelledby={headingId} onCancel={e => { e.preventDefault(); onClose() }} onClose={e => {
    // StrictMode may reopen the dialog before the cleanup's queued close event arrives.
    if (!e.currentTarget.open) onClose()
  }}>
    <PreviewHeader name={name} headingId={headingId} close={onClose}/>
    <p>Formato con datos de ejemplo. No se registra ningún documento en el expediente.</p>
    {error ? <p role="alert" className="validation-message">No se pudo preparar la vista previa. Cierra y vuelve a abrirla para intentar nuevamente.</p> : url ? <iframe title={`Vista previa PDF de ${name}`} src={url} /> : <p role="status">Preparando vista previa…</p>}
    {url && <a href={url} target="_blank" rel="noopener noreferrer">Abrir vista previa PDF en otra pestaña</a>}
  </dialog>
}
