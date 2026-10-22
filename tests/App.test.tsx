import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('pantalla técnica H0', () => {
  it('monta el punto de entrada visible con identificación y entorno accesibles', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'PERÚ MAR' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Entorno local' })).toBeVisible()
  })

  it('expresa que la conexión está pendiente sin afirmar una integración verificada', () => {
    render(<App />)
    expect(screen.getByText(/conexión con Supabase local está pendiente/)).toBeVisible()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })
})
