import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { browserEnv, validateEnv } from './env'

let client: SupabaseClient | undefined

export function getSupabase() {
  if (!client) {
    const config = validateEnv(browserEnv())
    client = createClient(config.url, config.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
    })
  }
  return client
}

export async function checkConnection() {
  try {
    const { data, error } = await getSupabase().getOpenApiSpec()
    if (error || !data || typeof data !== 'object' || !('paths' in data)) throw new Error('diagnostic')
    return 'Conexión local verificada. Data API disponible; sin consultas de negocio.'
  } catch {
    throw new Error('No se pudo verificar Supabase local. Revisa el stack y la configuración pública local.')
  }
}
