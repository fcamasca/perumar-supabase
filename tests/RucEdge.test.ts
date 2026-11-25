import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const {createClient}=vi.hoisted(()=>({createClient:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient}))
import { serveRuc } from '../supabase/functions/_shared/ruc/http'
import { validRuc, rucReference, storedRucReference } from '../supabase/functions/_shared/ruc/contract'
const ruc='20100047218'
const record={ruc,razon_social:'EMPRESA DE PRUEBA',estado:'ACTIVO',condicion:'HABIDO',direccion:'DIRECCIÓN SINTÉTICA',ubigeo:'150114',source:'SUNAT',as_of:'2026-01-01'}
const upstream=vi.fn()
let authenticated:boolean,active:boolean,academic:boolean,roleActive:boolean
beforeEach(()=>{
 authenticated=true;active=true;academic=true;roleActive=true
 vi.stubGlobal('Deno',{env:{get:(k:string)=>({SUPABASE_URL:'http://kong',SUPABASE_ANON_KEY:'anon'}[k])}})
 vi.spyOn(console,'error').mockImplementation(()=>{})
 createClient.mockReset().mockImplementation(()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'actor'}:null},error:null})},from:(table:string)=>{
  const data=()=>table==='app_users'?{active}:table==='app_user_roles'?[{role_code:academic?'COORDINADOR_ACADEMICO':'ADMIN_SISTEMA'}]:[{code:'COORDINADOR_ACADEMICO',active:roleActive}]
  const q={select:()=>q,eq:()=>q,in:()=>q,single:async()=>({data:data(),error:null}),then:(r:(v:unknown)=>void)=>Promise.resolve({data:data(),error:null}).then(r)};return q
 }}))
 upstream.mockReset().mockImplementation(async()=>new Response(JSON.stringify({...record,_more:{url:'https://evil.example',token:'FORBIDDEN'}}),{headers:{'Content-Type':'application/json'}}))
 vi.stubGlobal('fetch',upstream)
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
const req=(body:unknown={ruc})=>new Request('http://edge/consultar-ruc',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json',Origin:'http://127.0.0.1:5173'},body:JSON.stringify(body)})
it('validates checksum and returns a strict projection from one fixed unauthenticated upstream call',async()=>{
 expect(validRuc(ruc)).toBe(true);expect(validRuc('20131312955')).toBe(true)
 const res=await serveRuc(req());expect(res.status).toBe(200);const data=await res.json();expect(data).toEqual({...record,proveedor:'OpenRUC',consultado_at:expect.any(String)});expect(storedRucReference(data,ruc)).toEqual(data)
 expect(upstream).toHaveBeenCalledTimes(1)
 expect(upstream.mock.calls[0][0]).toBe('https://openruc.com/api/ruc/'+ruc)
 expect(upstream.mock.calls[0][1]).toMatchObject({method:'GET',headers:{Accept:'application/json'},redirect:'error',credentials:'omit'})
 expect(createClient.mock.calls.every(c=>c[1]==='anon')).toBe(true)
 expect(res.headers.get('Cache-Control')).toContain('no-store')
})
it.each(['anonymous','admin','inactive-user','inactive-role'])('denies %s before any provider request',async(kind)=>{
 if(kind==='anonymous')authenticated=false;if(kind==='admin')academic=false;if(kind==='inactive-user')active=false;if(kind==='inactive-role')roleActive=false
 const res=await serveRuc(req());expect([401,403]).toContain(res.status);expect(upstream).not.toHaveBeenCalled()
})
it.each([{ruc:'20100047219'},{ruc:'2010'},{ruc:ruc+'/'},{ruc,actor:'forged'},{ruc,url:'https://evil.example'}])('rejects forged/invalid request %j',async(body)=>{
 expect((await serveRuc(req(body))).status).toBe(422);expect(upstream).not.toHaveBeenCalled()
})
it('keeps natural-person RUC outside provider scope without disallowing manual business registration',async()=>{
 const prefix='1045678901',weights=[5,4,3,2,7,6,5,4,3,2];const check=(11-weights.reduce((s,w,i)=>s+w*Number(prefix[i]),0)%11)%10
 const res=await serveRuc(req({ruc:prefix+check}));expect(await res.json()).toEqual({code:'RUC_SCOPE'});expect(upstream).not.toHaveBeenCalled()
})
it.each([404,429,500])('maps provider status %i without retry or leaking its response',async(status)=>{
 upstream.mockResolvedValue(new Response('PRIVATE SQL TOKEN',{status}))
 const res=await serveRuc(req());expect(res.status).toBe(status===500?503:status);expect(await res.text()).not.toContain('PRIVATE');expect(upstream).toHaveBeenCalledTimes(1)
})
it.each([{...record,ruc:'20131312955'},{...record,as_of:'2026-02-30'},{...record,source:'unknown'},{...record,razon_social:'x'.repeat(201)},{...record,ubigeo:'wrong'}])('rejects inconsistent provider fields',async(value)=>{
 upstream.mockResolvedValue(new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}}))
 expect((await serveRuc(req())).status).toBe(502)
})
it.each(['html','oversize','json'])('rejects provider %s',async(kind)=>{
 upstream.mockResolvedValue(new Response(kind==='oversize'?'x'.repeat(32769):kind==='json'?'{bad':'<html>bad</html>',{headers:{'Content-Type':kind==='html'?'text/html':'application/json'}}))
 expect((await serveRuc(req())).status).toBe(502)
})
it('enforces a five-second abort and never follows promotional links',async()=>{
 const c=new AbortController();const timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(c.signal)
 upstream.mockImplementation(async(_url:string,options:RequestInit)=>new Promise((_resolve,reject)=>{options.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});c.abort()}))
 const res=await serveRuc(req());expect(timeout).toHaveBeenCalledWith(5000);expect(res.status).toBe(504);expect(await res.json()).toEqual({code:'RUC_TIMEOUT'});expect(upstream).toHaveBeenCalledTimes(1)
})
it('revalidates current role after provider IO',async()=>{
 upstream.mockImplementation(async()=>{academic=false;return new Response(JSON.stringify(record),{headers:{'Content-Type':'application/json'}})})
 expect((await serveRuc(req())).status).toBe(403)
})
it('accepts nullable reference fields and discards every extra provider key',()=>{
 expect(rucReference({...record,ubigeo:null,direccion:null,_more:{url:'https://evil.example'}},ruc)).toEqual({...record,ubigeo:null,direccion:null})
})

it.each([{_more:{}},{proveedor:'forged'},{consultado_at:'invalid'},{consultado_at:'2099-01-01T00:00:00.000Z'},{ruc:'20131312955'}])('rejects extra or mismatched persisted reference metadata %j',(change)=>{
 expect(()=>storedRucReference({...record,proveedor:'OpenRUC',consultado_at:'2026-01-02T10:00:00.000Z',...change},ruc)).toThrow()
})
