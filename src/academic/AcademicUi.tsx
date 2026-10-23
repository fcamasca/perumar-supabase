import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Confirmation = { title: string; description: string; reason?: boolean; confirmLabel?: string; sensitive?: boolean }
export function useConfirmation(busy = false) {
  const returnFocus = useRef<HTMLElement | null>(null), previousBusy = useRef(busy)
  const [request, setRequest] = useState<Confirmation | null>(null)
  const resolve = useRef<((value: string | null) => void) | null>(null)
  useEffect(() => () => { resolve.current?.(null) }, [])
  function ask(value: Confirmation): Promise<string | null> {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return new Promise(done => { resolve.current = done; setRequest(value) })
  }
  useEffect(() => {
    const completed = previousBusy.current && !busy
    previousBusy.current = busy
    if (!request && completed && returnFocus.current) {
      const target = returnFocus.current
      returnFocus.current = null
      if (target.isConnected && !target.matches(':disabled')) target.focus()
    }
  }, [request, busy])
  const finish = useCallback((value: string | null) => { if (value === null) returnFocus.current = null; resolve.current?.(value); resolve.current = null; setRequest(null) }, [])
  return { ask, dialog: request && <ConfirmDialog {...request} onFinish={finish} /> }
}

export function ConfirmDialog({ title, description, reason, confirmLabel = 'Confirmar operación', sensitive, onFinish }: Confirmation & { onFinish: (value: string | null) => void }) {
  const panel = useRef<HTMLDivElement>(null), cancel = useRef<HTMLButtonElement>(null)
  const [value, setValue] = useState(''), [error, setError] = useState('')
  const id = useId()
  useEffect(() => { if (error) panel.current?.querySelector('textarea')?.focus() }, [error])
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const background = Array.from(document.body.children).filter(e => !e.contains(panel.current)) as HTMLElement[]
    const previous = background.map(e => e.inert)
    background.forEach(e => { e.inert = true })
    cancel.current?.focus()
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button,textarea,input,select,[tabindex="0"]') ?? []).filter(e => !e.hasAttribute('disabled'))
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onFinish(null) }
      if (event.key === 'Tab') {
        const elements = focusables(), first = elements[0], last = elements.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    function focus(event: FocusEvent) { if (!panel.current?.contains(event.target as Node)) cancel.current?.focus() }
    document.addEventListener('keydown', key); document.addEventListener('focusin', focus)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('focusin', focus); background.forEach((e, i) => { e.inert = previous[i] }); if (opener?.isConnected) opener.focus() }
  }, [onFinish])
  return createPortal(<div className="dialog-backdrop"><div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className="confirm-dialog">
    <h2 id={`${id}-title`}>{title}</h2><p id={`${id}-description`}>{description}</p>
    {reason && <label>Motivo obligatorio<textarea value={value} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={e => setValue(e.target.value)} /></label>}
    {error && <p id={`${id}-error`} role="alert">{error}</p>}
    <div className="dialog-actions"><button type="button" ref={cancel} className="secondary" onClick={() => onFinish(null)}>Cancelar operación</button><button type="button" onClick={() => { if (reason && !value.trim()) { setError('Indica el motivo antes de confirmar.'); return }; onFinish(reason ? value.trim() : '') }} className={sensitive ? "sensitive" : undefined}>{confirmLabel}</button></div>
  </div></div>, document.body)
}

