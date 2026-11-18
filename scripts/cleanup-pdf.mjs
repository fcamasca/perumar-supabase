import { createClient } from '@supabase/supabase-js'
import { localStatus } from './local-platform.mjs'
// Local operator command: derived objects only. Never SQL DELETE or business history.
const offset=Number(process.argv[2]??0)
if(process.argv.length>3||!Number.isSafeInteger(offset)||offset<0)throw new Error('Uso: npm run pdf:cleanup -- [offset de carpetas, entero >=0]')
const config=localStatus(),client=createClient(config.url,config.administrativeKey,{auth:{persistSession:false,autoRefreshToken:false}})
const bucket=client.storage.from('fichas-matricula'),uuid=/^[0-9a-f-]{36}$/i
const folders=await bucket.list('',{limit:20,offset,sortBy:{column:'name',order:'asc'}})
if(folders.error)throw new Error('No se pudo consultar Storage privado.')
let removed=0
for(const folder of folders.data){
  if(!uuid.test(folder.name)||folder.id)continue
  const files=await bucket.list(folder.name,{limit:100,sortBy:{column:'created_at',order:'asc'}})
  if(files.error)throw new Error('No se pudo consultar el lote privado.')
  const expired=files.data.filter(f=>/^[0-9a-f-]{36}\.pdf$/i.test(f.name)&&f.created_at&&Date.parse(f.created_at)+86400000<=Date.now()).map(f=>`${folder.name}/${f.name}`)
  if(expired.length){const result=await bucket.remove(expired);if(result.error)throw new Error('Limpieza parcial; revisar el lote privado.');removed+=expired.length}
}
console.log(JSON.stringify({derivedObjectsRemoved:removed,foldersScanned:folders.data.length,nextOffset:removed?0:folders.data.length===20?offset+20:null,note:'Tras eliminar, volver a offset 0 porque cambia el listado. La descarga ya rechaza la expiración lógica.'}))
