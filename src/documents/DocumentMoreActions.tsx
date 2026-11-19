import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Matches the existing enrollment row menu; document withdrawal remains a secondary action.
export function DocumentMoreActions({
  name,
  mandatory,
  busy,
  onRetire,
  onHistory,
}: {
  name: string
  mandatory: boolean
  busy: boolean
  onRetire?: () => void
  onHistory?: () => void
}) {
  const id = useId(),
    trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  function close(restore = false) {
    setPosition(null)
    if (restore) trigger.current?.focus()
  }
  function open() {
    const box = trigger.current!.getBoundingClientRect()
    const height = onHistory && onRetire ? 114 : 78
    setPosition({
      top: box.bottom + height > window.innerHeight ? Math.max(8, box.top - height) : box.bottom + 4,
      left: Math.max(8, Math.min(window.innerWidth - 228, box.right - 220)),
    })
  }
  useEffect(() => {
    if (!position) return
    const first = panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    ;(first ?? panel.current)?.focus()
    const outside = (e: PointerEvent) => {
        if (
          !panel.current?.contains(e.target as Node) &&
          !trigger.current?.contains(e.target as Node)
        )
          setPosition(null)
      },
      dismiss = () => setPosition(null)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [position, mandatory])
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="secondary document-more-trigger"
        aria-label={`Más acciones de ${name}`}
        title="Más acciones"
        aria-haspopup="menu"
        aria-expanded={!!position && !busy}
        aria-controls={position && !busy ? id : undefined}
        disabled={busy}
        onClick={() => (position ? close() : open())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            open()
          }
        }}
      >
        ⋮
      </button>
      {position &&
        !busy &&
        createPortal(
          <div
            ref={panel}
            tabIndex={-1}
            role="menu"
            id={id}
            aria-label={`Acciones de ${name}`}
            className="enrollment-actions-menu document-actions-menu"
            style={position}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                close(true)
              } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
                e.preventDefault()
                const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
                const current = items.indexOf(document.activeElement as HTMLButtonElement)
                const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowUp' ? (current - 1 + items.length) % items.length : (current + 1) % items.length
                items[next]?.focus()
              } else if (e.key === 'Tab') close(true)
            }}
            onBlur={(e) => {
              if (
                !e.currentTarget.contains(e.relatedTarget as Node | null) &&
                !trigger.current?.contains(e.relatedTarget as Node | null)
              )
                close()
            }}
          >
            {onHistory && <button type="button" role="menuitem" onClick={() => { close(true); onHistory() }}>Historial</button>}
            {onRetire && <button
              type="button"
              role="menuitem"
              disabled={mandatory}
              onClick={() => {
                close(true)
                onRetire()
              }}
            >
              Retirar opcional
            </button>}
            {mandatory && onRetire && (
              <small>El documento obligatorio no puede retirarse individualmente.</small>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
