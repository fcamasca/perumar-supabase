import { useEffect, useRef, useState } from 'react'
import { assertNewDni, dniResult, DniError } from '../../supabase/functions/_shared/dni/contract'
import { useSession } from '../security/SessionProvider'
const messages:Record<string,string>={DNI_CONFIG:'La consulta de DNI no tiene configurada su credencial. Puedes completar los datos manualmente.',DNI_DISABLED:'La consulta de DNI todavía no está habilitada en este entorno. Puedes completar los datos manualmente.',DNI_PROVIDER_AUTH:'El proveedor rechazó la credencial de consulta. Revisa su vigencia; puedes completar los datos manualmente.',DNI_TIMEOUT:'La consulta de DNI superó el tiempo de espera. Puedes completar los datos manualmente.',DNI_LIMIT:'Se alcanzó el límite de consultas del proveedor. Puedes completar los datos manualmente.',DNI_EXISTS:'El alumno ya se encuentra registrado',DNI_INVALID:'El DNI debe tener exactamente 8 dígitos.',DNI_LOCAL:'No se pudo verificar si el alumno está registrado. Vuelve a verificar antes de continuar.'}
export function useDniLookup(dni:string,typeId:string,enabled:boolean,apply:(names:Record<string,string>)=>void) {
 const {client}=useSession(),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const current=useRef({dni,typeId,enabled,apply}),flight=useRef(false),alive=useRef(true)
 current.current={dni,typeId,enabled,apply}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const matches=(number:string,type:string)=>alive.current&&current.current.enabled&&current.current.dni===number&&current.current.typeId===type
 async function run(external:boolean) {
  if(!enabled)return true
  if(flight.current)return false
  flight.current=true;setBusy(true);setMessage('')
  const requested=dni,type=typeId
  let localVerified=false
  try {
   await assertNewDni(client,requested,type);localVerified=true
   if(!matches(requested,type))return false
   if(!external)return true
   const result=await client.functions.invoke('consultar-dni',{body:{dni:requested},timeout:5000})
   if(result.error){let code='DNI_UNAVAILABLE';try{const body=await result.error.context?.json();if(typeof body?.code==='string')code=body.code}catch{/* No provider details are displayed. */}throw new DniError(503,code)}
   const names=dniResult(result.data,requested)
   if(matches(requested,type)){current.current.apply({nombres:names.nombres,apellido_paterno:names.apellido_paterno,apellido_materno:names.apellido_materno});setMessage('Datos consultados. Revisa y completa la información antes de guardar.')}
   return false
  }catch(e){
   const code=e instanceof DniError?e.code:localVerified?'DNI_UNAVAILABLE':'DNI_LOCAL'
   if(matches(requested,type))setMessage(messages[code]??'No se pudo consultar el DNI. Puedes completar los datos manualmente; verificaremos nuevamente su existencia al guardar.')
   return false
  }finally{flight.current=false;if(alive.current)setBusy(false)}
 }
 return {busy,message,verify:()=>run(false),consult:()=>run(true)}
}
