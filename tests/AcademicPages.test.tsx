import { act, fireEvent, render, screen, waitFor, cleanup, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AcademicOnly, Materias, Ciclos, Carreras, Auditoria, academicError, suggestSigla } from '../src/academic/AcademicPages'
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
    select: () => builder, gte: () => builder, lte: () => builder, order: () => builder, limit: () => builder, ilike: () => builder, in: (column: string, values: unknown[]) => { filters.push([column, values]); return builder },
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
  await screen.findByRole('button', { name: 'Editar 2026-001-NAV' })
  fireEvent.click(screen.getByRole('button', { name: 'Crear Ciclo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar / descartar formulario' }))
  expect(rpc).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument()
})
it('terminal cycle is read-only without reopening or delete controls', async () => {
  session(['DIRECTOR_ACADEMICO'])
  tables.ciclo[0].estado_codigo = 'CERRADO'
  render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' }))
  await screen.findByText(/Solo consulta. Este Ciclo/)
  expect(screen.queryByRole('button', { name: 'Confirmar transición' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Eliminar|Reabrir|Guardar Ciclo/ })).not.toBeInTheDocument()
})
it('Director chooses a catalog reason; OTRO requires detail', async () => {
  session(['DIRECTOR_ACADEMICO'])
  render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  expect(screen.getByLabelText('Nuevo estado').querySelector('option[value="EN_CURSO"]')).toHaveTextContent('EN CURSO')
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
  fireEvent.click(screen.getByRole('button', { name: 'Inactivar' }))
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
  fireEvent.click(screen.getByRole('button', { name: 'Inactivar' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('cambiar_active_materia', { id: 'subject', expected_updated_at: version, active: false, motivo: 'ENSAYO' }))
})
it('reactivation requires confirmation but no invented mandatory reason', async () => {
  tables.materia[0].active = false; rpc.mockResolvedValue({ error: null })
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Reactivar M1' }))
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Reactivar Materia')
  expect(screen.queryByLabelText('Motivo obligatorio')).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
})
it('required and whitespace fields use inline feedback without native validation bubbles', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(screen.getByRole('button', { name: 'Crear Materia' }))
  fireEvent.change(screen.getByLabelText('Nombre de Materia'), { target: { value: '   ' } })
  const form = screen.getByRole('button', { name: 'Guardar Materia' }).closest('form')!
  expect(form).toHaveAttribute('novalidate')
  fireEvent.submit(form)
  expect(screen.getByRole('alert')).toHaveTextContent('Ingresa el código de la Materia')
  expect(screen.getByLabelText('Código de Materia')).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByLabelText('Código de Materia')).toHaveFocus()
  expect(rpc).not.toHaveBeenCalled()
})
it('limits and long field count are visible and inputs keep native maximums', () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(screen.getByRole('button', { name: 'Crear Materia' }))
  expect(screen.getByLabelText('Código de Materia')).toHaveAttribute('maxlength', '30')
  expect(screen.getByLabelText('Nombre de Materia')).toHaveAttribute('maxlength', '150')
  fireEvent.change(screen.getByLabelText('Descripción de Materia'), { target: { value: 'abc' } })
  expect(screen.getByText('3 / 500')).toBeVisible()
  expect(screen.getByText('Máximo 150 caracteres')).toBeVisible()
})
it('suggests a simple editable sigla only for a new untouched career', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  await screen.findByRole('button', { name: 'Editar C1' })
  fireEvent.click(screen.getByRole('button', { name: 'Crear Carrera' }))
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Formación Marítima Básica' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('FMB')
  fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: 'MAR' } })
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Otro Nombre' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('MAR')
  fireEvent.click(screen.getByRole('button', { name: 'Editar C1' }))
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Cambio Nombre' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('NAV')
  expect(suggestSigla('Navegación')).toBe('NVG')
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
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  const retire = await screen.findByRole('button', { name: 'Retirar' })
  expect(retire.closest('tr')).toHaveTextContent('M1NAVEGACIÓNHEREDADAActiva')
  fireEvent.click(retire)
  expect(screen.getByRole('dialog')).toHaveTextContent('sin borrar su historial')
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
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'DESIERTO' } })
  fireEvent.change(screen.getByLabelText('Motivo de Ciclo Desierto'), { target: { value: 'other' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Confirmar transición' }).closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('Indica el detalle o motivo obligatorio')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(rpc).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/Detalle \/ motivo/), { target: { value: 'ENSAYO' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Confirmar transición' }).closest('form')!)
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Cambiar estado a DESIERTO')
  fireEvent.keyDown(document, { key: 'Escape' }); expect(rpc).not.toHaveBeenCalled()
})
it('explicit cycle subject reactivation confirms without requiring a reason', async () => {
  tables.ciclo_materia = [{ id: 'relation', ciclo_id: 'cycle', materia_id: 'subject', activo: false, origen: 'HEREDADA', motivo_inactivacion: 'RETIRO_MANUAL' }]
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Reactivar explícitamente' }))
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Reactivar Materia del Ciclo')
  expect(screen.queryByLabelText('Motivo obligatorio')).not.toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' }); expect(rpc).not.toHaveBeenCalled()
})

