import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { assertLocalProject, runLocal } from './local-platform.mjs'

// Disposable DATABASE on the existing local PostgreSQL container, never a reset.
// Copy schema + public reference catalogs ONLY; never copy human users, students or finances.
assertLocalProject()
const container = 'supabase_db_perumar-supabase', database = 'h4_test_' + randomUUID().replaceAll('-','')
const docker = args => runLocal('docker', ['exec','-i',container,...args], undefined,120000)
const sql = statement => {
 const r=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1'],{input:statement,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:20*1024*1024})
 if(r.status!==0)throw new Error('Isolated SQL failed: '+r.stderr?.split('\n').find(line=>line.startsWith('ERROR:')))
 return r.stdout.trim()
}
const refTables=['app_roles','catalogo','catalogo_valor','departamento','provincia','distrito','capitania']
let created = false
try {
  docker(['createdb','-U','postgres',database]);created=true
  const schema=docker(['pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=public','--schema=private','--schema=auth','--no-owner','--no-acl','--no-publications','--no-subscriptions'])
  sql('drop schema public cascade;create schema extensions;create extension btree_gist with schema extensions;')
  sql(schema)
  const reference=docker(['pg_dump','-U','postgres','-d','postgres','--data-only',...refTables.flatMap(t=>['--table',`public.${t}`])])
  sql(reference)
  if(sql("select to_regclass('public.pago') is not null")!=='t') for(const name of ['20261109020000_h4_payment_model','20261109030000_h4_payment_commands','20261109040000_h4_enrollment_guards'])sql(readFileSync(`supabase/migrations/${name}.sql`,'utf8'))
  const conflictFunctions="select json_object_agg(n.nspname||'.'||p.proname,pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='private' and p.proname='require_version') or (n.nspname='public' and p.proname in ('cambiar_estado_ciclo','registrar_pago','anular_pago'));"
  const definitionsBefore=JSON.parse(sql(conflictFunctions))
  sql(readFileSync('supabase/migrations/20261109050000_logical_conflicts_pt409.sql','utf8'))
  const definitionsAfter=JSON.parse(sql(conflictFunctions))
  for(const [name,definition] of Object.entries(definitionsBefore))assert.equal(definitionsAfter[name].replaceAll('\r\n','\n'),definition.replaceAll('\r\n','\n').replaceAll("errcode='40001'","errcode='PT409'"),'Only the deliberate error contract may change')
  assert.equal(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosrc ~* 'errcode[[:space:]]*=[[:space:]]*''40001''';"),'0')
  console.log('Logical conflicts PT409: PASSED (effective definitions contain no deliberate 40001; function contracts otherwise identical)')
  sql('drop view if exists public.matricula_pago_listado;')
  sql(readFileSync('supabase/migrations/20261109060000_direct_payment_access.sql','utf8'))
  sql(readFileSync('tests/sql/h4-payments.sql','utf8'))
  sql(readFileSync('tests/sql/h4-regression.sql','utf8'))
  console.log('H4 isolated H3 regression, C-H4-001, states, historical UUIDs and sponsor: PASSED')
  console.log('H4 isolated schema + reference bootstrap and rollback invariants: PASSED')
  const fixtureSource=readFileSync('tests/sql/h4-payments.sql','utf8')
  const setup=fixtureSource.slice(fixtureSource.indexOf('do $$'),fixtureSource.indexOf(' select v.id into medium'))
  const fixture=(optional=false)=>{
    const result=sql(`create temporary table fixture_result(value jsonb);${setup}
    ${optional?`select * into c from public.ciclo where id=c.id;
    t:=public.guardar_tarifa(jsonb_build_object('codigo','OPT'||token,'nombre','H4 OPTIONAL','tipo','OTRO','monto_por_defecto','100'));
    select jsonb_agg(jsonb_build_object('tarifa_id',tarifa_id,'importe',importe::text,'obligatorio',obligatorio::text)) into charges from public.ciclo_tarifa where ciclo_id=c.id;
    c:=public.guardar_ciclo_tarifas(c.id,c.updated_at,charges||jsonb_build_array(jsonb_build_object('tarifa_id',t.id,'importe','100','obligatorio','false')));
    e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'expected_ciclo_updated_at',c.updated_at),array[(select id from public.ciclo_tarifa where ciclo_id=c.id and tarifa_id=t.id)]);`:''}
    select v.id into medium from public.catalogo_valor v join public.catalogo cat on cat.id=v.catalogo_id where cat.codigo='MEDIO_PAGO' and v.codigo='EFECTIVO';
    select id into cargo_id from public.matricula_cargo where matricula_id=e.id and activo and (not ${optional} or tipo='OTRO') limit 1;
    insert into fixture_result values(jsonb_build_object('actor',actor,'coordinator',coordinator,'enrollment',e.id,'version',e.updated_at,'cycle',c.id,'cycleVersion',c.updated_at,'student',a.id,'charge',cargo_id,'medium',medium));
    end $$;select value from fixture_result;`)
    return JSON.parse(result.split('\n').find(line=>line.startsWith('{')))
  }
  const asActor=(f,body)=>`begin isolation level serializable;select set_config('request.jwt.claim.sub','${f.actor}',true);${body};set constraints all immediate;commit;`
  const payload=(f,amount,key=randomUUID())=>({matricula_id:f.enrollment,expected_matricula_updated_at:f.version,idempotency_key:key,importe:amount,medio_pago_id:f.medium,aplicaciones:[{matricula_cargo_id:f.charge,importe:amount}]})
  const register=p=>`select public.registrar_pago('${JSON.stringify(p)}'::jsonb)->>'id'`
  const run=(statement)=>{
    const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'],{windowsHide:true})
    let output='',error='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>error+=chunk)
    const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({ok:code===0,output,sqlstate:error.match(/\b(40001|40P01|PT409|23505|23514)\b/)?.[1]}))})
    child.stdin.end(statement);return done
  }
  async function race(f,left,right,otherCycle=null) {
    // The coordinator holds the common Cycle lock until BOTH real sessions wait on it.
    const gate=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1'],{windowsHide:true})
    let locked=false;gate.stdout.on('data',chunk=>{if(String(chunk).includes('H4_BARRIER'))locked=true});gate.stderr.on('data',()=>{})
    const ended=new Promise((resolve,reject)=>{gate.on('error',reject);gate.on('close',code=>code===0?resolve():reject(new Error('Barrier failed')))})
    gate.stdin.write(`begin;select id from public.ciclo where id in ('${f.cycle}'${otherCycle?`, '${otherCycle}'`:''}) order by id for update;select 'H4_BARRIER';\n`)
    const deadline=Date.now()+15000
    try {
      while(!locked&&Date.now()<deadline)await new Promise(r=>setTimeout(r,25))
      assert.ok(locked,'Barrier did not acquire Cycle lock')
      const a=run(`set application_name='H4_RACE';${asActor(f,left)}`),b=run(`set application_name='H4_RACE';${asActor(f,right)}`)
      let waiting=0
      while(Date.now()<deadline){waiting=Number(sql("select count(*) from pg_stat_activity where datname=current_database() and application_name='H4_RACE' and wait_event_type='Lock';"));if(waiting===2)break;await new Promise(r=>setTimeout(r,25))}
      assert.equal(waiting,2,'Both actual transactions must reach the lock barrier')
      gate.stdin.end('commit;\n');await ended
      const results=await Promise.all([a,b]);assert.equal(results.filter(r=>r.ok).length,1,'Exactly one racing command should commit; no retries')
      return results
    } finally {if(!gate.stdin.writableEnded)gate.stdin.end('rollback;\n')}
  }
  const balance=f=>JSON.parse(sql(`select row_to_json(s) from public.matricula_saldo s where matricula_id='${f.enrollment}'`))
  const freshVersion=f=>sql(`select updated_at from public.matricula where id='${f.enrollment}'`)
  {
    const f=fixture();const result=await race(f,register(payload(f,'70')),register(payload(f,'60')));assert.equal(result.find(r=>!r.ok).sqlstate,'40001','The real SERIALIZABLE failure must still propagate unchanged')
    const s=balance(f);assert.ok([60,70].includes(s.abonado));assert.ok(s.pendiente>=0);assert.notEqual(s.abonado,130)
    const projected=JSON.parse(sql(`select row_to_json(v) from public.matricula_pago_listado v where matricula_id='${f.enrollment}'`));assert.equal(projected.pendiente,s.pendiente);assert.equal(projected.alumno_id,f.student);assert.equal(projected.ciclo_id,f.cycle)
    console.log('H4 70+60 / saldo100: PASSED (2 SERIALIZABLE connections, lock barrier, one commit, no retries)')
  }
  {
    const f=fixture(),p=payload(f,'70');await race(f,register(p),register(p))
    const original=sql(`select id from public.pago where idempotency_key='${p.idempotency_key}'`)
    sql(asActor(f,register(p)));assert.equal(sql(`select count(*) from public.pago where idempotency_key='${p.idempotency_key}'`),'1')
    assert.equal(sql(`select count(*) from public.auditoria where entidad='pago' and registro_id='${original}'`),'1')
    console.log('H4 simultaneous UUID and explicit replay after conflict: PASSED (one payment/event)')
  }
  {
    const f=fixture();sql(asActor(f,register(payload(f,'70'))));const p=JSON.parse(sql(`select row_to_json(p) from public.pago p where matricula_id='${f.enrollment}'`))
    const cancel=`select public.anular_pago('${p.id}','${p.updated_at}','SYNTHETIC CORRECTION')->>'id'`
    await race(f,cancel,cancel);assert.equal(balance(f).abonado,0)
    assert.equal(sql(`select count(*) from public.auditoria where entidad='pago' and registro_id='${p.id}' and accion='PAGO_ANULADO'`),'1')
    console.log('H4 concurrent annulment: PASSED (one release/event)')
  }
  {
    const f=fixture();await race(f,register(payload(f,'70')),`select (public.editar_matricula('${JSON.stringify({id:f.enrollment,expected_updated_at:f.version,descuento:'50',motivo_descuento:'SYNTHETIC'})}'::jsonb)).id`)
    assert.ok(balance(f).pendiente>=0);console.log('H4 payment vs discount: PASSED')
  }
  {
    const f=fixture();sql(asActor(f,register(payload(f,'70'))));f.version=freshVersion(f)
    const p=JSON.parse(sql(`select row_to_json(p) from public.pago p where matricula_id='${f.enrollment}'`))
    await race(f,`select public.anular_pago('${p.id}','${p.updated_at}','SYNTHETIC')->>'id'`,register(payload(f,'30')))
    assert.ok(balance(f).pendiente>=0);console.log('H4 annulment vs new payment: PASSED')
  }
  {
    const f=fixture(true);await race(f,register(payload(f,'70')),`select (public.editar_matricula('${JSON.stringify({id:f.enrollment,expected_updated_at:f.version,expected_ciclo_updated_at:f.cycleVersion})}'::jsonb,'{}'::uuid[])).id`)
    assert.ok(balance(f).pendiente>=0)
    assert.equal(sql(`select count(*) from public.pago_aplicacion a join public.pago p on p.id=a.pago_id join public.matricula_cargo c on c.id=a.matricula_cargo_id where p.matricula_id='${f.enrollment}' and p.estado_codigo='CONFIRMADO' and not c.activo`),'0')
    console.log('H4 payment vs optional cargo retirement: PASSED')
  }
  {
    const f=fixture(),target=fixture();await race(f,register(payload(f,'70')),`select (public.editar_matricula('${JSON.stringify({id:f.enrollment,expected_updated_at:f.version,ciclo_id:target.cycle,expected_ciclo_updated_at:target.cycleVersion})}'::jsonb,'{}'::uuid[])).id`)
    assert.equal(sql(`select count(*) from public.pago p join public.matricula m on m.id=p.matricula_id where m.id='${f.enrollment}' and m.ciclo_id<>'${f.cycle}'`),'0')
    console.log('H4 payment vs Cycle transfer: PASSED')
  }
  {
    const f=fixture(),reason=sql("select v.id from public.catalogo_valor v join public.catalogo c on c.id=v.catalogo_id where c.codigo='MOTIVO_CICLO_DESIERTO' and v.activo limit 1")
    await race(f,register(payload(f,'70')),`select (public.cambiar_estado_ciclo('${f.cycle}','${f.cycleVersion}','DESIERTO','SYNTHETIC','${reason}')).id`)
    assert.equal(sql(`select count(*) from public.pago p join public.matricula m on m.id=p.matricula_id join public.ciclo c on c.id=m.ciclo_id where m.id='${f.enrollment}' and c.estado_codigo in ('DESIERTO','ANULADO')`),'0')
    console.log('H4 payment vs forbidden Cycle state: PASSED')
  }
  {
    const f=fixture();sql(asActor(f,register(payload(f,'70'))));f.version=freshVersion(f)
    const p=JSON.parse(sql(`select row_to_json(p) from public.pago p where matricula_id='${f.enrollment}'`))
    await race(f,`select public.anular_pago('${p.id}','${p.updated_at}','SYNTHETIC')->>'id'`,`select (public.editar_matricula('${JSON.stringify({id:f.enrollment,expected_updated_at:f.version,descuento:'50',motivo_descuento:'SYNTHETIC'})}'::jsonb)).id`)
    assert.ok(balance(f).pendiente>=0);console.log('H4 annulment vs discount: PASSED')
  }
  {
    const f=fixture();sql(asActor(f,register(payload(f,'70'))));f.version=freshVersion(f)
    const p=JSON.parse(sql(`select row_to_json(p) from public.pago p where matricula_id='${f.enrollment}'`))
    await race(f,`select public.anular_pago('${p.id}','${p.updated_at}','SYNTHETIC')->>'id'`,`select (public.anular_matricula('${f.enrollment}','${f.version}','SYNTHETIC')).id`)
    assert.ok(balance(f).pendiente>=0);console.log('H4 annulment vs enrollment freeze: PASSED')
  }
  {
    const f=fixture(),other=fixture(),key=randomUUID();await race(f,register(payload(f,'70',key)),register(payload(other,'60',key)),other.cycle)
    assert.equal(sql(`select count(*) from public.pago where idempotency_key='${key}'`),'1')
    assert.ok(balance(f).pendiente>=0&&balance(other).pendiente>=0)
    console.log('H4 same global UUID / different enrollments concurrently: PASSED')
  }
  {
    const f=fixture();await race(f,register(payload(f,'70')),`select (public.editar_matricula('${JSON.stringify({id:f.enrollment,expected_updated_at:f.version,empresa_patrocinadora_id:null})}'::jsonb)).id`)
    assert.ok(balance(f).pendiente>=0);console.log('H4 payment vs sponsor edit: PASSED')
  }
  {
    const f=fixture();await race(f,register(payload(f,'70')),`select (public.anular_matricula('${f.enrollment}','${f.version}','SYNTHETIC')).id`)
    assert.ok(balance(f).pendiente>=0);console.log('H4 payment vs enrollment annulment: PASSED')
  }
  {
    // Engine-produced deadlock, isolated SQL harness only. Product lock ordering is NOT changed.
    const first=fixture(),second=fixture()
    const session=own=>{
      const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'],{windowsHide:true})
      const state={ready:false};let error=''
      child.stdout.on('data',chunk=>{if(String(chunk).includes('NATIVE_DEADLOCK_READY'))state.ready=true})
      child.stderr.on('data',chunk=>error+=chunk)
      const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({ok:code===0,sqlstate:error.match(/\b40P01\b/)?.[0]}))})
      child.stdin.write(`begin;set local deadlock_timeout='100ms';select id from public.ciclo where id='${own}' for update;select 'NATIVE_DEADLOCK_READY';\n`)
      return {child,state,done}
    }
    const a=session(first.cycle),b=session(second.cycle),deadline=Date.now()+15000
    try {
      while((!a.state.ready||!b.state.ready)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,25))
      assert.ok(a.state.ready&&b.state.ready,'Both sessions must hold their first lock')
      a.child.stdin.end(`select id from public.ciclo where id='${second.cycle}' for update;commit;\n`)
      b.child.stdin.end(`select id from public.ciclo where id='${first.cycle}' for update;commit;\n`)
      const result=await Promise.all([a.done,b.done]);assert.equal(result.filter(r=>r.ok).length,1);assert.equal(result.find(r=>!r.ok).sqlstate,'40P01')
      console.log('Native PostgreSQL 40001 (70/60 race) and 40P01 (real deadlock): PASSED, untranslated and without retry')
    } finally {
      for(const x of [a,b])if(!x.child.stdin.writableEnded)x.child.stdin.end('rollback;\n')
    }
  }
} finally {
  if(created)docker(['dropdb','-U','postgres','--force',database])
}
console.log('H4 disposable database removed; human database was never reset or written')
