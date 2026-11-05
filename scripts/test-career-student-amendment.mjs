import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { localStatus, inspectDatabase, assertSecurityInventory, securityInventory } from './local-platform.mjs'

// Safe on a local database with human fixtures: no reset, all product writes roll back.
// Requires an existing active Director. Never print records, identities or credentials.
export async function verifyCareerStudentAmendment() {
  localStatus()
  const fingerprint = `select md5(coalesce(string_agg(t.name||t.content,'|' order by t.name),'')) from (
    select 'alumno' name,coalesce(string_agg(to_jsonb(a)::text,'|' order by id),'') content from public.alumno a
    union all select 'carrera',coalesce(string_agg(to_jsonb(c)::text,'|' order by id),'') from public.carrera c
    union all select 'materia',coalesce(string_agg(to_jsonb(m)::text,'|' order by id),'') from public.materia m
    union all select 'matricula',coalesce(string_agg(to_jsonb(m)::text,'|' order by id),'') from public.matricula m
    union all select 'ciclo',coalesce(string_agg(to_jsonb(c)::text,'|' order by id),'') from public.ciclo c
    union all select 'audit',coalesce(string_agg(to_jsonb(a)::text,'|' order by id),'') from public.auditoria a
    union all select 'contactos',coalesce(string_agg(to_jsonb(c)::text,'|' order by id),'') from public.alumno_contacto_emergencia c
    union all select 'asociaciones',coalesce(string_agg(to_jsonb(c)::text,'|' order by id),'') from public.carrera_materia c
    union all select 'valores',coalesce(string_agg(to_jsonb(v)::text,'|' order by id),'') from public.catalogo_valor v
  ) t;`
  const approved=JSON.parse(readFileSync('supabase/reference/dicapi-fishing-curricula.json','utf8'));
  const seeded=JSON.parse(inspectDatabase("select coalesce(json_agg(json_build_object('code',c.codigo_curso_dicapi,'subject',m.nombre)),'[]'::json) from public.carrera c join public.carrera_materia cm on cm.carrera_id=c.id join public.materia m on m.id=cm.materia_id where c.codigo_curso_dicapi in ('MAM-009','MAM-010');"));
  for(const course of approved.courses)for(const subject of course.subjects)assert.ok(seeded.some(x=>x.code===course.code&&x.subject===subject),'Missing approved DICAPI subject');
  const before=inspectDatabase(fingerprint)
  assertSecurityInventory(securityInventory())
  for (const file of ['career-dicapi','career-student-amendment','h2-optional-career-modality','h3-occupation']) {
    const sql=readFileSync(`tests/sql/${file}.sql`,'utf8')
    await transaction(sql)
    assert.equal(inspectDatabase(fingerprint),before,'Rollback changed existing records')
    console.log(`${file}: PASSED (real DB, rollback, invariants)`)
  }
  await transaction('begin;'+readFileSync('supabase/migrations/20261104020000_initial_dicapi_fishing_courses.sql','utf8')+'rollback;')
  assert.equal(inspectDatabase(fingerprint),before,'Repeated DICAPI load changed records')
  console.log('dicapi-initial-data: PASSED (official subjects present, repeat load rollback)')
  const sql=readFileSync('tests/sql/student-code-concurrency.sql','utf8')
  const outputs=await Promise.all(Array.from({length:8},()=>transaction(sql)))
  const codes=outputs.map(output=>output.match(/GENERATED_CODE:(A-[0-9]{7,})/)?.[1])
  assert.ok(codes.every(Boolean),'Each concurrent transaction must return a code')
  assert.equal(new Set(codes).size,8,'Global student code repeated under concurrency')
  assert.equal(inspectDatabase(fingerprint),before,'Concurrent rollback changed existing records')
  console.log('student-code-concurrency: PASSED (8 separate serializable transactions, unique codes, rollback; no retries)')
}
function transaction(sql) {
  return new Promise((resolve,reject)=>{
    const child=spawn('docker',['exec','-i','supabase_db_perumar-supabase','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{windowsHide:true,timeout:30000})
    let output='',error=''
    child.stdout.on('data',chunk=>{output+=chunk})
    child.stderr.on('data',chunk=>{error+=chunk})
    child.on('error',()=>reject(new Error('Local transaction could not start')))
    child.on('close',code=>code===0 ? resolve(output+error) : reject(new Error(error.split('\n').find(line=>line.startsWith('ERROR:')) ?? 'Local transaction failed; sensitive context omitted')))
    child.stdin.end(sql)
  })
}
if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  await verifyCareerStudentAmendment()
}
