import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../security/SessionProvider'
import { DocumentDialog } from '../documents/EnrollmentDocuments'
import { ReportPdfPreview } from '../reports/ReportPdfPreview'
import { documentFileBlob } from '../documents/documentFileResponse'
import { Pager, useRows } from './BillingUi'

type Version={id:string;numero_version:number;confirmado_at:string;bytes:number}
const fields='id,orden_servicio_id,numero_version,confirmado_at,bytes'
const fileMessage=(code:string)=>code==='DOCUMENT_LIMIT'?'El PDF supera el máximo de 5 MiB. Reduce su tamaño y vuelve a adjuntarlo.':code==='DOCUMENT_FILE_INVALID'?'Archivo no admitido. Adjunta un PDF simple de hasta 20 páginas, sin cifrado, formularios ni contenido activo.':code==='DOCUMENT_ACCESS'||code==='DOCUMENT_SESSION'?'No tienes acceso vigente a este documento. Revisa tu sesión.':code==='DOCUMENT_STATE'||code==='DOCUMENT_VERSION'?'La orden cambió o fue anulada. Actualiza el documento antes de continuar.':code==='DOCUMENT_RESERVATION_EXISTS'?'Hay una carga pendiente de resolver. Consulta el documento; si continúa bloqueado, solicita la revisión al responsable del sistema.':'No se pudo completar la operación. Consulta el documento antes de volver a adjuntarlo; no se reintentó automáticamente.'
export function OrderDocuments({orderId,version,live}:{orderId:string;version:string;live:boolean}) {
 const {client}=useSession()
 const [uploadOpen,setUploadOpen]=useState(false),[history,setHistory]=useState(false),[page,setPage]=useState(0),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[preview,setPreview]=useState<Blob|null>(null)
 const flight=useRef(false),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const latest=useRows<Version>(useCallback(()=>client.from('orden_servicio_archivo').select(fields).eq('orden_servicio_id',orderId).eq('estado_tecnico','CONFIRMADO').order('numero_version',{ascending:false}).limit(1),[client,orderId,version]))
 const versions=useRows<Version>(useCallback(()=>history?client.from('orden_servicio_archivo').select(fields).eq('orden_servicio_id',orderId).eq('estado_tecnico','CONFIRMADO').order('numero_version',{ascending:false}).range(page*30,page*30+29):Promise.resolve({data:[],error:null}),[client,orderId,history,page]))
 async function invoke(name:string,body:FormData|Record<string,string>) {
  const r=await client.functions.invoke(name,{body})
  if(r.error) {
   let code='DOCUMENT_UNAVAILABLE'
   try {const payload=await r.error.context?.json();if(typeof payload?.code==='string')code=payload.code}catch{/* No unsafe server details shown. */}
   throw new Error(fileMessage(code))
  }
  return r
 }
 function refresh(){latest.reload();versions.reload();setStatus('');setError('')}
 async function upload() {
  if(flight.current||!file||!live||!latest.ready)return
  if(file.type!=='application/pdf'||!file.name.toLowerCase().endsWith('.pdf')){setError(fileMessage('DOCUMENT_FILE_INVALID'));return}
  if(!file.size||file.size>5242880){setError(fileMessage('DOCUMENT_LIMIT'));return}
  flight.current=true;setBusy(true);setError('');setStatus('Cargando y comprobando el PDF…')
  const form=new FormData();form.set('os_id',orderId);form.set('expected_updated_at',version);form.set('archivo',file)
  try {
   const r=await invoke('os-pdf-cargar',form)
   if(!r.data||typeof r.data.archivo_id!=='string')throw new Error(fileMessage('DOCUMENT_UNAVAILABLE'))
   if(alive.current){setUploadOpen(false);setFile(null);latest.reload();versions.reload();setStatus('PDF adjuntado correctamente. Las versiones anteriores se conservan.')}
  }catch(e){if(alive.current){setError(e instanceof Error?e.message:fileMessage('DOCUMENT_UNAVAILABLE'));setStatus('')}}
  finally{flight.current=false;if(alive.current)setBusy(false)}
 }
 async function download(v:Version,view:boolean) {
  if(flight.current)return
  flight.current=true;setBusy(true);setError('');setStatus('Consultando PDF…')
  try {
   const r=await invoke('os-pdf-descargar',{os_id:orderId,archivo_id:v.id})
   const blob=documentFileBlob(r.data,r.response)
   if(!alive.current)return
   if(view)setPreview(blob)
   else {const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='orden-servicio-v'+v.numero_version+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
   setStatus('')
  }catch(e){if(alive.current){setError(e instanceof Error?e.message:fileMessage('DOCUMENT_UNAVAILABLE'));setStatus('')}}
  finally{flight.current=false;if(alive.current)setBusy(false)}
 }
 const current=latest.rows[0]
 const alert=error&&<p role="alert" className="validation-errors">{error}</p>
 return <section className="os-document" aria-label="Documento de orden de servicio"><h4>Documento de orden de servicio</h4>
 {!uploadOpen&&!history&&alert}{status&&<p role="status">{status}</p>}
 {latest.loading&&<p role="status">Consultando documento…</p>}{latest.error&&<p role="alert">No se pudo consultar el documento adjunto.</p>}
 {latest.ready&&<>{current?<p>PDF adjunto · Versión {current.numero_version}</p>:<p>Sin documento adjunto.</p>}
 <div className="billing-actions">{current&&<><button type="button" className="secondary" disabled={busy} onClick={()=>void download(current,true)}>Ver PDF</button><button type="button" className="secondary" disabled={busy} onClick={()=>void download(current,false)}>Descargar</button></>}
 {live&&<button type="button" disabled={busy} onClick={()=>{setFile(null);setError('');setStatus('');setUploadOpen(true)}}>{current?'Reemplazar PDF':'Adjuntar PDF'}</button>}
 {current&&<button type="button" className="secondary" disabled={busy} onClick={()=>{setHistory(true);setPage(0);setError('')}}>Historial de versiones</button>}</div></>}
 <button type="button" className="secondary" disabled={busy||latest.loading} onClick={refresh}>Actualizar documento</button>
 {uploadOpen&&<DocumentDialog label={current?'Reemplazar PDF de la orden':'Adjuntar PDF a la orden'} busy={busy} close={()=>{if(!busy)setUploadOpen(false)}}><h2>{current?'Reemplazar PDF':'Adjuntar PDF'}</h2><p>La orden ya está registrada. Si la carga falla, se conservará el documento anterior.</p>{alert}{busy&&<p role="status">Cargando y comprobando el PDF…</p>}
 <form onSubmit={e=>{e.preventDefault();void upload()}}><label>Archivo PDF (máximo 5 MiB)<input type="file" accept="application/pdf,.pdf" required disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setError('')}}/></label><p className="help-text">Hasta 20 páginas. Sin cifrado, formularios, enlaces ni contenido activo.</p><div className="billing-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setUploadOpen(false)}>Cancelar</button><button disabled={busy||!file||!live}>{busy?'Cargando…':'Guardar PDF'}</button></div></form>
 {error&&<button type="button" className="secondary" disabled={busy} onClick={()=>{setUploadOpen(false);refresh()}}>Consultar documento de la orden</button>}</DocumentDialog>}
 {history&&!preview&&<DocumentDialog label="Historial de documentos de la orden" busy={busy} close={()=>{if(!busy)setHistory(false)}}><h2>Historial de versiones</h2>{alert}{versions.loading&&<p role="status">Consultando versiones…</p>}{versions.error&&<p role="alert">No se pudieron consultar las versiones.</p>}
 {versions.ready&&<div className="table-scroll"><table aria-label="Versiones del PDF"><thead><tr><th>Versión</th><th>Fecha de carga</th><th>Acciones</th></tr></thead><tbody>{versions.rows.map(v=><tr key={v.id}><td>{v.numero_version}{v.id===current?.id?' · Actual':''}</td><td>{new Date(v.confirmado_at).toLocaleString('es-PE',{timeZone:'America/Lima'})}</td><td><button type="button" className="secondary" disabled={busy} aria-label={'Ver PDF versión '+v.numero_version} onClick={()=>void download(v,true)}>Ver PDF</button><button type="button" className="secondary" disabled={busy} aria-label={'Descargar versión '+v.numero_version} onClick={()=>void download(v,false)}>Descargar</button></td></tr>)}</tbody></table></div>}
 {(page>0||versions.rows.length===30)&&<Pager page={page} count={versions.rows.length} disabled={busy||versions.loading} onChange={setPage}/>}<button type="button" className="secondary" disabled={busy} onClick={()=>setHistory(false)}>Cerrar historial</button></DocumentDialog>}
 {preview&&<ReportPdfPreview blob={preview} name="Orden de servicio" close={()=>setPreview(null)}/>}
 </section>
}
