import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SecurityRoutes } from '../src/security/SecurityRoutes'
import { useSession, type AccessState } from '../src/security/SessionProvider'

vi.mock('../src/security/SessionProvider', () => ({ useSession: vi.fn() }))
const refresh = vi.fn().mockResolvedValue(undefined)
const logout = vi.fn().mockResolvedValue(undefined)
const signIn = vi.fn().mockResolvedValue(false)
const directory = vi.fn().mockResolvedValue({ data: [{ id: 'synthetic-directory-id', active: true }], error: null })
const client = { from: vi.fn(() => ({ select: () => ({ order: directory }) })) }

function show(state: AccessState, path = '/seguridad') {
  vi.mocked(useSession).mockReturnValue({ state, refresh, logout, signIn, client } as unknown as ReturnType<typeof useSession>)
  return render(<MemoryRouter initialEntries={[path]}><SecurityRoutes /></MemoryRouter>)
}
beforeEach(() => vi.clearAllMocks())

describe('rutas de seguridad (UX; RLS se prueba por API real aparte)', () => {
  it('redirige al login sin sesión y no muestra datos previos', async () => {
    show({ phase: 'anonymous' }, '/seguridad/usuarios')
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    expect(client.from).not.toHaveBeenCalled()
  })
  it('no pinta recurso protegido mientras confirma identidad', () => {
    show({ phase: 'loading' }, '/seguridad/usuarios')
    expect(screen.getByRole('status')).toHaveTextContent('Confirmando')
    expect(client.from).not.toHaveBeenCalled()
  })
  it('niega URL ADMIN a OPERADOR sin hacer consulta de directorio', () => {
    show({ phase: 'authorized', userId: 'operator-id', roles: ['COORDINADOR_ACADEMICO'] }, '/seguridad/usuarios')
    expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeVisible()
    expect(client.from).not.toHaveBeenCalled()
  })
  it('ADMIN consulta directorio con cliente ordinario y sin botones de escritura', async () => {
    show({ phase: 'authorized', userId: 'admin-id', roles: ['ADMIN_SISTEMA'] }, '/seguridad/usuarios')
    expect(await screen.findByText('synthetic-directory-id')).toBeVisible()
    expect(client.from).toHaveBeenCalledWith('app_users')
    expect(screen.queryByText(/Editar|Eliminar|Crear usuario/)).not.toBeInTheDocument()
  })
  it('usuario autenticado sin habilitación tiene salida sin bucle', () => {
    show({ phase: 'blocked', userId: 'no-role-id' })
    expect(screen.getByRole('heading', { name: 'Acceso no habilitado' })).toBeVisible()
    fireEvent.click(screen.getByText('Cerrar sesión'))
    expect(logout).toHaveBeenCalled()
  })
  it('login inválido muestra mensaje genérico y retira contraseña del campo', async () => {
    show({ phase: 'anonymous' }, '/login')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'synthetic@example.invalid' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'unit-test-private-value' } })
    fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo iniciar sesión'))
    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
    expect(screen.queryByText('unit-test-private-value')).not.toBeInTheDocument()
  })
})

it('top navigation identifies the current section and keeps security links role-bound', () => {
  show({ phase: 'authorized', userId: 'director', roles: ['DIRECTOR_ACADEMICO'] })
  expect(screen.getByRole('navigation', { name: 'Académico' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Mi acceso' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Materias' })).not.toHaveAttribute('aria-current')
  expect(screen.queryByRole('link', { name: 'Directorio de seguridad' })).not.toBeInTheDocument()
  expect(screen.queryByText(/PostgreSQL|RLS/)).not.toBeInTheDocument()
})
