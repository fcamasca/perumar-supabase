import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Matches the existing enrollment row menu; document withdrawal remains a secondary action.
export function DocumentMoreActions({
  name,
  mandatory,
  busy,
  onRetire,
}: {
  name: string
  mandatory: boolean
  busy: boolean
  onRetire: () => void
}) {
  const id = useId(),
    trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null),
    item = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  function close(restore = false) {
    setPosition(null)
    if (restore) trigger.current?.focus()
  }
  function open() {
    const box = trigger.current!.getBoundingClientRect()
    setPosition({
      top: box.bottom + 78 > window.innerHeight ? Math.max(8, box.top - 78) : box.bottom + 4,
      left: Math.max(8, Math.min(window.innerWidth - 228, box.right - 220)),
    })
  }
  useEffect(() => {
    if (!position) return
    ;(mandatory ? panel.current : item.current)?.focus()
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
                if (!mandatory) item.current?.focus()
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
            <button
              type="button"
              role="menuitem"
              ref={item}
              disabled={mandatory}
              onClick={() => {
                close(true)
                onRetire()
              }}
            >
              Retirar opcional
            </button>
            {mandatory && (
              <small>El documento obligatorio no puede retirarse individualmente.</small>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
