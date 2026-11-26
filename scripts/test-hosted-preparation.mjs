import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { assertLocalProject, runLocal } from './local-platform.mjs'

// Tests repository procedures in a disposable LOCAL database. No Cloud target accepted.
assertLocalProject()
const container = 'supabase_db_perumar-supabase'
const database = 'hosted_prep_' + randomUUID().replaceAll('-', '')
const docker = (args, input) => runLocal('docker', args, input, 120_000)
function sql(input, variables = {}) {
  return spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', database, '-At', '-v', 'ON_ERROR_STOP=1', ...Object.entries(variables).flatMap(([key, value]) => ['-v', `${key}=${value}`])], { input, encoding: 'utf8', windowsHide: true, timeout: 120_000, maxBuffer: 30 * 1024 * 1024 })
}
function checked(input, variables) {
  const result = sql(input, variables)
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}
// Expand relative psql includes using the checked-in file locations; no copied SQL implementation.
function include(file) {
  return readFileSync(file, 'utf8').replace(/^\\ir (.+)$/gm, (_, relative) => include(path.resolve(path.dirname(file), relative.trim())))
}
let created = false
try {
  docker(['exec', container, 'createdb', '-U', 'postgres', database]); created = true
  const platform = docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--schema-only', '--schema=auth', '--schema=storage', '--no-owner', '--no-acl', '--no-publications', '--no-subscriptions'])
  checked('create schema extensions; create extension btree_gist with schema extensions;')
  checked(platform)
  checked('create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key);')
  const loader = include('supabase/reference/load-hosted-catalogs.sql')
  assert.notEqual(sql(loader).status, 0, 'Must reject missing migration history')
  const migrations = readdirSync('supabase/migrations').filter(file => /^\d.*\.sql$/.test(file)).sort()
  assert.equal(migrations.length, 41)
  for (const file of migrations) {
    checked(readFileSync('supabase/migrations/' + file, 'utf8'))
    checked(`insert into supabase_migrations.schema_migrations values('${file.split('_')[0]}');`)
  }
  assert.equal(checked('select count(*) from public.carrera;'), '0', 'DICAPI load must await base reference catalogs')
  checked(loader)
  const fingerprint = () => checked(`select json_build_object('catalogs',(select count(*) from public.catalogo_valor),'courses',(select count(*) from public.carrera),'subjects',(select count(*) from public.carrera_materia),'districts',(select count(*) from public.distrito));`)
  const before = fingerprint()
  assert.notEqual(sql(loader).status, 0, 'Must reject repeated seed without modifying data')
  assert.equal(fingerprint(), before)
  assert.equal(checked("select count(*) from pg_trigger where tgname in ('materia_audit','carrera_audit','carrera_materia_audit') and tgenabled='O';"), '3', 'All audit triggers must remain enabled')
  assert.equal(checked('select count(*) from public.alumno;'), '0')
  assert.equal(checked('select count(*) from auth.users;'), '0')
  const bootstrap = readFileSync('supabase/reference/bootstrap-hosted-user.sql', 'utf8')
  const id = randomUUID()
  const params = { auth_user_id: id, role_code: 'COORDINADOR_ACADEMICO' }
  assert.notEqual(sql(bootstrap, params).status, 0, 'No profile without confirmed Auth identity')
  checked(`insert into auth.users(id,email) values('${id}','hosted-synthetic@example.invalid');`)
  assert.notEqual(sql(bootstrap, params).status, 0, 'Unconfirmed identity must be rejected')
  checked(`update auth.users set email_confirmed_at=now() where id='${id}';`)
  assert.notEqual(sql(bootstrap, { ...params, role_code: 'ADMIN' }).status, 0, 'Historical role must be rejected')
  checked(bootstrap, params)
  checked(bootstrap, params)
  assert.equal(checked('select count(*) from public.app_user_roles;'), '1', 'Assignment is idempotent')
  checked(bootstrap, { ...params, role_code: 'DIRECTOR_ACADEMICO' })
  assert.equal(checked('select count(*) from public.app_user_roles;'), '2', 'Other approved assignments preserved')
  checked(`update public.app_users set active=false where id='${id}';`)
  assert.notEqual(sql(bootstrap, { ...params, role_code: 'ADMIN_SISTEMA' }).status, 0, 'Must not reactivate profile')
  assert.equal(checked('select active from public.app_users;'), 'f')
  assert.equal(checked('select count(*) from public.app_user_roles;'), '2')
  console.log('Hosted preparation: 41 migrations, ordered official catalogs, repeat rejection, audit triggers and secure user bootstrap PASSED in isolated local database.')
} finally {
  if (created) docker(['exec', container, 'dropdb', '-U', 'postgres', database])
}
