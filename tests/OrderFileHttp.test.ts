import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { File as NodeFile } from 'node:buffer'
import { PDFDocument } from 'pdf-lib'
const {createClient}=vi.hoisted(()=>({createClient:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient}))
import { serveOrderFile } from '../supabase/functions/_shared/os-files/http'
import { sha256 } from '../supabase/functions/_shared/expediente/contract'
// Node test compilation only; Edge entry points are checked against the real Deno runtime.
declare global { const Deno: { env: { get(name:string):string|undefined } } }
const id='11111111-1111-4111-8111-111111111111',fid='22222222-2222-4222-8222-222222222222'
let active:boolean,hasRole:boolean,hasResource:boolean,authenticated:boolean,bytes:Uint8Array
const rpc=vi.fn(),upload=vi.fn(),download=vi.fn()
beforeEach(async()=>{
 active=true;hasRole=true;hasResource=true;authenticated=true
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('File',NodeFile)
 vi.stubGlobal('Deno',{env:{get:(name:string)=>({SUPABASE_URL:'http://kong',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'}[name])}})
 vi.spyOn(console,'error').mockImplementation(()=>{})
 const pdf=await PDFDocument.create();pdf.addPage();bytes=await pdf.save({useObjectStreams:false})
 const user={auth:{getUser:async()=>({data:{user:authenticated?{id}:null},error:null})},from:(table:string)=>{
  const data=()=>table==='app_users'?{active}:table==='app_user_roles'?hasRole?[{role_code:'DIRECTOR_ACADEMICO'}]:[{role_code:'ADMIN_SISTEMA'}]:table==='app_roles'?[{code:'DIRECTOR_ACADEMICO',active:true}]:hasResource?{id,estado_codigo:'VIGENTE'}:null
  const q={select:()=>q,eq:()=>q,in:()=>q,single:async()=>({data:data(),error:null}),then:(r:(v:unknown)=>void)=>Promise.resolve({data:data(),error:null}).then(r)};return q
 }}
 rpc.mockReset().mockImplementation(async()=>({data:{id:fid,numero_version:1,object_key:id+'/'+fid+'.pdf',bytes:bytes.length,sha256:await sha256(bytes)},error:null}))
 upload.mockReset().mockResolvedValue({error:null});download.mockReset().mockImplementation(async()=>({data:new Blob([Uint8Array.from(bytes)]),error:null}))
 const server={rpc,storage:{from:()=>({upload,download,remove:vi.fn().mockResolvedValue({error:null})})}}
 createClient.mockReset().mockImplementation((_url:string,key:string)=>key==='anon'?user:server)
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
const request=(body:unknown={os_id:id,archivo_id:fid},origin='http://127.0.0.1:5173')=>new Request('http://edge/os-pdf-descargar',{method:'POST',headers:{Authorization:'Bearer synthetic',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
it.each(['missing-session','admin-only','inactive','missing-resource'])('denies %s before privileged client creation',async(kind)=>{
 if(kind==='missing-session')authenticated=false
 if(kind==='admin-only')hasRole=false
 if(kind==='inactive')active=false
 if(kind==='missing-resource')hasResource=false
 const response=await serveOrderFile(request(),'descargar')
 expect([401,403]).toContain(response.status)
 expect(createClient.mock.calls.every(c=>c[1]==='anon')).toBe(true)
 expect(download).not.toHaveBeenCalled()
})
it('returns PDF bytes with no-store after reauthorization and without any Storage URL',async()=>{
 const response=await serveOrderFile(request(),'descargar')
 expect(response.status).toBe(200);expect(response.headers.get('Content-Type')).toBe('application/pdf')
 expect(response.headers.get('Cache-Control')).toContain('no-store')
 expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
 expect(rpc).toHaveBeenLastCalledWith('consultar_archivo_os',{p_actor:id,p_os_id:id,p_archivo_id:fid,p_registrar:true})
})
it('rejects origin and forged object keys before service access',async()=>{
 expect((await serveOrderFile(request(undefined,'https://evil.example'),'descargar')).status).toBe(403)
 expect(createClient).not.toHaveBeenCalled()
 expect((await serveOrderFile(request({os_id:id,archivo_id:fid,object_key:'forged'}),'descargar')).status).toBe(422)
 expect(createClient.mock.calls.every(c=>c[1]==='anon')).toBe(true)
})
it('bounded multipart upload validates PDF and exposes only a safe confirmation',async()=>{
 const boundary='OS_TEST_BOUNDARY'
 const prefix=new TextEncoder().encode('--'+boundary+'\r\nContent-Disposition: form-data; name="os_id"\r\n\r\n'+id+'\r\n--'+boundary+'\r\nContent-Disposition: form-data; name="expected_updated_at"\r\n\r\n2026-11-25T12:00:00Z\r\n--'+boundary+'\r\nContent-Disposition: form-data; name="archivo"; filename="orden.pdf"\r\nContent-Type: application/pdf\r\n\r\n')
 const suffix=new TextEncoder().encode('\r\n--'+boundary+'--\r\n')
 const body=new Uint8Array(prefix.length+bytes.length+suffix.length);body.set(prefix);body.set(bytes,prefix.length);body.set(suffix,prefix.length+bytes.length)
 const req=new Request('http://edge/os-pdf-cargar',{method:'POST',headers:{Authorization:'Bearer synthetic','Content-Type':'multipart/form-data; boundary='+boundary},body})
 const response=await serveOrderFile(req,'cargar')
 expect(response.status).toBe(200)
 expect(await response.json()).toEqual({archivo_id:fid,numero_version:1})
 expect(upload).toHaveBeenCalledTimes(1)
})
