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

const projectRef = 'abcdefghijklmnopqrst'
const hosted = { ...valid, VITE_DEPLOYMENT_ENV: 'hosted', VITE_SUPABASE_PROJECT_REF: projectRef, VITE_SUPABASE_URL: `https://${projectRef}.supabase.co` }

describe('separación explícita local/hospedado', () => {
  it('admite Cloud solo con modo y proyecto coincidentes', () => {
    expect(validateEnv(hosted)).toEqual({ url: hosted.VITE_SUPABASE_URL, key: valid.VITE_SUPABASE_PUBLISHABLE_KEY })
    expect(validateEnv({ ...valid, VITE_DEPLOYMENT_ENV: 'local' }).url).toBe(valid.VITE_SUPABASE_URL)
  })
  it.each(['', 'production', 'HOSTED', false])('rechaza modos desconocidos: %s', mode => {
    expect(() => validateEnv({ ...hosted, VITE_DEPLOYMENT_ENV: mode })).toThrow(/VITE_DEPLOYMENT_ENV/)
  })
  it.each([undefined, '', 'ABC', 'abcdefghijklmnopqrst.supabase.co'])('requiere referencia válida: %s', ref => {
    expect(() => validateEnv({ ...hosted, VITE_SUPABASE_PROJECT_REF: ref })).toThrow(/PROJECT_REF/)
  })
  it.each(['http://127.0.0.1:54321', 'https://remote.invalid', 'https://abcdefghijklmnopqrst.supabase.co.evil.invalid',
    'http://abcdefghijklmnopqrst.supabase.co', 'https://abcdefghijklmnopqrst.supabase.co:54321',
    'https://otherprojectabcdefgh.supabase.co', 'https://user:CANARY@abcdefghijklmnopqrst.supabase.co',
    'https://abcdefghijklmnopqrst.supabase.co/path', 'https://abcdefghijklmnopqrst.supabase.co/?x=CANARY',
    'https://abcdefghijklmnopqrst.supabase.co/#CANARY'])('rechaza otro destino hospedado: %s', url => {
    expect(() => validateEnv({ ...hosted, VITE_SUPABASE_URL: url })).toThrow(/VITE_SUPABASE_URL/)
  })
  it('no infiere Cloud ni permite referencia hospedada en scripts locales', () => {
    expect(() => validateEnv({ ...valid, VITE_SUPABASE_URL: hosted.VITE_SUPABASE_URL })).toThrow(/VITE_SUPABASE_URL/)
    expect(() => validateEnv({ ...valid, VITE_SUPABASE_PROJECT_REF: projectRef })).toThrow(/PROJECT_REF/)
  })
  it('valida el proyecto en JWT anon legacy hospedado', () => {
    const key = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role: 'anon', ref: projectRef })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.fake_signature`
    expect(validateEnv({ ...hosted, VITE_SUPABASE_PUBLISHABLE_KEY: key }).key).toBe(key)
    expect(() => validateEnv({ ...hosted, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') })).toThrow(/PUBLISHABLE_KEY/)
  })
  it.each(['sb_secret_PRIVILEGED_CANARY', jwt('service_role'), jwt('authenticated'), 'malformed.jwt.value'])('rechaza claves privilegiadas o inválidas en Cloud', key => {
    expect(() => validateEnv({ ...hosted, VITE_SUPABASE_PUBLISHABLE_KEY: key })).toThrow(/PUBLISHABLE_KEY/)
  })
  it('rechaza secretos bajo otras variables públicas', () => {
    expect(() => validateEnv({ ...hosted, VITE_SERVICE_ROLE_KEY: 'CANARY' })).toThrow(/privilegiadas/)
  })
})
