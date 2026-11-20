import { useEffect, useState } from 'react'
import { DocumentDialog } from '../documents/EnrollmentDocuments'
import { PreviewHeader } from '../documents/PreviewHeader'

export function ReportPdfPreview({ blob, name, close }: { blob: Blob; name: string; close: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return <DocumentDialog wide busy={false} label={`Vista previa: ${name}`} close={close}>
    <PreviewHeader name={name} close={close}/>
    {url && <iframe title={`PDF de ${name}`} src={url}/>}
  </DocumentDialog>
}
