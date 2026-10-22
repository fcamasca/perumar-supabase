import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { validateEnv } from '../src/lib/env.ts'

export function assertLocalProject(root = '.') {
  if (existsSync(`${root}/supabase/.temp/project-ref`)
    || !/^project_id = "perumar-supabase"$/m.test(readFileSync(`${root}/supabase/config.toml`, 'utf8'))) {
    throw new Error('Proyecto local no reconocido o enlazado; operación rechazada.')
  }
}

export function runLocal(file, args, input) {
  const result = spawnSync(file, args, { encoding: 'utf8', windowsHide: true, timeout: 60_000, input })
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
export function inspectDatabase(sql) {
  assertLocalProject()
  return runLocal('docker', ['exec', '-i', 'supabase_db_perumar-supabase', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], sql).trim()
}

export function securityInventory() {
  return JSON.parse(inspectDatabase(`select json_build_object(
    'tables', (select json_agg(json_build_object('name',c.relname,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','m','p')),
    'policies', (select json_agg(json_build_object('table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check) order by policyname) from pg_policies where schemaname='public'),
    'helpers', (select json_agg(json_build_object('name',p.proname,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'args',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon',has_function_privilege('anon',p.oid,'EXECUTE')) order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private'),
    'grants', (select json_agg(json_build_object('table',t.table_name,'role',r.name,'select',has_table_privilege(r.name,'public.'||t.table_name,'SELECT'),'insert',has_table_privilege(r.name,'public.'||t.table_name,'INSERT'),'update',has_table_privilege(r.name,'public.'||t.table_name,'UPDATE'),'delete',has_table_privilege(r.name,'public.'||t.table_name,'DELETE'),'truncate',has_table_privilege(r.name,'public.'||t.table_name,'TRUNCATE')) order by t.table_name,r.name) from information_schema.tables t cross join (values ('authenticated'),('anon')) r(name) where t.table_schema='public'),
    'publicFunctions', (select count(*) from information_schema.routines where routine_schema='public'),
    'privateCreate', has_schema_privilege('authenticated','private','CREATE'),
    'authenticatedBypass', (select rolbypassrls from pg_roles where rolname='authenticated'),
    'buckets', (select count(*) from storage.buckets),
    'migrations', (select json_agg(version order by version) from supabase_migrations.schema_migrations)
  );`))
}

export function assertSecurityInventory(info) {
  const tables = ['app_roles', 'app_user_roles', 'app_users']
  if (JSON.stringify(info.tables?.map(t => t.name)) !== JSON.stringify(tables)
    || info.tables.some(t => !t.rls || t.forced) || info.publicFunctions !== 0
    || info.privateCreate || info.authenticatedBypass || info.buckets !== 0
    || JSON.stringify(info.migrations) !== JSON.stringify(['20261022041000'])) throw new Error('Inventario H1 inesperado.')
  const expected = ['app_roles_active_read', 'app_roles_admin_read', 'app_user_roles_admin_read', 'app_user_roles_self_read', 'app_users_admin_read', 'app_users_self_read']
  if (JSON.stringify(info.policies?.map(p => p.name)) !== JSON.stringify(expected)
    || info.policies.some(p => p.command !== 'SELECT' || JSON.stringify(p.roles) !== '["authenticated"]' || p.check !== null)) throw new Error('Policies H1 inesperadas.')
  if (info.grants?.length !== 6 || info.grants.some(g => g.select !== (g.role === 'authenticated') || g.insert || g.update || g.delete || g.truncate)) throw new Error('Grants H1 inesperados.')
  const [helper] = info.helpers ?? []
  if (info.helpers?.length !== 1 || helper.name !== 'has_active_role' || helper.owner !== 'postgres'
    || !helper.definer || helper.volatility !== 's' || !helper.config?.includes('search_path=""')
    || helper.args !== 'role_code text' || !helper.authenticated || helper.anon
    || !helper.definition.includes('auth.uid()') || /\b(insert|update|delete|execute)\b/i.test(helper.definition)) throw new Error('Helper H1 inesperado.')
}
