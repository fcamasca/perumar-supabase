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
  const result = await client.from('matricula').select('id,updated_at,created_at,estado_codigo,codigo_matricula,alumno_snapshot,empresa_patrocinadora_id,ciclo(codigo_ciclo,nombre_promocion,estado_codigo,carrera(nombre)),empresa_patrocinadora(razon_social,ruc,persona_contacto,telefono,email)').eq('id', request.matricula_id).single()
  if (result.error || !result.data) throw new FichaError(result.error?.code === 'PGRST116' ? 404 : 503, 'SOURCE')
  const source = result.data as unknown as Source
  requireEligible(source, request)
  return { source, actor }
}
