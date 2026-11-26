import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AcademicAction } from '../academic/AcademicLayout'
import { useSession } from '../security/SessionProvider'
import { lookupRuc, storedRucReference, type StoredRucReference } from '../../supabase/functions/_shared/ruc/contract'

const messages:Record<string,string>={RUC_INVALID:'Revisa el RUC: debe tener 11 dígitos y un dígito verificador válido.',RUC_SCOPE:'OpenRUC solo consulta RUC que empiezan por 20. Puedes registrar los datos manualmente.',RUC_NOT_FOUND:'No se encontró este RUC en OpenRUC. Puedes continuar con el registro manual.',RUC_LIMIT:'El servicio alcanzó su límite de consultas. Puedes registrar los datos manualmente.',RUC_TIMEOUT:'La consulta superó los 5 segundos. Puedes registrar los datos manualmente.',RUC_ACCESS:'No tienes permiso vigente para consultar. Puedes revisar tu sesión.',RUC_SESSION:'La sesión no está disponible. Vuelve a ingresar.'}
export function CompanyRucLookup({ruc,name,address,stored,readOnly=false,disabled,apply,children}:{ruc:string;name:string;address:string;stored:StoredRucReference|null;readOnly?:boolean;disabled:boolean;apply:(ruc:string,previousName:string,previousAddress:string,reference:StoredRucReference)=>void;children:(action:ReactNode,reference:ReactNode)=>ReactNode}) {
 const {client,state}=useSession()
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const flight=useRef(false),controller=useRef<AbortController|null>(null),alive=useRef(true),current=useRef({ruc,name,address,apply})
 current.current={ruc,name,address,apply}
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort()}},[])
 useEffect(()=>{controller.current?.abort();setError('')},[ruc])
 const authorized=state.phase==='authorized'&&state.roles?.some(role=>['DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO'].includes(role))
 async function consult() {
  if(!authorized||readOnly||disabled||flight.current)return
  setError('')
  try{lookupRuc(ruc)}catch(e){setError(messages[(e as {code:string}).code]??'Revisa el RUC antes de consultar.');return}
  const previousName=name,previousAddress=address,requested=ruc,c=new AbortController();controller.current=c;flight.current=true;setBusy(true)
  try {
   const response=await client.functions.invoke('consultar-ruc',{body:{ruc:requested},signal:c.signal,timeout:5000})
   if(response.error){let code='RUC_UNAVAILABLE';try{const v=await response.error.context?.json();if(typeof v?.code==='string')code=v.code}catch{/* Fixed safe message only. */}throw {code}}
   const data=storedRucReference(response.data,requested)
   if(!alive.current||c.signal.aborted||current.current.ruc!==requested)return
   current.current.apply(requested,previousName,previousAddress,data)
  }catch(e){if(alive.current&&current.current.ruc===requested&&!c.signal.aborted)setError(messages[(e as {name?:string}).name==='AbortError'?'RUC_TIMEOUT':(e as {code?:string}).code??'']??'No se pudo consultar el RUC. Conservamos tus datos; puedes continuar con el registro manual.')}
  finally{if(controller.current===c)controller.current=null;flight.current=false;if(alive.current)setBusy(false)}
 }
 if(!authorized)return children(null,null)
 const reference=stored?.ruc===ruc?stored:null
 const action=readOnly?null:<AcademicAction icon="search" label={busy?'Consultando RUC…':'Consultar RUC'} disabled={disabled||busy} onClick={()=>void consult()}/>
 const details=(busy||error||reference)?<section className="company-ruc-reference" aria-label="Consulta de RUC">
 {busy&&<p role="status" className="help-text">Consultando RUC… Espera un momento.</p>}
 {error&&<p role="alert" className="validation-errors">{error}</p>}
 {reference&&<details><summary>Datos tributarios de referencia</summary><p className="help-text">Referencia de la última consulta. Los datos operativos pueden haber sido corregidos.</p><dl className="review-fields">{name!==reference.razon_social&&<div><dt>Razón social de referencia</dt><dd>{reference.razon_social}</dd></div>}<div><dt>Estado</dt><dd>{reference.estado??'No informado'}</dd></div><div><dt>Condición</dt><dd>{reference.condicion??'No informada'}</dd></div><div><dt>Ubigeo</dt><dd>{reference.ubigeo??'No informado'}</dd></div><div className="company-fiscal-address"><dt>Domicilio fiscal</dt><dd>{reference.direccion??'No informado'}</dd></div></dl><p className="help-text company-ruc-source">{reference.proveedor} · {reference.source} · Padrón al {reference.as_of.split('-').reverse().join('/')} · Consultado el {new Date(reference.consultado_at).toLocaleString('es-PE',{timeZone:'America/Lima'})} (Lima). No es una verificación en tiempo real.</p></details>}
 </section>:null
 return children(action,details)
}
