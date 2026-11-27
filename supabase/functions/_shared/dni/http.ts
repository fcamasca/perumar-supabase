import { runtimeKey, supabaseFetch } from '../runtime-keys.ts'
import { createClient } from '@supabase/supabase-js'
import { academicActor } from '../expediente/operation.ts'
import { DocumentoError } from '../expediente/contract.ts'
import { assertNewDni, dniNames, DniError, validDni } from './contract.ts'

async function readBounded(body:ReadableStream<Uint8Array>|null,max:number,signal:AbortSignal) {
 if(!body)throw new DniError(502,'DNI_RESPONSE')
 const reader=body.getReader(),chunks:Uint8Array[]=[]
 let size=0
 const abort=()=>{void reader.cancel()};signal.addEventListener('abort',abort,{once:true})
 try {
  signal.throwIfAborted()
  while(true){const {done,value}=await reader.read();signal.throwIfAborted();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new DniError(502,'DNI_RESPONSE')}chunks.push(value)}
  const raw=new Uint8Array(size);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)) as unknown}catch{throw new DniError(502,'DNI_RESPONSE')}
 }finally{signal.removeEventListener('abort',abort);reader.releaseLock()}
}
export async function serveDni(req:Request) {
 const url=Deno.env.get('SUPABASE_URL')!,local=['kong','supabase_kong_perumar-supabase'].includes(new URL(url).hostname)
 const allowed=(Deno.env.get('DNI_ALLOWED_ORIGINS')??(local?'http://127.0.0.1:5173':'')).split(',').map(s=>s.trim()).filter(Boolean)
 const origin=req.headers.get('Origin'),headers=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Content-Type':'application/json'})
 if(origin&&allowed.includes(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','authorization, apikey, content-type, x-client-info');headers.set('Access-Control-Allow-Methods','POST, OPTIONS')}
 const signal=AbortSignal.timeout(5000)
 try {
  if(origin&&!allowed.includes(origin))throw new DniError(403,'DNI_ACCESS')
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers})
  if(req.method!=='POST')throw new DniError(405,'DNI_METHOD')
  const auth=req.headers.get('Authorization')
  if(!auth?.startsWith('Bearer '))throw new DniError(401,'DNI_SESSION')
  const user=createClient(url,runtimeKey(url, 'publishable', (name) => Deno.env.get(name)),{db:{retry:false},global:{headers:{Authorization:auth},fetch:(input:RequestInfo|URL,init?:RequestInit)=>supabaseFetch(input, init, signal)},auth:{persistSession:false,autoRefreshToken:false}})
  await academicActor(user)
  if(!(req.headers.get('Content-Type')??'').startsWith('application/json')||Number(req.headers.get('Content-Length')??0)>512)throw new DniError(422,'DNI_INPUT')
  let data:unknown
  try{data=await readBounded(req.body,512,signal)}catch{if(signal.aborted)throw new DniError(504,'DNI_TIMEOUT');throw new DniError(422,'DNI_INPUT')}
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==1||!('dni' in data))throw new DniError(422,'DNI_INPUT')
  const dni=(data as {dni:unknown}).dni
  if(!validDni(dni))throw new DniError(422,'DNI_INVALID')
  // Fail closed before reading the provider secret or issuing external IO.
  try{await assertNewDni(user,dni,undefined,signal)}catch(e){if(e instanceof DniError)throw e;throw new DniError(503,'DNI_LOCAL')}
  const token=Deno.env.get('APISPERU_TOKEN')
  if(!token)throw new DniError(503,'DNI_CONFIG')
  if(!local&&Deno.env.get('APISPERU_PRODUCTION_AUTHORIZED')!=='true')throw new DniError(503,'DNI_DISABLED')
  const endpoint=new URL('https://dniruc.apisperu.com/api/v1/dni/'+dni);endpoint.searchParams.set('token',token)
  const response=await fetch(endpoint,{method:'GET',headers:{Accept:'application/json'},redirect:'error',credentials:'omit',signal})
  if(!response.ok){await response.body?.cancel();throw new DniError(response.status===404?404:response.status===429?429:503,[401,403].includes(response.status)?'DNI_PROVIDER_AUTH':response.status===404?'DNI_NOT_FOUND':response.status===429?'DNI_LIMIT':'DNI_UNAVAILABLE')}
  if(!(response.headers.get('Content-Type')??'').toLowerCase().startsWith('application/json')||Number(response.headers.get('Content-Length')??0)>32768){await response.body?.cancel();throw new DniError(502,'DNI_RESPONSE')}
  const result=dniNames(await readBounded(response.body,32768,signal),dni)
  await academicActor(user)
  signal.throwIfAborted()
  return new Response(JSON.stringify(result),{headers})
 }catch(error){
  const safe=signal.aborted?new DniError(504,'DNI_TIMEOUT'):error instanceof DniError?error:error instanceof DocumentoError?new DniError(error.status,error.status===401?'DNI_SESSION':'DNI_ACCESS'):new DniError(503,'DNI_UNAVAILABLE')
  console.error(JSON.stringify({phase:'consultar-dni',category:safe.code,correlation:crypto.randomUUID()}))
  return new Response(JSON.stringify({code:safe.code}),{status:safe.status,headers})
 }
}
