import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'

export type AccessState = {
  phase: 'loading' | 'anonymous' | 'authorized' | 'blocked' | 'error'
  userId?: string
  roles?: string[]
  message?: string
}

type SessionContextValue = {
  state: AccessState
  client: SupabaseClient
  refresh: () => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children, client = getSupabase() }: { children: ReactNode; client?: SupabaseClient }) {
  const [state, setState] = useState<AccessState>({ phase: 'loading' })
  const epoch = useRef(0)
  const signedOut = useRef(false)

  const refresh = useCallback(async () => {
    const request = ++epoch.current
    if (signedOut.current) { setState({ phase: 'anonymous' }); return }
    setState({ phase: 'loading' })
    const current = () => request === epoch.current
    try {
      const session = await client.auth.getSession()
      if (!current()) return
      if (session.error) throw new Error('session')
      if (!session.data.session) { setState({ phase: 'anonymous' }); return }
      // getSession/storage is not an authority for the user's identity.
      const identity = await client.auth.getUser()
      if (!current()) return
      if (identity.error || !identity.data.user) throw new Error('identity')
      const userId = identity.data.user.id
      const [profile, assignments, catalog] = await Promise.all([
        client.from('app_users').select('id,active').eq('id', userId),
        client.from('app_user_roles').select('role_code').eq('user_id', userId),
        client.from('app_roles').select('code,active'),
      ])
      if (!current()) return
      if (profile.error || assignments.error || catalog.error) throw new Error('access')
      const roles = (assignments.data ?? []).map(row => String(row.role_code))
        .filter(code => (catalog.data ?? []).some(row => row.code === code && row.active))
      if (!profile.data?.some(row => row.id === userId && row.active) || !roles.length) {
        setState({ phase: 'blocked', userId }); return
      }
      setState({ phase: 'authorized', userId, roles })
    } catch {
      if (current()) setState({ phase: 'error', message: 'No se pudo confirmar la sesión y el acceso. Vuelve a iniciar sesión.' })
    }
  }, [client])

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const { data } = client.auth.onAuthStateChange(event => {
      ++epoch.current
      if (event === 'SIGNED_OUT') signedOut.current = true
      if (signedOut.current) { setState({ phase: 'anonymous' }); return }
      setState({ phase: event === 'SIGNED_OUT' ? 'anonymous' : 'loading' })
      if (event !== 'SIGNED_OUT') {
        // No Auth calls inside the SDK callback; avoid reentrant refresh/deadlock.
        const timer = setTimeout(() => { timers.delete(timer); void refresh() }, 0)
        timers.add(timer)
      }
    })
    void refresh()
    return () => {
      ++epoch.current
      for (const timer of timers) clearTimeout(timer)
      data.subscription.unsubscribe()
    }
  }, [client, refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    signedOut.current = false
    ++epoch.current
    setState({ phase: 'loading' })
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (signedOut.current) { await client.auth.signOut({ scope: 'local' }); return false }
      if (error) throw new Error('credentials')
      await refresh()
      return true
    } catch {
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
      ++epoch.current
      setState({ phase: 'anonymous' })
      return false
    }
  }, [client, refresh])

  const logout = useCallback(async () => {
    signedOut.current = true
    ++epoch.current
    setState({ phase: 'anonymous' })
    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw new Error('signout')
    } catch {
      ++epoch.current
      setState({ phase: 'error', message: 'Datos locales retirados. No se pudo confirmar el cierre remoto; inténtalo de nuevo.' })
    }
  }, [client])

  return <SessionContext.Provider value={{ state, client, refresh, signIn, logout }}>{children}</SessionContext.Provider>
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('Falta el proveedor de sesión.')
  return value
}
