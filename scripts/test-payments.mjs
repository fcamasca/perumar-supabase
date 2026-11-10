import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createFixtures, publicClient, checked } from './h2-fixtures.mjs'
import { inspectDatabase, assertSecurityInventory, securityInventory } from './local-platform.mjs'

// Auth/API fixtures commit only in the ephemeral GitHub Actions stack, never the human database.
if(process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true')throw new Error('H4 API tests require the disposable GitHub Actions database. Use test:payments:rollback or test:payments:isolated locally.')
let fixture
try {
  fixture=await createFixtures()
  assertSecurityInventory(securityInventory())
  const clients={}
  for(const [name,e] of Object.entries(fixture.entries)){
    clients[name]=publicClient(fixture.config);checked(await clients[name].auth.signInWithPassword({email:e.email,password:e.password}),'payment actor login')
  }
  const {D,O,M,A}=clients,tag=randomUUID().slice(0,8).toUpperCase()
  const rpc=async(c,n,args)=>checked(await c.rpc(n,args),n)
  const rows=async(table)=>checked(await D.from(table).select('*'),table)
  const byId=async(table,id)=>checked(await D.from(table).select('*').eq('id',id).single(),table)
  const catalogs=await rows('catalogo'),values=await rows('catalogo_valor')
  const value=(category,code)=>values.find(v=>v.catalogo_id===catalogs.find(c=>c.codigo===category).id&&v.codigo===code).id
  const district=(await rows('distrito'))[0],province=await byId('provincia',district.provincia_id)
  const geo={departamento_id:province.departamento_id,provincia_id:province.id,distrito_id:district.id}
  const subject=await rpc(D,'guardar_materia',{p:{nombre:'H4 SYNTHETIC '+tag}})
  const career=await rpc(D,'guardar_carrera',{p:{nombre:'H4 SYNTHETIC '+tag,sigla:'P'+tag},materias:[subject.id]})
  let cycle=await rpc(D,'guardar_ciclo',{p:{...geo,carrera_id:career.id,capitania_id:(await rows('capitania'))[0].id,fecha_inicio:'2046-01-01',fecha_fin:'2046-02-01'}})
  const tariff=await rpc(D,'guardar_tarifa',{p:{codigo:'PAY'+tag,nombre:'H4 SYNTHETIC',tipo:'CARRERA',monto_por_defecto:'100'}})
  cycle=await rpc(D,'guardar_ciclo_tarifas',{ciclo_id:cycle.id,expected_updated_at:cycle.updated_at,configuracion:[{tarifa_id:tariff.id,importe:'100',obligatorio:'true'}]})
  let student=await rpc(O,'guardar_alumno',{p:{apellido_paterno:'PRUEBA',apellido_materno:'SINTETICA',nombres:'H4',tipo_di_id:value('TIPO_DI','CARNET_EXTRANJERIA'),numero_di:randomUUID().replaceAll('-','').slice(0,30),fecha_nacimiento:'2000-01-01',sexo_id:value('SEXO','F'),celular:'999111222',domicilio:'SINTETICO',...Object.fromEntries(Object.entries(geo).map(([k,v])=>['nacimiento_'+k,v])),...Object.fromEntries(Object.entries(geo).map(([k,v])=>['domicilio_'+k,v])),contactos:[{apellido:'CONTACTO',nombre:'SINTETICO',parentesco_id:value('PARENTESCO','PADRE'),celular:'999111222'}]}})
  let enrollment=await rpc(O,'registrar_matricula',{p:{alumno_id:student.id,expected_alumno_updated_at:student.updated_at,ciclo_id:cycle.id,expected_ciclo_updated_at:cycle.updated_at}})
  const charge=checked(await D.from('matricula_cargo').select('*').eq('matricula_id',enrollment.id).single(),'charge')
  const payload=amount=>({matricula_id:enrollment.id,expected_matricula_updated_at:enrollment.updated_at,idempotency_key:randomUUID(),importe:amount,medio_pago_id:value('MEDIO_PAGO','EFECTIVO'),aplicaciones:[{matricula_cargo_id:charge.id,importe:amount}]})
  const p=payload('30'),payment=await rpc(O,'registrar_pago',{p})
  assert.equal(payment.registrado_por,fixture.entries.O.id)
  assert.equal((await rpc(D,'registrar_pago',{p})).id,payment.id)
  assert.equal((await rpc(M,'registrar_pago',{p})).id,payment.id)
  for(const c of [D,O,M]){
    assert.equal(checked(await c.from('matricula_saldo').select('*').eq('matricula_id',enrollment.id).single(),'balance').abonado,30)
    assert.equal(checked(await c.from('pago').select('id').eq('idempotency_key',p.idempotency_key),'recovery').length,1)
  }
  for(const name of ['A','B','N','F','I']){
    for(const table of ['pago','pago_aplicacion','matricula_saldo','matricula_cargo_saldo'])assert.equal(checked(await clients[name].from(table).select('*'),'denied financial read').length,0)
    assert.ok((await clients[name].rpc('registrar_pago',{p})).error)
    assert.ok((await clients[name].rpc('anular_pago',{id:payment.id,expected_updated_at:payment.updated_at,motivo:'SYNTHETIC'})).error)
  }
  for(const table of ['pago','pago_aplicacion'])for(const c of [D,O,A]){
    assert.ok((await c.from(table).insert({id:randomUUID()})).error)
    assert.ok((await c.from(table).update({importe:1}).eq('id',payment.id)).error)
    assert.ok((await c.from(table).delete().eq('id',payment.id)).error)
  }
  const anonymous=publicClient(fixture.config)
  assert.ok((await anonymous.from('pago').select('*')).error)
  assert.ok((await anonymous.rpc('registrar_pago',{p})).error)
  const invalid=await fetch(`${fixture.config.url}/rest/v1/pago`,{headers:{apikey:fixture.config.key,Authorization:'Bearer invalid'}})
  assert.equal(invalid.status,401)
  assert.ok((await O.rpc('anular_pago',{id:payment.id,expected_updated_at:payment.updated_at,motivo:'SYNTHETIC'})).error)
  checked(await fixture.admin.from('app_users').update({active:false}).eq('id',fixture.entries.O.id),'deactivate actor')
  assert.equal(checked(await O.from('pago').select('id').eq('idempotency_key',p.idempotency_key),'revoked recovery').length,0)
  assert.ok((await O.rpc('registrar_pago',{p})).error)
  checked(await fixture.admin.from('app_users').update({active:true}).eq('id',fixture.entries.O.id),'restore actor')
  const annulled=await rpc(D,'anular_pago',{id:payment.id,expected_updated_at:payment.updated_at,motivo:'SYNTHETIC CORRECTION'})
  assert.equal(annulled.estado_codigo,'ANULADO')
  assert.equal((await rpc(O,'registrar_pago',{p})).estado_codigo,'ANULADO')
  assert.equal(checked(await O.from('matricula_saldo').select('*').eq('matricula_id',enrollment.id).single(),'reopened balance').abonado,0)
  const audit=checked(await A.from('auditoria').select('accion,new_values,old_values,motivo').eq('entidad','pago').eq('registro_id',payment.id),'minimal audit')
  assert.equal(audit.length,2);for(const event of audit){assert.deepEqual(Object.keys(event.new_values).sort(),['matricula_id','pago_id']);assert.equal(event.old_values,null)}
  enrollment=await byId('matricula',enrollment.id)
  const second=await rpc(D,'registrar_pago',{p:payload('25')})
  enrollment=await byId('matricula',enrollment.id)
  enrollment=await rpc(D,'anular_matricula',{id:enrollment.id,expected_updated_at:enrollment.updated_at,motivo:'SYNTHETIC TERMINAL'})
  assert.ok((await D.rpc('anular_pago',{id:second.id,expected_updated_at:second.updated_at,motivo:'BLOCKED'})).error)
  assert.ok((await D.rpc('registrar_pago',{p:payload('1')})).error)
  assert.equal(checked(await D.from('pago').select('estado_codigo').eq('id',second.id).single(),'terminal history').estado_codigo,'CONFIRMADO')
  // No direct app role removal or catalog mutation persists after this suite; stack reset removes business fixtures.
  console.log('H4 ordinary JWT D/O/multirole, denied actors, revoked access, direct DML, recovery, cancellation, minimal Admin audit and terminal enrollment: PASSED')
  inspectDatabase("select 1;")
} finally {if(fixture)await fixture.cleanup()}
