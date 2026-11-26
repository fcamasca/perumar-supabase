import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { validateEnv } from '../src/lib/env.ts'

export function assertLocalProject(root = '.') {
  if (existsSync(`${root}/supabase/.temp/project-ref`)
    || !/^project_id = "perumar-supabase"$/m.test(readFileSync(`${root}/supabase/config.toml`, 'utf8'))) {
    throw new Error('Proyecto local no reconocido o enlazado; operaciÃ³n rechazada.')
  }
}

export function runLocal(file, args, input, timeout = 60_000) {
  const result = spawnSync(file, args, { encoding: 'utf8', windowsHide: true, timeout, input })
  if (result.error || result.status !== 0) throw new Error('OperaciÃ³n tÃ©cnica local fallida; salida sensible omitida.')
  return result.stdout
}

export function localStatus() {
  assertLocalProject()
  runLocal(process.execPath, ['scripts/local-supabase.mjs', 'status'])
  const status = JSON.parse(runLocal(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '--output', 'json']))
  const config = validateEnv({ VITE_SUPABASE_URL: status.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY })
  return { ...config, administrativeKey: status.SERVICE_ROLE_KEY }
}

// Only static, checked-in statements are sent to psql. Fixture values use SDK parameters.
export function inspectDatabase(sql, variables = {}) {
  assertLocalProject()
  const parameters = Object.entries(variables).flatMap(([name, value]) => {
    if (!/^[a-z_]+$/.test(name) || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('ParÃ¡metro tÃ©cnico no permitido.')
    return ['-v', `${name}=${value}`]
  })
  return runLocal('docker', ['exec', '-i', 'supabase_db_perumar-supabase', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', ...parameters], sql).trim()
}

export function securityInventory() {
  return JSON.parse(inspectDatabase(`select json_build_object(
    'tables', (select json_agg(json_build_object('name',c.relname,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,'kind',c.relkind,'options',c.reloptions) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','m','p')),
    'policies', (select json_agg(json_build_object('table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check) order by policyname) from pg_policies where schemaname='public'),
    'helpers', (select json_agg(json_build_object('name',p.proname,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'args',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE')) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private'),
    'grants', (select json_agg(json_build_object('table',t.table_name,'role',r.name,'select',has_table_privilege(r.name,'public.'||t.table_name,'SELECT'),'insert',has_table_privilege(r.name,'public.'||t.table_name,'INSERT'),'update',has_table_privilege(r.name,'public.'||t.table_name,'UPDATE'),'delete',has_table_privilege(r.name,'public.'||t.table_name,'DELETE'),'truncate',has_table_privilege(r.name,'public.'||t.table_name,'TRUNCATE')) order by t.table_name,r.name) from information_schema.tables t cross join (values ('authenticated'),('anon')) r(name) where t.table_schema='public'),
    'sequences', (select json_agg(json_build_object('name',c.relname,'authenticated',has_sequence_privilege('authenticated',c.oid,'USAGE,SELECT,UPDATE'),'anon',has_sequence_privilege('anon',c.oid,'USAGE,SELECT,UPDATE')) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relkind='S'),
    'paymentCommands', (select json_agg(json_build_object('name',p.proname,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'definition',pg_get_functiondef(p.oid)) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('registrar_pago','anular_pago')),
    'billingCommands', (select json_agg(json_build_object('name',p.proname,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'definition',pg_get_functiondef(p.oid)) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('registrar_orden_servicio','anular_orden_servicio','registrar_factura_patrocinador','avanzar_factura_patrocinador','anular_factura_patrocinador','registrar_pago_patrocinador','anular_pago_patrocinador')),
    'publicFunctions', (select count(*) from information_schema.routines where routine_schema='public'),
    'privateCreate', has_schema_privilege('authenticated','private','CREATE'),
    'publicCreate', has_schema_privilege('authenticated','public','CREATE'),
    'publicExecute', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='private' and a.grantee=0 and a.privilege_type='EXECUTE'),
    'authenticatedBypass', (select rolbypassrls from pg_roles where rolname='authenticated'),
    'buckets', (select count(*) from storage.buckets),
    'orderBucket', (select json_build_object('id',id,'public',public,'limit',file_size_limit,'types',allowed_mime_types) from storage.buckets where id='h7-os'),
    'orderColumns', (select json_agg(json_build_object('name',c.column_name,'authenticated',has_column_privilege('authenticated','public.orden_servicio_archivo',c.column_name,'SELECT'),'anon',has_column_privilege('anon','public.orden_servicio_archivo',c.column_name,'SELECT'),'insert',has_column_privilege('authenticated','public.orden_servicio_archivo',c.column_name,'INSERT'),'update',has_column_privilege('authenticated','public.orden_servicio_archivo',c.column_name,'UPDATE')) order by c.column_name) from information_schema.columns c where c.table_schema='public' and c.table_name='orden_servicio_archivo'),
    'orderCommands', (select json_agg(json_build_object('name',p.proname,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'server',has_function_privilege('service_role',p.oid,'EXECUTE')) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('preparar_archivo_os','confirmar_archivo_os','abortar_archivo_os','consultar_archivo_os')),
    'documentBucket', (select json_build_object('id',id,'public',public,'limit',file_size_limit,'types',allowed_mime_types) from storage.buckets where id='h6-expediente'),
    'documentCommands', (select json_agg(json_build_object('name',p.proname,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'server',has_function_privilege('service_role',p.oid,'EXECUTE')) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('preparar_archivo_expediente','confirmar_archivo_expediente','abortar_reserva_expediente','registrar_descarga_expediente')),
    'pdfBucket', (select json_build_object('id',id,'public',public,'limit',file_size_limit,'types',allowed_mime_types) from storage.buckets where id='fichas-matricula'),
    'storagePolicies', (select count(*) from pg_policies where schemaname='storage' and tablename='objects'),
    'pdfAudit', (select json_build_object('authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'server',has_function_privilege('service_role',p.oid,'EXECUTE'),'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='registrar_evento_ficha_pdf'),
    'migrations', (select json_agg(version order by version) from supabase_migrations.schema_migrations)
  );`))
}

export function assertSecurityInventory(info) {
  const tables = ['alumno', 'alumno_contacto_emergencia', 'app_roles', 'app_user_roles', 'app_users', 'auditoria', 'capitania', 'carrera', 'carrera_materia', 'catalogo', 'catalogo_valor', 'ciclo', 'ciclo_documento', 'ciclo_materia', 'ciclo_tarifa', 'departamento', 'distrito', 'empresa_patrocinadora', 'materia', 'matricula', 'matricula_cargo', 'matricula_cargo_saldo', 'matricula_documento', 'matricula_documento_archivo', 'matricula_expediente_resumen', 'matricula_ficha_fuente', 'matricula_pago_listado', 'matricula_reporte_ciclo', 'matricula_saldo', 'pago', 'pago_aplicacion', 'provincia', 'tarifa', 'tipo_documento']
  tables.push('orden_servicio','orden_servicio_matricula','factura_patrocinador','factura_orden_servicio','pago_patrocinador','pago_patrocinador_aplicacion','orden_servicio_archivo','factura_patrocinador_saldo','orden_servicio_resumen','ciclo_orden_servicio_saldo','facturacion_reporte')
  tables.sort()
  if (JSON.stringify(info.tables?.map(t => t.name)) !== JSON.stringify(tables)
    || info.tables.some(t => t.kind === 'v' ? !['ciclo_orden_servicio_saldo','facturacion_reporte','factura_patrocinador_saldo','orden_servicio_resumen','matricula_cargo_saldo','matricula_ficha_fuente','matricula_expediente_resumen','matricula_pago_listado','matricula_reporte_ciclo','matricula_saldo'].includes(t.name) || !t.options?.includes('security_invoker=true') : !t.rls || t.forced) || info.publicFunctions !== 39
    || info.privateCreate || info.publicCreate || info.publicExecute !== 0 || info.authenticatedBypass || info.buckets !== 3
    || JSON.stringify(info.migrations) !== JSON.stringify(['20261022041000', '20261022150000', '20261022160000', '20261023010000', '20261023020000', '20261023030000', '20261028190000', '20261028200000', '20261102010000', '20261102020000', '20261104010000', '20261104020000', '20261104030000', '20261104040000', '20261109010000', '20261109020000', '20261109030000', '20261109040000', '20261109050000', '20261109060000', '20261110010000', '20261112010000', '20261113010000', '20261118010000', '20261118020000', '20261118030000', '20261119010000', '20261119020000', '20261119030000', '20261123010000', '20261123020000', '20261123030000', '20261123040000', '20261123050000', '20261125010000', '20261125020000', '20261125030000', '20261125040000', '20261125050000', '20261125060000', '20261125070000'])) throw new Error('Inventario de seguridad H1–H7 inesperado.')
  if(JSON.stringify(info.pdfBucket)!==JSON.stringify({id:'fichas-matricula',public:false,limit:2097152,types:['application/pdf']}) || info.storagePolicies!==0 || !info.pdfAudit || info.pdfAudit.authenticated || info.pdfAudit.anon || !info.pdfAudit.server || info.pdfAudit.owner!=='postgres' || !info.pdfAudit.definer || !info.pdfAudit.config?.includes('search_path=""')) throw new Error('Storage/auditorÃ­a H5 expuestos o inesperados.')
  if(JSON.stringify(info.documentBucket)!==JSON.stringify({id:'h6-expediente',public:false,limit:5242880,types:['application/pdf','image/jpeg','image/png']})||info.documentCommands?.length!==4||info.documentCommands.some(f=>f.authenticated||f.anon||!f.server||!f.definer||f.owner!=='postgres'||!f.config?.includes('search_path=""')))throw new Error('H6 private Storage or service RPC ACL mismatch.')
  const readableOrderColumns = ['bytes','confirmado_at','estado_tecnico','id','mime','numero_version','orden_servicio_id']
  if (JSON.stringify(info.orderBucket) !== JSON.stringify({id:'h7-os',public:false,limit:5242880,types:['application/pdf']})
    || JSON.stringify(info.orderCommands?.map(f => f.name)) !== JSON.stringify(['abortar_archivo_os','confirmar_archivo_os','consultar_archivo_os','preparar_archivo_os'])
    || info.orderCommands.some(f => f.authenticated || f.anon || !f.server || !f.definer || f.owner !== 'postgres' || !f.config?.includes('search_path=""'))
    || JSON.stringify(info.orderColumns?.filter(c => c.authenticated).map(c => c.name)) !== JSON.stringify(readableOrderColumns)
    || !info.orderColumns?.some(c => c.name === 'object_key' && !c.authenticated)
    || info.orderColumns.some(c => c.anon || c.insert || c.update)) throw new Error('Storage, columnas o RPC de OS expuestos o inesperados.')
  if (JSON.stringify(info.sequences) !== JSON.stringify([{name:'alumno_codigo_seq',authenticated:false,anon:false}])) throw new Error('Secuencia Alumno expuesta o inesperada.')
  const expected = ['app_roles_active_read', 'app_roles_admin_read', 'app_user_roles_admin_read', 'app_user_roles_self_read', 'app_users_admin_read', 'app_users_self_read', ...Array(18).fill('academic_read'), ...Array(4).fill('document_read'), 'audit_read', 'payment_read', 'payment_read'].sort()
  expected.push('h7_os_file_read',...Array(6).fill('h7_read'));expected.sort()
  if (JSON.stringify(info.policies?.map(p => p.name)) !== JSON.stringify(expected)
    || info.policies.some(p => p.command !== 'SELECT' || JSON.stringify(p.roles) !== '["authenticated"]' || p.check !== null)) throw new Error('Policies H2 inesperadas.')
  if (info.grants?.length !== tables.length * 2 || info.grants.some(g => g.select !== (g.role === 'authenticated' && g.table !== 'orden_servicio_archivo') || g.insert || g.update || g.delete || g.truncate)) throw new Error('Grants H2 inesperados.')
  const names = ['academic_user', 'apply_enrollment_charges', 'assert_fields', 'audit_change', 'audit_enrollment', 'authorize', 'carrera_minimum', 'enrollment_snapshot', 'freeze_cycle_students', 'functional_user', 'guard_document_history', 'guard_enrollment_history', 'guard_payment_history', 'has_active_role', 'require_catalog', 'require_version', 'stamp_update', 'sync_document_context', 'sync_missing', 'validate_alumno', 'validate_payment_applications']
  names.push('audit_h7','guard_h7_history','validate_h7_integrity','guard_os_file','require_os_file_actor','valid_company_tax');names.sort()
  if (JSON.stringify(info.helpers?.map(h => h.name)) !== JSON.stringify(names)
    || info.helpers.some(h => h.owner !== 'postgres' || !h.config?.includes('search_path=""') || h.anon
      || h.authenticated !== ['has_active_role', 'academic_user', 'functional_user'].includes(h.name))) throw new Error('Helpers H2 inesperados.')
  if(JSON.stringify(info.paymentCommands?.map(f=>f.name))!==JSON.stringify(['anular_pago','registrar_pago'])
    ||info.paymentCommands.some(f=>f.owner!=='postgres'||!f.definer||!f.authenticated||f.anon||!f.config?.includes('search_path=""')||!f.config?.includes('default_transaction_isolation=serializable')||/\bexecute\s+/i.test(f.definition)))throw new Error('Unsafe H4 payment command inventory.')
  if(JSON.stringify(info.billingCommands?.map(f=>f.name))!==JSON.stringify(['anular_factura_patrocinador','anular_orden_servicio','anular_pago_patrocinador','avanzar_factura_patrocinador','registrar_factura_patrocinador','registrar_orden_servicio','registrar_pago_patrocinador'])
    ||info.billingCommands.some(f=>f.owner!=='postgres'||!f.definer||!f.authenticated||f.anon||!f.config?.includes('search_path=""')||!f.config?.includes('default_transaction_isolation=serializable')||/\bexecute\s+/i.test(f.definition)))throw new Error('Unsafe H7 billing command inventory.')
  const helper = info.helpers.find(h => h.name === 'has_active_role')
  if (!helper.definer || helper.volatility !== 's' || !helper.definition.includes('auth.uid()')
    || /\b(insert|update|delete|execute)\b/i.test(helper.definition)) throw new Error('Identidad de helper insegura.')
}
