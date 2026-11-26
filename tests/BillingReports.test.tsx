import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BillingReportList } from '../src/billing/BillingReportList'
import { billingCells, billingState, billingCsv, billingReportQuery, billingSummary, exportBillingCsv, type BillingFilters, type BillingReportRow } from '../src/billing/reportData'
const {client,state}=vi.hoisted(()=>({client:{from:vi.fn()},state:{phase:'authorized',userId:'director',roles:['DIRECTOR_ACADEMICO']}}))
vi.mock('../src/security/SessionProvider',()=>({useSession:()=>({client,state})}))
const f:BillingFilters={company:'company',kind:'invoice',search:'',state:'',from:'',to:'',cycle:''}
const row=(id='id'):BillingReportRow=>({id,tipo:'invoice',empresa_patrocinadora_id:'company',ruc:'20100047218',razon_social:'EMPRESA Ñ',documento:'F-1',fecha:'2026-01-01',estado:'PENDIENTE_DESEMBOLSO',estado_operativo:'PENDIENTE_DESEMBOLSO',estado_financiero:'PARCIAL',importe:'0.30',abonado:'0.10',pendiente:'0.20',vencimiento:'2026-02-01',banco:null,referencia:null,anulado:false,ciclo_ids:['c1'],ordenes:[{id:'o1',referencia:'OS-1',ciclo_id:'c1',ciclo:'2026-MA'},{id:'o2',referencia:'OS-2',ciclo_id:'c1',ciclo:'2026-MA'}],facturas:[{id,referencia:'F-1',aplicado:null}],beneficiarios:[{alumno_id:'a1',matricula_id:'m1',codigo_matricula:'M-1',ciclo_id:'c1',ciclo:'2026-MA',nombre:'MUÑOZ, ANA'}]})
let rows:BillingReportRow[],failAt:number,queries:number,duplicate:boolean,changeCount:boolean
const logs:{method:string;args:unknown[]}[]=[]
beforeEach(()=>{
 rows=[row()];failAt=-1;queries=0;duplicate=false;changeCount=false;logs.length=0;state.roles=['DIRECTOR_ACADEMICO'];state.userId='director'
 client.from.mockReset().mockImplementation(()=>{
  let start=0,end=29;const filters:((r:BillingReportRow)=>boolean)[]=[]
  const q={select:(...args:unknown[])=>{logs.push({method:'select',args});return q},eq:(key:keyof BillingReportRow,value:unknown)=>{logs.push({method:'eq',args:[key,value]});filters.push(r=>r[key]===value);return q},gte:(...args:unknown[])=>{logs.push({method:'gte',args});return q},lte:(...args:unknown[])=>{logs.push({method:'lte',args});return q},contains:(...args:unknown[])=>{logs.push({method:'contains',args});return q},ilike:(...args:unknown[])=>{logs.push({method:'ilike',args});return q},order:(...args:unknown[])=>{logs.push({method:'order',args});return q},range:(a:number,b:number)=>{start=a;end=b;logs.push({method:'range',args:[a,b]});return q},abortSignal:()=>q,then:(resolve:(v:unknown)=>void)=>{
   queries++;const selected=rows.filter(r=>filters.every(p=>p(r))),data=selected.slice(start,end+1)
   if(duplicate&&start===500&&data[0])data[0]=selected[0]
   return Promise.resolve({data:queries===failAt?null:data,error:queries===failAt?{code:'DENIED'}:null,count:changeCount&&queries>1?selected.length+1:selected.length}).then(resolve)
  }};return q
 })
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
it('keeps amount roots exact despite multiple orders/beneficiaries and globally deduplicates people versus enrollments',()=>{
 const one=row(),two=row('second');two.beneficiarios=[{...one.beneficiarios[0],matricula_id:'m2',ciclo_id:'c2',ciclo:'2026-MC'}]
 expect(billingSummary([one,two])).toEqual({importe:'0.60',abonado:'0.20',pendiente:'0.40',personas:1,matriculas:2})
 expect(billingCells(one)).toContain('OS-1; OS-2');expect(billingCells(one).filter(c=>c==='2026-MA')).toHaveLength(1)
 two.anulado=true;expect(billingSummary([one,two]).importe).toBe('0.30')
})
it.each(['=1+1',' \t@SUM(1,2)','\u200b+1','-1','\r\n=cmd'])('neutralizes formula prefix %j, preserves BOM/Unicode/quotes/newlines',value=>{
 const r=row();r.razon_social=value;r.beneficiarios[0].nombre='MUÑOZ, "ANA"\nPÉREZ'
 const csv=billingCsv([r],f);expect(csv.startsWith('\uFEFF')).toBe(true);expect(csv).toContain('"\''+value.replaceAll('"','""')+'"');expect(csv).toContain('MUÑOZ, ""ANA""\nPÉREZ');expect(csv.endsWith('\r\n')).toBe(true)
})
it('applies scope/date/state/Cycle/reference filters server-side with deterministic root ordering',()=>{
 billingReportQuery(client as never,{...f,search:'F_%*',state:'APROBADA',from:'2026-01-01',to:'2026-02-01',cycle:'2026-MA'},30,30)
 expect(logs).toEqual(expect.arrayContaining([{method:'eq',args:['empresa_patrocinadora_id','company']},{method:'eq',args:['tipo','invoice']},{method:'eq',args:['estado_operativo','APROBADA']},{method:'contains',args:['ciclo_codigos',['2026-MA']]},{method:'gte',args:['fecha','2026-01-01']},{method:'lte',args:['fecha','2026-02-01']},{method:'range',args:[30,59]}]))
 expect(logs.filter(l=>l.method==='order').map(l=>l.args)).toEqual([['fecha',{ascending:false}],['id',{ascending:false}]])
 expect(logs.find(l=>l.method==='ilike')?.args).toEqual(['documento','%F\\_\\%\\*%'])
})
it('exports all filtered pages, uses the ordinary client throughout and rechecks access/count before returning bytes',async()=>{
 rows=Array.from({length:501},(_,i)=>row(String(i)))
 const csv=await exportBillingCsv(client as never,f,new AbortController().signal)
 expect(queries).toBe(3);expect(csv.split('\r\n')).toHaveLength(504)
 expect(logs.filter(l=>l.method==='range').map(l=>l.args)).toEqual([[0,499],[500,999],[0,0]])
 expect(csv).toContain('150.30');expect(csv).toContain('50.10');expect(csv).toContain('100.20')
})
it.each(['failure','duplicate','changed-count','revoked-final'])('returns no partial CSV on %s',async(kind)=>{
 rows=Array.from({length:501},(_,i)=>row(String(i)));failAt=kind==='failure'?2:kind==='revoked-final'?3:-1;duplicate=kind==='duplicate';changeCount=kind==='changed-count'
 await expect(exportBillingCsv(client as never,f,new AbortController().signal)).rejects.toThrow()
})
it('does not read or export after cancellation',async()=>{const c=new AbortController();c.abort();await expect(exportBillingCsv(client as never,f,c.signal)).rejects.toThrow();expect(client.from).not.toHaveBeenCalled()})
it.each(['balance','application','foreign-company','wrong-kind'])('rejects inconsistent %s data before export',kind=>{
 const r=row();if(kind==='balance')r.pendiente='0.21';if(kind==='application'){r.tipo='payment';r.facturas=[{id:'f',referencia:'F-1',aplicado:'0.20'}]};if(kind==='foreign-company')r.empresa_patrocinadora_id='other';if(kind==='wrong-kind')r.tipo='order'
 expect(()=>billingCsv([r],kind==='application'?{...f,kind:'payment'}:f)).toThrow()
})
it.each([{from:'2026-02-30'}, {from:'2026-02-02',to:'2026-01-01'}, {state:'FORGED'}])('rejects invalid filters without querying %j',filters=>{expect(()=>billingReportQuery(client as never,{...f,...filters},0,30)).toThrow();expect(client.from).not.toHaveBeenCalled()})
it('ADMIN alone cannot query or export',()=>{state.roles=['ADMIN_SISTEMA'];render(<BillingReportList company="company" kind="invoice" revision={0} open={vi.fn()}/>);expect(screen.getByRole('alert')).toHaveTextContent('Acceso no autorizado');expect(client.from).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Exportar CSV'})).not.toBeInTheDocument()})
it('renders existing table/filter controls and exports via CSV only without altering financial data',async()=>{
 const url=vi.fn().mockReturnValue('blob:synthetic'),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
 vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:url,revokeObjectURL:vi.fn()}))
 render(<BillingReportList company="company" kind="invoice" revision={0} open={vi.fn()}/>)
 await screen.findByRole('table',{name:'Facturas del patrocinador'});expect(screen.getByText('0.30',{exact:false})).toBeVisible()
 fireEvent.click(screen.getByRole('button',{name:'Exportar CSV'}));await waitFor(()=>expect(click).toHaveBeenCalledTimes(1));expect(url).toHaveBeenCalledTimes(1)
 expect(screen.queryByRole('button',{name:/PDF/})).not.toBeInTheDocument()
})
it('does not create a download if a page fails',async()=>{
 const url=vi.fn();vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:url,revokeObjectURL:vi.fn()}))
 render(<BillingReportList company="company" kind="invoice" revision={0} open={vi.fn()}/>)
 await screen.findByRole('table',{name:'Facturas del patrocinador'});failAt=2
 fireEvent.click(screen.getByRole('button',{name:'Exportar CSV'}));expect(await screen.findByRole('alert')).toHaveTextContent('No se descargó un archivo parcial');expect(url).not.toHaveBeenCalled()
})
it('clears stale grid rows during a filter change and resets to first page',async()=>{
 render(<BillingReportList company="company" kind="invoice" revision={0} open={vi.fn()}/>);await screen.findByRole('table')
 fireEvent.change(screen.getByLabelText('Estado'),{target:{value:'APROBADA'}})
 await waitFor(()=>expect(screen.queryByText('F-1')).not.toBeInTheDocument());expect(screen.getByText('No hay registros que coincidan con los filtros.')).toBeVisible()
})
it('aborts export on unmount before releasing a download',async()=>{
 const url=vi.fn();vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:url,revokeObjectURL:vi.fn()}))
 const {unmount}=render(<BillingReportList company="company" kind="invoice" revision={0} open={vi.fn()}/>);await screen.findByRole('table')
 let done:()=>void=()=>{};client.from.mockImplementation(()=>{const q={select:()=>q,eq:()=>q,order:()=>q,range:()=>q,abortSignal:()=>q,then:(r:(v:unknown)=>void)=>new Promise<void>(resolve=>{done=()=>{r({data:rows,count:1,error:null});resolve()}})};return q})
 fireEvent.click(screen.getByRole('button',{name:'Exportar CSV'}));unmount();await act(async()=>done());expect(url).not.toHaveBeenCalled()
})