// Native constraints remain useful, but feedback is inline and owned by the app.
export function InlineForm({ children, onSubmit, ...props }: { children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void; 'aria-describedby'?: string }) {
  const [errors, setErrors] = useState<{ id: string; label: string; text: string }[]>([])
  const id = useId(), ref = useRef<HTMLFormElement>(null), focusAfterSubmit = useRef(false)
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const failures: typeof errors = []
    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea'))
    const requiredMessages: Record<string, string> = {
      Modalidad: 'Selecciona una modalidad.', Carrera: 'Selecciona una Carrera.',
      Departamento: 'Selecciona un departamento.', Provincia: 'Selecciona una provincia.', Distrito: 'Selecciona un distrito.', Capitanía: 'Selecciona una capitanía.',
      'Nuevo estado': 'Selecciona el nuevo estado.', 'Motivo de Ciclo Desierto': 'Selecciona un motivo para declarar desierto el Ciclo.',
      'Fecha de inicio': 'Indica la fecha de inicio.', 'Fecha de fin': 'Indica la fecha de fin.',
      'Código de Materia': 'Ingresa el código de la Materia.', 'Nombre de Materia': 'Ingresa el nombre de la Materia.',
      'Código de Carrera': 'Ingresa el código de la Carrera.', 'Nombre de Carrera': 'Ingresa el nombre de la Carrera.',
      Sigla: 'Ingresa una sigla de 2 a 10 caracteres.', 'Detalle / motivo': 'Indica el detalle o motivo obligatorio.',
    }
    fields.forEach((field, i) => {
      if (!field.id) field.id = `${id}-field-${i}`
      if (field.willValidate && (!field.validity.valid || (field.required && !field.value.trim()))) {
        const label = field.getAttribute('aria-label') || field.labels?.[0]?.querySelector('.field-label')?.textContent?.replace('*', '').trim() || field.labels?.[0]?.firstChild?.textContent?.trim() || 'Campo'
        const text = field.required && !field.value.trim() ? requiredMessages[label] ?? `Completa el campo ${label.toLocaleLowerCase()}.` : field.validity.patternMismatch ? field.getAttribute('data-pattern-error') ?? 'Usa entre 2 y 10 caracteres alfanuméricos.' : field.validity.tooLong ? 'Supera el máximo de caracteres permitido.' : field.validity.rangeUnderflow ? 'La fecha de fin no puede ser anterior al inicio.' : 'Revisa el formato del valor.'
        failures.push({ id: field.id, label, text })
      }
    })
    focusAfterSubmit.current = failures.length > 0
    setErrors(failures)
    if (!failures.length) onSubmit(event)
  }
  useEffect(() => {
    const fields = ref.current?.querySelectorAll('input,select,textarea') ?? []
    fields.forEach(field => {
      const errorId = `${field.id}-error`
      const descriptions = (field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(value => value && value !== errorId)
      if (errors.some(e => e.id === field.id)) { field.setAttribute('aria-invalid', 'true'); descriptions.push(errorId) }
      else field.removeAttribute('aria-invalid')
      if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '))
      else field.removeAttribute('aria-describedby')
    })
    if (focusAfterSubmit.current && errors.length) {
      focusAfterSubmit.current = false
      const first = document.getElementById(errors[0].id)
      first?.focus({ preventScroll: true })
      first?.scrollIntoView?.({ block: 'center', behavior: 'auto' })
    }
  }, [errors])
  return <form {...props} ref={ref} noValidate onSubmit={validate} onChange={event => {
    const field = event.target
    if ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) && field.validity.valid && (!field.required || field.value.trim())) setErrors(previous => previous.some(e => e.id === field.id) ? previous.filter(e => e.id !== field.id) : previous)
  }}>{errors.length > 0 && <div role="alert" className="validation-errors"><p>Revisa los campos indicados:</p><ul>{errors.map(e => <li key={e.id}><a href={`#${e.id}`} onClick={event => { event.preventDefault(); const field = document.getElementById(e.id); field?.focus({ preventScroll: true }); field?.scrollIntoView?.({ block: 'center', behavior: 'auto' }) }}>{e.label}: {e.text}</a></li>)}</ul></div>}{children}{errors.map(e => {
    const field = document.getElementById(e.id)
    const target = field?.closest('label')
    return target && ref.current?.contains(target) ? createPortal(<span className="field-error" id={`${e.id}-error`}>Error: {e.text}</span>, target, e.id) : null
  })}</form>
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${['Inactivo', 'ANULADO', 'DESIERTO'].includes(value) ? 'status-muted' : ''}`}><span aria-hidden="true">● </span>{value.replaceAll('_', ' ')}</span>
}
export function EditorHeading({ children }: { children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <h3 ref={heading} tabIndex={-1} className="editor-heading">{children}</h3>
}
export function EmptyState({ filtered, entity, onCreate }: { filtered: boolean; entity: string; onCreate?: () => void }) {
  return <div className="empty-state"><p>{filtered ? `No hay ${entity} que coincidan con los filtros.` : `No hay ${entity} registradas.`}</p>{onCreate && !filtered && <button type="button" onClick={onCreate}>Crear primera {entity === 'Carreras' ? 'Carrera' : 'Materia'}</button>}{filtered && <p>Prueba con otro código, nombre o estado.</p>}</div>
}
