import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertLocalProject, inspectDatabase, runLocal } from './local-platform.mjs'
assertLocalProject()
const fingerprint="select md5(string_agg(tab||data,'|' order by tab)) from (select 'audit' tab,coalesce(jsonb_agg(to_jsonb(a) order by id)::text,'') data from public.auditoria a union all select 'matricula',coalesce(jsonb_agg(to_jsonb(m) order by id)::text,'') from public.matricula m union all select 'cargo',coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'') from public.matricula_cargo c union all select 'alumno',coalesce(jsonb_agg(to_jsonb(s) order by id)::text,'') from public.alumno s union all select 'pago',coalesce(jsonb_agg(to_jsonb(p) order by id)::text,'') from public.pago p) x;"
const before=inspectDatabase(fingerprint)
const base=readFileSync('tests/sql/h4-payments.sql','utf8'),anchor=' select v.id into medium'
assert.ok(base.includes(anchor),'shared rollback fixture setup anchor')
const sql=base.slice(0,base.indexOf(anchor))+readFileSync('tests/sql/h5-audit.sql','utf8')
runLocal('docker',['exec','-i','supabase_db_perumar-supabase','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],sql)
assert.equal(inspectDatabase(fingerprint),before,'H5 rollback modified persistent business/audit data')
console.log('H5 closed audit, true actor, exact version, expiry, eligibility and no persisted mutations: PASSED DB rollback')

const sourceSql=base.slice(0,base.indexOf(anchor))+readFileSync('tests/sql/h5-source.sql','utf8')
runLocal('docker',['exec','-i','supabase_db_perumar-supabase','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],sourceSql)
assert.equal(inspectDatabase(fingerprint),before,'H5 source/closure rollback persisted data')
console.log('CHG-H5-002 current/final source, canonical fingerprint, immutable snapshots, atomic close and PII-free audit: PASSED DB rollback')