it('changing cycle career explains preservation rules before sending a command', async () => {
  tables.carrera.push({ ...tables.carrera[0], id: 'second-career', codigo: 'C2', nombre: 'SEGUNDA CARRERA', sigla: 'SC' })
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  await waitFor(() => expect(screen.getByLabelText('Distrito')).toHaveValue('dist'))
  fireEvent.change(screen.getByLabelText('Carrera'), { target: { value: 'second-career' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Ciclo' }).closest('form')!)
  expect(await screen.findByRole('dialog')).toHaveTextContent('C2 — SEGUNDA CARRERA')
  expect(screen.getByRole('dialog')).toHaveTextContent('materias heredadas de la Carrera actual se retirarán')
  expect(screen.getByRole('dialog')).toHaveTextContent('adicionales se conservarán')
  fireEvent.keyDown(document, { key: 'Escape' }); expect(rpc).not.toHaveBeenCalled()
})

it('list, creation and editing are distinct; cancel returns to neutral list with focus', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  expect(screen.queryByRole('button', { name: 'Guardar Materia' })).not.toBeInTheDocument()
  const create = screen.getByRole('button', { name: 'Crear Materia' })
  fireEvent.click(create)
  expect(screen.getByRole('heading', { name: 'Nueva Materia' })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('button', { name: 'Guardar Materia' })).not.toBeInTheDocument()
  expect(create).toHaveFocus()
  fireEvent.click(await screen.findByRole('button', { name: 'Editar M1' }))
  expect(screen.getByRole('heading', { name: 'Editando M1 — NAVEGACIÓN' })).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Editar M1' })).toHaveTextContent(/^Editar$/)
  expect(rpc).not.toHaveBeenCalled()
})
it('empty subject list offers creation only to authorized maintenance role', async () => {
  tables.materia = []; session(['COORDINADOR_ACADEMICO'])
  const view = render(<Materias />)
  expect(await screen.findByText('No hay Materias registradas.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Crear primera Materia' })).not.toBeInTheDocument()
  view.unmount(); session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Crear primera Materia' }))
  expect(screen.getByRole('heading', { name: 'Nueva Materia' })).toBeVisible()
})
it('local subject search preserves selected career subjects when hidden by the filter', async () => {
  tables.materia.push({ id: 'second', codigo: 'M2', nombre: 'SEGUNDA', active: true, updated_at: version })
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar C1' }))
  await waitFor(() => expect(screen.getByLabelText(/M1 — NAVEGACIÓN/)).toBeChecked())
  fireEvent.change(screen.getByLabelText('Localizar Materia'), { target: { value: 'M2' } })
  expect(screen.queryByLabelText(/M1 — NAVEGACIÓN/)).not.toBeInTheDocument()
  expect(screen.getByText('1 seleccionadas')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Localizar Materia'), { target: { value: '' } })
  expect(screen.getByLabelText(/M1 — NAVEGACIÓN/)).toBeChecked()
  expect(rpc).not.toHaveBeenCalled()
})
it('audit changes are human-readable with full technical evidence as secondary detail', async () => {
  tables.auditoria = [{ id: 'event-id', entidad: 'materia', registro_id: 'record-id', accion: 'UPDATE', actor: 'actor', fecha: '2026-10-22T15:00:00Z', motivo: 'ENSAYO', old_values: { codigo: 'M1', nombre: 'ANTES' }, new_values: { codigo: 'M1', nombre: 'DESPUÉS' } }]
  session(['DIRECTOR_ACADEMICO']); render(<Auditoria />)
  expect(await screen.findByText('Mi cuenta')).toBeVisible()
  expect(screen.getByRole('cell', { name: 'Actualización' })).toBeVisible()
  const changes = screen.getByText('Ver cambios (1)').closest('details')!
  expect(changes).not.toHaveAttribute('open')
  fireEvent.click(screen.getByText('Ver cambios (1)'))
  expect(screen.getByText('Antes: ANTES')).toBeVisible()
  expect(screen.getByText('Después: DESPUÉS')).toBeVisible()
  expect(screen.getByText('Detalle técnico completo').closest('details')).not.toHaveAttribute('open')
  expect(rpc).not.toHaveBeenCalled()
})

it('confirmed operation returns focus when its opener is enabled again after the request', async () => {
  tables.materia[0].active = false
  let finish: (value: unknown) => void = () => undefined
  rpc.mockReturnValue(new Promise(resolve => { finish = resolve }))
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  const opener = await screen.findByRole('button', { name: 'Reactivar M1' }); opener.focus(); fireEvent.click(opener)
  fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }))
  await waitFor(() => expect(opener).toBeDisabled())
  await act(async () => finish({ error: null }))
  expect(opener).not.toBeDisabled(); expect(opener).toHaveFocus()
})


