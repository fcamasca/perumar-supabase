import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { CycleDocuments } from '../src/documents/CycleDocuments'
import { EnrollmentDocuments } from '../src/documents/EnrollmentDocuments'
import { BulkDocumentRetirement } from '../src/documents/BulkDocumentRetirement'
import { DocumentTypes } from '../src/documents/DocumentTypes'
import { DocumentMoreActions } from '../src/documents/DocumentMoreActions'
const { client } = vi.hoisted(() => ({
  client: { from: vi.fn(), rpc: vi.fn(), functions: { invoke: vi.fn() } },
}))
vi.mock('../src/security/SessionProvider', () => ({
  useSession: () => ({ client, state: { userId: 'actor', roles: ['COORDINADOR_ACADEMICO'] } }),
}))
let tables: Record<string, Record<string, unknown>[]>
const cycle = { id: 'cycle', updated_at: 'cv', estado_codigo: 'CERRADO' }
const applied = {
  id: 'doc',
  matricula_id: 'enrollment',
  ciclo_documento_id: 'cfg',
  codigo: 'DOCUMENTO_IDENTIDAD',
  nombre: 'DOCUMENTO DE IDENTIDAD',
  origen: 'SUBIDO',
  estado: 'PENDIENTE',
  activo: true,
  contexto_vigente: true,
  obligatorio: false,
  updated_at: 'dv',
  ultimo_archivo_confirmado_id: null,
}
beforeEach(() => {
  client.rpc.mockReset()
  client.functions.invoke.mockReset()
  tables = {
    tipo_documento: [
      {
        id: 'type',
        codigo: 'DOCUMENTO_IDENTIDAD',
        nombre: 'DOCUMENTO DE IDENTIDAD',
        origen: 'SUBIDO',
        activo: true,
        updated_at: 'tv',
      },
    ],
    ciclo_documento: [
      {
        ciclo_id: 'cycle',
        id: 'cfg',
        tipo_documento_id: 'type',
        activo: true,
        obligatorio: false,
        updated_at: 'cfgv',
      },
    ],
    matricula_documento: [{ ...applied }],
    matricula_expediente_resumen: [
      { matricula_id: 'enrollment', aplicables: 1, completados: 0, pendientes: 1 },
    ],
    matricula_ficha_fuente: [{ id: 'enrollment', source_fingerprint: 'source' }],
    ciclo: [{ id: 'cycle', capitania: { nombre: 'PISCO' } }],
    matricula_documento_archivo: [],
  }
  client.from.mockImplementation((table: string) => {
    let single = false
    const filters: Record<string, unknown> = {},
      members: Record<string, unknown[]> = {}
    const q = {
      select: () => q,
      order: () => q,
      range: () => q,
      limit: () => q,
      eq: (k: string, v: unknown) => {
        filters[k] = v
        return q
      },
      in: (k: string, v: unknown[]) => {
        members[k] = v
        return q
      },
      single: () => {
        single = true
        return q
      },
      maybeSingle: () => {
        single = true
        return q
      },
      then: (resolve: (r: unknown) => unknown) => {
        const rows = (tables[table] ?? []).filter(
          (r) =>
            Object.entries(filters).every(([k, v]) => r[k] === v) &&
            Object.entries(members).every(([k, v]) => v.includes(r[k])),
        )
        return Promise.resolve({ data: single ? (rows[0] ?? null) : rows, error: null }).then(
          resolve,
        )
      },
    }
    return q
  })
})
it('keeps closed-Cycle document configuration editable and saves/synchronizes only after scope confirmation', async () => {
  render(<CycleDocuments cycle={cycle} />)
  const save = screen.getByRole('button', { name: 'Guardar documentos del Ciclo' })
  await waitFor(() =>
    expect(screen.getByRole('checkbox', { name: 'Aplicar DOCUMENTO DE IDENTIDAD' })).toBeChecked(),
  )
  expect(save).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Obligatorio DOCUMENTO DE IDENTIDAD' }))
  expect(save).toBeEnabled()
  fireEvent.click(save)
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveTextContent('todas las matrículas activas')
  expect(client.rpc).not.toHaveBeenCalled()
  client.rpc.mockResolvedValue({ data: {}, error: null })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar y sincronizar' }))
  await waitFor(() =>
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith('guardar_documentos_ciclo', {
      p_ciclo_id: 'cycle',
      p_expected_updated_at: 'cv',
      p_expected_config: [{ id: 'cfg', updated_at: 'cfgv' }],
      p_documentos: [{ tipo_documento_id: 'type', activo: 'true', obligatorio: 'true' }],
    }),
  )
  expect(await screen.findByRole('status')).toHaveTextContent('sincronizados correctamente')
})
it.each(['PT409', '40001', '40P01'])(
  'preserves configuration draft on %s without React retries',
  async (code) => {
    render(<CycleDocuments cycle={cycle} />)
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Aplicar DOCUMENTO DE IDENTIDAD' }),
      ).toBeChecked(),
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Obligatorio DOCUMENTO DE IDENTIDAD' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar documentos del Ciclo' }))
    client.rpc.mockResolvedValue({ error: { code } })
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Guardar y sincronizar',
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('borrador se conserva')
    expect(
      screen.getByRole('checkbox', { name: 'Obligatorio DOCUMENTO DE IDENTIDAD' }),
    ).toBeChecked()
    expect(client.rpc).toHaveBeenCalledTimes(1)
  },
)
it.each(['DESIERTO', 'ANULADO'])('blocks configuration mutations in %s', async (estado_codigo) => {
  render(<CycleDocuments cycle={{ ...cycle, estado_codigo }} />)
  await screen.findByRole('table')
  expect(screen.getByRole('checkbox', { name: 'Aplicar DOCUMENTO DE IDENTIDAD' })).toBeDisabled()
  expect(
    screen.queryByRole('button', { name: 'Guardar documentos del Ciclo' }),
  ).not.toBeInTheDocument()
})
it('counts optional missing, permits upload in CERRADO and preserves File on explicit conflict without sending authority', async () => {
  render(
    <EnrollmentDocuments
      enrollment="enrollment"
      cycleId="cycle"
      enrollmentState="ACTIVO"
      cycleState="CERRADO"
    />,
  )
  await screen.findByRole('table', { name: 'Documentos de la matrícula' })
  expect(screen.getByRole('status')).toHaveTextContent('1 pendientes')
  fireEvent.click(screen.getByRole('button', { name: 'Cargar' }))
  const dialog = screen.getByRole('dialog'),
    input = within(dialog).getByLabelText('Archivo (máximo 5 MiB)'),
    file = new File(['synthetic'], 'scan.pdf', { type: 'application/pdf' })
  fireEvent.change(input, { target: { files: [file] } })
  Object.defineProperty(input, 'validity', { configurable: true, value: { valid: true } })
  Object.defineProperty(input, 'value', { configurable: true, value: 'C:/fakepath/scan.pdf' })
  client.functions.invoke.mockResolvedValue({
    error: { context: new Response(JSON.stringify({ code: 'DOCUMENT_VERSION' }), { status: 409 }) },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar carga' }))
  await waitFor(() =>
    expect(within(dialog).getByRole('alert')).toHaveTextContent('borrador se conserva'),
  )
  expect((input as HTMLInputElement).files?.[0]).toBe(file)
  expect(client.functions.invoke).toHaveBeenCalledTimes(1)
  const [name, args] = client.functions.invoke.mock.calls[0]
  expect(name).toBe('expediente-cargar')
  expect([...args.body.keys()]).toEqual(['documento_id', 'expected_updated_at', 'archivo'])
  expect(args.body.get('expected_updated_at')).toBe('dv')
})
it('keeps confirmed history downloadable for annulled enrollment without enabling mutating actions', async () => {
  tables.matricula_documento = [
    { ...applied, estado: 'CARGADO', ultimo_archivo_confirmado_id: 'file' },
  ]
  tables.matricula_documento_archivo = [
    {
      id: 'file',
      matricula_documento_id: 'doc',
      estado_tecnico: 'CONFIRMADO',
      iniciado_at: '2026-01-01T12:00:00Z',
      confirmado_at: '2026-01-01T12:00:00Z',
      mime: 'application/pdf',
      bytes: 100,
    },
  ]
  render(
    <EnrollmentDocuments
      enrollment="enrollment"
      cycleId="cycle"
      enrollmentState="ANULADO"
      cycleState="ANULADO"
    />,
  )
  await screen.findByRole('table', { name: 'Documentos de la matrícula' })
  expect(screen.queryByRole('button', { name: 'Reemplazar' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Descargar histórico' })).toBeEnabled()
  expect(screen.queryByText('Retirar opcional')).not.toBeInTheDocument()
})
it('derives stale source separately while GENERADO and completeness remain unchanged', async () => {
  tables.matricula_documento = [
    {
      ...applied,
      origen: 'GENERADO',
      codigo: 'SOLICITUD',
      estado: 'GENERADO',
      ultimo_archivo_confirmado_id: 'file',
    },
  ]
  tables.matricula_documento_archivo = [
    {
      id: 'file',
      matricula_documento_id: 'doc',
      estado_tecnico: 'CONFIRMADO',
      plantilla_version: 'h6-1:SOLICITUD',
      fuente_base_fingerprint: 'OLD',
      datos_generacion: { capitania_nombre: 'PISCO' },
    },
  ]
  tables.matricula_expediente_resumen = [
    { matricula_id: 'enrollment', aplicables: 1, completados: 1, pendientes: 0 },
  ]
  render(
    <EnrollmentDocuments
      enrollment="enrollment"
      cycleId="cycle"
      enrollmentState="ACTIVO"
      cycleState="EN_CURSO"
    />,
  )
  expect(await screen.findByText('Fuente o plantilla cambiada')).toBeVisible()
  expect(screen.getByRole('table')).toHaveTextContent('GENERADO')
  expect(screen.getByRole('status')).toHaveTextContent('1 de 1 documentos completos')
  expect(client.functions.invoke).not.toHaveBeenCalled()
})
it('withdraws only the selected optional documents atomically with versions and a reason', async () => {
  tables.matricula_documento = [
    { ...applied },
    { ...applied, id: 'second', matricula_id: 'other', updated_at: 'dv2' },
    { ...applied, id: 'unselected', matricula_id: 'third' },
  ]
  render(
    <BulkDocumentRetirement
      cycleId="cycle"
      enrollments={['enrollment', 'other']}
      disabled={false}
      onBusyChange={() => {}}
      onChanged={() => {}}
    />,
  )
  const choice = screen.getByRole('combobox')
  await waitFor(() =>
    expect(
      within(choice).getByRole('option', { name: 'DOCUMENTO DE IDENTIDAD' }),
    ).toBeInTheDocument(),
  )
  fireEvent.change(choice, { target: { value: 'cfg' } })
  fireEvent.click(screen.getByRole('button', { name: 'Retirar opcional de 2 alumnos' }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'MOTIVO SINTÉTICO' } })
  client.rpc.mockResolvedValue({ error: null, data: [] })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Retirar de la selección' }))
  await waitFor(() =>
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith('retirar_documentos_opcionales', {
      p_ciclo_id: 'cycle',
      p_documentos: [
        { id: 'doc', expected_updated_at: 'dv' },
        { id: 'second', expected_updated_at: 'dv2' },
      ],
      p_motivo: 'MOTIVO SINTÉTICO',
    }),
  )
})
it('maintains a compact master searchable by code or name with stable origin', async () => {
  render(<DocumentTypes />)
  await screen.findByText('DOCUMENTO DE IDENTIDAD')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'DOCUMENTO_IDENTIDAD' } })
  expect(screen.getByRole('table')).toHaveTextContent('DOCUMENTO DE IDENTIDAD')
  fireEvent.click(screen.getByRole('button', { name: 'Editar DOCUMENTO DE IDENTIDAD' }))
  expect(screen.getByRole('combobox')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Guardar tipo de documento' })).toBeDisabled()
})

it('opens the secondary withdrawal menu by keyboard and restores focus without mutation', () => {
  const retire = vi.fn()
  render(<DocumentMoreActions name="FOTO" mandatory={false} busy={false} onRetire={retire} />)
  const trigger = screen.getByRole('button', { name: 'Más acciones de FOTO' })
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  expect(screen.getByRole('menuitem', { name: 'Retirar opcional' })).toHaveFocus()
  expect(retire).not.toHaveBeenCalled()
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  expect(trigger).toHaveFocus()
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  fireEvent.click(trigger)
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

it('explains why mandatory documents cannot be individually withdrawn', () => {
  render(<DocumentMoreActions name="DNI" mandatory busy={false} onRetire={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Más acciones de DNI' }))
  expect(screen.getByRole('menuitem')).toBeDisabled()
  expect(screen.getByRole('menu')).toHaveTextContent('no puede retirarse individualmente')
})
