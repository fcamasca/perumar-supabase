import { afterEach, expect, it, vi } from 'vitest'
import { runtimeKey, supabaseFetch } from '../supabase/functions/_shared/runtime-keys'
const url = 'https://abcdefghijklmnopqrst.supabase.co'
const pub = 'sb_publishable_synthetic0000000000000000', secret = 'sb_secret_synthetic0000000000000000'
const read = (values: Record<string, string>) => (name: string) => values[name]
afterEach(() => vi.unstubAllGlobals())
it.each(['publishable', 'secret'] as const)('requires a valid named hosted %s key despite legacy availability', kind => {
  const name = kind === 'publishable' ? 'SUPABASE_PUBLISHABLE_KEYS' : 'SUPABASE_SECRET_KEYS'
  const key = kind === 'publishable' ? pub : secret
  const legacy = { SUPABASE_ANON_KEY: 'legacy', SUPABASE_SERVICE_ROLE_KEY: 'legacy' }
  expect(runtimeKey(url, kind, read({ ...legacy, [name]: JSON.stringify({ default: key }) }))).toBe(key)
  for (const invalid of ['', 'bad-json', 'null', '[]', '{}', '{"other":"ignored"}', '{"default":42}', '{"default":"legacy"}', JSON.stringify({ default: kind === 'publishable' ? secret : pub }), JSON.stringify({ default: key + ' ' })]) {
    expect(() => runtimeKey(url, kind, read({ ...legacy, [name]: invalid }))).toThrow('EDGE_KEY_CONFIG')
  }
  expect(() => runtimeKey(url, kind, read(legacy))).toThrow('EDGE_KEY_CONFIG')
})
it.each(['http://kong', 'http://supabase_kong_perumar-supabase:8000'])('preserves legacy only in the known local runtime %s', endpoint => {
  expect(runtimeKey(endpoint, 'publishable', read({ SUPABASE_ANON_KEY: 'anon' }))).toBe('anon')
  expect(runtimeKey(endpoint, 'secret', read({ SUPABASE_SERVICE_ROLE_KEY: 'service' }))).toBe('service')
  expect(() => runtimeKey(endpoint, 'secret', read({}))).toThrow('EDGE_KEY_CONFIG')
})
it.each(['https://kong', 'http://example.com', 'https://evil.example', url + '/other'])('rejects unrecognized runtime %s', endpoint => {
  expect(() => runtimeKey(endpoint, 'secret', read({ SUPABASE_SERVICE_ROLE_KEY: 'legacy', SUPABASE_SECRET_KEYS: JSON.stringify({ default: secret }) }))).toThrow('EDGE_KEY_CONFIG')
})
it.each([pub, secret])('sends a new key only in apikey, preserving deadlines', async key => {
  const fetcher = vi.fn().mockResolvedValue(new Response()); vi.stubGlobal('fetch', fetcher)
  const signal = new AbortController().signal
  await supabaseFetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } }, signal)
  const options = fetcher.mock.calls[0][1]
  expect(options.headers.get('apikey')).toBe(key)
  expect(options.headers.has('Authorization')).toBe(false)
  expect(options.signal).toBe(signal)
})
it('preserves the user JWT separately from the public key and does not mutate caller headers', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response()); vi.stubGlobal('fetch', fetcher)
  const headers = new Headers({ apikey: pub, Authorization: 'Bearer user.session.jwt' })
  await supabaseFetch(url, { headers })
  expect(fetcher.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer user.session.jwt')
  expect(headers.get('Authorization')).toBe('Bearer user.session.jwt')
})
it('preserves local legacy bearer transport', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response()); vi.stubGlobal('fetch', fetcher)
  await supabaseFetch('http://kong', { headers: { apikey: 'legacy', Authorization: 'Bearer legacy' } })
  expect(fetcher.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer legacy')
})
it('integrates with the pinned SDK: server key never replaces a user JWT', async () => {
  const { createClient } = await import('@supabase/supabase-js')
  const fetcher = vi.fn().mockImplementation(async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetcher)
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: supabaseFetch } }
  const admin = createClient(url, secret, options)
  await admin.rpc('synthetic_readonly_probe')
  expect(fetcher.mock.calls[0][1].headers.get('apikey')).toBe(secret)
  expect(fetcher.mock.calls[0][1].headers.has('Authorization')).toBe(false)
  const user = createClient(url, pub, { ...options, global: { fetch: supabaseFetch, headers: { Authorization: 'Bearer user.session.jwt' } } })
  await user.rpc('synthetic_readonly_probe')
  expect(fetcher.mock.calls[1][1].headers.get('apikey')).toBe(pub)
  expect(fetcher.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer user.session.jwt')
})
