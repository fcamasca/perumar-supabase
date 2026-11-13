import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createFixtures, publicClient, checked } from './h2-fixtures.mjs'
import { inspectDatabase, runLocal, assertSecurityInventory, securityInventory } from './local-platform.mjs'

// Committed Auth/API fixtures belong only to the disposable CI stack.
if(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true')throw new Error('H5 API tests require the disposable GitHub Actions stack; never run against the human database.')
let fixture
const artifacts=[]
try {
  fixture=await createFixtures();assertSecurityInventory(securityInventory())
  const clients={}
  for(const [actor,e] of Object.entries(fixture.entries)){
    const c=publicClient(fixture.config);checked(await c.auth.signInWithPassword({email:e.email,password:e.password}),'PDF actor login');clients[actor]=c
  }
  const {D,O,A}=clients,tag=randomUUID().slice(0,8).toUpperCase()
  const rpc=async(c,n,args)=>checked(await c.rpc(n,args),n)
  const rows=async table=>checked(await D.from(table).select('*'),table)
  const byId=async(table,id)=>checked(await D.from(table).select('*').eq('id',id).single(),table)
  const catalogs=await rows('catalogo'),values=await rows('catalogo_valor')
  const value=(category,code)=>values.find(v=>v.catalogo_id===catalogs.find(c=>c.codigo===category).id&&v.codigo===code).id
  const district=(await rows('distrito'))[0],province=await byId('provincia',district.provincia_id)
  const geo={departamento_id:province.departamento_id,provincia_id:province.id,distrito_id:district.id}
  const subject=await rpc(D,'guardar_materia',{p:{nombre:'H5 SINTÉTICO '+tag}})
  const course=await rpc(D,'guardar_carrera',{p:{nombre:'H5 CURSO '+tag,sigla:'F'+tag},materias:[subject.id]})
  let cycle=await rpc(D,'guardar_ciclo',{p:{...geo,carrera_id:course.id,capitania_id:(await rows('capitania'))[0].id,fecha_inicio:'2047-01-01',fecha_fin:'2047-02-01'}})
  const tariff=await rpc(D,'guardar_tarifa',{p:{codigo:'PDF'+tag,nombre:'H5 SINTÉTICO',tipo:'CARRERA',monto_por_defecto:'100'}})
  cycle=await rpc(D,'guardar_ciclo_tarifas',{ciclo_id:cycle.id,expected_updated_at:cycle.updated_at,configuracion:[{tarifa_id:tariff.id,importe:'100',obligatorio:'true'}]})
  const initial={apellido_paterno:'MUÑOZ',apellido_materno:'QUIÑONES',nombres:'ÁNGELA',tipo_di_id:value('TIPO_DI','CARNET_EXTRANJERIA'),numero_di:randomUUID().replaceAll('-','').slice(0,30),fecha_nacimiento:'2000-01-01',sexo_id:value('SEXO','F'),celular:'999111222',domicilio:'SINTÉTICO',...Object.fromEntries(Object.entries(geo).map(([k,v])=>['nacimiento_'+k,v])),...Object.fromEntries(Object.entries(geo).map(([k,v])=>['domicilio_'+k,v])),contactos:[{apellido:'CONTACTO',nombre:'SINTÉTICO',parentesco_id:value('PARENTESCO','PADRE'),celular:'999111222'}]}
  initial.contactos=Array.from({length:100},(_,i)=>({...initial.contactos[0],nombre:'SINTÉTICO '+String(i+1).padStart(3,'0')}))
  let student=await rpc(O,'guardar_alumno',{p:initial})
  let enrollment=await rpc(O,'registrar_matricula',{p:{alumno_id:student.id,expected_alumno_updated_at:student.updated_at,ciclo_id:cycle.id,expected_ciclo_updated_at:cycle.updated_at}})
  const otherStudent=await rpc(O,'guardar_alumno',{p:{...initial,nombres:'OTRA FICHA',numero_di:randomUUID().replaceAll('-','').slice(0,30),contactos:[initial.contactos[0]]}})
  const otherEnrollment=await rpc(O,'registrar_matricula',{p:{alumno_id:otherStudent.id,expected_alumno_updated_at:otherStudent.updated_at,ciclo_id:cycle.id,expected_ciclo_updated_at:cycle.updated_at}})
  const body=()=>({matricula_id:enrollment.id,expected_updated_at:enrollment.updated_at})
  const tokens={};for(const [name,c] of Object.entries(clients))tokens[name]=(await c.auth.getSession()).data.session.access_token
  const invoke=async(payload,actor='D',origin)=>fetch(fixture.config.url+'/functions/v1/ficha-matricula',{method:'POST',headers:{apikey:fixture.config.key,'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+tokens[actor]}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify(payload)})
  const generate=async(actor='D')=>{
    const r=await invoke(body(),actor);assert.equal(r.status,200,'authorized real Edge generation');const m=await r.json();assert.match(m.artefacto_id,/^[a-f0-9-]{36}$/);artifacts.push(`${enrollment.id}/${m.artefacto_id}.pdf`);return m
  }
  const fingerprint=async()=>createHash('sha256').update(JSON.stringify({m:await byId('matricula',enrollment.id),s:await byId('alumno',student.id),c:await byId('ciclo',cycle.id),charges:checked(await D.from('matricula_cargo').select('*').eq('matricula_id',enrollment.id).order('id'),'fingerprint charges'),balance:checked(await D.from('matricula_saldo').select('*').eq('matricula_id',enrollment.id),'fingerprint balance')})).digest('hex')
  const events=async()=>checked(await D.from('auditoria').select('*').eq('entidad','ficha_pdf').eq('registro_id',enrollment.id).order('fecha').order('id'),'PDF events')
  const before=await fingerprint()
  const stale=await invoke({...body(),expected_updated_at:'2000-01-01T00:00:00Z'});assert.equal(stale.status,409);assert.equal((await stale.json()).code,'VERSION');assert.equal((await events()).length,0)
  const firstStart=performance.now(),manifest=await generate(),firstInvocationMs=performance.now()-firstStart,second=await generate('O');assert.notEqual(manifest.artefacto_id,second.artefacto_id)
  assert.equal(Date.parse(manifest.expires_at)-Date.parse(manifest.generated_at),86400000)
  assert.equal(await fingerprint(),before,'PDF generation must not mutate H1-H4 business state')
  for(const actor of ['A','B','N','F','I'])assert.equal((await invoke(body(),actor)).status,403,'non-academic/inactive rejected')
  for(const [actor,c] of Object.entries(clients)){
    const visible=checked(await c.from('matricula_ficha_fuente').select('id,source').eq('id',enrollment.id),'source view JWT/RLS matrix')
    assert.equal(visible.length,['D','O','M'].includes(actor)?1:0,'Source view must inherit academic RLS without leaking PII')
  }
  assert.equal((await invoke(body(),null)).status,401)
  for(const extra of [{path:'../outside.pdf'},{html:'<script>alert(1)</script>'},{actor:fixture.entries.D.id},{url:'http://169.254.169.254'}])assert.equal((await invoke({...body(),...extra})).status,422)
  assert.equal((await invoke({...body(),html:'x'.repeat(5000)})).status,413)
  assert.equal((await invoke(body(),'D','https://evil.invalid')).status,403)
  assert.equal((await invoke({matricula_id:randomUUID(),expected_updated_at:enrollment.updated_at})).status,404)
  assert.equal((await invoke({...body(),artefacto_id:randomUUID()})).status,404)
  const otherBody={matricula_id:otherEnrollment.id,expected_updated_at:otherEnrollment.updated_at}
  assert.equal((await invoke({...otherBody,artefacto_id:manifest.artefacto_id})).status,404,'real artifact cannot cross enrollment prefix/manifest')
  const otherResponse=await invoke(otherBody,'O');assert.equal(otherResponse.status,200,'academic role may read another authorized enrollment without invented student ownership');const otherManifest=await otherResponse.json();artifacts.push(`${otherEnrollment.id}/${otherManifest.artefacto_id}.pdf`)
  const path=artifacts[0]
  const objectNames=async()=>checked(await fixture.admin.storage.from('fichas-matricula').list(enrollment.id,{limit:100}),'synthetic object listing').map(f=>f.name).sort()
  const beforeFaultObjects=await objectNames(),beforeFaultEvents=(await events()).length
  // Real Storage rejection: no successful audit or retained object.
  checked(await fixture.admin.storage.updateBucket('fichas-matricula',{allowedMimeTypes:['image/png']}),'inject Storage MIME rejection')
  try { assert.equal((await invoke(body())).status,503,'real upload failure') }
  finally { checked(await fixture.admin.storage.updateBucket('fichas-matricula',{allowedMimeTypes:['application/pdf']}),'restore private PDF bucket') }
  assert.deepEqual(await objectNames(),beforeFaultObjects);assert.equal((await events()).length,beforeFaultEvents)
  // Real post-upload DB audit failure, restricted to this disposable synthetic enrollment.
  inspectDatabase("create function private.h5_test_failure() returns trigger language plpgsql set search_path='' as $$ begin raise exception using errcode='P0001',message='H5_SYNTHETIC_AUDIT_FAILURE'; end; $$; revoke all on function private.h5_test_failure() from public,anon,authenticated; create trigger z_h5_test_failure before insert on public.auditoria for each row when (new.entidad='ficha_pdf' and new.registro_id=:'enrollment_id'::uuid) execute function private.h5_test_failure();",{enrollment_id:enrollment.id})
  try { assert.equal((await invoke(body())).status,503,'real audit failure must compensate and withhold artifact') }
  finally { inspectDatabase('drop trigger z_h5_test_failure on public.auditoria; drop function private.h5_test_failure();') }
  assert.deepEqual(await objectNames(),beforeFaultObjects,'real Storage compensation');assert.equal((await events()).length,beforeFaultEvents)
  // Real dependency timeout, not a fake delayed Promise. Only the disposable CI Storage container is paused.
  const timeoutStart=performance.now();runLocal('docker',['pause','supabase_storage_perumar-supabase'])
  try { assert.equal((await invoke(body())).status,503,'real Storage timeout') }
  finally { runLocal('docker',['unpause','supabase_storage_perumar-supabase']) }
  const timeoutMs=performance.now()-timeoutStart;assert.ok(timeoutMs>=10000&&timeoutMs<23000,'bounded real timeout');assert.equal((await events()).length,beforeFaultEvents)
  await new Promise(r=>setTimeout(r,500))
  for(const name of (await objectNames()).filter(n=>!beforeFaultObjects.includes(n)))artifacts.push(`${enrollment.id}/${name}`) // Possible private orphan after unknown upload outcome.
  assertSecurityInventory(securityInventory())
  console.log('H5 real upload rejection, post-upload audit compensation and paused-Storage timeout: PASSED')
  for(const c of [D,O,A,publicClient(fixture.config)]){
    assert.ok((await c.storage.from('fichas-matricula').download(path)).error)
    const listed=await c.storage.from('fichas-matricula').list(enrollment.id);assert.ok(listed.error||listed.data.length===0)
    assert.ok((await c.storage.from('fichas-matricula').createSignedUrl(path,1)).error)
    assert.ok((await c.storage.from('fichas-matricula').upload(enrollment.id+'/'+randomUUID()+'.pdf',new Blob(['%PDF-test']),{contentType:'application/pdf'})).error)
    assert.ok((await c.rpc('registrar_evento_ficha_pdf',{p_actor:fixture.entries.D.id,p_matricula_id:enrollment.id,p_artefacto_id:manifest.artefacto_id,p_evento:'FICHA_PDF_GENERADA',p_source_version:enrollment.updated_at,p_generated_at:manifest.generated_at,p_source_fingerprint:manifest.source_fingerprint})).error)
  }
  // CHG-H5-002: current edits invalidate the existing artifact; original snapshot stays unchanged.
  student=await rpc(O,'guardar_alumno',{p:{...initial,contactos:[],id:student.id,expected_updated_at:student.updated_at,nombres:'ACTUAL DIFERENTE'}})
  const staleBefore=await events()
  const staleArtifact=await invoke({...body(),artefacto_id:manifest.artefacto_id},'O');assert.equal(staleArtifact.status,409);assert.equal((await staleArtifact.json()).code,'SOURCE_CHANGED');assert.equal((await events()).length,staleBefore.length)
  const afterPersonalEdit=await generate()
  const download=await invoke({...body(),artefacto_id:afterPersonalEdit.artefacto_id},'O');assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'application/pdf');assert.equal(download.headers.get('cache-control'),'private, no-store');assert.match(download.headers.get('content-disposition'),/ficha-matricula.pdf/)
  const bytes=Buffer.from(await download.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');mkdirSync('.cache/h5-results',{recursive:true});writeFileSync('.cache/h5-results/real-edge.pdf',bytes)
  const extracted=spawnSync('pdftotext',['-enc','UTF-8','.cache/h5-results/real-edge.pdf','-'],{encoding:'utf8',windowsHide:true})
  assert.equal(extracted.status,0,'independent PDF parsing');assert.ok(extracted.stdout.includes('MUÑOZ')&&extracted.stdout.includes('ACTUAL DIFERENTE')&&!extracted.stdout.includes('ÁNGELA'),'current data while Cycle is open; historical original snapshot remains separate');assert.ok(extracted.stdout.includes('SINTÉTICO 100'),'all 100 historic contacts rendered')
  const cycleDistrict=(await byId('distrito',cycle.distrito_id)).nombre.toLocaleLowerCase('es-PE').replace(/(^|\s)\p{L}/gu,part=>part.toLocaleUpperCase('es-PE'))
  const enrollmentDate=new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'numeric',month:'long',year:'numeric'}).format(new Date(enrollment.created_at))
  assert.ok(extracted.stdout.replace(/\s+/g,' ').includes(`${cycleDistrict}, ${enrollmentDate}`),'Real JWT/RLS read must supply the Cycle district and historical enrollment date above the signature')
  const visual=spawnSync('pdftoppm',['-scale-to','1100','-png','.cache/h5-results/real-edge.pdf','.cache/h5-results/page'],{encoding:'utf8',windowsHide:true});assert.equal(visual.status,0,'independent PDF rendering')
  const auditRows=await events();assert.equal(auditRows.filter(e=>e.accion==='FICHA_PDF_GENERADA').length,3);assert.equal(auditRows.at(-1).actor,fixture.entries.O.id)
  assert.ok(auditRows.every(e=>!JSON.stringify(e.new_values).includes('MUÑOZ')&&!JSON.stringify(e.new_values).includes(initial.numero_di)))
  // True expiry of a synthetic privileged URL, never exposed by the product. Do not delete to fake expiry.
  const signed=checked(await fixture.admin.storage.from('fichas-matricula').createSignedUrl(path,1),'signed URL fixture')
  assert.equal((await fetch(signed.signedUrl,{cache:'no-store'})).status,200)
  await new Promise(r=>setTimeout(r,2200));assert.ok((await fetch(signed.signedUrl,{cache:'no-store'})).status>=400,'real signed URL TTL')
  // Derived manifest fault injection only in disposable CI; expiry enforced although bytes remain private.
  const generatedEvent=auditRows.find(e=>e.new_values.artefacto_id===manifest.artefacto_id&&e.accion==='FICHA_PDF_GENERADA')
  inspectDatabase("update public.auditoria set new_values=jsonb_set(new_values,'{expires_at}',to_jsonb(clock_timestamp()-interval '1 second')) where id=:'event_id'::uuid and entidad='ficha_pdf';",{event_id:generatedEvent.id})
  assert.equal((await invoke({...body(),artefacto_id:manifest.artefacto_id})).status,409)
  inspectDatabase("update public.auditoria set new_values=jsonb_set(new_values,'{expires_at}',to_jsonb((new_values->>'generated_at')::timestamptz+interval '24 hours')) where id=:'event_id'::uuid and entidad='ficha_pdf';",{event_id:generatedEvent.id})
  checked(await fixture.admin.from('app_user_roles').delete().eq('user_id',fixture.entries.O.id),'revoke synthetic coordinator')
  assert.equal((await invoke({...body(),artefacto_id:manifest.artefacto_id},'O')).status,403)
  // Explicit concurrent generations remain distinct, and each download is authorized anew.
  const times=[]
  for(let i=0;i<20;i++){const start=performance.now();await generate();times.push(performance.now()-start)}
  const pair=await Promise.all([generate(),generate()]);assert.notEqual(pair[0].artefacto_id,pair[1].artefacto_id)
  const sorted=[...times].sort((a,b)=>a-b),metrics={runtime:'supabase-edge-runtime-1.77.4 / Deno 2.1.4',samples:20,firstInvocationMs,firstWarmMs:times[0],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),pdfBytes:bytes.length,cpu:'NOT MEASURED',memory:'NOT MEASURED',hosted:'NOT EXECUTED'}
  writeFileSync('.cache/h5-results/metrics.json',JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics))
  // Final capture is part of Cycle closure, not PDF generation.
  const originalSnapshot=(await byId('matricula',enrollment.id)).alumno_snapshot
  cycle=await rpc(D,'cambiar_estado_ciclo',{id:cycle.id,expected_updated_at:cycle.updated_at,destino:'EN_CURSO'})
  cycle=await rpc(D,'cambiar_estado_ciclo',{id:cycle.id,expected_updated_at:cycle.updated_at,destino:'CERRADO'})
  enrollment=await byId('matricula',enrollment.id)
  assert.deepEqual(enrollment.alumno_snapshot,originalSnapshot,'Original enrollment history remains immutable')
  assert.equal(enrollment.alumno_snapshot_cierre.alumno.nombres,'ACTUAL DIFERENTE')
  assert.equal((await invoke({...body(),artefacto_id:pair[0].artefacto_id})).status,409,'Open-Cycle PDF cannot be downloaded as final')
  const finalManifest=await generate()
  student=await rpc(D,'guardar_alumno',{p:{...initial,contactos:[],id:student.id,expected_updated_at:student.updated_at,nombres:'POSTERIOR AL CIERRE'}})
  const finalRegenerated=await generate()
  assert.equal(finalRegenerated.source_fingerprint,finalManifest.source_fingerprint,'Post-close student edits cannot change the frozen source')
  const finalDownload=await invoke({...body(),artefacto_id:finalRegenerated.artefacto_id});assert.equal(finalDownload.status,200)
  writeFileSync('.cache/h5-results/final-edge.pdf',Buffer.from(await finalDownload.arrayBuffer()))
  const finalText=spawnSync('pdftotext',['-enc','UTF-8','.cache/h5-results/final-edge.pdf','-'],{encoding:'utf8',windowsHide:true})
  assert.equal(finalText.status,0);assert.ok(finalText.stdout.includes('ACTUAL DIFERENTE')&&!finalText.stdout.includes('POSTERIOR AL CIERRE'),'Closed regeneration uses only final capture')
  console.log('CHG-H5-002 real JWT/Edge current edits, stale fingerprint HTTP409, final capture and post-close regeneration: PASSED')
  enrollment=await rpc(D,'anular_matricula',{id:enrollment.id,expected_updated_at:enrollment.updated_at,motivo:'H5 SINTÉTICO'})
  assert.equal((await invoke({...body(),artefacto_id:manifest.artefacto_id})).status,409)
  assert.equal((await invoke(body())).status,409)
  console.log('H5 real Edge, RLS/role/IDOR matrix, private Storage, true signed URL TTL, logical retention, snapshot, audit, no business mutation and concurrent generation: PASSED technical; hosted/human pending')
} catch(error){console.error('H5 FAILED '+(error instanceof assert.AssertionError||/^Falló /.test(error.message)?error.message:'technical operation; sensitive details omitted'));console.error('H5 LOCATION '+(error.stack?.split('\n').find(line=>line.includes('test-pdf.mjs:'))??error.name));process.exitCode=1}
finally {
  if(fixture){if(artifacts.length)checked(await fixture.admin.storage.from('fichas-matricula').remove(artifacts),'cleanup derived synthetic PDFs');await fixture.cleanup()}
}
