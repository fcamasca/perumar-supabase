export function PreviewHeader({ name, close, disabled = false, headingId }: { name: string; close: () => void; disabled?: boolean; headingId?: string }) {
  return <header className="preview-heading">
    <h2 id={headingId}>Vista previa: {name}</h2>
    <button type="button" className="secondary preview-close" aria-label="Cerrar vista previa" title="Cerrar vista previa" disabled={disabled} onClick={close}>×</button>
  </header>
}
