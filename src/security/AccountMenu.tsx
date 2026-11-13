import { useEffect, useId, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useSession } from './SessionProvider'

export const roleNames: Record<string, string> = {
  ADMIN_SISTEMA: 'Administrador del sistema',
  DIRECTOR_ACADEMICO: 'Director académico',
  COORDINADOR_ACADEMICO: 'Coordinador académico',
}

export function AccountMenu() {
  const { state, logout } = useSession()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), close = useRef<HTMLButtonElement>(null)
  const id = useId()
  const name = state.displayName || state.email || 'Mi cuenta'
  const initials = (state.displayName || state.email?.split('@')[0] || 'U').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(part => [...part][0]).join('').toLocaleUpperCase('es-PE')
  const roles = state.roles?.map(role => roleNames[role] ?? role) ?? []
  useEffect(() => {
    if (!open) return
    close.current?.focus()
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false) }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div ref={root} className="account-menu" onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button ref={trigger} type="button" className="account-trigger secondary" aria-label={`Mi cuenta: ${name}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span className="account-avatar" aria-hidden="true">{initials}</span>
      <span className="account-summary"><strong>{name}</strong><small>{roles.join(' · ')}</small></span>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    {open && <section id={id} role="dialog" aria-modal="false" aria-label="Mi cuenta" className="account-popover">
      <div className="account-popover-heading"><h2>Mi cuenta</h2><button ref={close} type="button" className="secondary account-close" aria-label="Cerrar panel de cuenta" onClick={() => { setOpen(false); trigger.current?.focus() }}>×</button></div>
      <div className="account-identity"><span className="account-avatar" aria-hidden="true">{initials}</span><div><strong>{name}</strong>{state.email && state.email !== name && <span>{state.email}</span>}</div></div>
      <h3>Perfiles habilitados</h3><ul className="account-profiles">{roles.map(role => <li key={role}>{role}</li>)}</ul>
      <div className="account-links"><NavLink end to="/seguridad" onClick={() => setOpen(false)}>Mi acceso</NavLink>{state.roles?.includes('ADMIN_SISTEMA') && <NavLink to="/seguridad/usuarios" onClick={() => setOpen(false)}>Directorio de seguridad</NavLink>}</div>
      <div className="account-signout"><button type="button" className="secondary" onClick={() => { setOpen(false); void logout() }}>Cerrar sesión</button></div>
    </section>}
  </div>
}
