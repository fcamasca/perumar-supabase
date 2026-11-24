import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
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
  // Reconstruct just the five affected pre-amendment definitions in this
  // disposable clone, so the upgrade test also works after the local migration.
  for (const [file, name] of [
    ['20261022160000_h2_academic_commands.sql', 'public.guardar_ciclo'],
    ['20261023020000_h3_enrollment_commands.sql', 'public.registrar_matricula'],
    ['20261023020000_h3_enrollment_commands.sql', 'public.editar_matricula'],
    ['20261113010000_h5_current_and_closure_source.sql', 'private.guard_enrollment_history'],
    ['20261123020000_h7_billing_commands.sql', 'public.registrar_orden_servicio'],
  ]) {
    const definition = readFileSync('supabase/migrations/' + file, 'utf8').match(new RegExp('create(?: or replace)? function ' + name.replace('.', '\\.') + '\\([\\s\\S]*?\nend;? \\$\\$;'))?.[0]
    assert.ok(definition, 'missing pre-amendment function: ' + name)
    sql(definition.replace('create function ', 'create or replace function '))
  }
  sql('drop view if exists public.ciclo_orden_servicio_saldo;')
  sql('alter table public.ciclo drop column if exists empresa_patrocinadora_id;')
  const referenceTables = ['app_roles', 'catalogo', 'catalogo_valor', 'departamento', 'provincia', 'distrito', 'capitania']
  const references = docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--data-only', ...referenceTables.map(t => '--table=public.' + t), '--no-owner', '--no-acl'])
  sql(references)
  const source = readFileSync('tests/sql/h4-payments.sql', 'utf8')
  const setup = source.slice(source.indexOf('do $$'), source.indexOf(' select v.id into medium'))
  sql(`create table public.sponsor_test_context(value jsonb);${setup}
    insert into public.sponsor_test_context values(jsonb_build_object('actor',actor,'student',a.id,'cycle',c.id,'enrollment',e.id));end $$;`)
  const context = JSON.parse(sql('select value from public.sponsor_test_context'))
  const company = sql(`select set_config('request.jwt.claim.sub','${context.actor}',false);select (public.guardar_empresa_patrocinadora('{"ruc":"20711111111","razon_social":"SPONSOR TEST"}')).id;`).split('\n').at(-1)
  // Exercise the actual pre-migration backfill with one known sponsor + NULL.
  sql(`select set_config('request.jwt.claim.sub','${context.actor}',false);select public.editar_matricula(jsonb_build_object('id','${context.enrollment}','expected_updated_at',(select updated_at from public.matricula where id='${context.enrollment}'),'empresa_patrocinadora_id','${company}'));`)
  const migration = readFileSync('supabase/migrations/20261123040000_h7_cycle_sponsor.sql', 'utf8')
  // Verify ambiguous data blocks the whole migration, without picking a company.
  sql(`${setup}
    e:=public.editar_matricula(jsonb_build_object('id',e.id,'expected_updated_at',e.updated_at,'ciclo_id','${context.cycle}','expected_ciclo_updated_at',(select updated_at from public.ciclo where id='${context.cycle}'),'empresa_patrocinadora_id',(public.guardar_empresa_patrocinadora('{"ruc":"20722222222","razon_social":"SECOND SPONSOR"}')).id));
    update public.sponsor_test_context set value=value||jsonb_build_object('ambiguous',e.id);end $$;`)
  let rejected = false
  try { sql(migration) } catch (e) { rejected = String(e).includes('CYCLE_SPONSOR_BACKFILL_AMBIGUOUS') }
  assert.ok(rejected, 'ambiguous backfill must fail')
  assert.equal(sql("select count(*) from information_schema.columns where table_schema='public' and table_name='ciclo' and column_name='empresa_patrocinadora_id'"), '0', 'failed migration is atomic')
  sql(`select set_config('request.jwt.claim.sub','${context.actor}',false);update public.matricula set empresa_patrocinadora_id=null where id=(select (value->>'ambiguous')::uuid from public.sponsor_test_context);`)
  sql(migration)
  sql(readFileSync('tests/sql/cycle-sponsor.sql', 'utf8'))
  console.log('Cycle sponsorship: focused DB checks PASSED (12 requested scenarios + invariant, atomic rollback and ambiguous backfill).')
} finally {
  if (created) docker(['exec', container, 'dropdb', '-U', 'postgres', '--force', db])
}
