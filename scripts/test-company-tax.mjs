import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { assertLocalProject } from './local-platform.mjs'
assertLocalProject()
const container='supabase_db_perumar-supabase',database='h7_tax_'+randomUUID().replaceAll('-','')
function docker(args,input){const r=spawnSync('docker',args,{input,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:40*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stdout}
const sql=text=>docker(['exec','-i',container,'psql','-U','postgres','-d',database,'-At','-v','ON_ERROR_STOP=1'],text)
const j=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb"
let created=false,checks=0
const check=(v,w)=>{assert.deepEqual(v,w);checks++}
try {
 docker(['exec',container,'createdb','-U','postgres',database]);created=true
 const platform=docker(['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=auth','--schema=storage','--no-owner','--no-acl','--no-publications','--no-subscriptions'])
 sql('create schema extensions;create extension btree_gist with schema extensions;');sql(platform)
 const migrations=readdirSync('supabase/migrations').filter(f=>/^\d.*\.sql$/.test(f)).sort()
 const newest='20261125050000_h7_company_tax_reference.sql'
 for(const f of migrations.filter(f=>f!==newest))sql(readFileSync('supabase/migrations/'+f,'utf8'))
 const actor=randomUUID(),coordinator=randomUUID(),admin=randomUUID()
 sql(`insert into auth.users(id) values('${actor}'),('${coordinator}'),('${admin}');insert into public.app_users(id) values('${actor}'),('${coordinator}'),('${admin}');insert into public.app_user_roles(user_id,role_code) values('${actor}','DIRECTOR_ACADEMICO'),('${coordinator}','COORDINADOR_ACADEMICO'),('${admin}','ADMIN_SISTEMA');`)
 const run=(text,who=actor)=>sql(`begin isolation level serializable;set local role authenticated;select set_config('request.jwt.claim.sub','${who}',true);${text};commit;`)
 const json=(text,who=actor)=>JSON.parse(run(text,who).split('\n').find(x=>x.startsWith('{')))
 const save=(p,who=actor)=>json(`select to_jsonb(public.guardar_empresa_patrocinadora(${j(p)}))`,who)
 const version=r=>({id:r.id,expected_updated_at:r.updated_at})
 const old=save({ruc:'20100047218',razon_social:'PREEXISTENTE'})
 sql(readFileSync('supabase/migrations/'+newest,'utf8'))
 check(sql(`select (domicilio_fiscal is null and datos_tributarios is null)::text from public.empresa_patrocinadora where id='${old.id}'`).trim(),'true')
 const tax={ruc:old.ruc,razon_social:'CONSULTADA',estado:'ACTIVO',condicion:'HABIDO',direccion:'REFERENCIA PRIVADA',ubigeo:'150114',source:'SUNAT',as_of:'2026-01-01',proveedor:'OpenRUC',consultado_at:'2026-01-02T10:00:00.000Z'}
 let current=save({...version(old),ruc:old.ruc,razon_social:'OPERATIVA',domicilio_fiscal:'DOMICILIO OPERATIVO',datos_tributarios:tax},coordinator)
 check(current.datos_tributarios,tax);check(current.domicilio_fiscal,'DOMICILIO OPERATIVO');check(current.razon_social,'OPERATIVA')
 // Legacy callers omit the new fields: preserve them if RUC is unchanged.
 current=save({...version(current),ruc:old.ruc,razon_social:'CORREGIDA'})
 check(current.datos_tributarios,tax);check(current.domicilio_fiscal,'DOMICILIO OPERATIVO')
 const baseline=sql(`select to_jsonb(e) from public.empresa_patrocinadora e where id='${old.id}'`)
 const fail=(p,code='23514',who=actor)=>{assert.throws(()=>save(p,who),new RegExp(code));checks++;check(sql(`select to_jsonb(e) from public.empresa_patrocinadora e where id='${old.id}'`),baseline)}
 for(const change of [{_more:{}},{other:'x'},{ruc:'20131312955'},{proveedor:'OTHER'},{source:'OTHER'},{as_of:'2026-02-30'},{as_of:'2099-01-01'},{consultado_at:'bad'},{consultado_at:'2026-02-30T10:00:00.000Z'},{consultado_at:'2099-01-01T00:00:00.000Z'},{ubigeo:'1'},{estado:123},{direccion:'x'.repeat(501)},{razon_social:null}])fail({...version(current),ruc:old.ruc,razon_social:'CORREGIDA',datos_tributarios:{...tax,...change}},'empresa_tax_reference_valid')
 const missing={...tax};delete missing.estado
 fail({...version(current),ruc:old.ruc,razon_social:'CORREGIDA',datos_tributarios:missing},'empresa_tax_reference_valid')
 fail({...version(current),ruc:old.ruc,razon_social:'CORREGIDA',datos_tributarios:[]},'empresa_tax_reference_valid')
 fail({...version(current),ruc:old.ruc,razon_social:'CORREGIDA',domicilio_fiscal:'x'.repeat(501)},'domicilio_fiscal_check')
 assert.throws(()=>save({...version(old),ruc:old.ruc,razon_social:'STALE'}));checks++
 assert.throws(()=>save({...version(current),ruc:old.ruc,razon_social:'DENIED'},admin),/autorizada/);checks++
 check(run('select count(*) from public.empresa_patrocinadora',admin).trim().split('\n').at(-2),'0')
 for(const command of [`update public.empresa_patrocinadora set domicilio_fiscal='FORGED' where id='${old.id}'`,`delete from public.empresa_patrocinadora where id='${old.id}'`,`insert into public.empresa_patrocinadora(ruc,razon_social) values('20131312955','FORGED')`]){assert.throws(()=>run(command),/permission denied/);checks++}
 check(sql(`select count(*) from public.auditoria where entidad='empresa_patrocinadora' and (coalesce(old_values::text,'')||coalesce(new_values::text,'')) ~ 'REFERENCIA PRIVADA|DOMICILIO OPERATIVO|CONSULTADA|150114'`).trim(),'0')
 check(sql(`select count(*) from public.auditoria where entidad='empresa_patrocinadora' and new_values->'campos_modificados' ? 'datos_tributarios'`).trim(),'1')
 current=save({...version(current),ruc:'20131312955',razon_social:'OTRO RUC'})
 check(current.datos_tributarios,null)
 current=save({...version(current),ruc:current.ruc,razon_social:'MANUAL',datos_tributarios:null,domicilio_fiscal:null})
 check(current.datos_tributarios,null);check(current.domicilio_fiscal,null)
 check(save({ruc:'20999999999',razon_social:'MANUAL SIN CONSULTA'}).datos_tributarios,null)
 console.log(`Company tax migration/RPC/RLS/audit/version regression: ${checks}/${checks} PASSED (isolated database; no human data copied)`)
}finally{if(created)docker(['exec',container,'dropdb','-U','postgres','--force',database])}
