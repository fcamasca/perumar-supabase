import {MemoryRouter} from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AcademicOnly, Materias, Ciclos, Carreras, Auditoria, academicError, suggestSigla } from '../src/academic/AcademicPages'
import { useSession } from '../src/security/SessionProvider'

vi.mock('../src/security/SessionProvider', () => ({ useSession: vi.fn() }))
const version = '2026-10-22T00:00:00Z'
const ciclo = { id: 'cycle', carrera_id: 'career', codigo_ciclo: '2026-001-NAV', fecha_inicio: '2037-01-01', fecha_fin: '2037-01-02', nombre_promocion: '', departamento_id: 'dep', provincia_id: 'prov', distrito_id: 'dist', capitania_id: 'cap', estado_codigo: 'PROGRAMADO', updated_at: version }
let tables: Record<string, Record<string, unknown>[]>
let errorTable: string | null = null
const rpc = vi.fn()
const queryCalls: {table:string;orders:[string,unknown][];likes:[string,string][];or?:string;filters:[string,unknown][];bounds?:[number,number]}[] = []
function from(table: string) {
  const filters: [string, unknown][] = []
  const call: typeof queryCalls[number] = {table,orders:[],likes:[],filters}; queryCalls.push(call)
  let single = false
  const builder = {
    select: () => builder, or: (expression:string) => {call.or=expression;return builder}, gte: () => builder, lte: () => builder, order: (column:string,options?:unknown) => {call.orders.push([column,options]);return builder}, range: (start:number,end:number) => {call.bounds=[start,end];return builder}, limit: () => builder, ilike: (column:string,text:string) => {call.likes.push([column,text]);return builder}, in: (column: string, values: unknown[]) => { filters.push([column, values]); return builder },
    eq: (column: string, value: unknown) => { filters.push([column, value]); return builder },
    single: () => { single = true; return builder },
    then: (resolve: (value: unknown) => unknown) => {
      const data = (tables[table] ?? []).filter(row => filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value))
      return Promise.resolve({ data: single ? data[0] : call.bounds ? data.slice(call.bounds[0],call.bounds[1]+1) : data, error: table===errorTable ? {code:'FAILED'} : null }).then(resolve)
    },
  }
  return builder
}
function session(roles: string[]) {
  vi.mocked(useSession).mockReturnValue({ state: { phase: 'authorized', userId: 'actor', roles }, client: { from, rpc } } as unknown as ReturnType<typeof useSession>)
}
beforeEach(() => {
  rpc.mockReset(); queryCalls.length=0; errorTable=null
  tables = {
    materia: [{ id: 'subject', codigo: 'M1', nombre: 'NAVEGACIÓN', descripcion: '', active: true, updated_at: version }],
    carrera: [{ id: 'career', codigo: 'C1', nombre: 'CARRERA', descripcion: '', active: true, sigla: 'NAV', modalidad_id: 'mode', con_experiencia: false, updated_at: version }],
    ciclo: [{ ...ciclo }], catalogo: [{ id: 'reasons', codigo: 'MOTIVO_CICLO_DESIERTO' }, { id: 'modes', codigo: 'MODALIDAD_CARRERA' }],
    catalogo_valor: [{ id: 'mode', catalogo_id: 'modes', codigo: 'PRESENCIAL', nombre: 'Presencial', activo: true }, { id: 'other', catalogo_id: 'reasons', codigo: 'OTRO', nombre: 'OTRO', activo: true }],
    departamento: [{ id: 'dep', nombre: 'DEPARTAMENTO', active: true }], provincia: [{ id: 'prov', departamento_id: 'dep', nombre: 'PROVINCIA', active: true }],
    distrito: [{ id: 'dist', provincia_id: 'prov', nombre: 'DISTRITO', active: true }], capitania: [{ id: 'cap', nombre: 'CAPITANÍA', active: true }],
    tarifa: [{id:'fee',codigo:'TC',nombre:'TARIFA CARRERA',tipo:'CARRERA',monto_por_defecto:'100',activo:true}], ciclo_tarifa:[{ciclo_id:'cycle',tarifa_id:'fee',importe:'100',obligatorio:true,activo:true}],
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
  fireEvent.click(await screen.findByRole('button', { name: 'Editar NAVEGACIÓN' }))
  fireEvent.change(screen.getByLabelText('Nombre de Materia'), { target: { value: 'EDITADO' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Materia' }).closest('form')!)
  expect(await screen.findByRole('alert')).toHaveTextContent('El registro fue modificado por otro usuario')
  expect(screen.getByLabelText('Nombre de Materia')).toHaveValue('EDITADO')
  expect(rpc).toHaveBeenCalledExactlyOnceWith('guardar_materia', { p: { id: 'subject', expected_updated_at: version, nombre: 'EDITADO', descripcion: null } })
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
  fireEvent.click(await screen.findByRole('button', { name: 'Ver 2026-001-NAV' }))
  await screen.findByText(/Solo consulta. Este Ciclo/)
  expect(screen.queryByRole('button', { name: 'Confirmar transición' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Eliminar|Reabrir|Guardar Ciclo/ })).not.toBeInTheDocument()
})
it('Director chooses a catalog reason; OTRO requires detail', async () => {
  session(['DIRECTOR_ACADEMICO'])
  render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  fireEvent.click(screen.getByRole('tab',{name:'Estado'}))
  expect(screen.getByLabelText('Nuevo estado').querySelector('option[value="EN_CURSO"]')).toHaveTextContent('EN CURSO')
  fireEvent.click(screen.getByRole('tab',{name:'Estado'}))
  fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'DESIERTO' } })
  fireEvent.change(screen.getByLabelText('Motivo de Ciclo Desierto'), { target: { value: 'other' } })
  expect(screen.getByLabelText(/Detalle \/ motivo/)).toBeRequired()
})

it('pending save prevents accidental discard or changes to in-flight input', async () => {
  session(['DIRECTOR_ACADEMICO'])
  let finish: (value: unknown) => void = () => undefined
  rpc.mockReturnValue(new Promise(resolve => { finish = resolve }))
  render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar NAVEGACIÓN' }))
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Materia' }).closest('form')!)
  expect(screen.getByLabelText('Nombre de Materia')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Recargar información' })).not.toBeInTheDocument()
  await act(async () => finish({ error: { code: '40001' }, data: null }))
  expect(screen.getByLabelText('Nombre de Materia')).not.toBeDisabled()
  expect(rpc).toHaveBeenCalledTimes(1)
})

it('last active subject is rejected before confirmation or asking for a reason', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Inactivar NAVEGACIÓN' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('NAV — CARRERA')
  expect(screen.getByRole('alert')).toHaveTextContent('Asocia primero otra Materia activa')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
})
it('inactivation asks for reason in the app and cancellation never writes', async () => {
  tables.carrera_materia = []
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  const opener = await screen.findByRole('button', { name: 'Inactivar NAVEGACIÓN' }); opener.focus(); fireEvent.click(opener)
  expect(await screen.findByRole('dialog')).toHaveAccessibleName('Inactivar Materia')
  expect(screen.getByRole('dialog')).toHaveTextContent('NAVEGACIÓN')
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
  fireEvent.click(await screen.findByRole('button', { name: 'Inactivar NAVEGACIÓN' }))
  await screen.findByRole('dialog')
  fireEvent.change(screen.getByLabelText('Motivo obligatorio'), { target: { value: '  ENSAYO  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Inactivar' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('cambiar_active_materia', { id: 'subject', expected_updated_at: version, active: false, motivo: 'ENSAYO' }))
})
it('reactivation requires confirmation but no invented mandatory reason', async () => {
  tables.materia[0].active = false; rpc.mockResolvedValue({ error: null })
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(await screen.findByRole('button', { name: 'Reactivar NAVEGACIÓN' }))
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
  expect(screen.getByRole('alert')).toHaveTextContent('Ingresa el nombre de la Materia')
  expect(screen.getByLabelText('Nombre de Materia')).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByLabelText('Nombre de Materia')).toHaveFocus()
  expect(rpc).not.toHaveBeenCalled()
})
it('limits and long field count are visible and inputs keep native maximums', () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(screen.getByRole('button', { name: 'Crear Materia' }))
  expect(screen.queryByLabelText('Código de Materia')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Nombre de Materia')).toHaveAttribute('maxlength', '150')
  fireEvent.change(screen.getByLabelText('Descripción de Materia'), { target: { value: 'abc' } })
  expect(screen.getByText('3 / 500')).toBeVisible()
  expect(screen.getByText('Máximo 150 caracteres')).toBeVisible()
})
it('suggests a simple editable sigla only for a new untouched career', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  await screen.findByRole('button', { name: 'Editar CARRERA' })
  fireEvent.click(screen.getByRole('button', { name: 'Crear Carrera' }))
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Formación Marítima Básica' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('FMB')
  fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: 'MAR' } })
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Otro Nombre' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('MAR')
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}))
  fireEvent.click(screen.getByRole('button', { name: 'Editar CARRERA' }))
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'), { target: { value: 'Cambio Nombre' } })
  expect(screen.getByLabelText('Sigla')).toHaveValue('NAV')
  expect(suggestSigla('Navegación')).toBe('NVG')
  expect(suggestSigla('Uno dos tres cuatro cinco seis siete ocho nueve diez once')).toMatch(/^[A-Z0-9]{2,10}$/)
})
it('career sigla invalid format is explained inline before any confirmation', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar CARRERA' }))
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}))
  await screen.findByLabelText(/NAVEGACIÓN/)
  fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: '!' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Carrera y Materias' }).closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('2 y 10 caracteres alfanuméricos')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(rpc).not.toHaveBeenCalled()
})
it('association additions warn about modifiable cycles before saving and may be cancelled', async () => {
  tables.materia.push({ id: 'second', codigo: 'M2', nombre: 'SEGUNDA', descripcion: '', active: true, updated_at: version })
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar CARRERA' }))
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}))
  await waitFor(() => expect(screen.getByLabelText(/NAVEGACIÓN/)).toBeChecked())
  fireEvent.click(screen.getByLabelText(/SEGUNDA/))
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Carrera y Materias' }).closest('form')!)
  expect(await screen.findByRole('dialog')).toHaveTextContent('1 Ciclos modificables')
  expect(screen.getByRole('dialog')).toHaveTextContent('no se reactivarán ni se reclasificarán')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar operación' }))
  expect(rpc).not.toHaveBeenCalled(); expect(screen.getByLabelText(/SEGUNDA/)).toBeChecked()
})
it('cycle subject references show identity, origin, retirement and own confirmation', async () => {
  tables.ciclo_materia = [{ id: 'relation', ciclo_id: 'cycle', materia_id: 'subject', activo: true, origen: 'HEREDADA', motivo_inactivacion: null }]
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}))
  const retire = await screen.findByRole('button', { name: 'Retirar' })
  expect(retire.closest('tr')).toHaveTextContent('NAVEGACIÓNCarreraActiva')
  fireEvent.click(retire)
  expect(screen.getByRole('dialog')).toHaveTextContent('Continuará perteneciendo a la Carrera')
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
  fireEvent.click(await screen.findByRole('button', { name: 'Editar CARRERA' }))
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}))
  await waitFor(() => expect(screen.getByLabelText(/NAVEGACIÓN/)).toBeChecked())
  fireEvent.change(screen.getByLabelText('Sigla'), { target: { value: 'NEW' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Carrera y Materias' }).closest('form')!)
  expect(await screen.findByRole('dialog')).toHaveTextContent('terminales conservarán su código histórico')
  fireEvent.keyDown(document, { key: 'Escape' }); expect(rpc).not.toHaveBeenCalled()
})
it('OTRO missing detail is rejected inline before state confirmation', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  fireEvent.click(screen.getByRole('tab',{name:'Estado'}))
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
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}))
  fireEvent.click(screen.getByRole('checkbox',{name:'Mostrar retiradas'}))
  fireEvent.click(await screen.findByRole('button', { name: 'Reactivar' }))
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
  await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar Ciclo'})).toBeEnabled())
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Ciclo' }).closest('form')!)
  expect(await screen.findByRole('dialog')).toHaveTextContent('SC — SEGUNDA CARRERA')
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
  expect(screen.getByRole('button',{name:'Crear Materia'})).toHaveFocus()
  fireEvent.click(await screen.findByRole('button', { name: 'Editar NAVEGACIÓN' }))
  expect(screen.getByRole('heading', { name: 'Ficha de Materia' })).toHaveFocus()
  expect(screen.queryByRole('button', { name: 'Editar NAVEGACIÓN' })).not.toBeInTheDocument()
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
  fireEvent.click(await screen.findByRole('button', { name: 'Editar CARRERA' }))
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}))
  await waitFor(() => expect(screen.getByLabelText(/NAVEGACIÓN/)).toBeChecked())
  fireEvent.change(screen.getByLabelText('Localizar Materia'), { target: { value: 'M2' } })
  expect(screen.queryByLabelText(/NAVEGACIÓN/)).not.toBeInTheDocument()
  expect(screen.getByText('1 seleccionadas')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Localizar Materia'), { target: { value: '' } })
  expect(screen.getByLabelText(/NAVEGACIÓN/)).toBeChecked()
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
  const opener = await screen.findByRole('button', { name: 'Reactivar NAVEGACIÓN' }); opener.focus(); fireEvent.click(opener)
  fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }))
  await waitFor(() => expect(opener).toBeDisabled())
  await act(async () => finish({ error: null }))
  expect(opener).not.toBeDisabled(); expect(opener).toHaveFocus()
})


