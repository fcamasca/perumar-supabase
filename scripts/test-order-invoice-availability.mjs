import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { assertLocalProject, runLocal } from './local-platform.mjs'

assertLocalProject()
const db = 'sponsor_' + randomBytes(6).toString('hex'), container = 'supabase_db_perumar-supabase'
const docker = (args, input) => runLocal('docker', args, input, 120000)
const sql = (input, database = db) => {
  const r = spawnSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', database, '-At', '-v', 'ON_ERROR_STOP=1'], { input, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 30 * 1024 * 1024 })
  if (r.status !== 0) throw Error(r.stderr)
  return r.stdout.trim()
}
let created = false
try {
  docker(['exec', container, 'createdb', '-U', 'postgres', db]); created = true
  // Schema ONLY, then synthetic/reference fixtures. No human data or stack reset.
  const schema = docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--schema-only', '--schema=public', '--schema=private', '--schema=auth', '--schema=storage', '--schema=extensions', '--no-owner', '--no-acl', '--no-publications', '--no-subscriptions'])
  sql('drop schema public;')
  sql('create schema extensions;create extension btree_gist with schema extensions;create extension pgcrypto with schema extensions;')
  sql(schema.replace('CREATE SCHEMA extensions;', 'CREATE SCHEMA IF NOT EXISTS extensions;'))
  const referenceTables = ['app_roles', 'catalogo', 'catalogo_valor', 'departamento', 'provincia', 'distrito', 'capitania']
  const references = docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--data-only', ...referenceTables.map(t => '--table=public.' + t), '--no-owner', '--no-acl'])
  sql(references)
  if(sql("select count(*) from information_schema.columns where table_schema='public' and table_name='ciclo' and column_name='empresa_patrocinadora_id'")==='0')sql(readFileSync('supabase/migrations/20261123040000_h7_cycle_sponsor.sql','utf8'))
  const source = readFileSync('tests/sql/h4-payments.sql', 'utf8')
  const setup = source.slice(source.indexOf('do $$'), source.indexOf(' select v.id into medium'))
  sql(`create table public.order_test_context(value jsonb);${setup}
   insert into public.order_test_context values(jsonb_build_object('actor',actor,'student',a.id,'cycle',c.id,'enrollment',e.id,'coordinator',coordinator));end $$;`)

  sql(readFileSync('supabase/migrations/20261125030000_h7_order_invoice_availability.sql','utf8'))
  sql(readFileSync('tests/sql/order-invoice-availability.sql','utf8'))

  const ctx=JSON.parse(sql('select value from public.order_test_context'))
  const concurrent=(number)=>new Promise(resolve=>{
    const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d',db,'-At','-v','ON_ERROR_STOP=1'],{windowsHide:true})
    let output='';child.stdout.on('data',chunk=>{output+=chunk});child.stderr.on('data',chunk=>{output+=chunk})
    child.on('close',code=>resolve({code,output}))
    const payload=JSON.stringify({...ctx.invoice_payload,correlativo:String(number)})
    child.stdin.end(`begin;select set_config('request.jwt.claim.sub','${ctx.actor}',true);select public.registrar_factura_patrocinador('${payload}'::jsonb);select pg_sleep(0.3);commit;`)
  })
  const races=await Promise.all([concurrent(4),concurrent(5)])
  if(races.filter(r=>r.code===0).length!==1||!races.some(r=>r.code!==0&&/H7_OS_ALREADY_INVOICED|could not serialize/.test(r.output)))throw Error('Concurrent invoice safety failed: '+JSON.stringify(races))
  if(sql(`select count(*) from public.factura_orden_servicio fo join public.factura_patrocinador f on f.id=fo.factura_id where fo.orden_servicio_id='${ctx.invoice_payload.ordenes[0].id}' and f.anulado_at is null`)!=='1')throw Error('Concurrent OS has more than one live invoice')
  console.log('OS invoice availability: focused DB checks PASSED (live exclusion, atomic rejection, annulment/reuse, preserved history, concurrent duplicate prevention).')
} finally {
  if (created) docker(['exec', container, 'dropdb', '-U', 'postgres', '--force', db])
}
