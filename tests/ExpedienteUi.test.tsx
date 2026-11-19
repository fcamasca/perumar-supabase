import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { CycleDocuments } from '../src/documents/CycleDocuments'
import { EnrollmentDocuments } from '../src/documents/EnrollmentDocuments'
import { BulkDocumentRetirement } from '../src/documents/BulkDocumentRetirement'
import { DocumentTypes } from '../src/documents/DocumentTypes'
import { DocumentMoreActions } from '../src/documents/DocumentMoreActions'
const { client, optimize } = vi.hoisted(() => ({
  optimize: vi.fn(),
  client: { from: vi.fn(), rpc: vi.fn(), functions: { invoke: vi.fn() } },
}))
vi.mock('../src/documents/optimizeImage', () => ({ optimizeImage: optimize }))
vi.mock('../src/security/SessionProvider', () => ({
  useSession: () => ({ client, state: { userId: 'actor', roles: ['COORDINADOR_ACADEMICO'] } }),
}))
vi.mock('../src/documents/DocumentPreview', () => ({
  DocumentPreview: ({ name, onClose }: { name: string; onClose: () => void }) => (
    <div role="dialog" aria-label={`Vista previa: ${name}`}><button onClick={onClose}>Cerrar vista previa</button></div>
  ),
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
  optimize.mockReset()
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
    let single = false, counting = false
    const filters: Record<string, unknown> = {},
      members: Record<string, unknown[]> = {}
    const q = {
      select: (_fields?: string, options?: { count?: string }) => { counting = !!options?.count; return q },
      or: () => q,
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
        return Promise.resolve({ data: counting ? null : single ? (rows[0] ?? null) : rows, count: counting ? rows.length : null, error: null }).then(
          resolve,
        )
      },
    }
    return q
  })
})
it('offers generated-type previews and preserves the unsaved type draft when closing them', async () => {
  tables.tipo_documento.push({ id: 'generated', codigo: 'SOLICITUD', nombre: 'SOLICITUD', origen: 'GENERADO', activo: true, updated_at: 'v' })
  render(<DocumentTypes />)
  expect(await screen.findByRole('button', { name: 'Vista previa del formato: SOLICITUD' })).toBeEnabled()
  expect(within(screen.getByRole('row', { name: /DOCUMENTO DE IDENTIDAD/ })).queryByRole('button', { name: /Vista previa del formato/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Editar SOLICITUD' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre' }), { target: { value: 'BORRADOR' } })
  fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }))
  expect(screen.getByRole('dialog', { name: 'Vista previa: BORRADOR' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista previa' }))
  expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('BORRADOR')
  expect(client.rpc).not.toHaveBeenCalled()
  expect(client.functions.invoke).not.toHaveBeenCalled()
})
it('blocks an oversized file immediately, clears the error for a replacement and never invokes upload', async () => {
  render(<EnrollmentDocuments enrollment="enrollment" cycleId="cycle" enrollmentState="ACTIVO" cycleState="CERRADO" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Cargar' }))
  const dialog = screen.getByRole('dialog'), input = within(dialog).getByLabelText('Archivo (máximo 5 MiB)')
  const oversized = new File(['synthetic'], 'large.pdf', { type: 'application/pdf' })
  Object.defineProperty(oversized, 'size', { value: 6 * 1024 * 1024 })
  fireEvent.change(input, { target: { files: [oversized] } })
  expect(within(dialog).getByRole('alert')).toHaveTextContent('supera el máximo de 5 MiB')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(within(dialog).getByRole('button', { name: 'Confirmar carga' })).toBeDisabled()
  expect(client.functions.invoke).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { files: [new File(['small'], 'small.pdf', { type: 'application/pdf' })] } })
  expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Confirmar carga' })).toBeEnabled()
})
it('does not block a lightweight photo because of its dimensions', async () => {
  tables.matricula_documento = [{ ...applied, codigo: 'FOTO_ALUMNO', nombre: 'FOTO DEL ALUMNO' }]
  render(<EnrollmentDocuments enrollment="enrollment" cycleId="cycle" enrollmentState="ACTIVO" cycleState="CERRADO" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Cargar' }))
  const dialog = screen.getByRole('dialog'), input = within(dialog).getByLabelText('Archivo (máximo 5 MiB)')
  const bytes = new Uint8Array(24), view = new DataView(bytes.buffer)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); bytes.set([73, 72, 68, 82], 12)
  view.setUint32(16, 6000); view.setUint32(20, 4000)
  fireEvent.change(input, { target: { files: [new File([bytes.buffer], 'photo.png', { type: 'image/png' })] } })
  expect(within(dialog).getByRole('button', { name: 'Confirmar carga' })).toBeEnabled()
  expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  expect(client.functions.invoke).not.toHaveBeenCalled()
})
it('prepares an optimized copy only on request and uploads it only after explicit confirmation', async () => {
  const createUrl = vi.fn(() => 'blob:optimized'), revokeUrl = vi.fn()
  class LocalURL extends URL { static createObjectURL = createUrl; static revokeObjectURL = revokeUrl }
  vi.stubGlobal('URL', LocalURL)
  const copy = new File(['optimized'], 'imagen-optimizada.jpg', { type: 'image/jpeg' })
  optimize.mockResolvedValue(copy)
  const view = render(<EnrollmentDocuments enrollment="enrollment" cycleId="cycle" enrollmentState="ACTIVO" cycleState="CERRADO" />)
  try {
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar' }))
    const dialog = screen.getByRole('dialog'), input = within(dialog).getByLabelText('Archivo (máximo 5 MiB)')
    const original = new File(['original'], 'camera.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [original] } })
    expect(optimize).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Optimizar imagen' }))
    await waitFor(() => expect(within(dialog).getByRole('status')).toHaveTextContent('Se cargará la copia optimizada'))
    expect(optimize).toHaveBeenCalledExactlyOnceWith(original)
    expect(client.functions.invoke).not.toHaveBeenCalled()
    expect(await within(dialog).findByRole('link', { name: 'Ver imagen optimizada' })).toHaveAttribute('href', 'blob:optimized')
    Object.defineProperty(input, 'validity', { configurable: true, value: { valid: true } })
    Object.defineProperty(input, 'value', { configurable: true, value: 'C:/fakepath/camera.jpg' })
    client.functions.invoke.mockResolvedValue({ data: { estado_tecnico: 'CONFIRMADO' }, error: null })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar carga' }))
    await waitFor(() => expect(client.functions.invoke).toHaveBeenCalledOnce())
    expect(client.functions.invoke.mock.calls[0][1].body.get('archivo').name).toBe('imagen-optimizada.jpg')
    expect(original.name).toBe('camera.jpg')
  } finally { view.unmount(); vi.unstubAllGlobals() }
  expect(revokeUrl).toHaveBeenCalled()
})
it('orders document actions and disables preview/download until a confirmed file exists', async () => {
  render(<EnrollmentDocuments enrollment="enrollment" cycleId="cycle" enrollmentState="ACTIVO" cycleState="PROGRAMADO" />)
  const row = (await screen.findByRole('button', { name: 'Cargar' })).closest('tr')!
  expect(within(row).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
    'Cargar', 'Vista previa', 'Descargar', 'Más acciones de DOCUMENTO DE IDENTIDAD',
  ])
  expect(within(row).getByRole('button', { name: 'Vista previa' })).toBeDisabled()
  expect(within(row).getByRole('button', { name: 'Descargar' })).toBeDisabled()
  fireEvent.click(within(row).getByRole('button', { name: /Más acciones/ }))
  expect(screen.getByRole('menuitem', { name: 'Historial' })).toHaveFocus()
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })
  expect(screen.getByRole('menuitem', { name: 'Retirar opcional' })).toHaveFocus()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Historial' }))
  expect(await screen.findByRole('dialog')).toHaveTextContent('Historia: DOCUMENTO DE IDENTIDAD')
  expect(client.functions.invoke).not.toHaveBeenCalled()
})
it('previews the confirmed file through the authorized read endpoint without generating it', async () => {
  const revoke = vi.fn()
  class LocalURL extends URL { static createObjectURL = vi.fn(() => 'blob:stored-preview'); static revokeObjectURL = revoke }
  vi.stubGlobal('URL', LocalURL)
  tables.matricula_documento = [{ ...applied, estado: 'CARGADO', ultimo_archivo_confirmado_id: 'confirmed' }]
  client.functions.invoke.mockResolvedValue({ data: new Blob(['synthetic'], { type: 'application/pdf' }), error: null })
  const view = render(<EnrollmentDocuments enrollment="enrollment" cycleId="cycle" enrollmentState="ACTIVO" cycleState="PROGRAMADO" />)
  try {
    fireEvent.click(await screen.findByRole('button', { name: 'Vista previa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Vista previa: DOCUMENTO DE IDENTIDAD' })
    await waitFor(() => expect(within(dialog).getByTitle('Archivo de DOCUMENTO DE IDENTIDAD')).toHaveAttribute('src', 'blob:stored-preview'))
    expect(client.functions.invoke).toHaveBeenCalledExactlyOnceWith('expediente-descargar', { body: { documento_id: 'doc', archivo_id: 'confirmed', historico: false } })
    expect(client.rpc).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar vista previa' }))
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:stored-preview')
  } finally { view.unmount(); vi.unstubAllGlobals() }
})
it('prioritizes mandatory pending documents, shows global counts and filters pending without changing states', async () => {
  tables.matricula_documento = [
    { ...applied, id: 'complete', nombre: 'A COMPLETO', estado: 'CARGADO', ultimo_archivo_confirmado_id: 'file' },
    { ...applied, id: 'optional', nombre: 'B OPCIONAL' },
    { ...applied, id: 'required', nombre: 'Z OBLIGATORIO', obligatorio: true },
  ]
  tables.matricula_expediente_resumen = [{ matricula_id: 'enrollment', aplicables: 3, completados: 1, pendientes: 2 }]
  render(<EnrollmentDocuments enrollment="enrollment" cycleId="cycle" enrollmentState="ACTIVO" cycleState="PROGRAMADO" />)
  const table = await screen.findByRole('table', { name: 'Documentos de la matrícula' })
  const rows = within(table).getAllByRole('row')
  expect(rows[1]).toHaveTextContent('Z OBLIGATORIO')
  expect(rows[2]).toHaveTextContent('B OPCIONAL')
  expect(rows[3]).toHaveTextContent('A COMPLETO')
  expect(screen.getByRole('status')).toHaveTextContent('2 pendientes')
  expect(screen.getByRole('status')).toHaveTextContent('1 obligatorio pendiente')
  expect(screen.getByRole('status')).toHaveTextContent('1 completo')
  fireEvent.click(screen.getByRole('button', { name: 'Pendientes (2)' }))
  await waitFor(() => expect(screen.queryByText('A COMPLETO')).not.toBeInTheDocument())
  expect(screen.getByRole('button', { name: 'Pendientes (2)' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('checkbox', { name: 'Mostrar retirados y contextos anteriores' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Todos (3)' }))
  expect(await screen.findByText('A COMPLETO')).toBeVisible()
  expect(client.rpc).not.toHaveBeenCalled()
  expect(client.functions.invoke).not.toHaveBeenCalled()
})
it('marks a retired document beside its name while keeping its file state and historical access', async () => {
  tables.matricula_documento = [{ ...applied, activo: false, estado: 'CARGADO', ultimo_archivo_confirmado_id: 'file' }]
  render(<EnrollmentDocuments enrollment="enrollment" cycleId="cycle" enrollmentState="ACTIVO" cycleState="PROGRAMADO" />)
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Mostrar retirados y contextos anteriores' }))
  const retired = await screen.findByText('Retirado')
  expect(retired).toHaveClass('document-retired-badge')
  expect(retired.closest('td')).toHaveTextContent('DOCUMENTO DE IDENTIDAD')
  expect(screen.getByRole('table')).toHaveTextContent('CARGADO')
  expect(screen.getByRole('button', { name: 'Descargar histórico' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Vista previa histórica' })).toBeEnabled()
  expect(client.rpc).not.toHaveBeenCalled()
})
it('selects visible Cycle documents together, preserves mandatory flags and excludes inactive types', async () => {
  tables.tipo_documento.push(
    { id: 'photo', codigo: 'FOTO', nombre: 'FOTO', origen: 'SUBIDO', activo: true },
    { id: 'inactive', codigo: 'ANTERIOR', nombre: 'ANTERIOR', origen: 'SUBIDO', activo: false },
  )
  tables.ciclo_documento[0].obligatorio = true
  render(<CycleDocuments cycle={cycle} />)
  const all = await screen.findByRole('checkbox', { name: 'Seleccionar todos los documentos visibles' })
  expect(all).toBePartiallyChecked()
  fireEvent.click(all)
  expect(screen.getByRole('checkbox', { name: 'Aplicar FOTO' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Aplicar ANTERIOR' })).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Obligatorio DOCUMENTO DE IDENTIDAD' })).toBeChecked()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar documento' }), { target: { value: 'FOTO' } })
  fireEvent.click(all)
  expect(screen.getByRole('checkbox', { name: 'Aplicar FOTO' })).not.toBeChecked()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar documento' }), { target: { value: '' } })
  expect(screen.getByRole('checkbox', { name: 'Aplicar DOCUMENTO DE IDENTIDAD' })).toBeChecked()
  expect(all).toBePartiallyChecked()
  expect(client.rpc).not.toHaveBeenCalled()
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
  expect(screen.getByRole('status')).toHaveTextContent('1 pendiente')
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
  expect(screen.getByRole('status')).toHaveTextContent('1 completo')
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