it.each(['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'])('modifiable Cycle action describes editing for %s', async role => {
  session([role])
  tables.ciclo.push({ ...ciclo, id: 'running', codigo_ciclo: '2026-002-NAV', estado_codigo: 'EN_CURSO' })
  render(<Ciclos />)
  expect(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' })).toHaveTextContent('Editar')
  expect(screen.getByRole('button', { name: 'Editar 2026-002-NAV' })).toHaveTextContent('Editar')
  fireEvent.click(screen.getByRole('button', { name: 'Editar 2026-002-NAV' }))
  expect(await screen.findByRole('button', { name: 'Guardar Ciclo' })).toBeVisible()
  expect(rpc).not.toHaveBeenCalled()
})
it.each(['CERRADO', 'DESIERTO', 'ANULADO'])('terminal %s remains consultation only', async estado => {
  session(['DIRECTOR_ACADEMICO']); tables.ciclo[0].estado_codigo = estado
  render(<Ciclos />)
  const action = await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' })
  expect(action).toHaveTextContent('Consultar'); fireEvent.click(action)
  expect(await screen.findByText(/Solo consulta. Este Ciclo/)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Guardar Ciclo' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Confirmar transición' })).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
})
it('Cycle presentation does not offer editing without a modifying role; route guard remains separate', async () => {
  session(['ADMIN_SISTEMA']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Consultar 2026-001-NAV' }))
  expect(await screen.findByText('Solo consulta. Tu acceso no permite modificar este Ciclo.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Crear Ciclo' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Guardar Ciclo' })).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
})
it('Career subjects are structured and absence of additional options is explicit', async () => {
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  const source = await screen.findByRole('table', { name: 'Materias activas de la Carrera seleccionada' })
  expect(within(source).getByRole('cell', { name: 'M1' })).toBeVisible()
  expect(within(source).getByRole('cell', { name: 'NAVEGACIÓN' })).toBeVisible()
  expect(screen.getByText('No hay materias activas adicionales disponibles para agregar a este Ciclo.')).toBeVisible()
  expect(screen.getByRole('table', { name: 'Materias actuales e historial de retiros' })).toBeVisible()
  expect(screen.queryByText(/Materias que se incorporarán/)).not.toBeInTheDocument()
})
it('additional subjects keep code and name, excluding inherited, related and inactive options', async () => {
  tables.materia.push(
    { id: 'extra', codigo: 'M2', nombre: 'SEGURIDAD', active: true, updated_at: version },
    { id: 'inactive', codigo: 'M3', nombre: 'INACTIVA', active: false, updated_at: version },
    { id: 'retired', codigo: 'M4', nombre: 'RETIRADA', active: true, updated_at: version },
  )
  tables.ciclo_materia.push({ id: 'relation', ciclo_id: 'cycle', materia_id: 'retired', activo: false, origen: 'ADICIONAL', motivo_inactivacion: 'RETIRO_MANUAL' })
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  await screen.findByRole('table', { name: 'Materias activas de la Carrera seleccionada' })
  const options = screen.getByRole('group', { name: 'Materias adicionales disponibles' })
  expect(within(options).getByRole('checkbox', { name: 'M2 — SEGURIDAD' })).toBeVisible()
  expect(within(options).getAllByRole('checkbox')).toHaveLength(1)
  expect(screen.getByRole('table', { name: 'Materias actuales e historial de retiros' })).toHaveTextContent('Retirada manualmente')
  expect(screen.queryByText(/No hay materias activas adicionales disponibles/)).not.toBeInTheDocument()
})
it('missing Modalidad has an adjacent associated message, focus and scrolling, then clears without stealing focus', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar C1' }))
  await waitFor(() => expect(screen.getByLabelText(/M1 — NAVEGACIÓN/)).toBeChecked())
  const field = screen.getByLabelText('Modalidad'), scroll = vi.fn()
  field.scrollIntoView = scroll
  fireEvent.change(field, { target: { value: '' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Carrera y Materias' }).closest('form')!)
  expect(field).toHaveFocus(); expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' })
  const error = document.getElementById(field.getAttribute('aria-describedby')!)!
  expect(error).toHaveTextContent('Error: Selecciona una modalidad.')
  expect(field.closest('label')).toContainElement(error)
  screen.getByLabelText('Nombre de Carrera').focus()
  fireEvent.change(field, { target: { value: 'mode' } })
  expect(field).not.toHaveAttribute('aria-invalid'); expect(error).not.toBeInTheDocument()
  expect(screen.getByLabelText('Nombre de Carrera')).toHaveFocus()
  expect(scroll).toHaveBeenCalledTimes(1); expect(rpc).not.toHaveBeenCalled()
})
it('Materia required messages stay beside each field and focus the first missing value', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(screen.getByRole('button', { name: 'Crear Materia' }))
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Materia' }).closest('form')!)
  for (const label of ['Código de Materia', 'Nombre de Materia']) {
    const field = screen.getByLabelText(label)
    const error = document.getElementById(field.getAttribute('aria-describedby')!)!
    expect(error).toHaveTextContent(label.startsWith('Código') ? 'Ingresa el código de la Materia.' : 'Ingresa el nombre de la Materia.')
    expect(field.closest('label')).toContainElement(error)
  }
  expect(screen.getByLabelText('Código de Materia')).toHaveFocus()
  expect(rpc).not.toHaveBeenCalled()
})
it('missing Cycle location uses the common inline validation and preserves other input', async () => {
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  await screen.findByRole('table', { name: 'Materias activas de la Carrera seleccionada' })
  const field = screen.getByLabelText('Capitanía'), scroll = vi.fn(); field.scrollIntoView = scroll
  fireEvent.change(field, { target: { value: '' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Ciclo' }).closest('form')!)
  expect(field).toHaveFocus(); expect(scroll).toHaveBeenCalledTimes(1)
  expect(document.getElementById(field.getAttribute('aria-describedby')!)).toHaveTextContent('Selecciona una capitanía.')
  expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('2037-01-01')
  expect(rpc).not.toHaveBeenCalled()
})
it.each([
  ['FORMACIÓN NÁUTICA', 'FN'], ['FORMACIÓN ALTERNA H2', 'FAH2'], ['BUZO', 'BZ'],
  ['NAVEGACIÓN', 'NVG'], ['ESCUELA DE LA MARINA', 'EM'], ['A', 'AA'], ['', ''],
])('suggests a short deterministic abbreviation for %s', (name, expected) => {
  expect(suggestSigla(name)).toBe(expected)
})
it('sigla suggestion respects the maximum and never contains accents or punctuation', () => {
  const suggestion = suggestSigla('ÁGUA BOTE COSTA DELTA ESTE FARO GRAU HELICE ISLA JUNCO KAYAK LIMA')
  expect(suggestion).toMatch(/^[A-Z0-9]{2,10}$/)
})
