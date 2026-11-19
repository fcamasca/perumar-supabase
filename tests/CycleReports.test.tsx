import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { CycleReports } from '../src/reports/CycleReports'
import { csvCell, exportReport, checkMatrix, matrixColumns, matrixLabel, missingNames, reportCells, reportCsv, reportQuery, type ReportRow } from '../src/reports/reportData'
const { client, access } = vi.hoisted(() => ({ client: { from: vi.fn() }, access: { roles: ['DIRECTOR_ACADEMICO'] } }))
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client, state: { userId: 'actor', roles: access.roles } }) }))
const cycle = '11111111-1111-4111-8111-111111111111'
const docs = [{ codigo: 'DI', nombre: 'Documento de identidad' }, { codigo: 'PSI', nombre: 'Certificado psicofísico' }, { codigo: 'FOTO', nombre: 'Foto del alumno' }, { codigo: 'RET', nombre: 'Retirado' }]
const row: ReportRow = { matricula_id: 'internal-uuid', codigo_alumno: 'A-0000001', apellido_paterno: 'QUIROZ', apellido_materno: 'PÉREZ', nombres: 'JUAN', numero_di: '12345678', codigo_matricula: '2026-MA-001', matricula_estado: 'ACTIVO', aplicables: 3, completados: 1, pendientes: 2, faltantes: ['Documento de identidad', 'Certificado psicofísico'], documentos: docs.map((d, i) => ({ ...d, estado: i < 2 ? 'PENDIENTE' : i === 2 ? 'CARGADO' : null })), base: '100.00', abonado: '70.00', pendiente: '30.00' }
let configuredDocs = docs
let data: ReportRow[], failed = false, changedCount = false
const queries: { select: string; eq: unknown[][]; or: string[]; range: number[]; orders: string[] }[] = []
beforeEach(() => {
  data = [row, { ...row, matricula_id: 'cancelled', matricula_estado: 'ANULADO' }]; failed = false; changedCount = false; configuredDocs = docs; access.roles = ['DIRECTOR_ACADEMICO']; queries.length = 0; client.from.mockReset()
  client.from.mockImplementation((table: string) => {
    const log = { select: '', eq: [] as unknown[][], or: [] as string[], range: [] as number[], orders: [] as string[] }; queries.push(log)
    const q = { select: (s: string) => { log.select = s; return q }, eq: (...args: unknown[]) => { log.eq.push(args); return q }, or: (s: string) => { log.or.push(s); return q }, order: (s: string) => { log.orders.push(s); return q }, range: (...args: number[]) => { log.range = args; return q }, abortSignal: () => q,
      then: (resolve: (r: unknown) => unknown) => {
        const filtered = data.filter(r => !log.eq.some(([k, v]) => k === 'matricula_estado' && r.matricula_estado !== v))
        return Promise.resolve({ data: failed ? null : table === 'ciclo_documento' ? configuredDocs.slice(log.range[0], log.range[1] + 1).map(d => ({ tipo_documento: d })) : filtered.slice(log.range[0], log.range[1] + 1).map(r => Object.fromEntries(log.select.split(',').map(field => field.split('::')[0]).map(field => [field, r[field as keyof ReportRow]]))), count: filtered.length + (changedCount && log.range[0] > 0 ? 1 : 0), error: failed ? { code: 'FAIL', message: 'secret raw error' } : null }).then(resolve)
      } }
    return q
  })
})
it('defaults to active enrollments and explicitly permits including cancelled', async () => {
  render(<CycleReports cycle={cycle}/>); await screen.findByText('Activa')
  expect(screen.queryByText('Anulada')).not.toBeInTheDocument(); expect(queries[0].eq).toEqual([['ciclo_id', cycle], ['matricula_estado', 'ACTIVO']])
  fireEvent.click(screen.getByLabelText('Incluir anulados')); await screen.findByText('Anulada')
  expect(queries.at(-1)?.eq).toEqual([['ciclo_id', cycle]])
})
it.each(['JUAN', 'QUIROZ PÉREZ', '12345678', 'a,b).or(id.neq.null)'])('sends quoted name/surname/DI filter to DB: %s', async term => {
  render(<CycleReports cycle={cycle}/>); await screen.findByText('Activa')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: term } })
  await waitFor(() => expect(queries.at(-1)?.or.length).toBe(1))
  const expression = queries.at(-1)!.or[0]
  for (const field of ['apellido_paterno', 'apellido_materno', 'nombres', 'numero_di']) expect(expression).toContain(field + '.ilike.')
  expect(expression).toContain(JSON.stringify(`%${term.toUpperCase().split(/\s/)[0]}%`))
})
it('requests stable server pages and resets to page one on filter changes', async () => {
  data = Array.from({ length: 31 }, (_, i) => ({ ...row, matricula_id: String(i), codigo_alumno: `A-${i}` }))
  render(<CycleReports cycle={cycle}/>); await screen.findByText('A-29')
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente página' })); await screen.findByText('A-30')
  expect(queries.at(-1)?.range).toEqual([30, 59]); expect(screen.queryByText('A-0')).not.toBeInTheDocument()
  expect(queries.at(-1)?.orders).toEqual(['apellido_paterno', 'apellido_materno', 'nombres', 'matricula_id'])
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'JUAN' } }); await waitFor(() => expect(queries.at(-1)?.range).toEqual([0, 29]))
})
it('shows per-Cycle document columns, pending/complete/not-applicable cells without per-row reads', async () => {
  render(<CycleReports cycle={cycle}/>); fireEvent.click(screen.getByRole('tab', { name: 'Documentos pendientes' }))
  await screen.findByRole('img', { name: 'Completo' })
  expect(queries.some(q => q.select.endsWith(',documentos'))).toBe(true)
  expect(screen.getAllByRole('img', { name: 'Pendiente' })).toHaveLength(2)
  expect(screen.getByRole('img', { name: 'No aplica' })).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Doc. Identidad' })).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Documento de identidad' })).toHaveAttribute('title', 'Documento de identidad')
  expect(screen.queryByRole('columnheader', { name: 'Aplicables' })).not.toBeInTheDocument()
  expect(new Set(client.from.mock.calls.map(c => c[0]))).toEqual(new Set(['matricula_reporte_ciclo', 'ciclo_documento']))
})
it.each([{ ...row, pendientes: 0, aplicables: 3, faltantes: [], text: 'Completo' }, { ...row, pendientes: 0, aplicables: 0, faltantes: [], text: 'Sin documentos aplicables' }])('distinguishes derived labels $text', r => {
  expect(missingNames(r)).toBe(r.text)
})
it('formats authoritative H4 values with two decimals and no arithmetic', async () => {
  render(<CycleReports cycle={cycle}/>); fireEvent.click(screen.getByRole('tab', { name: 'Saldos' }))
  const table = await screen.findByRole('table', { name: 'Saldos' }); await within(table).findByText('S/ 30.00')
  expect(within(table).getByText('S/ 100.00')).toBeVisible(); expect(within(table).getByText('S/ 70.00')).toBeVisible()
  expect(queries.at(-1)?.select).toContain('base::text,abonado::text,pendiente::text')
})
it.each(['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'])('allows %s', async role => {
  access.roles = [role]; render(<CycleReports cycle={cycle}/>); expect(await screen.findByText('Activa')).toBeVisible()
})
it.each([['ADMIN_SISTEMA'], []])('does not enumerate reports without academic roles: %j', async (...roles) => {
  access.roles = roles as string[]; render(<CycleReports cycle={cycle}/>); expect(screen.getByRole('alert')).toHaveTextContent('No tienes acceso'); expect(client.from).not.toHaveBeenCalled()
})
it('shows empty/error and recovers only on explicit Consultar, without leaking raw error', async () => {
  failed = true; render(<CycleReports cycle={cycle}/>); expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar')
  expect(screen.queryByText('secret raw error')).not.toBeInTheDocument(); expect(client.from).toHaveBeenCalledTimes(1)
  failed = false; data = []; fireEvent.click(screen.getByRole('button', { name: 'Consultar' })); expect(await screen.findByText('No hay matrículas para estos filtros.')).toBeVisible()
})
it('uses existing keyboard tab navigation', async () => {
  render(<CycleReports cycle={cycle}/>); const first = screen.getByRole('tab', { name: 'Alumnos matriculados' }); first.focus()
  fireEvent.keyDown(first, { key: 'End' }); expect(screen.getByRole('tab', { name: 'Saldos' })).toHaveFocus()
})
it.each(['=1+1', '+SUM(A1)', '-1+2', '@SUM(1)', '  =1', '\t+1', '\r\n@1', '\u200b-1'])('neutralizes CSV formula injection %j', text => {
  expect(csvCell(text)).toBe(`"'${text}"`)
})
it('escapes Unicode, commas, quotes and newlines, includes BOM and no internal UUID', () => {
  const csv = reportCsv([{ ...row, nombres: 'NIÑO, "Ángel"\nDOS' }], 0)
  expect(csv.startsWith('\uFEFF')).toBe(true); expect(csv).toContain('NIÑO, ""Ángel""\nDOS'); expect(csv).toContain('Código alumno'); expect(csv).not.toContain('internal-uuid')
})
it('neutralizes every persisted text column, including DI and document names', () => {
  const unsafe = [{ codigo: 'FORMULA', nombre: '@SUM(1)' }]
  const csv = reportCsv([{ ...row, codigo_alumno: '=A1', apellido_paterno: '+P', numero_di: ' -42', documentos: [{ ...unsafe[0], estado: 'PENDIENTE' }] }], 1, unsafe)
  for (const text of ["'=A1", "'+P", "' -42", "'@SUM(1)"]) expect(csv).toContain(text)
})
it('exports all filtered pages, not only the visible page, without UUIDs', async () => {
  data = Array.from({ length: 501 }, (_, i) => ({ ...row, matricula_id: `private-${i}`, codigo_alumno: `A-${i}` }))
  const csv = await exportReport(client as never, { cycle, kind: 0, search: 'JUAN', includeCancelled: false }, new AbortController().signal)
  expect(queries.map(q => q.range)).toEqual([[0, 499], [500, 999]])
  for (const q of queries) { expect(q.eq).toEqual([['ciclo_id', cycle], ['matricula_estado', 'ACTIVO']]); expect(q.or[0]).toContain('JUAN') }
  expect(csv).toContain('A-500'); expect(csv).not.toContain('private-500')
})
it('fails a complete CSV on any page error and honors cancellation without retry', async () => {
  failed = true
  await expect(exportReport(client as never, { cycle, kind: 2, search: '', includeCancelled: true }, new AbortController().signal)).rejects.toThrow('No se pudo completar')
  expect(client.from).toHaveBeenCalledTimes(1)
  const c = new AbortController(); c.abort()
  await expect(exportReport(client as never, { cycle, kind: 0, search: '', includeCancelled: false }, c.signal)).rejects.toThrow('cancelada')
  expect(client.from).toHaveBeenCalledTimes(1)
})
it('rejects an export if the server set count changes between pages', async () => {
  data = Array.from({ length: 501 }, (_, i) => ({ ...row, matricula_id: String(i) })); changedCount = true
  await expect(exportReport(client as never, { cycle, kind: 0, search: '', includeCancelled: false }, new AbortController().signal)).rejects.toThrow('El conjunto cambió')
})
it('downloads a CSV from the toolbar using the active filters', async () => {
  const create = vi.fn<(blob: Blob) => string>(() => 'blob:report'), revoke = vi.fn()
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  try {
    render(<CycleReports cycle={cycle}/>); await screen.findByText('Activa')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'QUIROZ' } }); await screen.findByText('Activa')
    fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(queries.at(-1)?.range).toEqual([0, 499]); expect(queries.at(-1)?.or[0]).toContain('QUIROZ')
    expect(create.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
  } finally { click.mockRestore(); vi.unstubAllGlobals() }
})
it('rejects malformed Cycle IDs before issuing a query', () => {
  expect(() => reportQuery(client as never, { cycle: 'x).or(id.neq.null)', kind: 0, search: '', includeCancelled: false }, 0, 30)).toThrow('Ciclo inválido'); expect(client.from).not.toHaveBeenCalled()
})
it('keeps zero balances as zero, and formats no-payment amounts directly', () => {
  expect(reportCells({ ...row, abonado: '0', pendiente: '100' }, 2).slice(-3)).toEqual(['S/ 100.00', 'S/ 0.00', 'S/ 100.00'])
  expect(reportCells({ ...row, abonado: '100', pendiente: '0' }, 2).at(-1)).toBe('S/ 0.00')
})

