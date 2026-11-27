// Runtime credentials only. Hosted configuration never falls back to legacy keys.
export function runtimeKey(url: string, kind: 'publishable' | 'secret', read: (name: string) => string | undefined): string {
  const endpoint = new URL(url)
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !['', '/'].includes(endpoint.pathname)) throw new Error('EDGE_KEY_CONFIG')
  const local = endpoint.protocol === 'http:' && ['kong', 'supabase_kong_perumar-supabase'].includes(endpoint.hostname)
  if (local) {
    const legacy = read(kind === 'publishable' ? 'SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY')
    if (!legacy?.trim()) throw new Error('EDGE_KEY_CONFIG')
    return legacy
  }
  if (endpoint.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(endpoint.hostname) || endpoint.port) throw new Error('EDGE_KEY_CONFIG')
  const name = kind === 'publishable' ? 'SUPABASE_PUBLISHABLE_KEYS' : 'SUPABASE_SECRET_KEYS'
  let keys: unknown
  try { keys = JSON.parse(read(name) ?? '') } catch { throw new Error('EDGE_KEY_CONFIG') }
  if (!keys || typeof keys !== 'object' || Array.isArray(keys) || !Object.hasOwn(keys, 'default')) throw new Error('EDGE_KEY_CONFIG')
  const key = (keys as Record<string, unknown>).default
  if (typeof key !== 'string' || !new RegExp('^sb_' + kind + '_[A-Za-z0-9_-]{20,}$').test(key)) throw new Error('EDGE_KEY_CONFIG')
  return key
}

// SDK transports may use the API key as a Bearer fallback. New keys belong only
// in apikey. Preserve a real user's Authorization header and the request deadline.
export function supabaseFetch(input: RequestInfo | URL, init?: RequestInit, signal?: AbortSignal): Promise<Response> {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  const key = headers.get('apikey')
  if (key && /^(sb_publishable_|sb_secret_)/.test(key) && headers.get('Authorization') === 'Bearer ' + key) headers.delete('Authorization')
  return fetch(input, { ...init, headers, ...(signal ? { signal } : {}) })
}
