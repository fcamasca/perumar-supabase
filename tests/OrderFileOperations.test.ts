import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { File as NodeFile } from 'node:buffer'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
import { uploadOrderFile, downloadOrderFile } from '../supabase/functions/_shared/os-files/operation'
import { sha256 } from '../supabase/functions/_shared/expediente/contract'
const upload=vi.fn(),remove=vi.fn(),download=vi.fn(),rpc=vi.fn()
let user:SupabaseClient,server:SupabaseClient,bytes:Uint8Array,file:File,active:boolean,orderState:string,access:boolean
const reservation={id:'file',orden_servicio_id:'os',object_key:'os/file.pdf',numero_version:2}
beforeEach(async()=>{
 vi.stubGlobal('crypto',webcrypto);active=true;orderState='VIGENTE';access=true
 upload.mockReset().mockResolvedValue({error:null});remove.mockReset().mockResolvedValue({error:null});download.mockReset();rpc.mockReset()
 const pdf=await PDFDocument.create();pdf.addPage();bytes=await pdf.save({useObjectStreams:false})
 file=new NodeFile([Uint8Array.from(bytes)],'orden.pdf',{type:'application/pdf'}) as unknown as File
 user={auth:{getUser:async()=>({data:{user:{id:'actor'}},error:null})},from:(table:string)=>{
  const data=()=>table==='orden_servicio'?access?{id:'os',estado_codigo:orderState}:null:table==='app_users'?{active}:table==='app_user_roles'?[{role_code:'DIRECTOR_ACADEMICO'}]:[{code:'DIRECTOR_ACADEMICO',active:true}]
  const q={select:()=>q,eq:()=>q,in:()=>q,single:async()=>({data:data(),error:null}),then:(resolve:(v:unknown)=>void)=>Promise.resolve({data:data(),error:null}).then(resolve)};return q
 }} as unknown as SupabaseClient
 server={rpc,storage:{from:()=>({upload,remove,download})}} as unknown as SupabaseClient
 rpc.mockImplementation(async(name:string)=>({data:name==='consultar_archivo_os'?{...reservation,bytes:bytes.length,sha256:await sha256(bytes)}:reservation,error:null}))
 download.mockImplementation(async()=>({data:new Blob([Uint8Array.from(bytes)]),error:null}))
})
it('uploads validated PDF once without upsert and returns only safe identifiers',async()=>{
 const result=await uploadOrderFile(user,server,'actor',{os_id:'os',expected_updated_at:'version'},file)
 expect(result).toEqual({archivo_id:'file',numero_version:2})
 expect(upload).toHaveBeenCalledExactlyOnceWith('os/file.pdf',bytes,{contentType:'application/pdf',cacheControl:'0',upsert:false})
 expect(rpc.mock.calls.map(c=>c[0])).toEqual(['preparar_archivo_os','confirmar_archivo_os'])
})
it.each(['wrong-mime','oversize','invalid','too-many-pages','active-pdf'])('rejects %s before reservation or Storage',async(kind)=>{
 let candidate=file
 if(kind==='wrong-mime')candidate=new NodeFile([bytes],'orden.pdf',{type:'image/png'}) as unknown as File
 if(kind==='oversize')candidate=new NodeFile([new Uint8Array(5242881)],'orden.pdf',{type:'application/pdf'}) as unknown as File
 if(kind==='invalid')candidate=new NodeFile(['%PDF-invalid'],'orden.pdf',{type:'application/pdf'}) as unknown as File
 if(kind==='too-many-pages'||kind==='active-pdf'){
  const pdf=await PDFDocument.create();for(let i=0;i<(kind==='too-many-pages'?21:1);i++)pdf.addPage()
  if(kind==='active-pdf')pdf.catalog.set(PDFName.of('OpenAction'),PDFString.of('malicious'))
  candidate=new NodeFile([await pdf.save({useObjectStreams:false})],'orden.pdf',{type:'application/pdf'}) as unknown as File
 }
 await expect(uploadOrderFile(user,server,'actor',{os_id:'os',expected_updated_at:'v'},candidate)).rejects.toThrow()
 expect(rpc).not.toHaveBeenCalled();expect(upload).not.toHaveBeenCalled()
})
it('failed replacement aborts only its reservation, never removes the previous version',async()=>{
 upload.mockResolvedValue({error:{message:'storage failure'}})
 await expect(uploadOrderFile(user,server,'actor',{os_id:'os',expected_updated_at:'v'},file)).rejects.toThrow('DOCUMENT_UPLOAD_FAILED')
 expect(rpc.mock.calls.map(c=>c[0])).toEqual(['preparar_archivo_os','abortar_archivo_os'])
 expect(remove).toHaveBeenCalledExactlyOnceWith(['os/file.pdf'])
})
it('lost confirmation response cannot cause removal of confirmed bytes',async()=>{
 rpc.mockImplementation(async(name:string)=>name==='preparar_archivo_os'?{data:reservation,error:null}:{data:null,error:name==='confirmar_archivo_os'?{code:'FETCH_ERROR'}:{code:'PT409',message:'DOCUMENT_ALREADY_CONFIRMED'}})
 await expect(uploadOrderFile(user,server,'actor',{os_id:'os',expected_updated_at:'v'},file)).rejects.toThrow()
 expect(remove).not.toHaveBeenCalled()
})
it('annulled OS denies new bytes but its confirmed PDF remains downloadable',async()=>{
 orderState='ANULADA'
 await expect(uploadOrderFile(user,server,'actor',{os_id:'os',expected_updated_at:'v'},file)).rejects.toThrow('DOCUMENT_STATE')
 expect(upload).not.toHaveBeenCalled()
 expect(await downloadOrderFile(user,server,'actor',{os_id:'os',archivo_id:'file'})).toEqual(bytes)
 expect(rpc).toHaveBeenLastCalledWith('consultar_archivo_os',{p_actor:'actor',p_os_id:'os',p_archivo_id:'file',p_registrar:true})
})
it('wrong resource is rejected before Storage access',async()=>{
 rpc.mockResolvedValue({data:null,error:{code:'42501'}})
 await expect(downloadOrderFile(user,server,'actor',{os_id:'other-os',archivo_id:'file'})).rejects.toThrow('DOCUMENT_ACCESS')
 expect(download).not.toHaveBeenCalled()
})
it('role revocation during IO withholds bytes',async()=>{
 download.mockImplementation(async()=>{active=false;return {data:new Blob([Uint8Array.from(bytes)]),error:null}})
 await expect(downloadOrderFile(user,server,'actor',{os_id:'os',archivo_id:'file'})).rejects.toThrow('DOCUMENT_ACCESS')
 expect(rpc).toHaveBeenCalledTimes(1)
})
it('corrupt bytes fail integrity before delivery',async()=>{
 download.mockResolvedValue({data:new Blob(['tampered']),error:null})
 await expect(downloadOrderFile(user,server,'actor',{os_id:'os',archivo_id:'file'})).rejects.toThrow('DOCUMENT_INTEGRITY')
})
it('missing OS access blocks reservation',async()=>{
 access=false
 await expect(uploadOrderFile(user,server,'actor',{os_id:'os',expected_updated_at:'v'},file)).rejects.toThrow('DOCUMENT_ACCESS')
 expect(rpc).not.toHaveBeenCalled()
})
