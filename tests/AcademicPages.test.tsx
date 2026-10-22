import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AcademicOnly, Materias, Ciclos } from '../src/academic/AcademicPages'
import { useSession } from '../src/security/SessionProvider'

vi.mock('../src/security/SessionProvider', () => ({ useSession: vi.fn() }))
const version = '2026-10-22T00:00:00Z'
const ciclo = { id: 'cycle', carrera_id: 'career', codigo_ciclo: '2026-001-NAV', fecha_inicio: '2037-01-01', fecha_fin: '2037-01-02', nombre_promocion: '', departamento_id: 'dep', provincia_id: 'prov', distrito_id: 'dist', capitania_id: 'cap', estado_codigo: 'PROGRAMADO', updated_at: version }
let tables: Record<string, Record<string, unknown>[]>
const rpc = vi.fn()
function from(table: string) {
  const filters: [string, unknown][] = []
  let single = false
  const builder = {
    select: () => builder, order: () => builder, limit: () => builder, ilike: () => builder, in: () => builder,
    eq: (column: string, value: unknown) => { filters.push([column, value]); return builder },
    single: () => { single = true; return builder },
    then: (resolve: (value: unknown) => unknown) => {
      const data = (tables[table] ?? []).filter(row => filters.every(([key, value]) => row[key] === value))
      return Promise.resolve({ data: single ? data[0] : data, error: null }).then(resolve)
    },
  }
  return builder
}
function session(roles: string[]) {
  vi.mocked(useSession).mockReturnValue({ state: { phase: 'authorized', userId: 'actor', roles }, client: { from, rpc } } as unknown as ReturnType<typeof useSession>)
}
beforeEach(() => {
  rpc.mockReset()
  tables = {
    materia: [{ id: 'subject', codigo: 'M1', nombre: 'NAVEGACIÓN', descripcion: '', active: true, updated_at: version }],
    carrera: [{ id: 'career', codigo: 'C1', nombre: 'CARRERA', descripcion: '', active: true, sigla: 'NAV', modalidad_id: 'mode', updated_at: version }],
    ciclo: [{ ...ciclo }], catalogo: [{ id: 'reasons', codigo: 'MOTIVO_CICLO_DESIERTO' }],
    catalogo_valor: [{ id: 'other', catalogo_id: 'reasons', codigo: 'OTRO', nombre: 'OTRO', activo: true }],
    departamento: [{ id: 'dep', nombre: 'DEPARTAMENTO', active: true }], provincia: [{ id: 'prov', departamento_id: 'dep', nombre: 'PROVINCIA', active: true }],
    distrito: [{ id: 'dist', provincia_id: 'prov', nombre: 'DISTRITO', active: true }], capitania: [{ id: 'cap', nombre: 'CAPITANÍA', active: true }],
    carrera_materia: [{ carrera_id: 'career', materia_id: 'subject' }], ciclo_materia: [],
  }
})
afterEach(cleanup)
it('Coordinador reads references without academic maintenance', async () => {
  session(['COORDINADOR_ACADEMICO'])
  render(<Materias />)
  expect(await screen.findByText('NAVEGACIÓN')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Guardar Materia' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Inactivar/ })).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
})
it('Admin Sistema does not gain academic routes from its name', () => {
  session(['ADMIN_SISTEMA'])
  render(<AcademicOnly><p>Private academic form</p></AcademicOnly>)
  expect(screen.getByRole('alert')).toHaveTextContent('no autorizado')
  expect(screen.queryByText('Private academic form')).not.toBeInTheDocument()
})
it('stale save retains input, reports conflict, and never silently retries', async () => {
  session(['DIRECTOR_ACADEMICO'])
  rpc.mockResolvedValue({ error: { code: '40001', message: 'internal detail must not show' }, data: null })
  render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar M1' }))
  fireEvent.change(screen.getByLabelText('Nombre de Materia'), { target: { value: 'EDITADO' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Materia' }).closest('form')!)
  expect(await screen.findByRole('alert')).toHaveTextContent('El registro fue modificado por otro usuario')
  expect(screen.getByLabelText('Nombre de Materia')).toHaveValue('EDITADO')
  expect(rpc).toHaveBeenCalledExactlyOnceWith('guardar_materia', { p: { id: 'subject', expected_updated_at: version, codigo: 'M1', nombre: 'EDITADO', descripcion: null } })
  expect(screen.queryByText('internal detail must not show')).not.toBeInTheDocument()
})
it('discarding an unsaved cycle never calls a write RPC', async () => {
  session(['COORDINADOR_ACADEMICO'])
  render(<Ciclos />)
  await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar / descartar formulario' }))
  expect(rpc).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument()
})
it('terminal cycle is read-only without reopening or delete controls', async () => {
  session(['DIRECTOR_ACADEMICO'])
  tables.ciclo[0].estado_codigo = 'CERRADO'
  render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' }))
  await waitFor(() => expect(screen.getByRole('group', { name: 'Datos del Ciclo' })).toBeDisabled())
  expect(screen.queryByRole('button', { name: 'Confirmar transición' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Eliminar|Reabrir/ })).not.toBeInTheDocument()
})
it('Director chooses a catalog reason; OTRO requires detail', async () => {
  session(['DIRECTOR_ACADEMICO'])
  render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' }))
  fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'DESIERTO' } })
  fireEvent.change(screen.getByLabelText('Motivo de Ciclo Desierto'), { target: { value: 'other' } })
  expect(screen.getByLabelText(/Detalle \/ motivo/)).toBeRequired()
})