it.each(['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'])('modifiable Cycle action describes editing for %s', async role => {
  session([role])
  tables.ciclo.push({ ...ciclo, id: 'running', codigo_ciclo: '2026-002-NAV', estado_codigo: 'EN_CURSO' })
  render(<Ciclos />)
  expect(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' })).toHaveAccessibleName('Editar 2026-001-NAV')
  expect(screen.getByRole('button', { name: 'Editar 2026-002-NAV' })).toHaveAccessibleName('Editar 2026-002-NAV')
  fireEvent.click(screen.getByRole('button', { name: 'Editar 2026-002-NAV' }))
  expect(await screen.findByRole('button', { name: 'Guardar Ciclo' })).toBeVisible()
  expect(rpc).not.toHaveBeenCalled()
})
it.each(['CERRADO', 'DESIERTO', 'ANULADO'])('terminal %s remains consultation only', async estado => {
  session(['DIRECTOR_ACADEMICO']); tables.ciclo[0].estado_codigo = estado
  render(<Ciclos />)
  const action = await screen.findByRole('button', { name: 'Ver 2026-001-NAV' })
  expect(action).toHaveAccessibleName('Ver 2026-001-NAV'); fireEvent.click(action)
  expect(await screen.findByText(/Solo consulta. Este Ciclo/)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Guardar Ciclo' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Confirmar transición' })).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
})
it('Cycle presentation does not offer editing without a modifying role; route guard remains separate', async () => {
  session(['ADMIN_SISTEMA']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Ver 2026-001-NAV' }))
  expect(await screen.findByText('Solo consulta. Tu acceso no permite modificar este Ciclo.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Crear Ciclo' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Guardar Ciclo' })).not.toBeInTheDocument()
  expect(rpc).not.toHaveBeenCalled()
})
it('shows one Cycle subject table, readable origin and retired history only on demand', async () => {
  tables.ciclo_materia=[{id:'r1',ciclo_id:'cycle',materia_id:'subject',activo:true,origen:'HEREDADA',motivo_inactivacion:null}];
  session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);
  fireEvent.click(await screen.findByRole('button',{name:'Editar 2026-001-NAV'}));
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
  const table=await screen.findByRole('table',{name:'Materias del Ciclo'});
  await waitFor(()=>expect(table).toHaveTextContent('NAVEGACIÓN'));
  expect(table).toHaveTextContent('Carrera');expect(table).not.toHaveTextContent('HEREDADA');
  expect(screen.getAllByRole('table')).toHaveLength(1);
  expect(screen.queryByRole('group',{name:'Materias adicionales disponibles'})).not.toBeInTheDocument();
  expect(screen.queryByRole('list',{name:'Resultados de materias adicionales'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox',{name:'Agregar materia adicional'}),{target:{value:'navegación'}});
  expect(screen.getByRole('status')).toHaveTextContent('No hay materias activas disponibles');
  expect(rpc).not.toHaveBeenCalled();
});
it('searches active subjects without listing the catalog and excludes active/retired Cycle relations',async()=>{
  tables.materia.push({id:'extra',nombre:'SEGURIDAD',active:true,updated_at:version},{id:'inactive',nombre:'INACTIVA',active:false,updated_at:version},{id:'retired',nombre:'RETIRADA',active:true,updated_at:version});
  tables.ciclo_materia=[{id:'r1',ciclo_id:'cycle',materia_id:'subject',activo:true,origen:'HEREDADA',motivo_inactivacion:null},{id:'r2',ciclo_id:'cycle',materia_id:'retired',activo:false,origen:'ADICIONAL',motivo_inactivacion:'RETIRO_MANUAL'}];
  session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);
  fireEvent.click(await screen.findByRole('button',{name:'Editar 2026-001-NAV'}));fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
  const table=await screen.findByRole('table',{name:'Materias del Ciclo'});
  await waitFor(()=>expect(screen.getByRole('searchbox',{name:'Agregar materia adicional'})).toBeEnabled());
  expect(table).not.toHaveTextContent('RETIRADA');expect(screen.queryByRole('button',{name:'Reactivar'})).not.toBeInTheDocument();
  const search=screen.getByRole('searchbox',{name:'Agregar materia adicional'});
  for(const name of ['INACTIVA','RETIRADA','NAVEGACIÓN']) {fireEvent.change(search,{target:{value:name}});expect(screen.getByRole('status')).toHaveTextContent('No hay materias activas disponibles');}
  fireEvent.change(search,{target:{value:'segur'}});fireEvent.click(screen.getByRole('button',{name:'SEGURIDAD'}));
  rpc.mockResolvedValue({data:{...ciclo,updated_at:'version-2'},error:null});
  tables.ciclo_materia.push({id:'new',ciclo_id:'cycle',materia_id:'extra',activo:true,origen:'ADICIONAL',motivo_inactivacion:null});
  fireEvent.click(screen.getByRole('button',{name:'Agregar'}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('guardar_ciclo',{p:expect.objectContaining({id:'cycle',expected_updated_at:version}),adicionales:['extra']}));
  await waitFor(()=>expect(screen.getByRole('table',{name:'Materias del Ciclo'})).toHaveTextContent('SEGURIDADAdicionalActiva'));
  fireEvent.click(screen.getByRole('checkbox',{name:'Mostrar retiradas'}));
  expect(screen.getByRole('table',{name:'Materias del Ciclo'})).toHaveTextContent('RETIRADAAdicionalRetirada');
  expect(screen.getByRole('button',{name:'Reactivar'})).toBeVisible();
});
it('makes Modalidad optional, places it and Sigla before Description, and keeps Sigla required', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Carreras />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar CARRERA' }))
  await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar Carrera y Materias'})).toBeEnabled())
  const field=screen.getByLabelText('Modalidad'),sigla=screen.getByLabelText('Sigla'),description=screen.getByLabelText('Descripción de Carrera')
  expect(field).not.toBeRequired(); expect(sigla).toBeRequired()
  expect(sigla.compareDocumentPosition(field)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(sigla.compareDocumentPosition(description)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.change(field,{target:{value:''}});fireEvent.change(sigla,{target:{value:''}})
  fireEvent.click(screen.getByRole('button',{name:'Guardar Carrera y Materias'}))
  expect(sigla).toHaveFocus();expect(field).not.toHaveAttribute('aria-invalid');expect(rpc).not.toHaveBeenCalled()
  fireEvent.change(sigla,{target:{value:'NAV'}})
  rpc.mockResolvedValue({data:{...tables.carrera[0],modalidad_id:null,updated_at:'version-2'},error:null})
  fireEvent.click(screen.getByRole('button',{name:'Guardar Carrera y Materias'}))
  await waitFor(()=>expect(rpc).toHaveBeenCalledExactlyOnceWith('guardar_carrera',{p:expect.objectContaining({id:'career',expected_updated_at:version,modalidad_id:null}),materias:['subject']}))
  expect(await screen.findByRole('table',{name:'Carreras'})).toBeVisible()
  expect(screen.queryByRole('button',{name:'Guardar Carrera y Materias'})).not.toBeInTheDocument()
})
it('Materia required messages stay beside each field and focus the first missing value', async () => {
  session(['DIRECTOR_ACADEMICO']); render(<Materias />)
  fireEvent.click(screen.getByRole('button', { name: 'Crear Materia' }))
  fireEvent.submit(screen.getByRole('button', { name: 'Guardar Materia' }).closest('form')!)
  for (const label of ['Nombre de Materia']) {
    const field = screen.getByLabelText(label)
    const error = document.getElementById(field.getAttribute('aria-describedby')!)!
    expect(error).toHaveTextContent(label.startsWith('Código') ? 'Ingresa el nombre de la Materia.' : 'Ingresa el nombre de la Materia.')
    expect(field.closest('label')).toContainElement(error)
  }
  expect(screen.getByLabelText('Nombre de Materia')).toHaveFocus()
  expect(rpc).not.toHaveBeenCalled()
})
it('missing Cycle location uses the common inline validation and preserves other input', async () => {
  session(['COORDINADOR_ACADEMICO']); render(<Ciclos />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar 2026-001-NAV' }))
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}))
  await screen.findByRole('table', { name: 'Materias del Ciclo' })
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

it.each([
  {Component:Materias,table:'materia',label:'Materias',code:'M',back:'Volver a materias',search:'Buscar Materia por nombre'},
  {Component:Carreras,table:'carrera',label:'Carreras',code:'C',back:'Volver a carreras',search:'Buscar Carrera por sigla o nombre'},
  {Component:Ciclos,table:'ciclo',label:'Ciclos',code:'CY',back:'Volver a ciclos',search:'Buscar Ciclo por código o Carrera'},
])('$label shares newest-first paging, row actions and list/record navigation without resetting filters',async({Component,table,label,code,back,search})=>{
  const base=tables[table][0];tables[table]=Array.from({length:65},(_,i)=>({...base,id:`row-${i}`,codigo:`${code}${i}`,codigo_ciclo:`${code}${i}`,nombre:`NOMBRE ${i}`}));
  session(['DIRECTOR_ACADEMICO']);render(<Component/>);
  await screen.findByRole('button',{name:`Ver ${table==='ciclo'?code+'0':'NOMBRE 0'}`});
  expect(screen.getByRole('search',{name:`Búsqueda de ${label.toLowerCase()}`})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Recargar información'})).not.toBeInTheDocument();
  let request=queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)!;
  expect(request.bounds).toEqual([0,29]);expect(request.orders).toEqual([['created_at',{ascending:false}],['id',{ascending:false}]]);
  fireEvent.click(screen.getByRole('button',{name:'Siguiente página'}));
  await screen.findByRole('button',{name:`Ver ${table==='ciclo'?code+'30':'NOMBRE 30'}`});
  expect(queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)!.bounds).toEqual([30,59]);
  fireEvent.click(screen.getByRole('button',{name:`Ver ${table==='ciclo'?code+'30':'NOMBRE 30'}`}));
  expect(screen.queryByRole('search')).not.toBeInTheDocument();
  expect(screen.queryByRole('table',{name:label})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Recargar información'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:back}));
  expect(screen.getByText('Página 2 · 30 resultados')).toBeVisible();
  fireEvent.change(screen.getByRole('searchbox',{name:search}),{target:{value:'ensayo'}});
  await waitFor(()=>expect(queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)!.bounds).toEqual([0,29]));
  request=queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)!;
  if(table==='ciclo') expect(request.or).toBe('codigo_ciclo.ilike."%ENSAYO%"');
  else if(table==='carrera') expect(request.or).toBe('sigla.ilike."%ENSAYO%",nombre.ilike."%ENSAYO%"');
  else expect(request.likes).toEqual([['nombre','%ENSAYO%']]);
  expect(rpc).not.toHaveBeenCalled();
});
it('Coordinador can view all Materia fields without seeing maintenance actions',async()=>{
  session(['COORDINADOR_ACADEMICO']);tables.materia[0].descripcion='DESCRIPCION COMPLETA';render(<Materias/>);
  fireEvent.click(await screen.findByRole('button',{name:'Ver NAVEGACIÓN'}));
  expect(screen.getByRole('textbox',{name:'Descripción de Materia'})).toHaveValue('DESCRIPCION COMPLETA');
  expect(screen.getByRole('textbox',{name:'Nombre de Materia'})).toHaveAttribute('readonly');
  expect(screen.queryByRole('button',{name:'Editar Materia'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Guardar Materia'})).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Volver a materias'})).toBeVisible();expect(rpc).not.toHaveBeenCalled();
});
it('Coordinador views Career identity, modality and associated subjects through the same tabs',async()=>{
  session(['COORDINADOR_ACADEMICO']);render(<Carreras/>);fireEvent.click(await screen.findByRole('button',{name:'Ver CARRERA'}));
  expect(screen.getByRole('textbox',{name:'Modalidad'})).toHaveValue('Presencial');
  expect(screen.getByRole('textbox',{name:'Nombre de Carrera'})).toHaveAttribute('readonly');
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
  const table=await screen.findByRole('table',{name:'Materias de Carrera'});
  await waitFor(()=>expect(table).toHaveTextContent('NAVEGACIÓN'));
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Editar Carrera'})).not.toBeInTheDocument();expect(rpc).not.toHaveBeenCalled();
});
it('Career tab switches preserve edits/selection and reveal invalid fields from another section',async()=>{
  tables.materia.push({id:'second',codigo:'M2',nombre:'SEGUNDA',active:true,updated_at:version});session(['DIRECTOR_ACADEMICO']);render(<Carreras/>);
  fireEvent.click(await screen.findByRole('button',{name:'Editar CARRERA'}));
  const name=screen.getByRole('textbox',{name:'Nombre de Carrera'});fireEvent.change(name,{target:{value:'NOMBRE EDITADO'}});
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
  await waitFor(()=>expect(screen.getByLabelText(/NAVEGACIÓN/)).toBeChecked());
  fireEvent.click(screen.getByLabelText(/SEGUNDA/));
  fireEvent.keyDown(screen.getByRole('tab',{name:'Materias'}),{key:'Home'});
  expect(screen.getByRole('tab',{name:'Datos generales'})).toHaveFocus();expect(screen.getByRole('textbox',{name:'Nombre de Carrera'})).toBe(name);expect(name).toHaveValue('NOMBRE EDITADO');
  fireEvent.change(screen.getByLabelText('Sigla'),{target:{value:''}});
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
  fireEvent.click(screen.getByRole('button',{name:'Guardar Carrera y Materias'}));
  await waitFor(()=>expect(screen.getByRole('textbox',{name:'Sigla'})).toHaveFocus());
  expect(screen.getByRole('tab',{name:'Datos generales'})).toHaveAttribute('aria-selected','true');
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}));expect(screen.getByLabelText(/SEGUNDA/)).toBeChecked();expect(rpc).not.toHaveBeenCalled();
});
it('Cycle consultation formats dates and exposes editing/state actions according to role',async()=>{
  session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);fireEvent.click(await screen.findByRole('button',{name:'Ver 2026-001-NAV'}));
  expect(screen.getByRole('textbox',{name:'Fecha de inicio'})).toHaveValue('01/01/2037');
  expect(screen.getByRole('textbox',{name:'Fecha de fin'})).toHaveValue('02/01/2037');
  expect(screen.getByRole('textbox',{name:'Carrera'})).toHaveAttribute('readonly');
  fireEvent.click(screen.getByRole('button',{name:'Editar Ciclo'}));fireEvent.click(screen.getByRole('tab',{name:'Estado'}));
  expect(screen.getByText('Solo el Director puede cambiar el estado.')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Confirmar transición'})).not.toBeInTheDocument();expect(rpc).not.toHaveBeenCalled();
});
it('Cycle tab changes preserve the draft and prevent separate mutations from discarding unsaved changes',async()=>{
  tables.ciclo_materia=[{id:'rel',ciclo_id:'cycle',materia_id:'subject',activo:true,origen:'HEREDADA',motivo_inactivacion:null}];session(['DIRECTOR_ACADEMICO']);render(<Ciclos/>);
  fireEvent.click(await screen.findByRole('button',{name:'Editar 2026-001-NAV'}));
  fireEvent.change(screen.getByLabelText('Nombre de promoción (opcional)'),{target:{value:'PROMOCION SIN GUARDAR'}});
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}));expect(await screen.findByRole('button',{name:'Retirar'})).toBeDisabled();
  fireEvent.click(screen.getByRole('tab',{name:'Estado'}));expect(screen.getByRole('button',{name:'Confirmar transición'})).toBeDisabled();expect(screen.getByRole('button',{name:'Cancelar edición'})).toBeEnabled();
  fireEvent.click(screen.getByRole('tab',{name:'Datos'}));expect(screen.getByLabelText('Nombre de promoción (opcional)')).toHaveValue('PROMOCION SIN GUARDAR');
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
  expect(screen.getByRole('textbox',{name:'Nombre de promoción (opcional)'})).toHaveValue('');expect(screen.getByRole('textbox',{name:'Carrera'})).toHaveAttribute('readonly');expect(rpc).not.toHaveBeenCalled();
});
it('saving Materia returns to its grid and refreshes the saved data',async()=>{
  session(['DIRECTOR_ACADEMICO']);render(<Materias/>);fireEvent.click(await screen.findByRole('button',{name:'Editar NAVEGACIÓN'}));
  fireEvent.change(screen.getByLabelText('Nombre de Materia'),{target:{value:'ACTUALIZADA'}});
  tables.materia[0]={...tables.materia[0],nombre:'ACTUALIZADA',updated_at:'version-2'};
  rpc.mockResolvedValue({data:tables.materia[0],error:null});
  fireEvent.click(screen.getByRole('button',{name:'Guardar Materia'}));
  expect(await screen.findByRole('table',{name:'Materias'})).toBeVisible();
  expect(await screen.findByRole('button',{name:'Ver ACTUALIZADA'})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Guardar Materia'})).not.toBeInTheDocument();
  expect(rpc).toHaveBeenCalledExactlyOnceWith('guardar_materia',{p:{id:'subject',expected_updated_at:version,nombre:'ACTUALIZADA',descripcion:null}});
});

it.each([
  {Component:Materias,table:'materia',label:'Buscar Materia por nombre'},
  {Component:Carreras,table:'carrera',label:'Buscar Carrera por sigla o nombre'},
])('uses one code-or-name search box for $table and retains the status filter',async({Component,table,label})=>{
  session(['DIRECTOR_ACADEMICO']);render(<Component/>);
  await screen.findByRole('button',{name:table==='materia'?'Ver NAVEGACIÓN':'Ver CARRERA'});
  expect(screen.getAllByRole('searchbox')).toHaveLength(1);
  const search=screen.getByRole('searchbox',{name:label});
  expect(search).toHaveAttribute('placeholder',table==='materia'?'Nombre':'Sigla o nombre');
  fireEvent.change(search,{target:{value:'m1'}});
  await waitFor(()=>{const q=queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)!; if(table==='materia') expect(q.likes).toEqual([['nombre','%M1%']]); else expect(q.or).toBe('sigla.ilike."%M1%",nombre.ilike."%M1%"')});
  fireEvent.change(search,{target:{value:'navegación'}});
  await waitFor(()=>{const q=queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)!; if(table==='materia') expect(q.likes).toEqual([['nombre','%NAVEGACIÓN%']]); else expect(q.or).toBe('sigla.ilike."%NAVEGACIÓN%",nombre.ilike."%NAVEGACIÓN%"')});
  fireEvent.change(screen.getByRole('combobox',{name:table==='materia'?'Estado de Materia':'Estado de Carrera'}),{target:{value:'inactive'}});
  await waitFor(()=>expect(queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)?.filters).toContainEqual(['active',table==='materia'?false:[false]]));
  await waitFor(()=>{const q=queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)!; if(table==='materia') expect(q.likes).toEqual([['nombre','%NAVEGACIÓN%']]); else expect(q.or).toBe('sigla.ilike."%NAVEGACIÓN%",nombre.ilike."%NAVEGACIÓN%"')});
  fireEvent.change(search,{target:{value:''}});
  await waitFor(()=>expect(queryCalls.filter(c=>c.table===table&&c.bounds).at(-1)?.or).toBeUndefined());
  expect(rpc).not.toHaveBeenCalled();
});
it('quotes punctuation in code-or-name search rather than allowing it to become OR filter syntax',async()=>{
  session(['DIRECTOR_ACADEMICO']);render(<Materias/>);await screen.findByRole('button',{name:'Ver NAVEGACIÓN'});
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'MAR, "NORTE" (A)'}});
  await waitFor(()=>expect(queryCalls.filter(c=>c.table==='materia'&&c.bounds).at(-1)?.likes).toEqual([['nombre','%MAR, "NORTE" (A)%']]));
  expect(rpc).not.toHaveBeenCalled();
});
it('searches Cycle code OR matching career names without querying promotion or career code',async()=>{
  tables.carrera.push({...tables.carrera[0],id:'second-career',codigo:'ALTERNATIVA',nombre:'FORMACION MARITIMA'});
  session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);await screen.findByRole('button',{name:'Ver 2026-001-NAV'});
  const search=screen.getByRole('searchbox',{name:'Buscar Ciclo por código o Carrera'});
  expect(search).toHaveAttribute('placeholder','Código de Ciclo o nombre de Carrera');
  fireEvent.change(search,{target:{value:'maritima'}});
  await waitFor(()=>expect(queryCalls.filter(c=>c.table==='ciclo'&&c.bounds).at(-1)?.or).toBe('codigo_ciclo.ilike."%MARITIMA%",carrera_id.in.(second-career)'));
  fireEvent.change(search,{target:{value:'2026-001'}});
  await waitFor(()=>expect(queryCalls.filter(c=>c.table==='ciclo'&&c.bounds).at(-1)?.or).toBe('codigo_ciclo.ilike."%2026-001%"'));
  fireEvent.change(search,{target:{value:'alternativa'}});
  await waitFor(()=>expect(queryCalls.filter(c=>c.table==='ciclo'&&c.bounds).at(-1)?.or).toBe('codigo_ciclo.ilike."%ALTERNATIVA%"'));
  expect(queryCalls.filter(c=>c.table==='ciclo'&&c.bounds).at(-1)?.or).not.toContain('nombre_promocion');
  expect(rpc).not.toHaveBeenCalled();
});

