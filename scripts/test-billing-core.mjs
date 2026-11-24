import assert from 'node:assert/strict'
import { randomUUID, randomBytes, createHmac } from 'node:crypto'
import { spawnSync, spawn } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { assertLocalProject, runLocal } from './local-platform.mjs'

assertLocalProject()
const token = randomUUID().replaceAll('-', ''), database = 'h7_test_' + token
const container = 'supabase_db_perumar-supabase', rest = 'h7_rest_' + token, login = 'h7_api_' + token
const password = randomBytes(24).toString('hex'), secret = randomBytes(32).toString('hex')
const docker = (args, input) => runLocal('docker', args, input, 120000)
const sql = (text, db = database) => {
 const r = spawnSync('docker', ['exec','-i',container,'psql','-U','postgres','-d',db,'-At','-v','ON_ERROR_STOP=1'], {input:text,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:40*1024*1024})
 if(r.status!==0) throw Error('H7 isolated SQL: '+r.stderr?.split('\n').filter(x=>/ERROR:|DETAIL:|CONTEXT:/.test(x)).slice(0,4).join(' '))
 return r.stdout.trim()
}
const json = text => JSON.parse(sql(text).split('\n').find(x=>x.startsWith('{')||x.startsWith('[')))
const asActor = (actor, text) => `begin isolation level serializable;select set_config('request.jwt.claim.sub','${actor}',true);${text};set constraints all immediate;commit;`
const j = value => "'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb"
let created=false, roleCreated=false, restStarted=false
let checks=0
const check=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++}
try {
 docker(['exec',container,'createdb','-U','postgres',database]);created=true
 // Reconstruct ALL application migrations from zero; platform schema only, never human data.
 const platform = docker(['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=auth','--schema=storage','--no-owner','--no-acl','--no-publications','--no-subscriptions'])
 sql('create schema extensions;create extension btree_gist with schema extensions;')
 sql(platform)
 for(const file of readdirSync('supabase/migrations').filter(f=>/^\d.*\.sql$/.test(f)).sort())sql(readFileSync('supabase/migrations/'+file,'utf8'))
 sql(readFileSync('supabase/seed.sql','utf8'))
 console.log('H7: full application migration rebuild + reference seed PASSED; no human rows copied')
 const src=readFileSync('tests/sql/h4-payments.sql','utf8')
 const setup=src.slice(src.indexOf('do $$'),src.indexOf(' select v.id into medium'))
 const fixture=()=>json(`create temporary table result(value jsonb);${setup}
 insert into result values(jsonb_build_object('actor',actor,'coordinator',coordinator,'student',a.id,'cycle',c.id,'cycleVersion',c.updated_at,'enrollment',e.id,'version',e.updated_at));
 end $$;select value from result;`)
 const f=fixture()
 const runActor=text=>sql(asActor(f.actor,text))
 const company=json(asActor(f.actor,`select to_jsonb(public.guardar_empresa_patrocinadora('{"ruc":"20777777777","razon_social":"H7 SYNTHETIC"}'::jsonb))`))
 const enroll=id=>json(`select to_jsonb(m) from public.matricula m where id='${id}'`)
 const version=(table,id)=>sql(`select updated_at from public.${table} where id='${id}'`)
 const cycleSponsorPayload=(fixture,companyId)=>{const c=json(`select to_jsonb(c) from public.ciclo c where id='${fixture.cycle}'`);return Object.fromEntries(['id','carrera_id','fecha_inicio','fecha_fin','nombre_promocion','departamento_id','provincia_id','distrito_id','capitania_id'].map(k=>[k,c[k]]).concat([['expected_updated_at',c.updated_at],['empresa_patrocinadora_id',companyId]]))}
 const sponsor=(companyId=company.id)=>runActor(`select public.guardar_ciclo(${j(cycleSponsorPayload(f,companyId))})`)
 const h4Payload=()=>({matricula_id:f.enrollment,expected_matricula_updated_at:enroll(f.enrollment).updated_at,idempotency_key:randomUUID(),importe:'1',medio_pago_id:sql("select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='MEDIO_PAGO' and v.codigo='EFECTIVO'"),aplicaciones:[{matricula_cargo_id:sql(`select id from public.matricula_cargo where matricula_id='${f.enrollment}' and activo limit 1`),importe:'1'}]})
 const historical=h4Payload()
 const oldPayment=json(asActor(f.actor,`select public.registrar_pago(${j(historical)})`))
 sponsor()
 // A dedicated disposable PostgREST instance with ordinary signed JWTs; no service key.
 const image=docker(['inspect','--format','{{.Config.Image}}','supabase_rest_perumar-supabase']).trim()
 const network=Object.keys(JSON.parse(docker(['inspect',container]))[0].NetworkSettings.Networks)[0]
 sql(`create role ${login} login password '${password}' noinherit;grant anon,authenticated to ${login};`,'postgres');roleCreated=true
 docker(['run','-d','--name',rest,'--network',network,'-p','127.0.0.1::3000','-e',`PGRST_DB_URI=postgres://${login}:${password}@${container}:5432/${database}`,'-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e',`PGRST_JWT_SECRET=${secret}`,image]);restStarted=true
 const port=JSON.parse(docker(['inspect',rest]))[0].NetworkSettings.Ports['3000/tcp'][0].HostPort, url='http://127.0.0.1:'+port
 const jwt=actor=>{const head=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),body=Buffer.from(JSON.stringify({role:'authenticated',sub:actor,exp:Math.floor(Date.now()/1000)+900})).toString('base64url');return head+'.'+body+'.'+createHmac('sha256',secret).update(head+'.'+body).digest('base64url')}
 for(let i=0;i<80;i++){try{if((await fetch(url+'/')).ok)break}catch{/* Starting disposable API */}await new Promise(r=>setTimeout(r,250))}
 const api=async(path,actor=f.actor,body,method=body?'POST':'GET')=>{const r=await fetch(url+path,{method,headers:{...(actor?{Authorization:'Bearer '+jwt(actor)}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
 const rpc=async(name,args,actor=f.actor)=>{const r=await api('/rpc/'+name,actor,args);assert.equal(r.status,200,JSON.stringify(r.data));checks++;return r.data}
 const fail=async(name,args,code,actor=f.actor)=>{const before=sql('select count(*) from public.auditoria'),r=await api('/rpc/'+name,actor,args);check(r.data.code,code,name);check(sql('select count(*) from public.auditoria'),before,'failed RPC audit rollback');return r}
 check((await rpc('registrar_pago',{p:historical})).id,oldPayment.id,'H4 historical idempotency after sponsorship')
 await fail('registrar_pago',{p:h4Payload()},'23514')
 const osPayload=(correlativo,monto='18450')=>({empresa_patrocinadora_id:company.id,ciclo_id:f.cycle,expected_ciclo_updated_at:version('ciclo',f.cycle),serie:' os01 ',correlativo,monto,fecha:'2026-01-01',matriculas:[{id:f.enrollment,expected_updated_at:enroll(f.enrollment).updated_at}]})
 const os1=await rpc('registrar_orden_servicio',{p:osPayload('000123')},f.coordinator)
 check(os1.monto,18450,'manual OS independent of H4 cargos')
 check(os1.serie,'OS01');check(os1.correlativo,'000123')
 await fail('registrar_orden_servicio',{p:osPayload('000123')},'23505')
 await fail('registrar_orden_servicio',{p:{...osPayload('2'),matriculas:[]}},'22023')
 await fail('registrar_orden_servicio',{p:{...osPayload('2'),matriculas:[...osPayload('2').matriculas,...osPayload('2').matriculas]}},'22023')
 for(const amount of ['0','-1','NaN','Infinity','1.001','10000000000'])await fail('registrar_orden_servicio',{p:osPayload('2',amount)},amount==='0'?'23514':'22023')
 const os2=await rpc('registrar_orden_servicio',{p:osPayload('000124','5000')})
 const os10=await rpc('registrar_orden_servicio',{p:osPayload('000125','10000')})
 const invoicePayload=(correlativo,importe='100',ordenes=[os1])=>({empresa_patrocinadora_id:company.id,serie:' f001 ',correlativo,importe,fecha_emision:'2026-01-01',fecha_vencimiento:'2026-02-01',confirmar_diferencia:'true',ordenes:ordenes.map(o=>({id:o.id,expected_updated_at:o.updated_at}))})
 await fail('registrar_factura_patrocinador',{p:{...invoicePayload('000456','4500',[os10,os2]),confirmar_diferencia:'false'}},'23514')
 const inv=await rpc('registrar_factura_patrocinador',{p:invoicePayload('000456','4500',[os10,os2])})
 check(inv.importe,4500)
 await fail('registrar_factura_patrocinador',{p:invoicePayload('000456')},'23505')
 const i1=await rpc('registrar_factura_patrocinador',{p:invoicePayload('000457')})
 const i2=await rpc('registrar_factura_patrocinador',{p:invoicePayload('000458')})
 check(sql(`select count(*) from public.factura_orden_servicio where orden_servicio_id='${os1.id}'`),'2','same OS in multiple invoices')
 await fail('anular_orden_servicio',{id:os1.id,expected_updated_at:os1.updated_at,motivo:'TEST'},'23514')
 await fail('avanzar_factura_patrocinador',{id:i1.id,expected_updated_at:i1.updated_at,destino:'APROBADA',fecha:'2026-01-02'},'23514')
 const ready=async(invoice)=>{let r=invoice;for(const destino of ['REGISTRADA_PATROCINADOR','APROBADA','PENDIENTE_DESEMBOLSO'])r=await rpc('avanzar_factura_patrocinador',{id:r.id,expected_updated_at:r.updated_at,destino,fecha:'2026-01-02'},f.coordinator);return r}
 const payPayload=(invoices,amount='10',key=randomUUID())=>({empresa_patrocinadora_id:company.id,idempotency_key:key,importe:amount,fecha_efectiva:'2026-01-02',banco:' BANCO SINTETICO ',referencia_operacion:' 001 ',aplicaciones:invoices.map(([invoice,importe])=>({factura_id:invoice.id,importe,expected_updated_at:version('factura_patrocinador',invoice.id)}))})
 await fail('registrar_pago_patrocinador',{p:payPayload([[i1,'10']])},'23514')
 await ready(i1);await ready(i2)
 const p=payPayload([[i1,'10'],[i2,'20']],'30')
 const payment=await rpc('registrar_pago_patrocinador',{p},f.coordinator)
 check((await rpc('registrar_pago_patrocinador',{p})).id,payment.id)
 await fail('registrar_pago_patrocinador',{p:{...p,banco:'OTRO'}},'PT409')
 check((await api('/factura_patrocinador_saldo?id=eq.'+i1.id)).data[0].pendiente,90)
 await fail('anular_factura_patrocinador',{id:i1.id,expected_updated_at:version('factura_patrocinador',i1.id),motivo:'TEST'},'23514')
 await fail('anular_pago_patrocinador',{id:payment.id,expected_updated_at:payment.updated_at,motivo:'TEST'},'42501',f.coordinator)
 await rpc('anular_pago_patrocinador',{id:payment.id,expected_updated_at:payment.updated_at,motivo:'TEST'})
 check((await rpc('registrar_pago_patrocinador',{p})).estado_codigo,'ANULADO','recovery never reactivates')
 check((await api('/factura_patrocinador_saldo?id=eq.'+i1.id)).data[0].pendiente,100)
 await rpc('anular_factura_patrocinador',{id:i1.id,expected_updated_at:version('factura_patrocinador',i1.id),motivo:'TEST'})
 await rpc('anular_factura_patrocinador',{id:i2.id,expected_updated_at:version('factura_patrocinador',i2.id),motivo:'TEST'})
 await rpc('anular_orden_servicio',{id:os1.id,expected_updated_at:version('orden_servicio',os1.id),motivo:'TEST'})
 check(sql(`select count(*) from public.pago_patrocinador_aplicacion where pago_id='${payment.id}'`),'2','history remains')
 await fail('registrar_orden_servicio',{p:osPayload('000123')},'23505')
 const stale=await fail('anular_orden_servicio',{id:os2.id,expected_updated_at:'2000-01-01T00:00:00Z',motivo:'TEST'},'PT409')
 check(stale.status,409,'real PostgREST conflict')
 console.log('H7 DB + ordinary JWT: OS, N:M invoices, manual amount, workflow, payments, idempotency, dependent cancellations PASSED')
 // Remaining security, rollback and real concurrency probes follow below.

 const admin=randomUUID(), inactive=randomUUID(), expired=randomUUID(), disabledRole=randomUUID()
 sql(`insert into auth.users(id) values('${admin}'),('${inactive}'),('${expired}'),('${disabledRole}');
 insert into public.app_users(id,active) values('${admin}',true),('${inactive}',false),('${expired}',true),('${disabledRole}',true);
 insert into public.app_user_roles(user_id,role_code) values('${admin}','ADMIN_SISTEMA'),('${inactive}','COORDINADOR_ACADEMICO'),('${expired}','COORDINADOR_ACADEMICO'),('${disabledRole}','COORDINADOR_ACADEMICO');`)
 // Token expiration is independently exercised by a real invalid JWT.
 for(const actor of [admin,inactive,null]){
   check((await api('/orden_servicio',actor)).status,actor?200:401)
   if(actor)check((await api('/orden_servicio',actor)).data,[])
   const r=await api('/rpc/registrar_orden_servicio',actor,{p:osPayload('DENIED')})
   check(r.data.code,actor?'42501':'42501')
 }
 sql("update public.app_roles set active=false where code='COORDINADOR_ACADEMICO'")
 await fail('registrar_orden_servicio',{p:osPayload('888')},'42501',disabledRole)
 sql("update public.app_roles set active=true where code='COORDINADOR_ACADEMICO'")
 const expiredHead=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),expiredBody=Buffer.from(JSON.stringify({role:'authenticated',sub:expired,exp:1})).toString('base64url')
 const expiredToken=expiredHead+'.'+expiredBody+'.'+createHmac('sha256',secret).update(expiredHead+'.'+expiredBody).digest('base64url')
 check((await fetch(url+'/orden_servicio',{headers:{Authorization:'Bearer '+expiredToken}})).status,401)
 for(const table of ['orden_servicio','orden_servicio_matricula','factura_patrocinador','factura_orden_servicio','pago_patrocinador','pago_patrocinador_aplicacion','orden_servicio_archivo']){
   const r=await api('/'+table,f.actor,{});check(r.data.code,'42501','DML denied '+table)
 }
 check((await api('/orden_servicio_archivo')).data,[],'technical keys unavailable')
 const h7Names=['registrar_orden_servicio','anular_orden_servicio','registrar_factura_patrocinador','avanzar_factura_patrocinador','anular_factura_patrocinador','registrar_pago_patrocinador','anular_pago_patrocinador']
 for(const actor of [admin,inactive,null])for(const name of h7Names){
   const args=name.startsWith('registrar_')?{p:{}}:name==='avanzar_factura_patrocinador'?{id:i1.id,expected_updated_at:i1.updated_at,destino:'APROBADA',fecha:'2026-01-02'}:{id:i1.id,expected_updated_at:i1.updated_at,motivo:'DENIED'}
   check((await api('/rpc/'+name,actor,args)).data.code,'42501',name+' authorization precedes inputs')
 }
 check(Number(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ("+h7Names.map(n=>"'"+n+"'").join(',')+") and p.prosecdef and 'search_path=\"\"'=any(p.proconfig) and has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')")),7)
 const invR=await rpc('registrar_factura_patrocinador',{p:invoicePayload('100098','100',[os10])})
 const invR2=await rpc('registrar_factura_patrocinador',{p:invoicePayload('100099','100',[os2])})
 await ready(invR);await ready(invR2)
 const stalePayment=payPayload([[invR,'1']],'1')
 stalePayment.aplicaciones[0].expected_updated_at='2000-01-01T00:00:00Z'
 check((await fail('registrar_pago_patrocinador',{p:stalePayment},'PT409')).status,409,'invoice version required for new payment')
 const ordered=[invR,invR2].sort((a,b)=>a.id.localeCompare(b.id))
 sql(`create function private.h7_test_failure() returns trigger language plpgsql as $$begin if new.importe=13 then raise exception 'H7_LAST_APPLICATION_FAILURE';end if;return new;end$$;
 revoke all on function private.h7_test_failure() from public,anon,authenticated;
 create trigger h7_test_failure before insert on public.pago_patrocinador_aplicacion for each row execute function private.h7_test_failure();`)
 const beforeFailure=sql('select jsonb_build_array((select count(*) from public.pago_patrocinador),(select count(*) from public.pago_patrocinador_aplicacion),(select count(*) from public.auditoria))')
 await fail('registrar_pago_patrocinador',{p:payPayload([[ordered[0],'12'],[ordered[1],'13']],'25')},'P0001')
 check(sql('select jsonb_build_array((select count(*) from public.pago_patrocinador),(select count(*) from public.pago_patrocinador_aplicacion),(select count(*) from public.auditoria))'),beforeFailure,'last application rollback')
 sql('drop trigger h7_test_failure on public.pago_patrocinador_aplicacion;drop function private.h7_test_failure()')
 for(const mutation of [
   {banco:''},{fecha_efectiva:'2999-01-01'},{fecha_efectiva:'2025-12-31'},
   {importe:'0'},{importe:'-1'},{importe:'NaN'},{importe:'1.001'},{actor:f.actor}
 ])await fail('registrar_pago_patrocinador',{p:{...payPayload([[invR,'10']]),...mutation}},['','0','-1','NaN','1.001'].includes(mutation.banco??mutation.importe)||mutation.actor?'22023':'23514')
 const run=text=>{
   const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'],{windowsHide:true})
   let output='',error='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>error+=c)
   const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({ok:code===0,output,code:error.match(/\b(40001|40P01|PT409|23514|23505)\b/)?.[1]}))})
   child.stdin.end(text);return done
 }
 const race=async(lock,left,right)=>{
   const gate=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1'],{windowsHide:true})
   let locked=false;gate.stdout.on('data',c=>{if(String(c).includes('H7_BARRIER'))locked=true});gate.stderr.on('data',()=>{})
   const ended=new Promise((resolve,reject)=>{gate.on('error',reject);gate.on('close',c=>c===0?resolve():reject(Error('H7 barrier failed')))})
   gate.stdin.write('begin;'+lock+";select 'H7_BARRIER';\n")
   const deadline=Date.now()+20000
   try{
     while(!locked&&Date.now()<deadline)await new Promise(r=>setTimeout(r,25));assert.ok(locked)
     const a=run("set application_name='H7_RACE';"+asActor(f.actor,left)),b=run("set application_name='H7_RACE';"+asActor(f.actor,right))
     let waiting=0
     while(Date.now()<deadline){waiting=Number(sql("select count(*) from pg_stat_activity where datname=current_database() and application_name='H7_RACE' and wait_event_type='Lock'"));if(waiting===2)break;await new Promise(r=>setTimeout(r,25))}
     check(waiting,2,'both real transactions at lock barrier')
     gate.stdin.end('commit;\n');await ended
     return await Promise.all([a,b])
   }finally{if(!gate.stdin.writableEnded)gate.stdin.end('rollback;\n')}
 }
 const companyLock=`select id from public.empresa_patrocinadora where id='${company.id}' for update`
 const paySQL=p=>`select public.registrar_pago_patrocinador(${j(p)})`
 const result=await race(companyLock,paySQL(payPayload([[invR,'70']],'70')),paySQL(payPayload([[invR,'60']],'60')))
 check(result.filter(r=>r.ok).length,1,'70+60 only one committed; no retry')
 check(result.find(r=>!r.ok).code,'40001','native serialization preserved')
 const remaining=Number(sql(`select pendiente from public.factura_patrocinador_saldo where id='${invR.id}'`));assert.ok([30,40].includes(remaining));checks++
 console.log('H7 real lock barrier 70+60/100: PASSED; remaining',remaining,'native',result.find(r=>!r.ok).code)
 const sameKey=payPayload([[invR2,'10']])
 const same=await race(companyLock,paySQL(sameKey),paySQL(sameKey))
 check(same.filter(r=>r.ok).length,1)
 check(sql(`select count(*) from public.pago_patrocinador where idempotency_key='${sameKey.idempotency_key}'`),'1','same-key race one financial effect')
 check((await rpc('registrar_pago_patrocinador',{p:sameKey})).idempotency_key,sameKey.idempotency_key)
 const finalPayment=await rpc('registrar_pago_patrocinador',{p:payPayload([[invR2,'90']],'90')})
 check(finalPayment.importe,90)
 check((await api('/factura_patrocinador_saldo?id=eq.'+invR2.id)).data[0].estado_financiero,'DESEMBOLSADA')
 await fail('registrar_pago_patrocinador',{p:payPayload([[invR2,'1']],'1')},'23514')
 // Two overlapping real HTTP requests have their own no-overpay oracle.
 const httpInvoice=await rpc('registrar_factura_patrocinador',{p:invoicePayload('100102','100',[os10])});await ready(httpInvoice)
 const httpRace=await Promise.all(['70','60'].map(amount=>api('/rpc/registrar_pago_patrocinador',f.actor,{p:payPayload([[httpInvoice,amount]],amount)})))
 check(httpRace.filter(r=>r.status===200).length,1)
 assert.ok(['23514','PT409','40001'].includes(httpRace.find(r=>r.status!==200).data.code));checks++
 // H3 sponsor assignment vs new H4 payment uses only the established academic lock order.
 sponsor(null)
 const h4=h4Payload()
 const h3p=cycleSponsorPayload(f,company.id)
 const assignRace=await race(`select id from public.ciclo where id='${f.cycle}' for update`,`select public.registrar_pago(${j(h4)})`,`select public.guardar_ciclo(${j(h3p)})`)
 check(assignRace.filter(r=>r.ok).length,1,'H3/H4 exactly one concurrent decision')
 const afterRace=enroll(f.enrollment)
 if(afterRace.empresa_patrocinadora_id)check(sql(`select count(*) from public.pago where idempotency_key='${h4.idempotency_key}'`),'0')
 else{check(sql(`select count(*) from public.pago where idempotency_key='${h4.idempotency_key}'`),'1');sponsor()}
 await fail('registrar_pago',{p:h4Payload()},'23514')
 check((await rpc('registrar_pago',{p:historical})).id,oldPayment.id)
 await rpc('anular_pago',{id:oldPayment.id,expected_updated_at:version('pago',oldPayment.id),motivo:'H7 HISTORICAL'})
 check(sql(`select estado_codigo from public.pago where id='${oldPayment.id}'`),'ANULADO')
 // Historic coverage remains despite later sponsor removal.
 sponsor(null)
 check(sql(`select count(*) from public.orden_servicio_matricula where matricula_id='${f.enrollment}'`),'3')
 // Invoice uniqueness is global, OS uniqueness is scoped to sponsor; historical coverage is not repriced.
 const f2=fixture()
 const company2=json(asActor(f2.actor,`select to_jsonb(public.guardar_empresa_patrocinadora('{"ruc":"20666666666","razon_social":"H7 SECOND"}'::jsonb))`))
 sql(asActor(f2.actor,`select public.guardar_ciclo(${j(cycleSponsorPayload(f2,company2.id))})`))
 const osOther=await rpc('registrar_orden_servicio',{p:{...osPayload('000123','100'),empresa_patrocinadora_id:company2.id,ciclo_id:f2.cycle,expected_ciclo_updated_at:version('ciclo',f2.cycle),matriculas:[{id:f2.enrollment,expected_updated_at:enroll(f2.enrollment).updated_at}]}})
 await fail('registrar_factura_patrocinador',{p:{...invoicePayload('000456','100',[osOther]),empresa_patrocinadora_id:company2.id}},'23505')
 await fail('registrar_factura_patrocinador',{p:invoicePayload('200001','100',[osOther])},'23514')
 await fail('registrar_pago_patrocinador',{p:{...payPayload([[invR2,'1']],'1'),empresa_patrocinadora_id:company2.id}},'23514')
 const historicCoverage=sql(`select to_jsonb(o) from public.orden_servicio o where id='${osOther.id}'`)
 sql(asActor(f2.actor,`select public.guardar_ciclo(${j(cycleSponsorPayload(f2,company.id))})`))
 const target=json(asActor(f2.actor,`select to_jsonb(public.guardar_ciclo(jsonb_build_object('carrera_id',c.carrera_id,'departamento_id',c.departamento_id,'provincia_id',c.provincia_id,'distrito_id',c.distrito_id,'capitania_id',c.capitania_id,'fecha_inicio','2039-01-01','fecha_fin','2039-02-01'))) from public.ciclo c where id='${f2.cycle}'`))
 const configured=json(asActor(f2.actor,`select to_jsonb(public.guardar_ciclo_tarifas('${target.id}','${target.updated_at}',(select jsonb_agg(jsonb_build_object('tarifa_id',tarifa_id,'importe',importe::text,'obligatorio',obligatorio::text)) from public.ciclo_tarifa where ciclo_id='${f2.cycle}' and activo)))`))
 sql(asActor(f2.actor,`select public.editar_matricula(${j({id:f2.enrollment,expected_updated_at:enroll(f2.enrollment).updated_at,ciclo_id:target.id,expected_ciclo_updated_at:configured.updated_at})})`))
 sql(asActor(f2.actor,`select public.anular_matricula('${f2.enrollment}','${enroll(f2.enrollment).updated_at}','H7 HISTORY')`))
 check(sql(`select to_jsonb(o) from public.orden_servicio o where id='${osOther.id}'`),historicCoverage,'OS history survives sponsor change, transfer and annulment')
 check(sql(`select count(*) from public.orden_servicio_matricula where orden_servicio_id='${osOther.id}' and matricula_id='${f2.enrollment}'`),'1')
 // Commercial amount/context and joins remain immutable even through accidental privileged DML.
 for(const command of [`update public.orden_servicio set monto=1 where id='${os2.id}'`,`delete from public.orden_servicio_matricula where orden_servicio_id='${os2.id}'`]){
   assert.throws(()=>runActor(command),/H7_HISTORY_IMMUTABLE/);checks++
 }
 check(sql("select count(*) from storage.buckets where id like 'h7%'"),'0','no H7 Storage infrastructure')
 check(sql(`select count(*) from public.auditoria where entidad in ('orden_servicio','factura_patrocinador','pago_patrocinador') and (new_values::text ~ 'domicilio|snapshot|20999999999|BANCO|token')`),'0')
 sql(readFileSync('tests/sql/h4-payments.sql','utf8'))
 sql(readFileSync('tests/sql/h4-regression.sql','utf8'))
 console.log('H7 JWT negative roles/DML, rollback, native concurrency, same-key race, H3↔H4 race and H4 regression PASSED')
 console.log('H7 assertions PASSED:',checks)
} finally {
 if(restStarted)docker(['rm','-f',rest])
 if(created)docker(['exec',container,'dropdb','-U','postgres','--force',database])
 if(roleCreated)sql(`drop role ${login}`,'postgres')
}
