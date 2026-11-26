import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const {client}=vi.hoisted(()=>({client:{from:vi.fn(),functions:{invoke:vi.fn()}}}))
vi.mock('../src/security/SessionProvider',()=>({useSession:()=>({client})}))
import { useDniLookup } from '../src/enrollment/useDniLookup'
const dni='12345678',apply=vi.fn()
let rows:unknown[],error:unknown
beforeEach(()=>{
 rows=[];error=null;apply.mockReset()
 client.from.mockReset().mockImplementation(()=>{const q={select:()=>q,abortSignal:()=>q,eq:()=>q,limit:async()=>({data:rows,error})};return q})
 client.functions.invoke.mockReset().mockResolvedValue({data:{dni,nombres:'PERSONA',apellido_paterno:'PRUEBA',apellido_materno:'SINTÉTICA'},error:null})
})
afterEach(cleanup)
it('autofills editable name fields only and verifies again before manual save',async()=>{
 const {result}=renderHook(()=>useDniLookup(dni,'type',true,apply))
 await act(async()=>{await result.current.consult()})
 expect(apply).toHaveBeenCalledWith({nombres:'PERSONA',apellido_paterno:'PRUEBA',apellido_materno:'SINTÉTICA'})
 let valid=false;await act(async()=>{valid=await result.current.verify()});expect(valid).toBe(true);expect(client.from).toHaveBeenCalledTimes(2);expect(client.functions.invoke).toHaveBeenCalledTimes(1)
})
it.each(['duplicate','local-failure'])('blocks lookup and creation on %s',async(kind)=>{
 rows=kind==='duplicate'?[{id:'inactive'}]:[];error=kind==='local-failure'?{}:null
 const {result}=renderHook(()=>useDniLookup(dni,'type',true,apply))
 await act(async()=>{expect(await result.current.consult()).toBe(false)})
 await act(async()=>{expect(await result.current.verify()).toBe(false)})
 expect(client.functions.invoke).not.toHaveBeenCalled();expect(apply).not.toHaveBeenCalled();expect(result.current.message).toContain(kind==='duplicate'?'El alumno ya se encuentra registrado':'No se pudo verificar')
})
it('permits manual registration after external failure only if the next local verification succeeds',async()=>{
 client.functions.invoke.mockResolvedValue({data:null,error:{context:{json:async()=>({code:'DNI_TIMEOUT'})}}})
 const {result}=renderHook(()=>useDniLookup(dni,'type',true,apply))
 await act(async()=>{await result.current.consult()});expect(result.current.message).toContain('manualmente')
 await act(async()=>{expect(await result.current.verify()).toBe(true)})
 error={};await act(async()=>{expect(await result.current.verify()).toBe(false)})
})
it('skips DNI lookup for existing students and non-DNI documents',async()=>{
 const {result}=renderHook(()=>useDniLookup('CE123','type',false,apply));await act(async()=>{expect(await result.current.verify()).toBe(true)});expect(client.from).not.toHaveBeenCalled();expect(client.functions.invoke).not.toHaveBeenCalled()
})
it('invalid DNI does not call either service',async()=>{const {result}=renderHook(()=>useDniLookup('123','type',true,apply));await act(async()=>{expect(await result.current.verify()).toBe(false)});expect(client.from).not.toHaveBeenCalled();expect(client.functions.invoke).not.toHaveBeenCalled()})
it('prevents parallel consultations and ignores stale results after the document changes',async()=>{
 let finish:(v:unknown)=>void=()=>{};client.functions.invoke.mockImplementation(()=>new Promise(r=>{finish=r}))
 const {result,rerender}=renderHook(({number})=>useDniLookup(number,'type',true,apply),{initialProps:{number:dni}})
 let pending:Promise<boolean>;await act(async()=>{pending=result.current.consult()});expect(result.current.busy).toBe(true)
 await act(async()=>{expect(await result.current.consult()).toBe(false)});expect(client.functions.invoke).toHaveBeenCalledTimes(1)
 rerender({number:'87654321'});await act(async()=>{finish({data:{dni,nombres:'PERSONA',apellido_paterno:'PRUEBA',apellido_materno:'SINTÉTICA'},error:null});await pending});expect(apply).not.toHaveBeenCalled();expect(result.current.busy).toBe(false)
})