it('new Career defaults to Presencial and No experience, with Nombre first and a keyboard-operable switch',async()=>{
  session(['DIRECTOR_ACADEMICO']);render(<Carreras/>);await screen.findByRole('button',{name:'Ver CARRERA'});
  fireEvent.click(screen.getByRole('button',{name:'Crear Carrera'}));
  const flag=screen.getByRole('switch',{name:'Con experiencia'});
  expect(flag).not.toBeChecked();expect(screen.getByLabelText('Modalidad')).toHaveValue('mode');
  expect(screen.queryByLabelText('Código de Carrera')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Nombre de Carrera').compareDocumentPosition(screen.getByLabelText('Sigla'))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(flag);expect(flag).toBeChecked();
  fireEvent.change(screen.getByLabelText('Nombre de Carrera'),{target:{value:'NUEVA CARRERA'}});
  fireEvent.click(screen.getByRole('tab',{name:'Materias'}));fireEvent.click(await screen.findByLabelText(/NAVEGACIÓN/));
  rpc.mockResolvedValue({error:{code:'40001'}});fireEvent.click(screen.getByRole('button',{name:'Guardar Carrera y Materias'}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('guardar_carrera',{p:expect.objectContaining({con_experiencia:true,modalidad_id:'mode'}),materias:['subject']}));
  expect(rpc.mock.calls[0][1].p).not.toHaveProperty('codigo');
});

it('saving Cycle returns to its grid after the command succeeds',async()=>{
 session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);
 fireEvent.click(await screen.findByRole('button',{name:'Editar 2026-001-NAV'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar Ciclo'})).toBeEnabled());
 rpc.mockResolvedValue({data:{...ciclo,updated_at:'v2'},error:null});
 fireEvent.click(screen.getByRole('button',{name:'Guardar Ciclo'}));
 expect(await screen.findByRole('table',{name:'Ciclos'})).toBeVisible();
 expect(screen.queryByRole('button',{name:'Guardar Ciclo'})).not.toBeInTheDocument();
 expect(rpc).toHaveBeenCalledTimes(1);
});

it('stages new Cycle subjects in one preview and allows removing unsaved additions without a command',async()=>{
 tables.materia.push({id:'extra',nombre:'SEGURIDAD',active:true,updated_at:version});session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);
 await screen.findByRole('button',{name:'Ver 2026-001-NAV'});fireEvent.click(screen.getByRole('button',{name:'Crear Ciclo'}));
 fireEvent.change(screen.getByLabelText('Carrera'),{target:{value:'career'}});fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
 const search=screen.getByRole('searchbox',{name:'Agregar materia adicional'});await waitFor(()=>expect(search).toBeEnabled());
 expect(screen.getByRole('table',{name:'Materias del Ciclo'})).toHaveTextContent('NAVEGACIÓNCarreraActiva');
 fireEvent.change(search,{target:{value:'segur'}});fireEvent.click(screen.getByRole('button',{name:'SEGURIDAD'}));fireEvent.click(screen.getByRole('button',{name:'Agregar'}));
 expect(screen.getByRole('table',{name:'Materias del Ciclo'})).toHaveTextContent('SEGURIDADAdicionalActiva');expect(rpc).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Quitar'}));expect(screen.getByRole('table',{name:'Materias del Ciclo'})).not.toHaveTextContent('SEGURIDAD');expect(rpc).not.toHaveBeenCalled();
});
it('an additional-subject conflict preserves selection and never silently retries',async()=>{
 tables.materia.push({id:'extra',nombre:'SEGURIDAD',active:true,updated_at:version});session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);
 fireEvent.click(await screen.findByRole('button',{name:'Editar 2026-001-NAV'}));fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
 const search=screen.getByRole('searchbox',{name:'Agregar materia adicional'});await waitFor(()=>expect(search).toBeEnabled());
 fireEvent.change(search,{target:{value:'segur'}});fireEvent.click(screen.getByRole('button',{name:'SEGURIDAD'}));rpc.mockResolvedValue({error:{code:'40001'}});fireEvent.click(screen.getByRole('button',{name:'Agregar'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('modificado por otro usuario');expect(search).toHaveValue('SEGURIDAD');expect(rpc).toHaveBeenCalledTimes(1);
});

it('bounds search suggestions and never renders the full subject catalog',async()=>{
 tables.materia.push(...Array.from({length:30},(_,i)=>({id:`extra-${i}`,nombre:`SEGURIDAD ${i}`,active:true,updated_at:version})));
 session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);fireEvent.click(await screen.findByRole('button',{name:'Editar 2026-001-NAV'}));fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
 const search=screen.getByRole('searchbox',{name:'Agregar materia adicional'});await waitFor(()=>expect(search).toBeEnabled());
 expect(screen.queryByRole('list',{name:'Resultados de materias adicionales'})).not.toBeInTheDocument();fireEvent.change(search,{target:{value:'seguridad'}});
 expect(screen.getByRole('list',{name:'Resultados de materias adicionales'}).querySelectorAll('li')).toHaveLength(8);
 expect(screen.getByRole('status')).toHaveTextContent('Escribe más');fireEvent.keyDown(search,{key:'Enter'});expect(rpc).not.toHaveBeenCalled();
 fireEvent.keyDown(search,{key:'Escape'});expect(screen.queryByRole('list',{name:'Resultados de materias adicionales'})).not.toBeInTheDocument();
});
it('failed Cycle relationship loading blocks the additional-subject search',async()=>{
 errorTable='ciclo_materia';session(['COORDINADOR_ACADEMICO']);render(<Ciclos/>);fireEvent.click(await screen.findByRole('button',{name:'Editar 2026-001-NAV'}));fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
 await screen.findByText(/Vuelve a abrir la ficha/);expect(screen.getByRole('searchbox',{name:'Agregar materia adicional'})).toBeDisabled();expect(screen.getByRole('button',{name:'Agregar'})).toBeDisabled();expect(rpc).not.toHaveBeenCalled();
});
it('terminal Cycle subjects allow history consultation without mutation controls',async()=>{
 tables.ciclo[0].estado_codigo='CERRADO';tables.ciclo_materia=[{id:'r1',ciclo_id:'cycle',materia_id:'subject',activo:false,origen:'HEREDADA',motivo_inactivacion:'RETIRO_MANUAL'}];
 session(['DIRECTOR_ACADEMICO']);render(<Ciclos/>);fireEvent.click(await screen.findByRole('button',{name:'Ver 2026-001-NAV'}));fireEvent.click(screen.getByRole('tab',{name:'Materias'}));
 await screen.findByRole('table',{name:'Materias del Ciclo'});fireEvent.click(screen.getByRole('checkbox',{name:'Mostrar retiradas'}));
 expect(screen.getByRole('table',{name:'Materias del Ciclo'})).toHaveTextContent('NAVEGACIÓNCarreraRetirada');
 expect(screen.queryByRole('button',{name:'Reactivar'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Agregar'})).not.toBeInTheDocument();expect(rpc).not.toHaveBeenCalled();
});

it('Cycle exposes enrollment history between Materias and Estado without requiring Cycle edit mode',async()=>{
 session(['COORDINADOR_ACADEMICO']);render(<MemoryRouter><Ciclos/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Ver 2026-001-NAV'}));
 expect(screen.getAllByRole('tab').map(t=>t.textContent)).toEqual(['Datos','Materias','Tarifas','Matrículas','Estado']);fireEvent.click(screen.getByRole('tab',{name:'Matrículas'}));
 expect(await screen.findByRole('table',{name:'Alumnos matriculados en el Ciclo'})).toBeVisible();await waitFor(()=>expect(screen.getByRole('button',{name:'+ Matricular alumno'})).toBeEnabled());expect(screen.queryByRole('button',{name:'Guardar Ciclo'})).not.toBeInTheDocument();expect(rpc).not.toHaveBeenCalled();
});
it('returning from enrollment details opens the requested Cycle directly on Matriculas',async()=>{
 session(['COORDINADOR_ACADEMICO']);render(<MemoryRouter><Ciclos initialCycleId="cycle"/></MemoryRouter>);
 expect(await screen.findByRole('table',{name:'Alumnos matriculados en el Ciclo'})).toBeVisible();expect(screen.getByRole('tab',{name:'Matrículas'})).toHaveAttribute('aria-selected','true');expect(screen.getByRole('button',{name:'Volver a ciclos'})).toBeVisible();expect(rpc).not.toHaveBeenCalled();
});

it('shows the Cycle tariffs tab and directs missing-price configuration before registration',async()=>{
 tables.ciclo_tarifa=[];session(['DIRECTOR_ACADEMICO']);render(<MemoryRouter><Ciclos/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Ver 2026-001-NAV'}));fireEvent.click(screen.getByRole('tab',{name:'Tarifas'}));
 await screen.findByRole('table',{name:'Tarifas del Ciclo'});expect(screen.getByRole('alert')).toHaveTextContent('Falta asignar una tarifa CARRERA');fireEvent.click(screen.getByRole('tab',{name:'Matrículas'}));expect(screen.getByRole('button',{name:'+ Matricular alumno'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Revisar tarifas del Ciclo'}));expect(screen.getByRole('tab',{name:'Tarifas'})).toHaveAttribute('aria-selected','true');expect(rpc).not.toHaveBeenCalled();
});

it('preserves tariff drafts across tabs, blocks registration until saved and uses the returned Cycle version',async()=>{
 session(['DIRECTOR_ACADEMICO']);render(<MemoryRouter><Ciclos/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Ver 2026-001-NAV'}));fireEvent.click(screen.getByRole('tab',{name:'Tarifas'}));await screen.findByRole('table',{name:'Tarifas del Ciclo'});
 fireEvent.change(screen.getByRole('spinbutton',{name:'Importe de TARIFA CARRERA'}),{target:{value:'125'}});fireEvent.click(screen.getByRole('tab',{name:'Matrículas'}));expect(screen.getByRole('button',{name:'+ Matricular alumno'})).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('Guarda o cancela los cambios de Tarifas');
 fireEvent.click(screen.getByRole('tab',{name:'Tarifas'}));expect(screen.getByRole('spinbutton',{name:'Importe de TARIFA CARRERA'})).toHaveValue(125);tables.ciclo_tarifa[0].importe='125';rpc.mockImplementation(async(name:string)=>({data:{...ciclo,updated_at:name==='guardar_ciclo_tarifas'?'cv2':'cv3'},error:null}));fireEvent.click(screen.getByRole('button',{name:'Guardar tarifas del Ciclo'}));await screen.findByText('Tarifas del Ciclo guardadas correctamente.');await screen.findByText('Tarifas listas para matricular.');
 fireEvent.click(screen.getByRole('tab',{name:'Matrículas'}));await waitFor(()=>expect(screen.getByRole('button',{name:'+ Matricular alumno'})).toBeEnabled());fireEvent.click(screen.getByRole('tab',{name:'Datos'}));fireEvent.click(screen.getByRole('button',{name:'Editar Ciclo'}));fireEvent.change(screen.getByLabelText('Nombre de promoción (opcional)'),{target:{value:'PROMOCION'}});fireEvent.click(screen.getByRole('button',{name:'Guardar Ciclo'}));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('guardar_ciclo',{p:expect.objectContaining({id:'cycle',expected_updated_at:'cv2',nombre_promocion:'PROMOCION'}),adicionales:[]}));
});
