import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AcademicOnly, Materias, Ciclos, Carreras, academicError, suggestSigla } from '../src/academic/AcademicPages'
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
    select: () => builder, order: () => builder, limit: () => builder, ilike: () => builder, in: (column: string, values: unknown[]) => { filters.push([column, values]); return builder },
    eq: (column: string, value: unknown) => { filters.push([column, value]); return builder },
    single: () => { single = true; return builder },
    then: (resolve: (value: unknown) => unknown) => {
      const data = (tables[table] ?? []).filter(row => filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value))
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
    ciclo: [{ ...ciclo }], catalogo: [{ id: 'reasons', codigo: 'MOTIVO_CICLO_DESIERTO' }, { id: 'modes', codigo: 'MODALIDAD_CARRERA' }],
    catalogo_valor: [{ id: 'mode', catalogo_id: 'modes', codigo: 'CON_EXPERIENCIA', nombre: 'CON EXPERIENCIA', activo: true }, { id: 'other', catalogo_id: 'reasons', codigo: 'OTRO', nombre: 'OTRO', activo: true }],
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

it('pending save prevents accidental discard or changes to in-flight input', async () => {
  session(['DIRECTOR_ACADEMICO'])
  let finish: (value: unknown) => void = () => undefined
  rpc.mockReturnValue(new Promise(resolve => { finish = resolve }))
  render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar M1' }))
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Materia' }).closest('form')!)
  expect(screen.getByLabelText('Nombre de Materia')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Recargar información' })).toBeDisabled()
  await act(async () => finish({ error: { code: '40001' }, data: null }))
  expect(screen.getByLabelText('Nombre de Materia')).not.toBeDisabled()
  expect(rpc).toHaveBeenCalledTimes(1)
})

it('last active subject is rejected before confirmation or asking for a reason', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Inactivar M1' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('C1 — CARRERA')
  expect(screen.getByRole('alert')).toHaveTextContent('Asocia primero otra Materia activa')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
})
it('inactivation asks for reason in the app and cancellation never writes', async () => {
  tables.carrera_materia = []
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  const opener = await screen.findByRole('button', { name: 'Inactivar M1' }); opener.focus(); fireEvent.click(opener)
  expect(await screen.findByRole('dialog')).toHaveAccessibleName('Inactivar Materia')
  expect(screen.getByRole('dialog')).toHaveTextContent('M1 — NAVEGACIÓN')
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operación' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Indica el motivo')
  expect(screen.getByLabelText('Motivo obligatorio')).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(opener).toHaveFocus(); expect(rpc).not.toHaveBeenCalled()
})
it('confirmed inactivation passes the entered reason and original version', async () => {
  tables.carrera_materia = []; rpc.mockResolvedValue({ error: null })
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Inactivar M1' }))
  await screen.findByRole('dialog')
  fireEvent.change(screen.getByLabelText('Motivo obligatorio'), { target: { value: '  ENSAYO  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operación' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('cambiar_active_materia', { id: 'subject', expected_updated_at: version, active: false, motivo: 'ENSAYO' }))
})
it('reactivation requires confirmation but no invented mandatory reason', async () => {
  tables.materia[0].active = false; rpc.mockResolvedValue({ error: null })
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Reactivar M1' }))
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Reactivar Materia')
  expect(screen.queryByLabelText('Motivo obligatorio')).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar operación' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
})
it('required and whitespace fields use inline feedback without native validation bubbles', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.change(screen.getByLabelText('Nombre de Materia'), { target: { value: '   ' } })
  const form = screen.getByRole('button', { name: 'Guardar Materia' }).closest('form')!
  expect(form).toHaveAttribute('novalidate')
  fireEvent.submit(form)
  expect(screen.getByRole('alert')).toHaveTextContent('Este campo es obligatorio')
  expect(screen.getByLabelText('Código de Materia')).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByLabelText('Código de Materia')).toHaveFocus()
  expect(rpc).not.toHaveBeenCalled()
})
it('limits and long field count are visible and inputs keep native maximums', () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  expect(screen.getByLabelText('Código de Materia')).toHaveAttribute('maxlength', '30')
  expect(screen.getByLabelText('Nombre de Materia')).toHaveAttribute('maxlength', '150')
  fireEvent.change(screen.getByLabelText('Descripción de Materia'), { target: { value: 'abc' } })
  expect(screen.getByText('3 / 500')).toBeVisible()
  expect(screen.getByText('Máximo 150 caracteres')).toBeVisible()
})
it('suggests a simple editable sigla only for a new untouched career', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  await screen.findByRole('button', { name: 'Editar C1' })
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Formación Marítima Básica' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('FMB')
  fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: 'MAR' } })
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Otro Nombre' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('MAR')
  fireEvent.click(screen.getByRole('button', { name: 'Editar C1' }))
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Cambio Nombre' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('NAV')
  expect(suggestSigla('Navegación')).toBe('NAVEGACION')
  expect(suggestSigla('Uno dos tres cuatro cinco seis siete ocho nueve diez once')).toMatch(/^[A-Z0-9]{2,10}$/)
})
it('career sigla invalid format is explained inline before any confirmation', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar C1' }))
  await screen.findByLabelText(/M1 — NAVEGACIÓN/)
  fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: '!' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Carrera y Materias' }).closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('2 y 10 caracteres alfanuméricos')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(rpc).not.toHaveBeenCalled()
})
it('association additions warn about modifiable cycles before saving and may be cancelled', async () => {
  tables.materia.push({ id: 'second', codigo: 'M2', nombre: 'SEGUNDA', descripcion: '', active: true, updated_at: version })
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar C1' }))
  await waitFor(() => expect(screen.getByLabelText(/M1 — NAVEGACIÓN/)).toBeChecked())
  fireEvent.click(screen.getByLabelText(/M2 — SEGUNDA/))
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Carrera y Materias' }).closest('form')!)
  expect(await screen.findByRole('dialog')).toHaveTextContent('1 Ciclos modificables')
  expect(screen.getByRole('dialog')).toHaveTextContent('no se reactivarán ni se reclasificarán')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar operación' }))
  expect(rpc).not.toHaveBeenCalled(); expect(screen.getByLabelText(/M2 — SEGUNDA/)).toBeChecked()
})
it('cycle subject references show identity, origin, retirement and own confirmation', async () => {
  tables.ciclo_materia = [{ id: 'relation', ciclo_id: 'cycle', materia_id: 'subject', activo: true, origen: 'HEREDADA', motivo_inactivacion: null }]
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' }))
  const retire = await screen.findByRole('button', { name: 'Retirar' })
  expect(retire.closest('li')).toHaveTextContent('M1 — NAVEGACIÓN — HEREDADA — Asociación activa')
  fireEvent.click(retire)
  expect(screen.getByRole('dialog')).toHaveTextContent('RETIRO_MANUAL')
  expect(screen.queryByLabelText('Motivo obligatorio')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar operación' }))
  expect(rpc).not.toHaveBeenCalled()
})
it('specific safe duplicate/minimum errors never expose internal SQL details', () => {
  expect(academicError({ code: '23505', message: 'duplicate key violates materia_codigo_key' }, 'Materia')).toMatch(/código de Materia/)
  expect(academicError({ code: '23505', message: 'materia_nombre_key SQL SECRET' }, 'Materia')).toMatch(/nombre de Materia/)
  expect(academicError({ code: '23505' }, 'Materia')).not.toMatch(/sigla/)
  expect(academicError({ code: '23505', message: 'carrera_sigla_key' }, 'Carrera')).toMatch(/sigla de Carrera/)
  expect(academicError({ code: '23514', message: 'Cada Carrera requiere al menos una Materia activa' }, 'Materia')).toMatch(/conservar al menos/)
  expect(academicError({ code: '42501', message: 'SECRET SQL' })).not.toMatch(/SECRET|SQL/)
})

it('sigla changes explain terminal history in a cancellable own dialog', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar C1' }))
  await waitFor(() => expect(screen.getByLabelText(/M1 — NAVEGACIÓN/)).toBeChecked())
  fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: 'NEW' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Carrera y Materias' }).closest('form')!)
  expect(await screen.findByRole('dialog')).toHaveTextContent('terminales conservarán su código histórico')
  fireEvent.keyDown(document, { key: 'Escape' }); expect(rpc).not.toHaveBeenCalled()
})
it('OTRO missing detail is rejected inline before state confirmation', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' }))
  fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'DESIERTO' } })
  fireEvent.change(screen.getByLabelText('Motivo de Ciclo Desierto'), { target: { value: 'other' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Confirmar transición' }).closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('Este campo es obligatorio')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(rpc).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/Detalle \/ motivo/), { target: { value: 'ENSAYO' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Confirmar transición' }).closest('form')!)
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Cambiar estado a DESIERTO')
  fireEvent.keyDown(document, { key: 'Escape' }); expect(rpc).not.toHaveBeenCalled()
})
it('explicit cycle subject reactivation confirms without requiring a reason', async () => {
  tables.ciclo_materia = [{ id: 'relation', ciclo_id: 'cycle', materia_id: 'subject', activo: false, origen: 'HEREDADA', motivo_inactivacion: 'RETIRO_MANUAL' }]
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Reactivar explícitamente' }))
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Reactivar Materia del Ciclo')
  expect(screen.queryByLabelText('Motivo obligatorio')).not.toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' }); expect(rpc).not.toHaveBeenCalled()
})

it('changing cycle career explains preservation rules before sending a command', async () => {
  tables.carrera.push({ ...tables.carrera[0], id: 'second-career', codigo: 'C2', nombre: 'SEGUNDA CARRERA', sigla: 'SC' })
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' }))
  await waitFor(() => expect(screen.getByLabelText('Distrito')).toHaveValue('dist'))
  fireEvent.change(screen.getByLabelText('Carrera'), { target: { value: 'second-career' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Ciclo' }).closest('form')!)
  expect(await screen.findByRole('dialog')).toHaveTextContent('C2 — SEGUNDA CARRERA')
  expect(screen.getByRole('dialog')).toHaveTextContent('heredadas anteriores se inactivan')
  expect(screen.getByRole('dialog')).toHaveTextContent('adicionales se conservan')
  fireEvent.keyDown(document, { key: 'Escape' }); expect(rpc).not.toHaveBeenCalled()
})
