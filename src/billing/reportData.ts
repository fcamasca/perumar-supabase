import type { SupabaseClient } from '@supabase/supabase-js'
import { csvCell } from '../reports/reportData'
import { cents, decimal } from '../payments/money'
import type { Kind } from './BillingForms'
export type Beneficiary={alumno_id:string;matricula_id:string;codigo_matricula:string;ciclo_id:string;ciclo:string;nombre:string}
export type BillingReportRow={id:string;tipo:Kind;empresa_patrocinadora_id:string;ruc:string;razon_social:string;documento:string|null;fecha:string;estado:string;estado_operativo:string;estado_financiero:string|null;importe:string;abonado:string|null;pendiente:string|null;vencimiento:string|null;banco:string|null;referencia:string|null;anulado:boolean;ciclo_ids:string[];ordenes:{id:string;referencia:string;ciclo_id:string;ciclo:string}[];facturas:{id:string;referencia:string;aplicado:string|null}[];beneficiarios:Beneficiary[]}
export type BillingFilters={company:string;kind:Kind;search:string;state:string;from:string;to:string;cycle:string;hideCancelled?:boolean}
export const reportTitles={order:'Órdenes de servicio',invoice:'Facturas del patrocinador',payment:'Transferencias del patrocinador'}
export const reportStates={order:['VIGENTE','ANULADA'],invoice:['EMITIDA','REGISTRADA_PATROCINADOR','APROBADA','PENDIENTE_DESEMBOLSO','PAGO_PARCIAL','PAGADA','ANULADA'],payment:['CONFIRMADO','ANULADO']}
export const billingStateLabels:Record<string,string>={EMITIDA:'Emitida',REGISTRADA_PATROCINADOR:'Registrada en patrocinador',APROBADA:'Aprobada',PENDIENTE_DESEMBOLSO:'Pendiente de desembolso',PAGO_PARCIAL:'Pago parcial',PAGADA:'Pagada',ANULADA:'Anulada',ANULADO:'Anulada',VIGENTE:'Vigente',CONFIRMADO:'Confirmado'}
export function billingState(r:BillingReportRow):string {
 if(r.anulado)return 'Anulada'
 if(r.tipo==='invoice'){
  if(r.estado_financiero==='DESEMBOLSADA')return 'Pagada'
  if(r.estado_financiero==='PARCIAL')return 'Pago parcial'
 }
 return billingStateLabels[r.estado]??r.estado.replaceAll('_',' ')
}
const columns='id,tipo,empresa_patrocinadora_id,ruc,razon_social,documento,fecha,estado,estado_operativo,estado_financiero,importe::text,abonado::text,pendiente::text,vencimiento,banco,referencia,anulado,ciclo_ids,ordenes,facturas,beneficiarios'
export function billingReportQuery(client:SupabaseClient,f:BillingFilters,offset:number,size:number){
 if(!(f.kind in reportTitles)||!f.company||!Number.isInteger(offset)||offset<0||!Number.isInteger(size)||size<1||size>500)throw Error('Filtros inválidos')
 if(f.state&&!reportStates[f.kind].includes(f.state))throw Error('Estado inválido')
 for(const date of [f.from,f.to])if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw Error('Fecha inválida')
 if(f.from&&f.to&&f.from>f.to)throw Error('Revisa el intervalo de fechas')
 if(f.cycle&&!/^[A-Z0-9-]{1,50}$/i.test(f.cycle.trim()))throw Error('Código de Ciclo inválido')
 let q=client.from('facturacion_reporte').select(columns,{count:'exact'}).eq('empresa_patrocinadora_id',f.company).eq('tipo',f.kind)
 if(f.hideCancelled)q=q.eq('anulado',false)
 if(f.state){
  if(f.kind!=='invoice'||f.state==='ANULADA')q=q.eq('estado',f.state)
  else if(f.state==='PAGADA'||f.state==='PAGO_PARCIAL')q=q.eq('anulado',false).eq('estado_financiero',f.state==='PAGADA'?'DESEMBOLSADA':'PARCIAL')
  else q=q.eq('anulado',false).eq('estado_operativo',f.state).eq('estado_financiero','SIN_DESEMBOLSO')
 }
 if(f.from)q=q.gte('fecha',f.from)
 if(f.to)q=q.lte('fecha',f.to)
 if(f.cycle)q=q.contains('ciclo_codigos',[f.cycle.trim().toUpperCase()])
 const search=f.search.trim();if(search.length>100)throw Error('Búsqueda demasiado extensa')
 if(search)q=q.ilike(f.kind==='payment'?'referencia':'documento','%'+search.replace(/[\\%_*]/g,'\\$&')+'%')
 return q.order('fecha',{ascending:false}).order('id',{ascending:false}).range(offset,offset+size-1)
}
function amount(text:string|null):bigint {if(text===null)return 0n;const value=cents(text);if(value===null)throw Error('Importe inválido');return value}
export function validateBillingRow(r:BillingReportRow,f:BillingFilters){
 if(!r||typeof r.id!=='string'||r.tipo!==f.kind||r.empresa_patrocinadora_id!==f.company||!Array.isArray(r.ordenes)||!Array.isArray(r.facturas)||!Array.isArray(r.beneficiarios)||!Array.isArray(r.ciclo_ids)||typeof r.anulado!=='boolean')throw Error('Respuesta incompleta')
 if(typeof r.importe!=='string')throw Error('Importe incompleto');const total=amount(r.importe)
 if(r.tipo==='invoice'&&(r.abonado===null||r.pendiente===null||amount(r.abonado)+amount(r.pendiente)!==total))throw Error('Saldo inconsistente')
 if(r.tipo==='payment'&&r.facturas.reduce((n,a)=>n+amount(a.aplicado),0n)!==total)throw Error('Aplicaciones inconsistentes')
 for(const b of r.beneficiarios)if(!b.alumno_id||!b.matricula_id||!b.ciclo_id||typeof b.nombre!=='string')throw Error('Beneficiarios incompletos')
}
const common=['RUC','Empresa']
export const billingHeaders=(kind:Kind)=>[...common,...(kind==='order'?['Orden','Fecha','Estado','Monto']:kind==='invoice'?['Factura','Emisión','Vencimiento','Estado','Importe','Abonado','Pendiente']:['Fecha efectiva','Banco','Referencia','Estado','Importe','Facturas y aplicaciones']), 'Ciclos','Órdenes de servicio','Beneficiarios (identificación al matricular)','Personas únicas','Matrículas únicas']
export function billingCells(r:BillingReportRow):string[]{
 const beneficiaries=[...new Map(r.beneficiarios.map(b=>[b.matricula_id+':'+b.ciclo_id,b])).values()]
 return [r.ruc,r.razon_social,...(r.tipo==='order'?[r.documento??'',r.fecha,r.estado,r.importe]:r.tipo==='invoice'?[r.documento??'',r.fecha,r.vencimiento??'',billingState(r),r.importe,r.abonado??'',r.pendiente??'']:[r.fecha,r.banco??'',r.referencia??'',r.estado,r.importe,r.facturas.map(a=>a.referencia+' / S/ '+a.aplicado).join('; ')]),[...new Set(r.ordenes.map(o=>o.ciclo))].join('; '),r.ordenes.map(o=>o.referencia).join('; '),beneficiaries.map(b=>b.nombre+' · '+b.codigo_matricula+' · '+b.ciclo).join('; '),String(new Set(beneficiaries.map(b=>b.alumno_id)).size),String(new Set(beneficiaries.map(b=>b.matricula_id)).size)]
}
export function billingSummary(rows:BillingReportRow[]){
 const live=rows.filter(r=>!r.anulado)
 return {importe:decimal(live.reduce((n,r)=>n+amount(r.importe),0n)),abonado:decimal(live.reduce((n,r)=>n+amount(r.abonado),0n)),pendiente:decimal(live.reduce((n,r)=>n+amount(r.pendiente),0n)),personas:new Set(rows.flatMap(r=>r.beneficiarios.map(b=>b.alumno_id))).size,matriculas:new Set(rows.flatMap(r=>r.beneficiarios.map(b=>b.matricula_id))).size}
}
export function billingCsv(rows:BillingReportRow[],f:BillingFilters){
 rows.forEach(r=>validateBillingRow(r,f));const headers=billingHeaders(f.kind),total=billingSummary(rows),footer=Array<string>(headers.length).fill('')
 footer[0]='TOTALES: importes no anulados; personas y matrículas de todos los resultados';footer[headers.indexOf(f.kind==='order'?'Monto':'Importe')]=total.importe
 if(f.kind==='invoice'){footer[headers.indexOf('Abonado')]=total.abonado;footer[headers.indexOf('Pendiente')]=total.pendiente}
 footer[headers.indexOf('Personas únicas')]=String(total.personas);footer[headers.indexOf('Matrículas únicas')]=String(total.matriculas)
 return '\uFEFF'+[headers,...rows.map(billingCells),footer].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'
}
export async function exportBillingCsv(client:SupabaseClient,f:BillingFilters,signal:AbortSignal){
 const rows:BillingReportRow[]=[],seen=new Set<string>();let expected:number|undefined
 for(let offset=0;;offset+=500){
  if(signal.aborted)throw Error('Cancelado')
  const r=await billingReportQuery(client,f,offset,500).abortSignal(signal)
  if(r.error||signal.aborted||!Array.isArray(r.data)||typeof r.count!=='number'||(expected!==undefined&&expected!==r.count))throw Error('No se pudo completar la exportación')
  expected=r.count
  for(const row of r.data as BillingReportRow[]){validateBillingRow(row,f);if(seen.has(row.id))throw Error('El conjunto cambió');seen.add(row.id);rows.push(row)}
  if(rows.length>expected)throw Error('El conjunto cambió')
  if(r.data.length<500)break
 }
 if(rows.length!==expected||signal.aborted)throw Error('Exportación incompleta')
 // Ordinary JWT/RLS is re-evaluated once more before releasing any bytes.
 const final=await billingReportQuery(client,f,0,1).abortSignal(signal)
 if(final.error||final.count!==expected||signal.aborted)throw Error('El conjunto cambió')
 return billingCsv(rows,f)
}
