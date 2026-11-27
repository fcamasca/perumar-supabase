import { runtimeKey, supabaseFetch } from '../runtime-keys.ts'
import { createClient } from '@supabase/supabase-js'
import { academicActor } from '../expediente/operation.ts'
import { DocumentoError, MAX_FILE, identifier, version, object } from '../expediente/contract.ts'
import { orderAccess, uploadOrderFile, downloadOrderFile } from './operation.ts'
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

export async function serveOrderFile(req:Request,kind:'cargar'|'descargar') {
 const url=Deno.env.get('SUPABASE_URL')!
 const local=['kong','supabase_kong_perumar-supabase'].includes(new URL(url).hostname)
 const allowed=(Deno.env.get('H7_OS_ALLOWED_ORIGINS')??(local?'http://127.0.0.1:5173':'')).split(',').map(s=>s.trim()).filter(Boolean)
 const origin=req.headers.get('Origin')
 const headers=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'})
 if(origin&&allowed.includes(origin)) {
  headers.set('Access-Control-Allow-Origin',origin)
  headers.set('Access-Control-Allow-Headers','authorization, apikey, content-type, x-client-info')
  headers.set('Access-Control-Allow-Methods','POST, OPTIONS')
 }
 try {
  if(origin&&!allowed.includes(origin))throw new DocumentoError(403,'DOCUMENT_ORIGIN')
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers})
  if(req.method!=='POST')throw new DocumentoError(405,'DOCUMENT_METHOD')
  const auth=req.headers.get('Authorization')
  if(!auth?.startsWith('Bearer '))throw new DocumentoError(401,'DOCUMENT_SESSION')
  const signal=AbortSignal.timeout(15000)
  const transport={fetch:(input:RequestInfo|URL,init?:RequestInit)=>supabaseFetch(input, init, signal)}
  const options={db:{retry:false},global:transport,auth:{persistSession:false,autoRefreshToken:false}}
  const user=createClient(url,runtimeKey(url, 'publishable', (name) => Deno.env.get(name)),{...options,global:{...transport,headers:{Authorization:auth}}})
  const actor=await academicActor(user)
  const content=req.headers.get('Content-Type')??''
  let input:{os_id:string;expected_updated_at:string}|{os_id:string;archivo_id:string},file:File|undefined
  if(kind==='cargar') {
   if(!content.startsWith('multipart/form-data;'))throw new DocumentoError(422,'DOCUMENT_INPUT')
   const raw=await body(req,MAX_FILE+16384,signal)
   let form:FormData
   try {form=await new Response(raw.buffer,{headers:{'Content-Type':content}}).formData()}catch{throw new DocumentoError(422,'DOCUMENT_INPUT')}
   const keys=[...form.keys()]
   if(keys.length!==3||new Set(keys).size!==3||keys.some(k=>!['os_id','expected_updated_at','archivo'].includes(k)))throw new DocumentoError(422,'DOCUMENT_INPUT')
   const candidate=form.get('archivo')
   if(!(candidate instanceof File))throw new DocumentoError(422,'DOCUMENT_INPUT')
   if(candidate.size>MAX_FILE)throw new DocumentoError(413,'DOCUMENT_LIMIT')
   file=candidate
   input={os_id:identifier(form.get('os_id')),expected_updated_at:version(form.get('expected_updated_at'))}
  } else {
   if(!content.startsWith('application/json'))throw new DocumentoError(422,'DOCUMENT_INPUT')
   const raw=await body(req,4096,signal)
   let parsed:unknown
   try {parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))}catch{throw new DocumentoError(422,'DOCUMENT_INPUT')}
   const data=object(parsed,['os_id','archivo_id'])
   input={os_id:identifier(data.os_id),archivo_id:identifier(data.archivo_id)}
  }
  // Do not create/use a privileged client until JWT, current role and resource access pass.
  await orderAccess(user,input.os_id)
  const server=createClient(url,runtimeKey(url, 'secret', (name) => Deno.env.get(name)),options)
  if(kind==='cargar'&&file&&'expected_updated_at' in input) {
   const result=await uploadOrderFile(user,server,actor,input,file)
   headers.set('Content-Type','application/json')
   return new Response(JSON.stringify(result),{headers})
  }
  if(!('archivo_id' in input))throw new DocumentoError(422,'DOCUMENT_INPUT')
  const bytes=await downloadOrderFile(user,server,actor,input)
  headers.set('Content-Type','application/pdf')
  headers.set('Content-Disposition','attachment; filename="orden-servicio.pdf"')
  return new Response(Uint8Array.from(bytes).buffer,{headers})
 } catch(error) {
  const safe=error instanceof DocumentoError?error:new DocumentoError(503,'DOCUMENT_UNAVAILABLE')
  // Only a fixed category and random correlation. Never SQL/input/key/PII/token.
  console.error(JSON.stringify({phase:'os-pdf-'+kind,category:safe.code,correlation:crypto.randomUUID()}))
  headers.set('Content-Type','application/json')
  return new Response(JSON.stringify({code:safe.code}),{status:safe.status,headers})
 }
}
