export type PublicConfig = { url: string; key: string }

export function browserEnv() {
  return {
    VITE_DEPLOYMENT_ENV: import.meta.env.VITE_DEPLOYMENT_ENV,
    VITE_SUPABASE_PROJECT_REF: import.meta.env.VITE_SUPABASE_PROJECT_REF,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  }
}

export function validateEnv(values: Record<string, unknown>): PublicConfig {
  if (Object.keys(values).some(name => /^VITE_.*(SECRET|SERVICE_ROLE|PASSWORD|TOKEN)/i.test(name))) {
    throw new Error('No se admiten variables VITE_* privilegiadas.')
  }
  // Missing mode remains local for existing local-only scripts; it never infers hosted from a URL.
  const environment = values.VITE_DEPLOYMENT_ENV === undefined ? 'local' : values.VITE_DEPLOYMENT_ENV
  if (environment !== 'local' && environment !== 'hosted') throw new Error('VITE_DEPLOYMENT_ENV debe ser local o hosted.')
  const projectRef = values.VITE_SUPABASE_PROJECT_REF
  if (environment === 'hosted' && (typeof projectRef !== 'string' || !/^[a-z0-9]{20}$/.test(projectRef))) {
    throw new Error('VITE_SUPABASE_PROJECT_REF debe identificar explícitamente el proyecto hospedado.')
  }
  if (environment === 'local' && projectRef !== undefined && projectRef !== '') throw new Error('VITE_SUPABASE_PROJECT_REF no se admite en entorno local.')
  const urlValue = values.VITE_SUPABASE_URL
  const key = values.VITE_SUPABASE_PUBLISHABLE_KEY
  if (typeof urlValue !== 'string' || !urlValue.trim()) throw new Error('Falta VITE_SUPABASE_URL.')
  let url: URL
  try { url = new URL(urlValue) } catch { throw new Error('VITE_SUPABASE_URL no es una URL válida.') }
  const plainOrigin = (urlValue === url.origin || urlValue === `${url.origin}/`) && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash
  const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && url.port === '54321'
  const hosted = url.protocol === 'https:' && url.hostname === `${projectRef}.supabase.co` && !url.port
  if (!plainOrigin || !(environment === 'local' ? local : hosted)) {
    throw new Error('VITE_SUPABASE_URL no corresponde al entorno y proyecto autorizados; no se admiten credenciales, rutas ni parámetros.')
  }
  if (typeof key !== 'string' || !key.trim()) throw new Error('Falta VITE_SUPABASE_PUBLISHABLE_KEY.')
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  if (!publicKey && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      publicKey = payload.role === 'anon' && (environment === 'local' || payload.ref === projectRef)
    } catch { /* Invalid credentials are rejected without echoing their content. */ }
  }
  if (!publicKey) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY debe ser publicable o anon del proyecto; no se admiten claves privilegiadas.')
  return { url: url.origin, key }
}
