export type PublicConfig = { url: string; key: string }

export function browserEnv() {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  }
}

export function validateEnv(values: Record<string, unknown>): PublicConfig {
  const urlValue = values.VITE_SUPABASE_URL
  const key = values.VITE_SUPABASE_PUBLISHABLE_KEY
  if (typeof urlValue !== 'string' || !urlValue.trim()) throw new Error('Falta VITE_SUPABASE_URL.')
  let url: URL
  try { url = new URL(urlValue) } catch { throw new Error('VITE_SUPABASE_URL no es una URL válida.') }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    || url.port !== '54321' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_SUPABASE_URL debe apuntar a la API local de H0 por HTTP, puerto 54321 y sin credenciales ni rutas.')
  }
  if (typeof key !== 'string' || !key.trim()) throw new Error('Falta VITE_SUPABASE_PUBLISHABLE_KEY.')
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  if (!publicKey && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      publicKey = payload.role === 'anon'
    } catch { /* Invalid credentials are rejected without echoing their content. */ }
  }
  if (!publicKey) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY debe ser publicable o anon local; no se admiten claves privilegiadas.')
  return { url: url.origin, key }
}