it('switches between loaded report projections without reusing incompatible rows', async () => {
  render(<CycleReports cycle={cycle}/>)
  await screen.findByText('Activa')
  fireEvent.click(screen.getByRole('tab', { name: 'Documentos pendientes' }))
  await screen.findByRole('img', { name: 'Completo' })
  fireEvent.click(screen.getByRole('tab', { name: 'Saldos' }))
  await screen.findByText('S/ 30.00')
  fireEvent.click(screen.getByRole('tab', { name: 'Documentos pendientes' }))
  await screen.findByRole('img', { name: 'Completo' })
  fireEvent.click(screen.getByRole('tab', { name: 'Alumnos matriculados' }))
  await screen.findByText('Activa')
})

it('exports the same document matrix with readable status labels and no technical IDs', () => {
  const csv = reportCsv([row], 1, docs)
  expect(csv).toContain('"Código alumno","Apellidos y nombres","Doc. Identidad","Documento de identidad"')
  expect(csv).toContain('"Pendiente","Pendiente","Completo","No aplica"')
  expect(csv).not.toContain('internal-uuid'); expect(csv).not.toContain('"Aplicables"')
})
it('rejects an inconsistent configuration rather than reporting missing data as not applicable', () => {
  expect(() => checkMatrix([{ ...row, documentos: [] }], docs)).toThrow('configuración documental cambió')
  expect(() => checkMatrix([{ ...row, documentos: undefined } as unknown as ReportRow], docs)).toThrow()
})
it.each(['CARGADO', 'GENERADO'] as const)('represents H6 %s as complete without introducing a business state', estado => {
  expect(matrixLabel({ ...docs[0], estado })).toBe('Completo')
})
it('loads configured headers even with zero matching students', async () => {
  data = []; render(<CycleReports cycle={cycle}/>); fireEvent.click(screen.getByRole('tab', { name: 'Documentos pendientes' }))
  await screen.findByText('No hay matrículas para estos filtros.')
  expect(screen.getByRole('columnheader', { name: 'Documento de identidad' })).toBeVisible()
})
it('exports document columns independently of the current filtered page', async () => {
  const csv = await exportReport(client as never, { cycle, kind: 1, search: 'QUIROZ', includeCancelled: false }, new AbortController().signal)
  expect(csv).toContain('Certificado psicofísico'); expect(csv).toContain('No aplica')
  expect(client.from.mock.calls.filter(c => c[0] === 'ciclo_documento')).toHaveLength(1)
  expect(queries.find(q => q.select.endsWith(',documentos'))?.or[0]).toContain('QUIROZ')
})
it('quotes malicious document headings too, including blank exports', () => {
  expect(reportCsv([], 1, [{ codigo: 'X', nombre: '  =DDE()' }])).toContain("'  =DDE()")
})
it('reads active Cycle configuration with RLS and deterministic pages', async () => {
  await matrixColumns(client as never, cycle, new AbortController().signal)
  expect(queries[0].eq).toEqual([['ciclo_id', cycle], ['activo', true]])
  expect(queries[0].orders).toEqual(['tipo_documento_id'])
})

it('shows only identity columns when the Cycle has no configured documents', async () => {
  configuredDocs = []; data = [{ ...row, documentos: [] }]
  render(<CycleReports cycle={cycle}/>); fireEvent.click(screen.getByRole('tab', { name: 'Documentos pendientes' }))
  await screen.findByText('Sin documentos activos configurados para este Ciclo.')
  expect(within(screen.getByRole('table', { name: 'Documentos pendientes' })).getAllByRole('columnheader')).toHaveLength(3)
  expect(screen.queryByRole('img', { name: 'Pendiente' })).not.toBeInTheDocument()
})
it('shows a query error without rendering a misleading matrix when configuration changes', async () => {
  data = [{ ...row, documentos: [] }]
  render(<CycleReports cycle={cycle}/>); fireEvent.click(screen.getByRole('tab', { name: 'Documentos pendientes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar')
  expect(screen.queryByRole('img', { name: 'No aplica' })).not.toBeInTheDocument()
})
