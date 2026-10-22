import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useSession } from './SessionProvider'
import { BrandMark } from '../BrandMark'
import { InlineForm, StatusBadge } from '../academic/AcademicUi'
import { AcademicOnly, Materias, Carreras, Ciclos, Auditoria } from '../academic/AcademicPages'

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
  return <section className="login-panel" aria-labelledby="login-title">
    <div className="login-identity"><BrandMark /><p className="login-wordmark">PERÚ MAR</p><p className="eyebrow">Gestión Académica</p></div><h2 id="login-title">Iniciar sesión</h2><p>Ingresa con tu cuenta institucional.</p>
    <InlineForm onSubmit={submit}>
      <label>Email <input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label>Contraseña <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Verificando…' : 'Entrar'}</button>
    </InlineForm>
    {(message || state.message) && <p role="alert">{message || state.message}</p>}
    {state.phase === 'error' && <button onClick={() => void logout()}>Cerrar sesión local e intentar de nuevo</button>}
    <p className="help-text">Si necesitas acceso, comunícate con el administrador de tu institución.</p>
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
    <div className="navigation-shell"><nav aria-label="Académico" className="main-nav">{state.roles?.some(r => r === 'DIRECTOR_ACADEMICO' || r === 'COORDINADOR_ACADEMICO') && <><NavLink to="/academico/materias">Materias</NavLink><NavLink to="/academico/carreras">Carreras</NavLink><NavLink to="/academico/ciclos">Ciclos</NavLink></>}<NavLink to="/academico/auditoria">Auditoría</NavLink></nav>
    <nav aria-label="Seguridad" className="account-nav"><NavLink end to="/seguridad">Mi acceso</NavLink>{state.roles?.includes('ADMIN_SISTEMA') && <NavLink to="/seguridad/usuarios">Directorio de seguridad</NavLink>}<button className="secondary" onClick={() => void logout()}>Cerrar sesión</button></nav></div>
    <Outlet />
  </>
}

function OwnAccess() {
  const { state } = useSession()
  const names: Record<string, string> = { ADMIN_SISTEMA: 'Administrador del sistema', DIRECTOR_ACADEMICO: 'Director académico', COORDINADOR_ACADEMICO: 'Coordinador académico' }
  return <section className="account-panel"><h2>Mi acceso</h2><p>Estas son las funciones habilitadas para tu cuenta. Elige una sección en la navegación superior para comenzar.</p>
    <h3>Roles habilitados</h3><ul className="role-list">{state.roles?.map(role => <li key={role}>{names[role] ?? role}</li>)}</ul>
    <details><summary>Identificador de mi cuenta</summary><code className="identifier">{state.userId}</code></details></section>
}

function Directory() {
  const { client, state, refresh } = useSession()
  const [rows, setRows] = useState<{ id: string; active: boolean }[]>([])
  const [message, setMessage] = useState('Cargando directorio…')
  const admin = state.roles?.includes('ADMIN_SISTEMA') ?? false
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
  return <section className="directory-panel"><h2>Directorio de seguridad</h2><p>Consulta las cuentas registradas y su estado. Esta pantalla es de solo lectura.</p><p role="status">{message}</p>
    {rows.length > 0 && <div className="table-scroll"><table><caption>Cuentas con acceso a la aplicación</caption><thead><tr><th>Identificador</th><th>Estado</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}><td><code className="identifier">{row.id}</code></td><td><StatusBadge value={row.active ? 'Activo' : 'Inactivo'} /></td></tr>)}</tbody></table></div>}
  </section>
}

export function SecurityRoutes() {
  return <Routes>
    <Route path="/" element={<Navigate to="/seguridad" replace />} />
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedArea />}>
      <Route path="/academico/materias" element={<AcademicOnly><Materias /></AcademicOnly>} />
      <Route path="/academico/carreras" element={<AcademicOnly><Carreras /></AcademicOnly>} />
      <Route path="/academico/ciclos" element={<AcademicOnly><Ciclos /></AcademicOnly>} />
      <Route path="/academico/auditoria" element={<Auditoria />} />
      <Route path="/seguridad" element={<OwnAccess />} />
      <Route path="/seguridad/usuarios" element={<Directory />} />
    </Route>
    <Route path="*" element={<section><h2>Ruta no disponible</h2><Link to="/seguridad">Ir a seguridad</Link></section>} />
  </Routes>
}
