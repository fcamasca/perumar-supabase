import assert from 'node:assert/strict'
import { randomUUID, randomBytes, createHmac } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { assertLocalProject, runLocal } from './local-platform.mjs'

assertLocalProject()
const token = randomUUID().replaceAll('-', ''), database = 'h7_report_' + token
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
 const setup=src.slice(src.indexOf('do $$'),src.indexOf(' select v.id into medium')).replace("'importe','100'","'importe','1000000'")
 const fixture=()=>json(`create temporary table result(value jsonb);${setup}
 insert into result values(jsonb_build_object('actor',actor,'coordinator',coordinator,'student',a.id,'cycle',c.id,'cycleVersion',c.updated_at,'enrollment',e.id,'version',e.updated_at));
 end $$;select value from result;`)
 const f=fixture()
 const runActor=text=>sql(asActor(f.actor,text))
 const company=json(asActor(f.actor,`select to_jsonb(public.guardar_empresa_patrocinadora('{"ruc":"20777777777","razon_social":"H7 SYNTHETIC"}'::jsonb))`))
 const version=(table,id)=>sql(`select updated_at from public.${table} where id='${id}'`)
 const cycleSponsorPayload=(fixture,companyId)=>{const c=json(`select to_jsonb(c) from public.ciclo c where id='${fixture.cycle}'`);return Object.fromEntries(['id','carrera_id','fecha_inicio','fecha_fin','nombre_promocion','departamento_id','provincia_id','distrito_id','capitania_id'].map(k=>[k,c[k]]).concat([['expected_updated_at',c.updated_at],['empresa_patrocinadora_id',companyId]]))}
 const sponsor=(companyId=company.id)=>runActor(`select public.guardar_ciclo(${j(cycleSponsorPayload(f,companyId))})`)
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

 const order=async(correlativo,monto='10')=>rpc('registrar_orden_servicio',{p:{empresa_patrocinadora_id:company.id,ciclo_id:f.cycle,expected_ciclo_updated_at:version('ciclo',f.cycle),serie:'OS',correlativo,monto,fecha:'2026-01-01'}})
 const o1=await order('1','30'),o2=await order('2','20')
 const invoice=await rpc('registrar_factura_patrocinador',{p:{empresa_patrocinadora_id:company.id,serie:'F',correlativo:'1',importe:'50',fecha_emision:'2026-01-01',fecha_vencimiento:'2026-02-01',ordenes:[o1,o2].map(o=>({id:o.id,expected_updated_at:version('orden_servicio',o.id)}))}})
 for(const destino of ['REGISTRADA_PATROCINADOR','APROBADA','PENDIENTE_DESEMBOLSO'])await rpc('avanzar_factura_patrocinador',{id:invoice.id,expected_updated_at:version('factura_patrocinador',invoice.id),destino,fecha:'2026-01-02'})
 const payment=await rpc('registrar_pago_patrocinador',{p:{empresa_patrocinadora_id:company.id,idempotency_key:randomUUID(),importe:'15',banco:'Banco de Crédito del Perú (BCP)',fecha_efectiva:'2026-01-02',referencia_operacion:'=FORMULA',aplicaciones:[{factura_id:invoice.id,importe:'15',expected_updated_at:version('factura_patrocinador',invoice.id)}]}})
 const columns='id,tipo,importe::text,abonado::text,pendiente::text,beneficiarios,ordenes,facturas,ciclo_ids'
 const reports=()=>api('/facturacion_reporte?select='+columns+'&empresa_patrocinadora_id=eq.'+company.id)
 let report=(await reports()).data
 check(report.length,4,'one root per document')
 const ir=report.find(r=>r.id===invoice.id),pr=report.find(r=>r.id===payment.id)
 check(ir.importe,'50.00');check(ir.abonado,'15.00');check(ir.pendiente,'35.00');check(ir.ordenes.length,2)
 check(ir.beneficiarios.length,1,'two OS with same membership do not duplicate beneficiary')
 check(pr.importe,'15.00');check(pr.facturas.length,1,'application not multiplied by two OS');check(pr.facturas[0].aplicado,'15.00')
 // Move the pupil to another Cycle; report retains OS membership and its historical Cycle.
 const cycle=json(`select to_jsonb(c) from public.ciclo c where id='${f.cycle}'`)
 const cp=Object.fromEntries(['carrera_id','fecha_inicio','fecha_fin','nombre_promocion','departamento_id','provincia_id','distrito_id','capitania_id'].map(k=>[k,cycle[k]]))
 cp.fecha_inicio='2039-01-01';cp.fecha_fin='2039-01-02';cp.empresa_patrocinadora_id=company.id
 const second=await rpc('guardar_ciclo',{p:cp})
 const tariffs=JSON.parse(sql(`select jsonb_agg(jsonb_build_object('tarifa_id',tarifa_id,'importe',importe::text,'obligatorio',obligatorio::text)) from public.ciclo_tarifa where ciclo_id='${f.cycle}' and activo`))
 await rpc('guardar_ciclo_tarifas',{ciclo_id:second.id,expected_updated_at:version('ciclo',second.id),configuracion:tariffs})
 // A second enrollment for the same student is legal and must count as one person, two enrollments.
 const enrollment=await rpc('registrar_matricula',{p:{alumno_id:f.student,expected_alumno_updated_at:version('alumno',f.student),ciclo_id:second.id,expected_ciclo_updated_at:version('ciclo',second.id)}})
 const o3=await rpc('registrar_orden_servicio',{p:{empresa_patrocinadora_id:company.id,ciclo_id:second.id,expected_ciclo_updated_at:version('ciclo',second.id),serie:'OS',correlativo:'3',monto:'1',fecha:'2026-01-01'}})
 const many=(await reports()).data.flatMap(r=>r.beneficiarios)
 check(new Set(many.map(b=>b.alumno_id)).size,1,'one global person')
 check(new Set(many.map(b=>b.matricula_id)).size,2,'two distinct enrollments')
 check(many.some(b=>b.matricula_id===enrollment.id),true)
 const originalName=ir.beneficiarios[0].nombre
 // Current identity changes must not rewrite the initial enrollment identity in this projection.
 const pupil=json(`select to_jsonb(a) from public.alumno a where id='${f.student}'`)
 await rpc('guardar_alumno',{p:{...Object.fromEntries(['apellido_paterno','apellido_materno','tipo_di_id','numero_di','fecha_nacimiento','sexo_id','celular','domicilio','nacimiento_departamento_id','nacimiento_provincia_id','nacimiento_distrito_id','domicilio_departamento_id','domicilio_provincia_id','domicilio_distrito_id'].map(k=>[k,pupil[k]])),nombres:'CAMBIADO',id:f.student,expected_updated_at:pupil.updated_at,contactos:[]}})
 check((await reports()).data.find(r=>r.id===invoice.id).beneficiarios[0].nombre,originalName,'initial identity conserved')
 // Patrocinador changes do not change historical commercial ownership or membership.
 const changedCycle=json(`select to_jsonb(c) from public.ciclo c where id='${f.cycle}'`)
 await rpc('guardar_ciclo',{p:{...Object.fromEntries(['id','carrera_id','fecha_inicio','fecha_fin','nombre_promocion','departamento_id','provincia_id','distrito_id','capitania_id'].map(k=>[k,changedCycle[k]])),expected_updated_at:changedCycle.updated_at,empresa_patrocinadora_id:null}})
 check((await reports()).data.find(r=>r.id===invoice.id).beneficiarios[0].ciclo_id,f.cycle,'historical OS Cycle retained')
 const admin=randomUUID();sql(`insert into auth.users(id) values('${admin}');insert into public.app_users(id) values('${admin}');insert into public.app_user_roles(user_id,role_code) values('${admin}','ADMIN_SISTEMA');`)
 const path='/facturacion_reporte?select='+columns
 check((await api(path,admin)).data.length,0,'ADMIN cannot read projection')
 check((await api(path,f.coordinator)).data.length,5,'coordinator reads all roots')
 check((await api(path,null)).status,401,'anonymous denied')
 const denied=await api('/facturacion_reporte',f.actor,{importe:1},'PATCH');check(denied.data.code,'55000','union projection is not writable');check(sql("select has_table_privilege('authenticated','public.facturacion_reporte','INSERT') or has_table_privilege('authenticated','public.facturacion_reporte','UPDATE') or has_table_privilege('authenticated','public.facturacion_reporte','DELETE')"),'f','no write privileges');check((await reports()).data.length,5,'failed write leaves roots intact')
 sql(`update public.app_users set active=false where id='${f.coordinator}'`);check((await api(path,f.coordinator)).data.length,0,'inactive academic denied');sql(`update public.app_users set active=true where id='${f.coordinator}'`)
 check(sql("select reloptions::text from pg_class where oid='public.facturacion_reporte'::regclass"),'{security_invoker=true}')
 // Hundreds of root rows exercise real PostgREST offsets/count, never join-expanded amounts.
 runActor(`insert into public.orden_servicio(empresa_patrocinadora_id,ciclo_id,serie,correlativo,fecha,monto,registrado_por) select '${company.id}','${second.id}','BULK',lpad(n::text,10,'0'),'2026-01-03',1,'${f.actor}' from generate_series(1,501) n;insert into public.orden_servicio_matricula(orden_servicio_id,matricula_id) select id,'${enrollment.id}' from public.orden_servicio where serie='BULK'`)
 const filter='&empresa_patrocinadora_id=eq.'+company.id+'&tipo=eq.order&documento=ilike.BULK*&order=fecha.desc,id.desc'
 const first=await api(path+filter+'&limit=500&offset=0'),last=await api(path+filter+'&limit=500&offset=500')
 check(first.data.length,500);check(last.data.length,1);check(new Set([...first.data,...last.data].map(r=>r.id)).size,501)
 check((await api(path+'&tipo=eq.invoice&estado=eq.PENDIENTE_DESEMBOLSO&fecha=gte.2026-01-01&fecha=lte.2026-01-02')).data.length,1,'server filters')
 check((await api(path+'&empresa_patrocinadora_id=eq.'+randomUUID())).data.length,0,'foreign company scope')
 check((await api(path+'&ciclo_codigos=cs.{'+cycle.codigo_ciclo+'}')).data.some(r=>r.id===o3.id),false,'cycle filter does not include unrelated roots')
 console.log(`H7 reports: ${checks}/${checks} checks PASSED (rebuild, real JWT/PostgREST/RLS, historical identities, root money and multipage; isolated synthetic DB).`)
}finally{
 if(restStarted)docker(['rm','-f',rest])
 if(created)docker(['exec',container,'dropdb','-U','postgres','--force',database])
 if(roleCreated)sql('drop role '+login,'postgres')
}
