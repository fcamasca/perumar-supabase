import type { SupabaseClient } from '@supabase/supabase-js'
import { academicActor } from '../expediente/operation.ts'
import { DocumentoError, MAX_FILE, databaseError, sha256 } from '../expediente/contract.ts'
import { validateFile } from '../expediente/validateFile.ts'
export const OS_BUCKET = 'h7-os'
type Manifest = { id:string; orden_servicio_id:string; object_key:string; numero_version:number; bytes:number; sha256:string }
export async function orderAccess(user:SupabaseClient, id:string) {
 const q=await user.from('orden_servicio').select('id,estado_codigo').eq('id',id).single()
 if(q.error||!q.data)throw new DocumentoError(403,'DOCUMENT_ACCESS')
 return q.data as {id:string;estado_codigo:string}
}
async function rpc(server:SupabaseClient,name:string,args:Record<string,unknown>):Promise<Manifest> {
 const r=await server.rpc(name,args)
 if(r.error)throw databaseError(r.error)
 if(!r.data?.id)throw new DocumentoError(503,'DOCUMENT_UNAVAILABLE')
 return r.data as Manifest
}
export async function uploadOrderFile(user:SupabaseClient,server:SupabaseClient,actor:string,input:{os_id:string;expected_updated_at:string},file:File) {
 const order=await orderAccess(user,input.os_id)
 if(order.estado_codigo!=='VIGENTE')throw new DocumentoError(409,'DOCUMENT_STATE')
 if(file.type!=='application/pdf')throw new DocumentoError(422,'DOCUMENT_FILE_INVALID')
 if(file.size>MAX_FILE)throw new DocumentoError(413,'DOCUMENT_LIMIT')
 const bytes=new Uint8Array(await file.arrayBuffer())
 await validateFile(bytes,file.type,file.name)
 const f=await rpc(server,'preparar_archivo_os',{p_actor:actor,p_os_id:order.id,p_expected_updated_at:input.expected_updated_at})
 const bucket=server.storage.from(OS_BUCKET)
 try {
  const result=await bucket.upload(f.object_key,bytes,{contentType:'application/pdf',cacheControl:'0',upsert:false})
  if(result.error)throw new DocumentoError(503,'DOCUMENT_UPLOAD_FAILED')
  const confirmed=await rpc(server,'confirmar_archivo_os',{p_actor:actor,p_os_id:order.id,p_archivo_id:f.id,p_bytes:bytes.length,p_sha256:await sha256(bytes)})
  return {archivo_id:confirmed.id,numero_version:confirmed.numero_version}
 } catch(error) {
  // A lost confirmation response must never cause deletion of confirmed history.
  try {
   const aborted=await rpc(server,'abortar_archivo_os',{p_actor:actor,p_os_id:order.id,p_archivo_id:f.id})
   await bucket.remove([aborted.object_key])
  } catch { /* Uncertain/unconfirmed files remain private for manual reconciliation. */ }
  throw error
 }
}
export async function downloadOrderFile(user:SupabaseClient,server:SupabaseClient,actor:string,input:{os_id:string;archivo_id:string}) {
 await orderAccess(user,input.os_id)
 const args={p_actor:actor,p_os_id:input.os_id,p_archivo_id:input.archivo_id}
 const f=await rpc(server,'consultar_archivo_os',args)
 const result=await server.storage.from(OS_BUCKET).download(f.object_key)
 if(result.error||!result.data)throw new DocumentoError(404,'DOCUMENT_FILE_UNAVAILABLE')
 if(result.data.size>MAX_FILE)throw new DocumentoError(503,'DOCUMENT_INTEGRITY')
 const bytes=new Uint8Array(await result.data.arrayBuffer())
 if(bytes.length!==f.bytes||await sha256(bytes)!==f.sha256)throw new DocumentoError(503,'DOCUMENT_INTEGRITY')
 // Fresh user JWT/role and resource checks after I/O, immediately before byte delivery.
 if(await academicActor(user)!==actor)throw new DocumentoError(403,'DOCUMENT_ACCESS')
 await orderAccess(user,input.os_id)
 await rpc(server,'consultar_archivo_os',{...args,p_registrar:true})
 return bytes
}
