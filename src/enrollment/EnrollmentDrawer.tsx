import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function EnrollmentDrawer({title,busy,close,children}:{title:string;busy:boolean;close:()=>void;children:ReactNode}) {
 const panel=useRef<HTMLDialogElement>(null),titleId=useId()
 useEffect(()=>{
  const opener=document.activeElement instanceof HTMLElement?document.activeElement:null
  const dialog=panel.current
  dialog?.showModal()
  dialog?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
  return()=>{dialog?.close();if(opener?.isConnected)opener.focus()}
 },[])
 return createPortal(<dialog ref={panel} className="enrollment-drawer" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(!busy)close()}}><header className="enrollment-drawer-heading"><h2 id={titleId}>{title}</h2><button type="button" className="secondary" disabled={busy} onClick={close} aria-label="Cerrar panel de matrícula">Cerrar</button></header>{children}</dialog>,document.body)
}
