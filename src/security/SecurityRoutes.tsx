import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useSession } from './SessionProvider'

function Login() {
  const { state, signIn, logout } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  if (state.phase === 'authorized' || state.phase === 'blocked') return <Navigate to="/seguridad" replace />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) { setMessage('Introduce email y contraseña.'); return }
    setBusy(true)
    const success = await signIn(email, password)
    setPassword('')
    setMessage(success ? '' : 'No se pudo iniciar sesión. Revisa las credenciales e inténtalo de nuevo.')
    setBusy(false)
  }
  return <section aria-labelledby="login-title">
    <h2 id="login-title">Iniciar sesión</h2>
    <form onSubmit={submit}>
      <label>Email <input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label>Contraseña <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Verificando…' : 'Entrar'}</button>
    </form>
    {(message || state.message) && <p role="alert">{message || state.message}</p>}
    {state.phase === 'error' && <button onClick={() => void logout()}>Cerrar sesión local e intentar de nuevo</button>}
    <p>Solo cuentas sintéticas del ensayo local. No hay registro público ni recuperación por correo en H1.</p>
  </section>
}

function ProtectedArea() {
  const { state, refresh, logout } = useSession()
  const { pathname } = useLocation()
  useEffect(() => { void refresh() }, [pathname, refresh])
  if (state.phase === 'loading') return <p role="status">Confirmando sesión y acceso…</p>
  if (state.phase === 'anonymous' || state.phase === 'error') return <Navigate to="/login" replace />
  if (state.phase === 'blocked') return <section>
    <h2>Acceso no habilitado</h2><p>La identidad fue autenticada, pero no tiene acceso de aplicación habilitado.</p>
    <button onClick={() => void logout()}>Cerrar sesión</button>
  </section>
  return <>
    <nav aria-label="Seguridad"><Link to="/seguridad">Mi acceso</Link>{state.roles?.includes('ADMIN') && <> · <Link to="/seguridad/usuarios">Directorio de seguridad</Link></>}</nav>
    <button onClick={() => void logout()}>Cerrar sesión</button>
    <Outlet />
  </>
}

function OwnAccess() {
  const { state } = useSession()
  return <section><h2>Mi acceso</h2><p>Identidad: {state.userId}</p><p>Roles activos: {state.roles?.join(', ')}</p>
    <p>Estos roles validan H1. PostgreSQL/RLS decide cada acceso real a datos.</p></section>
}

function Directory() {
  const { client, state, refresh } = useSession()
  const [rows, setRows] = useState<{ id: string; active: boolean }[]>([])
  const [message, setMessage] = useState('Cargando directorio…')
  const admin = state.roles?.includes('ADMIN') ?? false
  useEffect(() => {
    let current = true
    setRows([])
    if (!admin) return
    void (async () => {
      try {
        const { data, error } = await client.from('app_users').select('id,active').order('id')
        if (!current) return
        if (error) throw new Error('directory')
        if (!data?.length) { setMessage('Acceso no habilitado.'); void refresh(); return }
        setRows(data)
        setMessage('Directorio de seguridad de solo lectura.')
      } catch {
        if (current) { setRows([]); setMessage('No se pudo consultar el directorio. No se muestran datos anteriores.') }
      }
    })()
    return () => { current = false }
  }, [client, admin, refresh])
  if (!admin) return <section><h2>Acceso no autorizado</h2><Link to="/seguridad">Volver a mi acceso</Link></section>
  return <section><h2>Directorio de seguridad</h2><p role="status">{message}</p>
    {rows.length > 0 && <table><caption>Usuarios de aplicación sintéticos</caption><thead><tr><th>Identificador</th><th>Estado</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}><td>{row.id}</td><td>{row.active ? 'Activo' : 'Inactivo'}</td></tr>)}</tbody></table>}
  </section>
}

export function SecurityRoutes() {
  return <Routes>
    <Route path="/" element={<Navigate to="/seguridad" replace />} />
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedArea />}>
      <Route path="/seguridad" element={<OwnAccess />} />
      <Route path="/seguridad/usuarios" element={<Directory />} />
    </Route>
    <Route path="*" element={<section><h2>Ruta no disponible</h2><Link to="/seguridad">Ir a seguridad</Link></section>} />
  </Routes>
}
