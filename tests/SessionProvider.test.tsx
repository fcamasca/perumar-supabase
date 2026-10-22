import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { SessionProvider, useSession } from '../src/security/SessionProvider'

function fixture() {
  let notify: (event: string) => void = () => undefined
  const unsubscribe = vi.fn()
  const rows: Record<string, unknown[]> = {
    app_users: [{ id: 'operator-id', active: true }],
    app_user_roles: [{ role_code: 'OPERADOR' }], app_roles: [{ code: 'OPERADOR', active: true }],
  }
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'operator-id' } } }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-id' } }, error: null }),
    onAuthStateChange: vi.fn((fn: typeof notify) => { notify = fn; return { data: { subscription: { unsubscribe } } } }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
  }
  const from = vi.fn((table: string) => ({ select: () => {
    const value = { data: rows[table], error: null }
    return table === 'app_roles' ? Promise.resolve(value) : { eq: () => Promise.resolve(value) }
  } }))
  return { client: { auth, from } as unknown as SupabaseClient, auth, from, rows, unsubscribe, notify: (event: string) => notify(event) }
}

function Probe() {
  const { state, logout, signIn } = useSession()
  return <>
    <p role="status">{state.phase} {state.userId} {state.roles?.join(',')}</p>
    <p>{state.message}</p>
    <button onClick={() => void logout()}>Salir</button>
    <button onClick={() => void signIn('synthetic@example.invalid', 'unit-only')}>Entrar</button>
  </>
}

describe('sesión y aislamiento de estado', () => {
  it('restaura solo después de comprobar la identidad con Auth', async () => {
    const f = fixture()
    let confirm!: (value: unknown) => void
    f.auth.getUser.mockImplementation(() => new Promise(resolve => { confirm = resolve }))
    render(<SessionProvider client={f.client}><Probe /></SessionProvider>)
    await waitFor(() => expect(f.auth.getUser).toHaveBeenCalled())
    expect(screen.getByRole('status')).toHaveTextContent('loading')
    expect(f.from).not.toHaveBeenCalled()
    await act(async () => { confirm({ data: { user: { id: 'operator-id' } }, error: null }) })
    expect(screen.getByRole('status')).toHaveTextContent('authorized operator-id OPERADOR')
  })

  it('no trata un almacenamiento con identidad inventada como identidad válida', async () => {
    const f = fixture()
    f.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'sensitive-backend-detail' } })
    render(<SessionProvider client={f.client}><Probe /></SessionProvider>)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('error'))
    expect(f.from).not.toHaveBeenCalled()
    expect(screen.queryByText(/sensitive-backend-detail/)).not.toBeInTheDocument()
  })

  it('bloquea usuario Auth sin fila/rol en lugar de aprovisionarlo', async () => {
    const f = fixture()
    f.rows.app_users = []
    f.rows.app_user_roles = []
    render(<SessionProvider client={f.client}><Probe /></SessionProvider>)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('blocked'))
    expect(screen.getByRole('status')).not.toHaveTextContent('OPERADOR')
  })

  it('descarta una respuesta tardía después de logout', async () => {
    const f = fixture()
    let finish!: (value: unknown) => void
    f.auth.getUser.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    render(<SessionProvider client={f.client}><Probe /></SessionProvider>)
    await waitFor(() => expect(f.auth.getUser).toHaveBeenCalled())
    fireEvent.click(screen.getByText('Salir'))
    await waitFor(() => expect(f.auth.signOut).toHaveBeenCalledWith({ scope: 'local' }))
    await act(async () => { finish({ data: { user: { id: 'operator-id' } }, error: null }) })
    expect(screen.getByRole('status')).toHaveTextContent('anonymous')
    expect(f.from).not.toHaveBeenCalled()
  })

  it('retira datos y comunica fallo de cierre remoto sin fingir éxito', async () => {
    const f = fixture()
    render(<SessionProvider client={f.client}><Probe /></SessionProvider>)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('authorized'))
    f.auth.signOut.mockResolvedValue({ error: { message: 'private-token-canary' } })
    fireEvent.click(screen.getByText('Salir'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('error'))
    expect(screen.getByRole('status')).not.toHaveTextContent('operator-id')
    expect(screen.getByText(/No se pudo confirmar el cierre remoto/)).toBeVisible()
    expect(screen.queryByText(/private-token-canary/)).not.toBeInTheDocument()
  })

  it('renovación fallida no conserva datos anteriores y retira listeners en StrictMode', async () => {
    const f = fixture()
    const view = render(<StrictMode><SessionProvider client={f.client}><Probe /></SessionProvider></StrictMode>)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('authorized'))
    f.auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'refresh-failed' } })
    act(() => f.notify('TOKEN_REFRESHED'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('error'))
    expect(screen.getByRole('status')).not.toHaveTextContent('operator-id')
    view.unmount()
    expect(f.unsubscribe).toHaveBeenCalledTimes(2)
  })
})
