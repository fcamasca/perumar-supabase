import { createClient } from '@supabase/supabase-js'
import {
  DocumentoError,
  MAX_FILE,
  object,
  identifier,
  version,
  generationRequest,
  downloadRequest,
} from './contract.ts'
import {
  academicActor,
  cancelReservation,
  uploadDocument,
  generateDocument,
  downloadDocument,
} from './operation.ts'
import { FichaError } from '../ficha/contract.ts'

async function body(req: Request, max: number, signal: AbortSignal) {
  if (Number(req.headers.get('content-length') ?? 0) > max)
    throw new DocumentoError(413, 'DOCUMENT_LIMIT')
  const reader = req.body?.getReader()
  if (!reader) throw new DocumentoError(422, 'DOCUMENT_INPUT')
  const abort = () => {
    void reader.cancel()
  }
  signal.addEventListener('abort', abort, { once: true })
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > max) {
        await reader.cancel()
        throw new DocumentoError(413, 'DOCUMENT_LIMIT')
      }
      chunks.push(value)
    }
    signal.throwIfAborted()
    const raw = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
      raw.set(c, offset)
      offset += c.length
    }
    return raw
  } finally {
    signal.removeEventListener('abort', abort)
    reader.releaseLock()
  }
}
// Exactly three fixed entry points; no client-controlled command/table/template dispatch.
export async function serveExpediente(req: Request, kind: 'cargar' | 'generar' | 'descargar') {
  const apiUrl = Deno.env.get('SUPABASE_URL')!,
    local = ['kong', 'supabase_kong_perumar-supabase'].includes(new URL(apiUrl).hostname)
  const allowed = (
    Deno.env.get('EXPEDIENTE_ALLOWED_ORIGINS') ?? (local ? 'http://127.0.0.1:5173' : '')
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req.headers.get('Origin'),
    headers = new Headers({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    })
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set(
      'Access-Control-Allow-Headers',
      'authorization, apikey, content-type, x-client-info',
    )
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  }
  try {
    if (origin && !allowed.includes(origin)) throw new DocumentoError(403, 'DOCUMENT_ORIGIN')
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (req.method !== 'POST') throw new DocumentoError(405, 'DOCUMENT_METHOD')
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) throw new DocumentoError(401, 'DOCUMENT_SESSION')
    const signal = AbortSignal.timeout(15000),
      transport = {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal }),
      }
    const user = createClient(apiUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      db: { retry: false },
      global: { ...transport, headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const server = createClient(apiUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      db: { retry: false },
      global: transport,
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const actor = await academicActor(user),
      content = req.headers.get('Content-Type') ?? ''
    let result: unknown
    if (kind === 'cargar' && content.startsWith('multipart/form-data;')) {
      const raw = await body(req, MAX_FILE + 16384, signal)
      let form: FormData
      try {
        form = await new Response(raw.buffer, { headers: { 'Content-Type': content } }).formData()
      } catch {
        throw new DocumentoError(422, 'DOCUMENT_INPUT')
      }
      const keys = [...form.keys()]
      if (
        keys.length !== 3 ||
        new Set(keys).size !== 3 ||
        keys.some((k) => !['documento_id', 'expected_updated_at', 'archivo'].includes(k))
      )
        throw new DocumentoError(422, 'DOCUMENT_INPUT')
      const file = form.get('archivo')
      if (!(file instanceof File) || file.size > MAX_FILE)
        throw new DocumentoError(413, 'DOCUMENT_LIMIT')
      result = await uploadDocument(
        user,
        server,
        actor,
        {
          documento_id: identifier(form.get('documento_id')),
          expected_updated_at: version(form.get('expected_updated_at')),
        },
        file,
      )
    } else {
      if (!content.startsWith('application/json')) throw new DocumentoError(422, 'DOCUMENT_INPUT')
      const raw = await body(req, 4096, signal)
      let parsed: unknown
      try {
        parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw))
      } catch {
        throw new DocumentoError(422, 'DOCUMENT_INPUT')
      }
      if (
        kind !== 'descargar' &&
        parsed &&
        typeof parsed === 'object' &&
        'cancelar_reserva' in parsed
      ) {
        const v = object(parsed, ['cancelar_reserva'])
        result = await cancelReservation(user, server, actor, identifier(v.cancelar_reserva))
      } else if (kind === 'generar')
        result = await generateDocument(user, server, actor, generationRequest(parsed))
      else if (kind === 'descargar') {
        const downloaded = await downloadDocument(user, server, actor, downloadRequest(parsed))
        // functions-js reads image/* as text; use a binary envelope without changing stored bytes.
        headers.set('Content-Type', downloaded.mime.startsWith('image/') ? 'application/octet-stream' : downloaded.mime)
        headers.set('X-Documento-Mime', downloaded.mime)
        headers.set('Access-Control-Expose-Headers', 'X-Documento-Mime, X-Documento-Historico')
        headers.set('Content-Disposition', `attachment; filename="${downloaded.filename}"`)
        headers.set('X-Documento-Historico', String(downloaded.historico))
        return new Response(Uint8Array.from(downloaded.bytes).buffer, { headers })
      } else throw new DocumentoError(422, 'DOCUMENT_INPUT')
    }
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify(result), { headers })
  } catch (error) {
    const safe =
      error instanceof DocumentoError
        ? error
        : error instanceof FichaError
          ? new DocumentoError(error.status, 'DOCUMENT_' + error.code)
          : new DocumentoError(503, 'DOCUMENT_UNAVAILABLE')
    console.error(
      JSON.stringify({
        correlation: crypto.randomUUID(),
        phase: 'expediente-' + kind,
        category: safe.code,
      }),
    )
    headers.set('Content-Type', 'application/json')
    return new Response(JSON.stringify({ code: safe.code }), { status: safe.status, headers })
  }
}
