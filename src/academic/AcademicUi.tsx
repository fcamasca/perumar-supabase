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

// Native constraints remain useful, but all feedback is rendered by the application.
export function InlineForm({ children, onSubmit, ...props }: { children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void; 'aria-describedby'?: string }) {
  const [errors, setErrors] = useState<{ id: string; text: string }[]>([])
  const id = useId(), ref = useRef<HTMLFormElement>(null)
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const failures: { id: string; text: string }[] = []
    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea'))
    fields.forEach((field, i) => {
      if (!field.id) field.id = `${id}-field-${i}`
      if (field.willValidate && (!field.validity.valid || (field.required && !field.value.trim()))) {
        const label = field.getAttribute('aria-label') || field.labels?.[0]?.textContent || 'Campo'
        const detail = field.required && !field.value.trim() ? 'Este campo es obligatorio.' : field.validity.patternMismatch ? 'Usa entre 2 y 10 caracteres alfanuméricos.' : field.validity.tooLong ? 'Supera el máximo de caracteres.' : field.validity.rangeUnderflow ? 'La fecha de fin no puede ser anterior al inicio.' : 'Revisa el formato del valor.'
        failures.push({ id: field.id, text: `${label}: ${detail}` })
      }
    })
    setErrors(failures)
    if (failures.length) fields.find(f => f.id === failures[0].id)?.focus()
    else onSubmit(event)
  }
  useEffect(() => {
    const fields = ref.current?.querySelectorAll('input,select,textarea') ?? []
    fields.forEach(field => {
      if (errors.some(e => e.id === field.id)) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', `${field.id}-error`) }
      else { field.removeAttribute('aria-invalid'); if (field.getAttribute('aria-describedby') === `${field.id}-error`) field.removeAttribute('aria-describedby') }
    })
  }, [errors])
  return <form {...props} ref={ref} noValidate onSubmit={validate}>{errors.length > 0 && <div role="alert" className="validation-errors"><p>Revisa los campos indicados:</p><ul>{errors.map(e => <li id={`${e.id}-error`} key={e.id}><a href={`#${e.id}`} onClick={event => { event.preventDefault(); document.getElementById(e.id)?.focus() }}>{e.text}</a></li>)}</ul></div>}{children}</form>
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${['Inactivo', 'ANULADO', 'DESIERTO'].includes(value) ? 'status-muted' : ''}`}><span aria-hidden="true">● </span>{value}</span>
}
export function EditorHeading({ children }: { children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <h3 ref={heading} tabIndex={-1} className="editor-heading">{children}</h3>
}
export function EmptyState({ filtered, entity, onCreate }: { filtered: boolean; entity: string; onCreate?: () => void }) {
  return <div className="empty-state"><p>{filtered ? `No hay ${entity} que coincidan con los filtros.` : `No hay ${entity} registradas.`}</p>{onCreate && !filtered && <button type="button" onClick={onCreate}>Crear primera {entity === 'Carreras' ? 'Carrera' : 'Materia'}</button>}{filtered && <p>Prueba con otro código, nombre o estado.</p>}</div>
}
