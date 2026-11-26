import { createClient } from '@supabase/supabase-js'
import { academicActor } from '../expediente/operation.ts'
import { DocumentoError } from '../expediente/contract.ts'
import { lookupRuc, rucReference, RucError } from './contract.ts'

async function readBounded(body:ReadableStream<Uint8Array>|null,max:number,signal:AbortSignal) {
 if(!body)throw new RucError(502,'RUC_RESPONSE')
 const reader=body.getReader(),chunks:Uint8Array[]=[]
 let size=0
 const abort=()=>{void reader.cancel()};signal.addEventListener('abort',abort,{once:true})
 try {
  signal.throwIfAborted()
  while(true){const {done,value}=await reader.read();signal.throwIfAborted();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new RucError(502,'RUC_RESPONSE')}chunks.push(value)}
  const raw=new Uint8Array(size);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)) as unknown}catch{throw new RucError(502,'RUC_RESPONSE')}
 }finally{signal.removeEventListener('abort',abort);reader.releaseLock()}
}
export async function serveRuc(req:Request) {
 const url=Deno.env.get('SUPABASE_URL')!,local=['kong','supabase_kong_perumar-supabase'].includes(new URL(url).hostname)
 const allowed=(Deno.env.get('RUC_ALLOWED_ORIGINS')??(local?'http://127.0.0.1:5173':'')).split(',').map(s=>s.trim()).filter(Boolean)
 const origin=req.headers.get('Origin'),headers=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Content-Type':'application/json'})
 if(origin&&allowed.includes(origin)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','authorization, apikey, content-type, x-client-info');headers.set('Access-Control-Allow-Methods','POST, OPTIONS')}
 const signal=AbortSignal.timeout(5000)
 try {
  if(origin&&!allowed.includes(origin))throw new RucError(403,'RUC_ACCESS')
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers})
  if(req.method!=='POST')throw new RucError(405,'RUC_METHOD')
  const auth=req.headers.get('Authorization')
  if(!auth?.startsWith('Bearer '))throw new RucError(401,'RUC_SESSION')
  const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{db:{retry:false},global:{headers:{Authorization:auth},fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal})},auth:{persistSession:false,autoRefreshToken:false}})
  await academicActor(user)
  if(!(req.headers.get('Content-Type')??'').startsWith('application/json')||Number(req.headers.get('Content-Length')??0)>512)throw new RucError(422,'RUC_INPUT')
  let data:unknown
  try{data=await readBounded(req.body,512,signal)}catch{if(signal.aborted)throw new RucError(504,'RUC_TIMEOUT');throw new RucError(422,'RUC_INPUT')}
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==1||!('ruc' in data))throw new RucError(422,'RUC_INPUT')
  const ruc=lookupRuc((data as {ruc:unknown}).ruc)
  const response=await fetch('https://openruc.com/api/ruc/'+ruc,{method:'GET',headers:{Accept:'application/json'},redirect:'error',credentials:'omit',signal})
  if(!response.ok){await response.body?.cancel();throw new RucError(response.status===404?404:response.status===429?429:503,response.status===404?'RUC_NOT_FOUND':response.status===429?'RUC_LIMIT':'RUC_UNAVAILABLE')}
  if(!(response.headers.get('Content-Type')??'').toLowerCase().startsWith('application/json')||Number(response.headers.get('Content-Length')??0)>32768){await response.body?.cancel();throw new RucError(502,'RUC_RESPONSE')}
  const result=rucReference(await readBounded(response.body,32768,signal),ruc)
  await academicActor(user)
  signal.throwIfAborted()
  return new Response(JSON.stringify({...result,proveedor:'OpenRUC',consultado_at:new Date().toISOString()}),{headers})
 }catch(error){
  const safe=signal.aborted?new RucError(504,'RUC_TIMEOUT'):error instanceof RucError?error:error instanceof DocumentoError?new RucError(error.status,error.status===401?'RUC_SESSION':'RUC_ACCESS'):new RucError(503,'RUC_UNAVAILABLE')
  console.error(JSON.stringify({phase:'consultar-ruc',category:safe.code,correlation:crypto.randomUUID()}))
  return new Response(JSON.stringify({code:safe.code}),{status:safe.status,headers})
 }
}
