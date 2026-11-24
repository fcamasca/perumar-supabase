import { useEffect, useRef, useState, type ReactNode } from 'react'
import { InlineForm } from '../academic/AcademicUi'

export function useRows<T>(load: () => PromiseLike<{data: unknown; error: unknown}>) {
 const [revision,setRevision]=useState(0)
 const [result,setResult]=useState<{source: typeof load; rows:T[]; error:string; ready:boolean}>()
 useEffect(()=>{
  let active=true
  setResult({source:load,rows:[],error:'',ready:false})
  void(async()=>{try{const r=await load();if(r.error||!Array.isArray(r.data))throw Error('read');if(active)setResult({source:load,rows:r.data as T[],error:'',ready:true})}
  catch{if(active)setResult({source:load,rows:[],error:'No se pudo consultar la información. Vuelve a consultar antes de operar.',ready:false})}})()
  return()=>{active=false}
 },[load,revision])
 const current=result?.source===load?result:undefined
 return {rows:current?.rows??[],ready:current?.ready??false,error:current?.error??'',loading:!current||(!current.ready&&!current.error),reload:()=>{setResult(undefined);setRevision(n=>n+1)}}
}
export function Pager({page,count,disabled,onChange}:{page:number;count:number;disabled:boolean;onChange:(n:number)=>void}){
 return <div className="billing-pagination"><span>Página {page+1} · {count} resultados</span><button type="button" className="secondary" disabled={disabled||!page} onClick={()=>onChange(page-1)}>Anterior</button><button type="button" className="secondary" disabled={disabled||count<30} onClick={()=>onChange(page+1)}>Siguiente página</button></div>
}
export function Selection<T extends {id:string}>({rows,selected,change,label,children,name,disabled=false}:{rows:T[];selected:string[];change:(ids:string[])=>void;label:string;children:(r:T)=>ReactNode;name?:(r:T)=>string;disabled?:boolean}){
 const all=rows.length>0&&rows.every(r=>selected.includes(r.id)),some=rows.some(r=>selected.includes(r.id)),ref=useRef<HTMLInputElement>(null)
 useEffect(()=>{if(ref.current)ref.current.indeterminate=some&&!all},[some,all])
 const missing=selected.filter(id=>!rows.some(r=>r.id===id))
 return <div className="billing-selection"><label className="billing-check"><input ref={ref} type="checkbox" aria-label={'Seleccionar todas las '+label+' visibles'} checked={all} disabled={disabled||!rows.length} onChange={e=>change(e.target.checked?rows.map(r=>r.id):[])}/>Seleccionar todas las visibles</label><p className="help-text">Selección de esta página. Cambiar de página reinicia la selección.</p>
 <div className="table-scroll"><table aria-label={label}><thead><tr><th>Incluir</th><th>Detalle</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><input type="checkbox" aria-label={'Seleccionar '+(name?name(r):r.id)} checked={selected.includes(r.id)} disabled={disabled} onChange={e=>change(e.target.checked?[...selected,r.id]:selected.filter(id=>id!==r.id))}/></td><td>{children(r)}</td></tr>)}{!rows.length&&<tr><td colSpan={2}>No hay resultados elegibles en esta página.</td></tr>}</tbody></table></div>
 {!!missing.length&&<p role="alert" className="validation-errors">Hay selecciones que ya no están disponibles. Se conserva el borrador; revisa la selección y los datos.<button type="button" onClick={()=>change(selected.filter(id=>!missing.includes(id)))}>Quitar selecciones no disponibles</button></p>}</div>
}
export function DocumentFields({draft,change,invoice=false}:{draft:Record<string,string>;change:(key:string,value:string)=>void;invoice?:boolean}){
 return <div className="billing-fields">{[['serie','Serie','text'],['correlativo','Correlativo','text'],...(invoice?[['fecha_emision','Fecha de emisión','date'],['fecha_vencimiento','Fecha de vencimiento','date']]:[['fecha','Fecha','date']]),[invoice?'importe':'monto',invoice?'Importe (S/)':'Monto manual (S/)','text']].map(([key,label,type])=><label key={key}>{label}<input required type={type} inputMode={key==='correlativo'?'numeric':['importe','monto'].includes(key)?'decimal':undefined} pattern={key==='serie'?'[a-zA-Z0-9]{1,20}':key==='correlativo'?'[0-9]{1,20}':undefined} maxLength={key==='serie'||key==='correlativo'?20:undefined} value={draft[key]??''} onChange={e=>change(key,e.target.value)}/></label>)}<label>Observación (opcional)<textarea maxLength={500} value={draft.observacion??''} onChange={e=>change('observacion',e.target.value)}/></label></div>
}
export function BillingForm({children,submit,busy,cancel,error,blocked=false,submitLabel='Confirmar registro'}:{children:ReactNode;submit:()=>void;busy:boolean;cancel:()=>void;error:string;blocked?:boolean;submitLabel?:string}){
 const ref=useRef<HTMLParagraphElement>(null)
 useEffect(()=>{if(error)ref.current?.focus()},[error])
 return <InlineForm onSubmit={submit}>{error&&<p ref={ref} tabIndex={-1} role="alert" className="validation-errors">{error}</p>}<fieldset disabled={busy}>{children}<div className="billing-actions"><button type="button" className="secondary" onClick={cancel}>Cancelar registro</button><button disabled={busy||blocked}>{busy?'Guardando…':submitLabel}</button></div></fieldset></InlineForm>
}
