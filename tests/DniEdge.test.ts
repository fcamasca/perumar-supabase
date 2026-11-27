import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const {createClient}=vi.hoisted(()=>({createClient:vi.fn()}))
vi.mock('@supabase/supabase-js',()=>({createClient}))
import { dniResult } from '../supabase/functions/_shared/dni/contract'
import { serveDni } from '../supabase/functions/_shared/dni/http'
const upstream=vi.fn(),dni='12345678',record={dni,nombres:'PERSONA',apellidoPaterno:'PRUEBA',apellidoMaterno:'SINTÉTICA'}
let exists:boolean,localError:boolean,authenticated:boolean,academic:boolean,token:string,hosted:boolean,authorized:boolean
const filters:unknown[][]=[]
beforeEach(()=>{
 exists=false;localError=false;authenticated=true;academic=true;token='SECRET-FIXTURE';hosted=false;authorized=false;filters.length=0
 vi.stubGlobal('Deno',{env:{get:(k:string)=>({SUPABASE_URL:hosted?'https://abcdefghijklmnopqrst.supabase.co':'http://kong',SUPABASE_ANON_KEY:'anon',SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:'sb_publishable_synthetic0000000000000000'}),APISPERU_TOKEN:token,APISPERU_PRODUCTION_AUTHORIZED:String(authorized)}[k])}})
 vi.spyOn(console,'error').mockImplementation(()=>{})
 createClient.mockImplementation(()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'actor'}:null},error:null})},from:(table:string)=>{
  const result=()=>({data:table==='app_users'?{active:true}:table==='app_user_roles'?[{role_code:academic?'DIRECTOR_ACADEMICO':'ADMIN_SISTEMA'}]:table==='app_roles'?[{code:'DIRECTOR_ACADEMICO',active:true}]:table==='catalogo_valor'?{id:'dni-type'}:exists?[{id:'inactive-existing'}]:[],error:table==='alumno'&&localError?{message:'PII SQL'}:null})
  const q={select:()=>q,abortSignal:()=>q,eq:(...args:unknown[])=>{filters.push(args);return q},in:()=>q,limit:()=>q,single:async()=>result(),then:(r:(v:unknown)=>void)=>Promise.resolve(result()).then(r)};return q
 }}))
 upstream.mockReset().mockResolvedValue(new Response(JSON.stringify(record),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',upstream)
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
const req=(body:unknown={dni})=>new Request('http://edge/consultar-dni',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)})
it('checks all students including inactive before the single fixed provider call; returns names only',async()=>{
 const response=await serveDni(req());expect(response.status).toBe(200);expect(dniResult(await response.json(),dni)).toEqual({dni,nombres:'PERSONA',apellido_paterno:'PRUEBA',apellido_materno:'SINTÉTICA'})
 expect(filters).toContainEqual(['numero_di',dni]);expect(filters).toContainEqual(['tipo_di_id','dni-type']);expect(filters.some(f=>f[0]==='activo')).toBe(false)
 expect(upstream).toHaveBeenCalledTimes(1);expect(String(upstream.mock.calls[0][0])).toBe('https://dniruc.apisperu.com/api/v1/dni/12345678?token=SECRET-FIXTURE')
 expect(upstream.mock.calls[0][1]).toMatchObject({redirect:'error',credentials:'omit',headers:{Accept:'application/json'}})
 expect(response.headers.get('Cache-Control')).toContain('no-store')
})
it.each(['existing','local-error'])('never consumes provider on %s',async(kind)=>{
 exists=kind==='existing';localError=kind==='local-error';const res=await serveDni(req());expect(res.status).toBe(exists?409:503);expect(await res.json()).toEqual({code:exists?'DNI_EXISTS':'DNI_LOCAL'});expect(upstream).not.toHaveBeenCalled()
})
it.each(['session','admin'])('denies %s before provider access',async(kind)=>{authenticated=kind!=='session';academic=kind!=='admin';expect([401,403]).toContain((await serveDni(req())).status);expect(upstream).not.toHaveBeenCalled()})
it.each([{dni:'123'},{dni:'1234567a'},{dni:12345678},{dni,token:'forged'},{ruc:'20100047218'}])('rejects invalid input %j',async(body)=>{expect((await serveDni(req(body))).status).toBe(422);expect(upstream).not.toHaveBeenCalled()})
it.each([401,403,404,429,500])('maps upstream %i without private data or retries',async(status)=>{
 upstream.mockResolvedValue(new Response('SECRET-FIXTURE '+dni,{status}));const res=await serveDni(req());expect(res.ok).toBe(false);const body=await res.text();expect(body).not.toContain(dni);if([401,403].includes(status))expect(JSON.parse(body).code).toBe('DNI_PROVIDER_AUTH');expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/SECRET-FIXTURE|12345678/);expect(upstream).toHaveBeenCalledTimes(1)
})
it.each([{...record,dni:'87654321'},{...record,nombres:''},{...record,apellidoPaterno:'X'.repeat(151)},{...record,success:false}])('rejects inconsistent names',async(data)=>{upstream.mockResolvedValue(new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}}));expect((await serveDni(req())).status).toBe(502)})
it.each(['html','large','bad-json'])('rejects %s response',async(kind)=>{upstream.mockResolvedValue(new Response(kind==='large'?'x'.repeat(32769):'bad',{headers:{'Content-Type':kind==='html'?'text/html':'application/json'}}));expect((await serveDni(req())).status).toBe(502)})
it('aborts after five seconds without leaking the token',async()=>{
 const c=new AbortController(),timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(c.signal)
 upstream.mockImplementation(async()=>{c.abort();throw Error('SECRET-FIXTURE')})
 const res=await serveDni(req());expect(timeout).toHaveBeenCalledWith(5000);expect(res.status).toBe(504);expect(await res.json()).toEqual({code:'DNI_TIMEOUT'})
})
it('does not enable production consumption before explicit authorized-use confirmation',async()=>{hosted=true;const blocked=await serveDni(req());expect(blocked.status).toBe(503);expect(await blocked.json()).toEqual({code:'DNI_DISABLED'});expect(upstream).not.toHaveBeenCalled();authorized=true;expect((await serveDni(req())).status).toBe(200)})
it('missing secret preserves the local result and prevents provider access',async()=>{token='';const res=await serveDni(req());expect(res.status).toBe(503);expect(await res.json()).toEqual({code:'DNI_CONFIG'});expect(upstream).not.toHaveBeenCalled()})
it('hosted missing new keys fails closed before Auth or provider IO despite a legacy key',async()=>{
 hosted=true
 vi.stubGlobal('Deno',{env:{get:(k:string)=>({SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_ANON_KEY:'anon',APISPERU_TOKEN:token}[k])}})
 createClient.mockClear()
 expect((await serveDni(req())).status).toBe(503)
 expect(createClient).not.toHaveBeenCalled()
 expect(upstream).not.toHaveBeenCalled()
})
