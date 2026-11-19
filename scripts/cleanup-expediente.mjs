import {createClient} from '@supabase/supabase-js'
import {localStatus} from './local-platform.mjs'
// Explicit local operator command, default DRY RUN. No scheduler or deletion of history.
if(process.argv.slice(2).some(x=>x!=='--execute')||process.argv.slice(2).length>1)throw Error('Uso: npm run expediente:cleanup -- [--execute]')
const execute=process.argv.includes('--execute'),config=localStatus()
const client=createClient(config.url,config.administrativeKey,{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false}})
const threshold=new Date(Date.now()-86400000).toISOString()
const batch=await client.from('matricula_documento_archivo').select('id,iniciado_por,estado_tecnico,iniciado_at').in('estado_tecnico',['PREPARADO','ABORTADO']).lt('iniciado_at',threshold).order('iniciado_at').order('id').limit(50)
if(batch.error)throw Error('No se pudo consultar el lote privado; no se eliminó ningún objeto.')
let removed=0,skipped=0
if(execute)for(const row of batch.data){
 const aborted=await client.rpc('abortar_reserva_expediente',{p_actor:row.iniciado_por,p_archivo_id:row.id})
 if(aborted.error){skipped++;continue}
 const r=aborted.data
 if(r.estado_tecnico!=='ABORTADO'||Date.parse(r.iniciado_at)>=Date.parse(threshold)||!new RegExp('^[a-f0-9-]{36}/[a-f0-9-]{36}$').test(r.object_key)){skipped++;continue}
 const current=await client.from('matricula_documento_archivo').select('estado_tecnico').eq('id',r.id).single()
 if(current.error||current.data.estado_tecnico!=='ABORTADO'){skipped++;continue}
 const result=await client.storage.from('h6-expediente').remove([r.object_key])
 if(result.error){skipped++;continue}removed++
}
console.log(JSON.stringify({mode:execute?'EXECUTE':'DRY RUN',candidates:batch.data.length,removed,skipped,limit:50,note:'Solo objetos nunca confirmados mayores de 24h. Metadatos e historia se conservan. Confirmados sin TTL ni purga. Revisar el siguiente lote manualmente.'}))
