import { createClient } from '@supabase/supabase-js'
import { FichaError, parseRequest } from '../_shared/ficha/contract.ts'
import { operateFicha } from '../_shared/ficha/operation.ts'

// Configure explicit deployed application origins; localhost is not accepted in hosted deployments.
const apiUrl = Deno.env.get('SUPABASE_URL')!
const localRuntime = ['kong', 'supabase_kong_perumar-supabase'].includes(new URL(apiUrl).hostname)
const origins = (Deno.env.get('FICHA_ALLOWED_ORIGINS') ?? (localRuntime ? 'http://127.0.0.1:5173' : '')).split(',').map(s => s.trim()).filter(Boolean)
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' })
  if (origin && origins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info')
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  }
  try {
    if (origin && !origins.includes(origin)) throw new FichaError(403, 'ORIGIN')
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (req.method !== 'POST') throw new FichaError(405, 'METHOD')
    if (!req.headers.get('Content-Type')?.startsWith('application/json')) throw new FichaError(422, 'INPUT')
    if (Number(req.headers.get('Content-Length') ?? 0) > 4096) throw new FichaError(413, 'LIMIT')
    const reader = req.body?.getReader(); if (!reader) throw new FichaError(422, 'INPUT')
    let length = 0; const chunks: Uint8Array[] = []
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 4096) { await reader.cancel(); throw new FichaError(413, 'LIMIT') } chunks.push(value) }
    const raw = new Uint8Array(length); let offset = 0; for (const c of chunks) { raw.set(c, offset); offset += c.length }
    let body: unknown; try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)) } catch { throw new FichaError(422, 'INPUT') }
    const request = parseRequest(body)
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) throw new FichaError(401, 'SESSION')
    const key = Deno.env.get('SUPABASE_ANON_KEY')!, deadline = AbortSignal.timeout(15000)
    const transport = { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: deadline }) }
    const user = createClient(apiUrl, key, { db: { retry: false }, global: { ...transport, headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
    // This client is used only by the closed operation for Storage and the bounded audit command.
    const server = createClient(apiUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { retry: false }, global: transport, auth: { persistSession: false, autoRefreshToken: false } })
    const result = await operateFicha(user, server, request)
    if ('bytes' in result && result.bytes) {
      headers.set('Content-Type', 'application/pdf'); headers.set('Content-Disposition', 'attachment; filename="ficha-matricula.pdf"')
      return new Response(result.bytes as unknown as BodyInit, { headers })
    }
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify(result.manifest), { headers })
  } catch (error) {
    const safe = error instanceof FichaError ? error : new FichaError(503, 'UNAVAILABLE')
    console.error(JSON.stringify({ correlation: crypto.randomUUID(), phase: 'ficha', category: safe.code }))
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify({ code: safe.code }), { status: safe.status, headers })
  }
})
