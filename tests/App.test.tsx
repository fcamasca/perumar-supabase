import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { checkConnection } from '../src/lib/supabase'

vi.mock('../src/lib/supabase', () => ({ checkConnection: vi.fn() }))
vi.mock('../src/security/SessionProvider', () => ({ SessionProvider: ({ children }: { children: import('react').ReactNode }) => children }))
vi.mock('../src/security/SecurityRoutes', () => ({ SecurityRoutes: () => null }))
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('encabezado y diagnóstico secundario', () => {
  it('monta el punto de entrada visible con identificación y entorno accesibles', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'PERÚ MAR' })).toBeVisible()
    expect(screen.getByText('Diagnóstico técnico')).toBeVisible()
    expect(screen.getByRole('region', { name: 'Entorno local' })).not.toBeVisible()
  })

  it('muestra un error seguro si falta la configuración', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo iniciar la aplicación')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('solo diagnostica al pulsar y comunica el resultado', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    vi.mocked(checkConnection).mockResolvedValue('Conexión local verificada.')
    render(<App />)
    expect(checkConnection).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Diagnóstico técnico'))
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar conexión local' }))
    expect(await screen.findByText('Conexión local verificada.')).toBeVisible()
  })
})
