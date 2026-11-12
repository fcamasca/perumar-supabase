import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createFixtures, publicClient, checked } from './h2-fixtures.mjs'
import { assertSecurityInventory, securityInventory } from './local-platform.mjs'

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
  let student=await rpc(O,'guardar_alumno',{p:initial})
  let enrollment=await rpc(O,'registrar_matricula',{p:{alumno_id:student.id,expected_alumno_updated_at:student.updated_at,ciclo_id:cycle.id,expected_ciclo_updated_at:cycle.updated_at}})
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
  assert.equal((await invoke(body(),null)).status,401)
  for(const extra of [{path:'../outside.pdf'},{html:'<script>alert(1)</script>'},{actor:fixture.entries.D.id},{url:'http://169.254.169.254'}])assert.equal((await invoke({...body(),...extra})).status,422)
  assert.equal((await invoke(body(),'D','https://evil.invalid')).status,403)
  assert.equal((await invoke({matricula_id:randomUUID(),expected_updated_at:enrollment.updated_at})).status,404)
  assert.equal((await invoke({...body(),artefacto_id:randomUUID()})).status,404)
  const path=artifacts[0]
  for(const c of [D,O,A,publicClient(fixture.config)]){
    assert.ok((await c.storage.from('fichas-matricula').download(path)).error)
    const listed=await c.storage.from('fichas-matricula').list(enrollment.id);assert.ok(listed.error||listed.data.length===0)
    assert.ok((await c.storage.from('fichas-matricula').createSignedUrl(path,1)).error)
    assert.ok((await c.storage.from('fichas-matricula').upload(enrollment.id+'/'+randomUUID()+'.pdf',new Blob(['%PDF-test']),{contentType:'application/pdf'})).error)
    assert.ok((await c.rpc('registrar_evento_ficha_pdf',{p_actor:fixture.entries.D.id,p_matricula_id:enrollment.id,p_artefacto_id:manifest.artefacto_id,p_evento:'FICHA_PDF_GENERADA',p_source_version:enrollment.updated_at,p_generated_at:manifest.generated_at})).error)
  }
  // Current personal edits never replace the snapshot in the source projection.
  student=await rpc(O,'guardar_alumno',{p:{...initial,contactos:[],id:student.id,expected_updated_at:student.updated_at,nombres:'ACTUAL DIFERENTE'}})
  const download=await invoke({...body(),artefacto_id:manifest.artefacto_id},'O');assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'application/pdf');assert.equal(download.headers.get('cache-control'),'private, no-store');assert.match(download.headers.get('content-disposition'),/ficha-matricula.pdf/)
  const bytes=Buffer.from(await download.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');mkdirSync('.cache/h5-results',{recursive:true});writeFileSync('.cache/h5-results/real-edge.pdf',bytes)
  const auditRows=await events();assert.equal(auditRows.filter(e=>e.accion==='FICHA_PDF_GENERADA').length,2);assert.equal(auditRows.at(-1).actor,fixture.entries.O.id)
  assert.ok(auditRows.every(e=>!JSON.stringify(e.new_values).includes('MUÑOZ')&&!JSON.stringify(e.new_values).includes(initial.numero_di)))
  // True expiry of a synthetic privileged URL, never exposed by the product. Do not delete to fake expiry.
  const signed=checked(await fixture.admin.storage.from('fichas-matricula').createSignedUrl(path,1),'signed URL fixture')
  assert.equal((await fetch(signed.signedUrl,{cache:'no-store'})).status,200)
  await new Promise(r=>setTimeout(r,2200));assert.ok((await fetch(signed.signedUrl,{cache:'no-store'})).status>=400,'real signed URL TTL')
  // Derived manifest fault injection only in disposable CI; expiry enforced although bytes remain private.
  const generatedEvent=auditRows.find(e=>e.new_values.artefacto_id===manifest.artefacto_id&&e.accion==='FICHA_PDF_GENERADA')
  checked(await fixture.admin.from('auditoria').update({new_values:{...manifest,expires_at:new Date(Date.now()-1).toISOString()}}).eq('id',generatedEvent.id),'expired synthetic manifest')
  assert.equal((await invoke({...body(),artefacto_id:manifest.artefacto_id})).status,409)
  checked(await fixture.admin.from('auditoria').update({new_values:manifest}).eq('id',generatedEvent.id),'restore synthetic manifest')
  checked(await fixture.admin.from('app_user_roles').delete().eq('user_id',fixture.entries.O.id),'revoke synthetic coordinator')
  assert.equal((await invoke({...body(),artefacto_id:manifest.artefacto_id},'O')).status,403)
  // Explicit concurrent generations remain distinct, and each download is authorized anew.
  const times=[]
  for(let i=0;i<20;i++){const start=performance.now();await generate();times.push(performance.now()-start)}
  const pair=await Promise.all([generate(),generate()]);assert.notEqual(pair[0].artefacto_id,pair[1].artefacto_id)
  const sorted=[...times].sort((a,b)=>a-b),metrics={runtime:'supabase-edge-runtime-1.77.4 / Deno 2.1.4',samples:20,firstInvocationMs,firstWarmMs:times[0],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),pdfBytes:bytes.length,cpu:'NOT MEASURED',memory:'NOT MEASURED',hosted:'NOT EXECUTED'}
  writeFileSync('.cache/h5-results/metrics.json',JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics))
  enrollment=await rpc(D,'anular_matricula',{id:enrollment.id,expected_updated_at:enrollment.updated_at,motivo:'H5 SINTÉTICO'})
  assert.equal((await invoke({...body(),artefacto_id:manifest.artefacto_id})).status,409)
  assert.equal((await invoke(body())).status,409)
  console.log('H5 real Edge, RLS/role/IDOR matrix, private Storage, true signed URL TTL, logical retention, snapshot, audit, no business mutation and concurrent generation: PASSED technical; hosted/human pending')
} catch(error){console.error('H5 FAILED '+(error instanceof assert.AssertionError?error.message:'technical operation; sensitive details omitted'));process.exitCode=1}
finally {
  if(fixture){if(artifacts.length)checked(await fixture.admin.storage.from('fichas-matricula').remove(artifacts),'cleanup derived synthetic PDFs');await fixture.cleanup()}
}
