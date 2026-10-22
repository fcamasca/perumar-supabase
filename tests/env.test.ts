import { describe, expect, it } from 'vitest'
import { validateEnv } from '../src/lib/env'

const valid = { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }
const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role }))}.fake_signature`

describe('configuración pública local', () => {
  it.each(['http://127.0.0.1:54321', 'http://localhost:54321/', 'http://[::1]:54321'])('admite loopback: %s', url => {
    expect(validateEnv({ ...valid, VITE_SUPABASE_URL: url }).key).toBe(valid.VITE_SUPABASE_PUBLISHABLE_KEY)
  })
  it('admite exclusivamente rol anon para la clave legacy local', () => {
    expect(validateEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }).key).toBe(jwt('anon'))
  })
  it.each(['', undefined, 'not-a-url', 'https://remote.invalid', 'http://192.168.1.236:54321',
    'http://127.0.0.1:54322', 'http://user:pass@localhost:54321', 'http://localhost:54321/path',
    'http://localhost:54321/?key=CANARY', 'http://localhost:54321/#CANARY'])('rechaza URL ausente, remota o alterada', url => {
    expect(() => validateEnv({ ...valid, VITE_SUPABASE_URL: url })).toThrow(/VITE_SUPABASE_URL/)
  })
  it.each(['', undefined, 'sb_secret_PRIVILEGED_CANARY', jwt('service_role'), jwt('authenticated'), 'postgresql://CANARY', 'malformed.jwt.value'])('rechaza claves ausentes o no públicas sin filtrarlas', key => {
    let message = ''
    try { validateEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: key }) } catch (error) { message = (error as Error).message }
    expect(message).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
    expect(message).not.toContain('CANARY')
    if (key) expect(message).not.toContain(key)
  })
})