it('presents one invoice state with cancellation and confirmed payments taking precedence over workflow',()=>{
 const r=row();expect(billingState(r)).toBe('Pago parcial');r.estado_financiero='DESEMBOLSADA';expect(billingState(r)).toBe('Pagada');r.anulado=true;expect(billingState(r)).toBe('Anulada');r.anulado=false;r.estado_financiero='SIN_DESEMBOLSO';expect(billingState(r)).toBe('Pendiente de desembolso')
})
it.each([['PAGADA','DESEMBOLSADA'],['PAGO_PARCIAL','PARCIAL']])('filters %s by derived financial state without selecting annulled roots', (state,financial)=>{
 billingReportQuery(client as never,{...f,state},0,30);expect(logs).toContainEqual({method:'eq',args:['anulado',false]});expect(logs).toContainEqual({method:'eq',args:['estado_financiero',financial]});expect(logs).not.toContainEqual({method:'eq',args:['estado',state]})
})
it('hides annulled invoices by default, allows showing them and offers only one visible state',async()=>{
 const annulled=row('annulled');annulled.documento='F-ANULADA';annulled.anulado=true;annulled.estado='ANULADA';rows.push(annulled)
 render(<BillingReportList company="company" kind="invoice" revision={0} open={vi.fn()}/>);await screen.findByRole('table')
 expect(screen.getByRole('checkbox',{name:'Ocultar anuladas'})).toBeChecked();expect(screen.queryByText('F-ANULADA')).not.toBeInTheDocument();expect(screen.queryByRole('columnheader',{name:'Estado financiero'})).not.toBeInTheDocument();expect(screen.getByRole('columnheader',{name:/^Estado$/})).toBeInTheDocument()
 fireEvent.click(screen.getByRole('checkbox',{name:'Ocultar anuladas'}));expect(await screen.findByText('F-ANULADA')).toBeVisible()
 fireEvent.change(screen.getByLabelText('Estado'),{target:{value:'ANULADA'}});await screen.findByText('F-ANULADA');expect(screen.getByRole('checkbox',{name:'Ocultar anuladas'})).not.toBeChecked()
 fireEvent.click(screen.getByRole('checkbox',{name:'Ocultar anuladas'}));await screen.findByText('F-1');expect(screen.getByLabelText('Estado')).toHaveValue('');expect(screen.queryByText('F-ANULADA')).not.toBeInTheDocument()
})
it('applies hide annulled filter to every CSV page and final access check',async()=>{
 const annulled=row('annulled');annulled.anulado=true;rows.push(annulled)
 const csv=await exportBillingCsv(client as never,{...f,hideCancelled:true},new AbortController().signal)
 expect(logs.filter(l=>l.method==='eq'&&l.args[0]==='anulado')).toHaveLength(2)
 expect(csv.split('\r\n')).toHaveLength(4)
})
