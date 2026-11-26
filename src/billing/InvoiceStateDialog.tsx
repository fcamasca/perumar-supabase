import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { InlineForm } from '../academic/AcademicUi'

const labels:Record<string,string>={EMITIDA:'Emitida',REGISTRADA_PATROCINADOR:'Registrada en el sistema del patrocinador',APROBADA:'Aprobada',PENDIENTE_DESEMBOLSO:'Pendiente de desembolso'}
const dates:Record<string,string>={REGISTRADA_PATROCINADOR:'Fecha de registro en el patrocinador',APROBADA:'Fecha de aprobación',PENDIENTE_DESEMBOLSO:'Fecha en que quedó pendiente de desembolso'}

export function InvoiceStateDialog({current,next,date,min,busy,blocked,error,onDate,onSave,onClose}:{current:string;next:string;date:string;min:string;busy:boolean;blocked:boolean;error:string;onDate:(value:string)=>void;onSave:()=>void;onClose:()=>void}) {
 const panel=useRef<HTMLDivElement>(null), cancel=useRef<HTMLButtonElement>(null), id=useId(), close=useRef(onClose), inFlight=useRef(busy)
 close.current=onClose;inFlight.current=busy
 useEffect(()=>{
  const opener=document.activeElement instanceof HTMLElement?document.activeElement:null
  const background=Array.from(document.body.children).filter(e=>!e.contains(panel.current)) as HTMLElement[]
  const previous=background.map(e=>e.inert);background.forEach(e=>{e.inert=true})
  cancel.current?.focus()
  function key(e:KeyboardEvent){
   if(e.key==='Escape'){e.preventDefault();if(!inFlight.current)close.current();return}
   if(e.key==='Tab'){
    const fields=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')??[]).filter(el=>!el.closest('fieldset:disabled'))
    const first=fields[0],last=fields.at(-1)
    if(!first){e.preventDefault();panel.current?.focus()}
    else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
  }
  function focus(e:FocusEvent){if(!panel.current?.contains(e.target as Node))(cancel.current?.disabled?panel.current:cancel.current)?.focus()}
  document.addEventListener('keydown',key);document.addEventListener('focusin',focus)
  return()=>{document.removeEventListener('keydown',key);document.removeEventListener('focusin',focus);background.forEach((e,i)=>{e.inert=previous[i]});if(opener?.isConnected)opener.focus()}
 },[])
 return createPortal(<div className="dialog-backdrop"><div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className="confirm-dialog invoice-state-dialog">
  <h2 id={id}>Cambiar estado de la factura</h2>
  <dl className="review-fields"><div><dt>Estado actual</dt><dd>{labels[current]??current}</dd></div><div><dt>Siguiente estado</dt><dd>{labels[next]??next}</dd></div></dl>
  <InlineForm onSubmit={onSave}>
   {error&&<p role="alert" className="validation-errors">{error}</p>}
   <fieldset disabled={busy}><label>{dates[next]}<input required type="date" min={min} max={new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'})} value={date} onChange={e=>onDate(e.target.value)}/></label></fieldset>
   <p className="help-text">Indica la fecha en que ocurrió este cambio. El pago se registra por separado.</p>
   <div className="dialog-actions"><button ref={cancel} type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button disabled={busy||blocked}>{busy?'Guardando…':'Guardar cambio'}</button></div>
  </InlineForm>
 </div></div>,document.body)
}
