import { useEffect, useRef, useState } from 'react'
import { AcademicAction, AcademicPagination, AcademicSearch } from '../academic/AcademicLayout'
import { StatusBadge } from '../academic/AcademicUi'
import { useSession } from '../security/SessionProvider'
import { pen } from '../payments/money'
import type { Kind } from './BillingForms'
import { billingReportQuery, billingState, billingStateLabels, exportBillingCsv, reportStates, reportTitles, validateBillingRow, type BillingFilters, type BillingReportRow } from './reportData'
export function BillingReportList({company,kind,revision,open}:{company:string;kind:Kind;revision:number;open:(id:string)=>void}){
 const {client,state}=useSession(),[filters,setFilters]=useState({search:'',state:'',from:'',to:'',cycle:'',hideCancelled:kind==='invoice'}),[page,setPage]=useState(0),[reload,setReload]=useState(0)
 const [result,setResult]=useState<{key:string;rows:BillingReportRow[];count:number;error:string}>(),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('')
 const allowed=state.phase==='authorized'&&!!state.roles?.some(r=>['DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO'].includes(r))
 const exportFlight=useRef(false),exportAbort=useRef<AbortController|null>(null)
 const key=JSON.stringify([state.userId,company,kind,filters,page,revision,reload,allowed]),loading=allowed&&result?.key!==key
 const rows=result?.key===key?result.rows:[],count=result?.key===key?result.count:0,error=result?.key===key?result.error:''
 useEffect(()=>{
  const c=new AbortController();exportAbort.current?.abort();setExportError('')
  if(allowed)void(async()=>{try{
   const f:BillingFilters={...filters,company,kind},r=await billingReportQuery(client,f,page*30,30).abortSignal(c.signal)
   if(r.error||!Array.isArray(r.data)||typeof r.count!=='number')throw Error('read')
   const next=r.data as BillingReportRow[];next.forEach(row=>validateBillingRow(row,f))
   if(!c.signal.aborted)setResult({key,rows:next,count:r.count,error:''})
  }catch{if(!c.signal.aborted)setResult({key,rows:[],count:0,error:'No se pudo consultar el reporte. Revisa los filtros y vuelve a consultar.'})}})()
  return()=>{c.abort();exportAbort.current?.abort()}
 },[client,allowed,company,kind,filters,page,revision,reload,key])
 function change<K extends keyof typeof filters>(field:K,value:(typeof filters)[K]){exportAbort.current?.abort();setFilters(f=>({...f,[field]:value,...(field==='state'&&value==='ANULADA'?{hideCancelled:false}:{}),...(field==='hideCancelled'&&value===true&&f.state==='ANULADA'?{state:''}:{})}));setPage(0)}
 async function download(){
  if(!allowed||loading||error||exportFlight.current)return
  const c=new AbortController();exportAbort.current=c;exportFlight.current=true;setExporting(true);setExportError('')
  try{
   const csv=await exportBillingCsv(client,{...filters,company,kind},c.signal)
   if(c.signal.aborted)return
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a')
   a.href=url;a.download='perumar-'+kind+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }catch{if(!c.signal.aborted)setExportError('No se pudo exportar el reporte completo. No se descargó un archivo parcial.')}
  finally{exportFlight.current=false;if(!c.signal.aborted)setExporting(false)}
 }
 // Aborting an export must also release its disabled control in the next filter context.
 useEffect(()=>{setExporting(false)},[key])
 if(!allowed)return <p role="alert">Acceso no autorizado a los reportes.</p>
 return <>
 <div className="billing-report-filters">
  <AcademicSearch label={kind==='payment'?'Buscar referencia':'Buscar serie o correlativo'} value={filters.search} onChange={v=>change('search',v)} placeholder={kind==='payment'?'Referencia de operación':'Serie-correlativo'}/>
  <label>Estado<select value={filters.state} onChange={e=>change('state',e.target.value)}><option value="">Todos</option>{reportStates[kind].map(s=><option key={s} value={s}>{billingStateLabels[s]??s.replaceAll('_',' ')}</option>)}</select></label>
  <label>Desde<input type="date" value={filters.from} onChange={e=>change('from',e.target.value)}/></label><label>Hasta<input type="date" value={filters.to} onChange={e=>change('to',e.target.value)}/></label>
  <div className="billing-report-actions"><AcademicAction icon="refresh" label="Actualizar listado" disabled={loading} onClick={()=>setReload(n=>n+1)}/><AcademicAction icon="csv" label={exporting?'Exportando CSV…':'Exportar CSV'} disabled={loading||exporting||!!error} onClick={()=>void download()}/></div>
 </div>
 {kind==='invoice'&&<label className="billing-check"><input type="checkbox" checked={filters.hideCancelled} onChange={e=>change('hideCancelled',e.target.checked)}/>Ocultar anuladas</label>}
 <p className="help-text">{count} documentos coinciden con los filtros. El CSV incluye todos los resultados. Los totales del CSV excluyen documentos anulados.</p>
 {loading&&<p role="status">Consultando…</p>}{error&&<p role="alert">{error}</p>}{exportError&&<p role="alert">{exportError}</p>}
 {!loading&&!error&&<div className="table-scroll"><table aria-label={reportTitles[kind]}><thead><tr>{(kind==='order'?['Orden','Fecha','Ciclos','Monto','Estado']:kind==='invoice'?['Factura','Emisión','Estado','Importe','Abonado','Pendiente']:['Fecha efectiva','Banco','Referencia','Estado','Importe']).map(h=><th key={h} className={['Importe','Abonado','Pendiente'].includes(h) ? 'billing-report-money' : undefined}>{h}</th>)}<th>Acciones</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>
 {kind==='order'?<><td>{r.documento}</td><td>{r.fecha}</td><td>{[...new Set(r.ordenes.map(o=>o.ciclo))].join(', ')}</td><td>{pen(r.importe)}</td><td><StatusBadge value={r.estado}/></td></>:kind==='invoice'?<><td>{r.documento}</td><td>{r.fecha}</td><td>{billingState(r)}</td><td className="billing-report-money">{pen(r.importe)}</td><td className="billing-report-money">{pen(r.abonado??'')}</td><td className="billing-report-money"><strong>{pen(r.pendiente??'')}</strong></td></>:<><td>{r.fecha}</td><td>{r.banco}</td><td>{r.referencia||'—'}</td><td><StatusBadge value={r.estado}/></td><td className="billing-report-money">{pen(r.importe)}</td></>}
 <td><button type="button" className="secondary" aria-label={'Consultar '+(r.documento??'transferencia de '+r.fecha)} onClick={()=>open(r.id)}>Consultar</button></td></tr>)}{!rows.length&&<tr><td colSpan={kind==='invoice'?7:6}>No hay registros que coincidan con los filtros.</td></tr>}</tbody></table></div>}
 {!loading&&!error&&count>0&&<AcademicPagination page={page} count={rows.length} disabled={loading} onChange={setPage}/>}
 </>
}
