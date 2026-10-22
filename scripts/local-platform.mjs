import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { validateEnv } from '../src/lib/env.ts'

export function assertLocalProject(root = '.') {
  if (existsSync(`${root}/supabase/.temp/project-ref`)
    || !/^project_id = "perumar-supabase"$/m.test(readFileSync(`${root}/supabase/config.toml`, 'utf8'))) {
    throw new Error('Proyecto local no reconocido o enlazado; operación rechazada.')
  }
}

export function runLocal(file, args, input, timeout = 60_000) {
  const result = spawnSync(file, args, { encoding: 'utf8', windowsHide: true, timeout, input })
  if (result.error || result.status !== 0) throw new Error('Operación técnica local fallida; salida sensible omitida.')
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
    if (!/^[a-z_]+$/.test(name) || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Parámetro técnico no permitido.')
    return ['-v', `${name}=${value}`]
  })
  return runLocal('docker', ['exec', '-i', 'supabase_db_perumar-supabase', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', ...parameters], sql).trim()
}

export function securityInventory() {
  return JSON.parse(inspectDatabase(`select json_build_object(
    'tables', (select json_agg(json_build_object('name',c.relname,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','m','p')),
    'policies', (select json_agg(json_build_object('table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check) order by policyname) from pg_policies where schemaname='public'),
    'helpers', (select json_agg(json_build_object('name',p.proname,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'args',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE')) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private'),
    'grants', (select json_agg(json_build_object('table',t.table_name,'role',r.name,'select',has_table_privilege(r.name,'public.'||t.table_name,'SELECT'),'insert',has_table_privilege(r.name,'public.'||t.table_name,'INSERT'),'update',has_table_privilege(r.name,'public.'||t.table_name,'UPDATE'),'delete',has_table_privilege(r.name,'public.'||t.table_name,'DELETE'),'truncate',has_table_privilege(r.name,'public.'||t.table_name,'TRUNCATE')) order by t.table_name,r.name) from information_schema.tables t cross join (values ('authenticated'),('anon')) r(name) where t.table_schema='public'),
    'publicFunctions', (select count(*) from information_schema.routines where routine_schema='public'),
    'privateCreate', has_schema_privilege('authenticated','private','CREATE'),
    'publicCreate', has_schema_privilege('authenticated','public','CREATE'),
    'publicExecute', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='private' and a.grantee=0 and a.privilege_type='EXECUTE'),
    'authenticatedBypass', (select rolbypassrls from pg_roles where rolname='authenticated'),
    'buckets', (select count(*) from storage.buckets),
    'migrations', (select json_agg(version order by version) from supabase_migrations.schema_migrations)
  );`))
}

export function assertSecurityInventory(info) {
  const tables = ['app_roles', 'app_user_roles', 'app_users', 'auditoria', 'capitania', 'carrera', 'carrera_materia', 'catalogo', 'catalogo_valor', 'ciclo', 'ciclo_materia', 'departamento', 'distrito', 'materia', 'provincia']
  if (JSON.stringify(info.tables?.map(t => t.name)) !== JSON.stringify(tables)
    || info.tables.some(t => !t.rls || t.forced) || info.publicFunctions !== 7
    || info.privateCreate || info.publicCreate || info.publicExecute !== 0 || info.authenticatedBypass || info.buckets !== 0
    || JSON.stringify(info.migrations) !== JSON.stringify(['20261022041000', '20261022150000', '20261022160000'])) throw new Error('Inventario H2 inesperado.')
  const expected = ['app_roles_active_read', 'app_roles_admin_read', 'app_user_roles_admin_read', 'app_user_roles_self_read', 'app_users_admin_read', 'app_users_self_read', ...Array(11).fill('academic_read'), 'audit_read'].sort()
  if (JSON.stringify(info.policies?.map(p => p.name)) !== JSON.stringify(expected)
    || info.policies.some(p => p.command !== 'SELECT' || JSON.stringify(p.roles) !== '["authenticated"]' || p.check !== null)) throw new Error('Policies H2 inesperadas.')
  if (info.grants?.length !== 30 || info.grants.some(g => g.select !== (g.role === 'authenticated') || g.insert || g.update || g.delete || g.truncate)) throw new Error('Grants H2 inesperados.')
  const names = ['academic_user', 'assert_fields', 'audit_change', 'authorize', 'carrera_minimum', 'functional_user', 'has_active_role', 'require_catalog', 'require_version', 'stamp_update', 'sync_missing']
  if (JSON.stringify(info.helpers?.map(h => h.name)) !== JSON.stringify(names)
    || info.helpers.some(h => h.owner !== 'postgres' || !h.config?.includes('search_path=""') || h.anon
      || h.authenticated !== ['has_active_role', 'academic_user', 'functional_user'].includes(h.name))) throw new Error('Helpers H2 inesperados.')
  const helper = info.helpers.find(h => h.name === 'has_active_role')
  if (!helper.definer || helper.volatility !== 's' || !helper.definition.includes('auth.uid()')
    || /\b(insert|update|delete|execute)\b/i.test(helper.definition)) throw new Error('Identidad de helper insegura.')
}
