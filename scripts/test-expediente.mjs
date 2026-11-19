import assert from 'node:assert/strict'
import {randomUUID,createHash} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {PDFDocument,PDFName,PDFDict} from 'pdf-lib'
import {PNG} from 'pngjs'
import jpeg from 'jpeg-js'
import {createFixtures,publicClient,checked} from './h2-fixtures.mjs'
import {inspectDatabase,assertSecurityInventory,securityInventory} from './local-platform.mjs'
if(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true')throw Error('H6 real Auth/Storage probes require the disposable CI stack, never the human database.')
let fixture;const documentIds=[]
try{
 fixture=await createFixtures();assertSecurityInventory(securityInventory())
 const clients={},tokens={}
 for(const [actor,e] of Object.entries(fixture.entries)){const c=publicClient(fixture.config);checked(await c.auth.signInWithPassword({email:e.email,password:e.password}),'H6 fixture login');clients[actor]=c;tokens[actor]=(await c.auth.getSession()).data.session.access_token}
 const {D,O}=clients,tag=randomUUID().slice(0,8).toUpperCase(),rpc=async(c,n,p)=>checked(await c.rpc(n,p),n)
 const rows=async table=>checked(await D.from(table).select('*'),table),one=async(table,id)=>checked(await D.from(table).select('*').eq('id',id).single(),table)
 const cats=await rows('catalogo'),values=await rows('catalogo_valor'),value=(c,v)=>values.find(x=>x.catalogo_id===cats.find(k=>k.codigo===c).id&&x.codigo===v).id
 const district=(await rows('distrito'))[0],province=await one('provincia',district.provincia_id),geo={departamento_id:province.departamento_id,provincia_id:province.id,distrito_id:district.id}
 const subject=await rpc(D,'guardar_materia',{p:{nombre:'H6 ASIGNATURA '+tag}}),course=await rpc(D,'guardar_carrera',{p:{nombre:'H6 CURSO '+tag,sigla:'E'+tag},materias:[subject.id]})
 let cycle=await rpc(D,'guardar_ciclo',{p:{...geo,carrera_id:course.id,capitania_id:(await rows('capitania'))[0].id,fecha_inicio:'2048-01-01',fecha_fin:'2048-02-01'}})
 const tariff=await rpc(D,'guardar_tarifa',{p:{codigo:'DOC'+tag,nombre:'H6 SINTETICO',tipo:'CARRERA',monto_por_defecto:'100'}})
 cycle=await rpc(D,'guardar_ciclo_tarifas',{ciclo_id:cycle.id,expected_updated_at:cycle.updated_at,configuracion:[{tarifa_id:tariff.id,importe:'100',obligatorio:'true'}]})
 const initial={apellido_paterno:'MUÑOZ',apellido_materno:'QUIÑONES',nombres:'ÁNGELA',tipo_di_id:value('TIPO_DI','CARNET_EXTRANJERIA'),numero_di:randomUUID().replaceAll('-','').slice(0,30),fecha_nacimiento:'2000-01-01',sexo_id:value('SEXO','F'),celular:'999111222',domicilio:'H6 SINTÉTICO',...Object.fromEntries(Object.entries(geo).map(([k,v])=>['nacimiento_'+k,v])),...Object.fromEntries(Object.entries(geo).map(([k,v])=>['domicilio_'+k,v])),contactos:[{apellido:'CONTACTO',nombre:'SINTÉTICO',parentesco_id:value('PARENTESCO','PADRE'),celular:'999111222'}]}
 let student=await rpc(O,'guardar_alumno',{p:initial})
 const types=await rows('tipo_documento'),config=types.filter(t=>t.activo).map(t=>({tipo_documento_id:t.id,activo:'true',obligatorio:t.codigo==='DOCUMENTO_IDENTIDAD'?'true':'false'}))
 await rpc(O,'guardar_documentos_ciclo',{p_ciclo_id:cycle.id,p_expected_updated_at:cycle.updated_at,p_expected_config:[],p_documentos:config})
 let enrollment=await rpc(O,'registrar_matricula',{p:{alumno_id:student.id,expected_alumno_updated_at:student.updated_at,ciclo_id:cycle.id,expected_ciclo_updated_at:cycle.updated_at}})
 const docs=async()=>checked(await D.from('matricula_documento').select('*').eq('matricula_id',enrollment.id).eq('contexto_vigente',true),'H6 applications'),doc=async code=>(await docs()).find(d=>d.codigo===code)
 documentIds.push(...(await docs()).map(d=>d.id));assert.equal(documentIds.length,types.filter(t=>t.activo).length);assert.ok((await docs()).every(d=>d.activo&&d.estado==='PENDIENTE'))
 const invoke=(kind,payload,actor='D',origin)=>fetch(fixture.config.url+'/functions/v1/expediente-'+kind,{method:'POST',headers:{apikey:fixture.config.key,...(actor?{Authorization:'Bearer '+tokens[actor]}:{}),...(payload instanceof FormData?{}:{'Content-Type':'application/json'}),...(origin?{Origin:origin}:{})},body:payload instanceof FormData?payload:JSON.stringify(payload)})
 const input=async code=>{const d=await doc(code);return {documento_id:d.id,expected_updated_at:d.updated_at,datos_generacion:code==='CARTA_PODER'?{apoderado_nombre:'APODERADO SINTÉTICO',apoderado_tipo_di_id:value('TIPO_DI','DNI'),apoderado_numero_di:'00000001'}:{}}}
 const versions=async id=>checked(await D.from('matricula_documento_archivo').select('*').eq('matricula_documento_id',id).order('iniciado_at'),'H6 versions')
 const download=(d,id,historico=false,actor='D')=>invoke('descargar',{documento_id:d.id,archivo_id:id,historico},actor)
 const pdf=await PDFDocument.create();pdf.addPage();const safePdf=await pdf.save({useObjectStreams:false})
 const png=PNG.sync.write(Object.assign(new PNG({width:1,height:1}),{data:Buffer.from([255,0,0,255])})),jpg=jpeg.encode({width:1,height:1,data:Buffer.from([255,0,0,255])}).data
 const upload=async(code,bytes,mime,name,actor='D')=>{const d=await doc(code),f=new FormData();f.set('documento_id',d.id);f.set('expected_updated_at',d.updated_at);f.set('archivo',new Blob([bytes],{type:mime}),name);return invoke('cargar',f,actor)}
 for(const actor of ['A','B','N','F','I'])assert.equal((await invoke('generar',await input('SOLICITUD'),actor)).status,403)
 assert.equal((await invoke('generar',await input('SOLICITUD'),null)).status,401)
 assert.equal((await invoke('generar',await input('SOLICITUD'),'D','https://evil.invalid')).status,403)
 for(const key of ['actor','object_key','bucket','hash','url','sql','plantilla','service_role'])assert.equal((await invoke('generar',{...await input('SOLICITUD'),[key]:'FORGED'})).status,422)
 assert.equal((await invoke('generar',{...await input('SOLICITUD'),documento_id:randomUUID()})).status,403)
 for(const [code,bytes,mime,name] of [['DOCUMENTO_IDENTIDAD',safePdf,'application/pdf','documento.pdf'],['FOTO_PASAPORTE',png,'image/png','foto.png'],['FOTO_PASAPORTE',jpg,'image/jpeg','foto.jpg']]){const r=await upload(code,bytes,mime,name,'O');assert.equal(r.status,200,'real '+mime+' upload/decoder');const result=await r.json();assert.equal(result.estado_tecnico,'CONFIRMADO');const d=await doc(code),dl=await download(d,result.archivo_id);assert.equal(dl.status,200);assert.equal(dl.headers.get('cache-control'),'private, no-store');assert.equal(dl.headers.get('x-content-type-options'),'nosniff');assert.equal(createHash('sha256').update(Buffer.from(await dl.arrayBuffer())).digest('hex'),createHash('sha256').update(bytes).digest('hex'))}
 const bad=await PDFDocument.create();bad.addPage();bad.catalog.set(PDFName.of('OpenAction'),PDFDict.withContext(bad.context))
 const beforeInvalid=(await versions((await doc('FOTO_PASAPORTE')).id)).length
 for(const [bytes,mime,name] of [[safePdf,'application/pdf','foto.pdf'],[png,'image/jpeg','foto.jpg'],[png,'image/png','foto.exe.png'],[new Uint8Array(5242881),'image/png','foto.png'],[await bad.save({useObjectStreams:false}),'application/pdf','foto.pdf']])assert.ok([413,422].includes((await upload('FOTO_PASAPORTE',bytes,mime,name)).status))
 assert.equal((await versions((await doc('FOTO_PASAPORTE')).id)).length,beforeInvalid,'invalid content creates no reservation')
 // Real post-upload audit failure rolls back confirmation and compensates NEVER-confirmed bytes.
 const target=await doc('DOCUMENTO_IDENTIDAD'),priorPointer=target.ultimo_archivo_confirmado_id
 inspectDatabase("create function private.h6_test_failure() returns trigger language plpgsql set search_path='' as $$begin raise exception using errcode='P0001',message='H6_SYNTHETIC_CONFIRM_FAILURE';end$$; revoke all on function private.h6_test_failure() from public,anon,authenticated; create trigger z_h6_test_failure before insert on public.auditoria for each row when(new.entidad='matricula_documento_archivo' and new.new_values->>'estado_tecnico'='CONFIRMADO') execute function private.h6_test_failure();")
 try{assert.equal((await upload('DOCUMENTO_IDENTIDAD',safePdf,'application/pdf','documento.pdf')).status,503)}finally{inspectDatabase('drop trigger z_h6_test_failure on public.auditoria;drop function private.h6_test_failure();')}
 assert.equal((await doc('DOCUMENTO_IDENTIDAD')).ultimo_archivo_confirmado_id,priorPointer)
 const failed=(await versions(target.id)).at(-1);assert.equal(failed.estado_tecnico,'ABORTADO');assert.ok((await fixture.admin.storage.from('h6-expediente').download(failed.object_key)).error)
 mkdirSync('.cache/h6-results',{recursive:true});const metrics=[]
 for(const code of ['SOLICITUD','DECLARACION_JURADA','CARTA_PODER','FICHA_DATOS_PERSONALES','FICHA_MATRICULA']){
  const start=performance.now(),r=await invoke('generar',await input(code),'O');assert.equal(r.status,200,'real fixed renderer '+code);const manifest=await r.json(),d=await doc(code);assert.equal(d.estado,'GENERADO')
  const dl=await download(d,manifest.archivo_id);assert.equal(dl.status,200);const bytes=Buffer.from(await dl.arrayBuffer());assert.equal((await PDFDocument.load(bytes)).getPageCount()>0,true);writeFileSync('.cache/h6-results/'+code+'.pdf',bytes);metrics.push({code,ms:performance.now()-start,pdfBytes:bytes.length})
 }
 // Explicit concurrent generations for the same version: at most one confirmed new version, no retry.
 const request=await input('SOLICITUD'),prior=(await versions(request.documento_id)).length,pair=await Promise.all([invoke('generar',request),invoke('generar',request)])
 assert.deepEqual(pair.map(r=>r.status).sort(),[200,409]);const afterPair=await versions(request.documento_id);assert.equal(afterPair.length,prior+1)
 const current=await doc('SOLICITUD'),latest=current.ultimo_archivo_confirmado_id
 student=await rpc(O,'guardar_alumno',{p:{...initial,id:student.id,expected_updated_at:student.updated_at,domicilio:'H6 CORREGIDO'}})
 assert.equal((await download(current,latest)).status,409);assert.equal((await download(current,latest,true)).status,200,'stale persistent file is explicit history, not erased')
 // Private Storage is unavailable to every browser/JWT, including authorized academics.
 const key=(await versions(target.id)).find(f=>f.estado_tecnico==='CONFIRMADO').object_key
 for(const c of [D,O,clients.A,publicClient(fixture.config)]){assert.ok((await c.storage.from('h6-expediente').download(key)).error);assert.ok((await c.storage.from('h6-expediente').createSignedUrl(key,60)).error);assert.ok((await c.storage.from('h6-expediente').upload(key,new Blob([png]),{contentType:'image/png'})).error);const list=await c.storage.from('h6-expediente').list(target.id);assert.ok(list.error||list.data.length===0);assert.ok((await c.rpc('abortar_reserva_expediente',{p_actor:fixture.entries.D.id,p_archivo_id:latest})).error)}
 const historyBefore=await versions(target.id)
 enrollment=await rpc(D,'anular_matricula',{id:enrollment.id,expected_updated_at:enrollment.updated_at,motivo:'H6 SINTÉTICO'})
 assert.equal((await upload('DOCUMENTO_IDENTIDAD',safePdf,'application/pdf','documento.pdf')).status,409)
 assert.equal((await download(target,priorPointer)).status,409);assert.equal((await download(target,priorPointer,true,'O')).status,200)
 assert.deepEqual(await versions(target.id),historyBefore,'annulment preserves every file version')
 checked(await fixture.admin.from('app_user_roles').delete().eq('user_id',fixture.entries.O.id),'revoke H6 synthetic role')
 assert.equal((await download(target,priorPointer,true,'O')).status,403)
 const audit=checked(await D.from('auditoria').select('actor,new_values,old_values').in('entidad',['matricula_documento','matricula_documento_archivo']).in('registro_id',[...documentIds,...(await versions(target.id)).map(f=>f.id)]),'H6 audit')
 assert.ok(audit.length>0&&audit.every(a=>a.actor&&!/MUÑOZ|APODERADO|object_key|sha256|numero_di|domicilio/.test(JSON.stringify([a.new_values,a.old_values]))))
 assertSecurityInventory(securityInventory());writeFileSync('.cache/h6-results/metrics.json',JSON.stringify({runtime:'local Edge',samples:metrics,cpu:'NOT MEASURED',memory:'NOT MEASURED',hosted:'NOT EXECUTED'},null,2))
 console.log('H6 real Auth/Edge/Storage: all 5 renderers, PDF/JPEG/PNG validation, private bytes, role/IDOR/tampering, actual audit-fault compensation, same-document race, stale/annulled history, revoke and PII-free audit PASSED. Hosted/CPU/memory not measured.')
}catch(error){console.error('H6 Edge FAILED '+(error instanceof assert.AssertionError||/^Falló /.test(error.message)?error.message:'sensitive detail omitted'));console.error(error.stack?.split('\n').find(l=>l.includes('test-expediente.mjs:'))??error.name);process.exitCode=1}
finally{if(fixture){if(documentIds.length){const files=checked(await fixture.admin.from('matricula_documento_archivo').select('object_key').in('matricula_documento_id',documentIds),'synthetic H6 cleanup listing');if(files.length)checked(await fixture.admin.storage.from('h6-expediente').remove(files.map(f=>f.object_key)),'synthetic disposable CI bytes cleanup')}await fixture.cleanup()}}
