import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertLocalProject, inspectDatabase, runLocal } from './local-platform.mjs'

// Safe on the human database: schema additions AND synthetic product data roll back.
assertLocalProject()
const fingerprint = `select md5(string_agg(name||content,'|' order by name)) from (
select 'matricula' name,coalesce(jsonb_agg(to_jsonb(m) order by id)::text,'') content from public.matricula m
union all select 'alumno',coalesce(jsonb_agg(to_jsonb(a) order by id)::text,'') from public.alumno a
union all select 'cargo',coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'') from public.matricula_cargo c
union all select 'audit',coalesce(jsonb_agg(to_jsonb(a) order by id)::text,'') from public.auditoria a
union all select 'ciclo',coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'') from public.ciclo c
union all select 'catalogo',coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'') from public.catalogo_valor c
) x;`
const before = inspectDatabase(fingerprint)
const installed = inspectDatabase("select to_regclass('public.pago') is not null;") === 't'
const migrations = installed ? '' : ['20261109020000_h4_payment_model','20261109030000_h4_payment_commands','20261109040000_h4_enrollment_guards'].map(name => readFileSync(`supabase/migrations/${name}.sql`, 'utf8')).join('\n')
const test = readFileSync('tests/sql/h4-payments.sql', 'utf8').replace(/^begin;/, '')
runLocal('docker', ['exec','-i','supabase_db_perumar-supabase','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'], `begin;${migrations}\n${test}`)
assert.equal(inspectDatabase(fingerprint), before, 'H4 rollback changed existing data')
console.log('H4 model, register, precision, idempotency, annulment, balance, H3 guards and minimal audit: PASSED (DB rollback; no persisted fixtures)')
