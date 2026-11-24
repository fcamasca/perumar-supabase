import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../security/SessionProvider'
import { Pager, useRows } from './BillingUi'
import { reference, type Order, type Invoice } from './contracts'

export function EnrollmentBilling({enrollment,version,sponsor}:{enrollment:string;version:string;sponsor:string|null}){
 const {state}=useSession()
 if(state.phase!=='authorized'||!state.roles?.some(r=>['DIRECTOR_ACADEMICO','COORDINADOR_ACADEMICO'].includes(r)))return null
 return <Coverage key={(state.userId??'')+':'+enrollment} enrollment={enrollment} version={version} sponsor={sponsor}/>
}
function Coverage({enrollment,version,sponsor}:{enrollment:string;version:string;sponsor:string|null}){
 const {client}=useSession(),[page,setPage]=useState(0)
 type CoverageRow={orden_servicio_id:string;orden_servicio:Order&{factura_orden_servicio:{factura_patrocinador:Invoice}[]}}
 const list=useRows<CoverageRow>(useCallback(()=>client.from('orden_servicio_matricula').select('orden_servicio_id,orden_servicio(id,empresa_patrocinadora_id,serie,correlativo,factura_orden_servicio(factura_patrocinador(id,serie,correlativo)))').eq('matricula_id',enrollment).order('orden_servicio_id').range(page*30,page*30+29),[client,enrollment,version,page]))
 return <section aria-label="Facturación relacionada"><h4>Facturación del patrocinador</h4>{sponsor&&<Link to={'/empresas/'+sponsor+'/facturacion'}>Consultar facturación del patrocinador actual</Link>}<p>La cobertura comercial es histórica. Los importes compartidos no se asignan a esta matrícula ni se suman a sus cargos H4.</p>
 {list.loading&&<p role="status">Consultando cobertura…</p>}{list.error&&<p role="alert">{list.error}</p>}
 <ul>{list.rows.map(r=><li key={r.orden_servicio_id}>{r.orden_servicio&&<><Link to={'/empresas/'+r.orden_servicio.empresa_patrocinadora_id+'/facturacion?orden='+r.orden_servicio_id}>OS {reference(r.orden_servicio)} · cobertura histórica</Link><ul>{r.orden_servicio.factura_orden_servicio?.map(f=><li key={f.factura_patrocinador.id}><Link to={'/empresas/'+r.orden_servicio.empresa_patrocinadora_id+'/facturacion?factura='+f.factura_patrocinador.id}>Factura {reference(f.factura_patrocinador)}</Link></li>)}</ul></>}</li>)}</ul>
 {list.ready&&!list.rows.length&&<p>No hay órdenes relacionadas en esta página.</p>}<button type="button" className="secondary" disabled={list.loading} onClick={list.reload}>Actualizar cobertura comercial</button><Pager page={page} count={list.rows.length} disabled={list.loading} onChange={setPage}/></section>
}
