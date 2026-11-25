export type RucReference = { ruc:string; razon_social:string; estado:string|null; condicion:string|null; direccion:string|null; ubigeo:string|null; source:string; as_of:string }
export class RucError extends Error {
 constructor(public status:number,public code:string){super(code)}
}
export function validRuc(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{11}$/.test(value))return false
 const weights=[5,4,3,2,7,6,5,4,3,2]
 const sum=weights.reduce((n,w,i)=>n+Number(value[i])*w,0)
 return (11-sum%11)%10===Number(value[10])
}
export function lookupRuc(value:unknown):string {
 if(!validRuc(value))throw new RucError(422,'RUC_INVALID')
 if(!value.startsWith('20'))throw new RucError(422,'RUC_SCOPE')
 return value
}
function text(value:unknown,max:number,optional=false):string|null {
 if(optional&&(value===null||value===''||value==='-'))return null
 if(typeof value!=='string'||!value.trim()||value.length>max||[...value].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))throw new RucError(502,'RUC_RESPONSE')
 return value.trim()
}
export function rucReference(value:unknown,requested:string):RucReference {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new RucError(502,'RUC_RESPONSE')
 const v=value as Record<string,unknown>
 if(v.ruc!==requested||!validRuc(v.ruc)||v.source!=='SUNAT')throw new RucError(502,'RUC_RESPONSE')
 const asOf=text(v.as_of,10)!
 if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isFinite(Date.parse(asOf))||new Date(asOf).toISOString().slice(0,10)!==asOf||asOf>new Date().toISOString().slice(0,10))throw new RucError(502,'RUC_RESPONSE')
 const ubigeo=text(v.ubigeo,6,true)
 if(ubigeo!==null&&!/^\d{6}$/.test(ubigeo))throw new RucError(502,'RUC_RESPONSE')
 // Fixed projection: never expose/follow _more, links or arbitrary provider keys.
 return {ruc:requested,razon_social:text(v.razon_social,200)!,estado:text(v.estado,80,true),condicion:text(v.condicion,80,true),direccion:text(v.direccion,500,true),ubigeo,source:'SUNAT',as_of:asOf}
}

// Persist only this normalized projection; operational edits are separate.
export type StoredRucReference = RucReference & { proveedor:'OpenRUC'; consultado_at:string }
export function storedRucReference(value:unknown,requested:string):StoredRucReference {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new RucError(502,'RUC_RESPONSE')
 const v=value as Record<string,unknown>
 const allowed=['ruc','razon_social','estado','condicion','direccion','ubigeo','source','as_of','proveedor','consultado_at']
 if(Object.keys(v).length!==allowed.length||Object.keys(v).some(k=>!allowed.includes(k))||v.proveedor!=='OpenRUC'||typeof v.consultado_at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.consultado_at)||!Number.isFinite(Date.parse(v.consultado_at))||new Date(v.consultado_at).toISOString()!==v.consultado_at||Date.parse(v.consultado_at)>Date.now()+60000)throw new RucError(502,'RUC_RESPONSE')
 return {...rucReference(value,requested),proveedor:'OpenRUC',consultado_at:v.consultado_at}
}
