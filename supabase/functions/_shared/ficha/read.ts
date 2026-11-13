import type { SupabaseClient } from '@supabase/supabase-js'
import { FichaError, requireEligible, type FichaRequest, type Source } from './contract.ts'

// Called only with a JWT-scoped client, never the Storage privileged client.
export async function readFicha(client: SupabaseClient, request: FichaRequest) {
  const identity = await client.auth.getUser()
  if (identity.error || !identity.data.user) throw new FichaError(401, 'SESSION')
  const actor = identity.data.user.id
  const [profile, assignments, roles] = await Promise.all([
    client.from('app_users').select('id,active').eq('id', actor).single(),
    client.from('app_user_roles').select('role_code').eq('user_id', actor),
    client.from('app_roles').select('code,active').in('code', ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO']),
  ])
  if (profile.error || assignments.error || roles.error || !profile.data?.active || !assignments.data?.some(a => roles.data?.some(r => r.active && r.code === a.role_code))) throw new FichaError(403, 'ACCESS')
  const result = await client.from('matricula_ficha_fuente').select('updated_at,source,source_fingerprint').eq('id', request.matricula_id).single()
  if (result.error || !result.data) throw new FichaError(result.error?.code === 'PGRST116' ? 404 : 503, 'SOURCE')
  const source = { ...result.data.source, updated_at: result.data.updated_at, source_fingerprint: result.data.source_fingerprint } as Source
  if (!/^[a-f0-9]{64}$/.test(source.source_fingerprint)) throw new FichaError(503, 'SOURCE')
  requireEligible(source, request)
  if (!source.datos_ficha) throw new FichaError(409, 'SNAPSHOT')
  return { source, actor }
}
