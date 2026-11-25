import type { SupabaseClient } from '@supabase/supabase-js'
export class DniError extends Error {
 constructor(public status:number,public code:string){super(code)}
}
export function validDni(value:unknown):value is string {return typeof value==='string'&&/^[0-9]{8}$/.test(value)}
// RLS authorizes academic readers, including inactive students. Never filter activo.
export async function assertNewDni(client:SupabaseClient,dni:string,typeId?:string,signal?:AbortSignal) {
 if(!validDni(dni))throw new DniError(422,'DNI_INVALID')
 const deadline=signal??AbortSignal.timeout(5000)
 let id=typeId
 if(!id){const type=await client.from('catalogo_valor').select('id,catalogo!inner(codigo)').abortSignal(deadline).eq('codigo','DNI').eq('catalogo.codigo','TIPO_DI').single();if(type.error||!type.data)throw new DniError(503,'DNI_LOCAL');id=String(type.data.id)}
 const result=await client.from('alumno').select('id').abortSignal(deadline).eq('tipo_di_id',id).eq('numero_di',dni).limit(1)
 if(result.error||!Array.isArray(result.data))throw new DniError(503,'DNI_LOCAL')
 if(result.data.length)throw new DniError(409,'DNI_EXISTS')
}
export type DniNames={dni:string;nombres:string;apellido_paterno:string;apellido_materno:string}
export function dniNames(value:unknown,dni:string):DniNames {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new DniError(502,'DNI_RESPONSE')
 const v=value as Record<string,unknown>
 if(v.dni!==dni||v.success===false)throw new DniError(502,'DNI_RESPONSE')
 const name=(key:string)=>{const text=v[key];if(typeof text!=='string'||!text.trim()||text.trim().length>150||Array.from(text).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))throw new DniError(502,'DNI_RESPONSE');return text.trim().toUpperCase()}
 return {dni,nombres:name('nombres'),apellido_paterno:name('apellidoPaterno'),apellido_materno:name('apellidoMaterno')}
}

// The browser receives our projection, never the provider's original payload.
export function dniResult(value:unknown,dni:string):DniNames {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new DniError(502,'DNI_RESPONSE')
 const v=value as Record<string,unknown>
 return dniNames({dni:v.dni,nombres:v.nombres,apellidoPaterno:v.apellido_paterno,apellidoMaterno:v.apellido_materno},dni)
}
