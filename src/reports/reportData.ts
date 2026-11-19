import type { SupabaseClient } from '@supabase/supabase-js'
import { studentSearchFilter } from '../lib/studentSearch'
import { pen } from '../payments/money'

export type ReportKind = 0 | 1 | 2
export type ReportFilters = { cycle: string; kind: ReportKind; search: string; includeCancelled: boolean }
export type ReportRow = {
  matricula_id: string; codigo_alumno: string; apellido_paterno: string; apellido_materno: string
  nombres: string; numero_di: string; codigo_matricula: string; matricula_estado: string
  aplicables: number; completados: number; pendientes: number; faltantes: string[]
  base: string; abonado: string; pendiente: string
}
export const reportNames = ['Alumnos matriculados', 'Documentos pendientes', 'Saldos']
const identity = 'matricula_id,codigo_alumno,apellido_paterno,apellido_materno,nombres,numero_di'
const columns = [identity + ',codigo_matricula,matricula_estado', identity + ',aplicables,completados,pendientes,faltantes', identity + ',codigo_matricula,base::text,abonado::text,pendiente::text']
export const reportHeaders = [
  ['Código alumno', 'Apellidos y nombres', 'Documento de identidad', 'Código matrícula', 'Estado matrícula'],
  ['Código alumno', 'Apellidos y nombres', 'DI', 'Aplicables', 'Completados', 'Pendientes', 'Faltantes'],
  ['Código alumno', 'Apellidos y nombres', 'DI', 'Código matrícula', 'Base', 'Abonado', 'Saldo pendiente'],
]
export const reportName = (r: ReportRow) => `${r.apellido_paterno} ${r.apellido_materno}, ${r.nombres}`
export const missingNames = (r: ReportRow) => r.aplicables === 0 ? 'Sin documentos aplicables' : r.pendientes === 0 ? 'Completo' : r.faltantes.join(', ')
// This formats the DB decimal only; no financial aggregation or debt equation here.
export function reportCells(r: ReportRow, kind: ReportKind): string[] {
  const common = [r.codigo_alumno, reportName(r), r.numero_di]
  return kind === 0 ? [...common, r.codigo_matricula, r.matricula_estado === 'ACTIVO' ? 'Activa' : 'Anulada']
    : kind === 1 ? [...common, String(r.aplicables), String(r.completados), String(r.pendientes), missingNames(r)]
      : [...common, r.codigo_matricula, pen(r.base), pen(r.abonado), pen(r.pendiente)]
}
export function reportQuery(client: SupabaseClient, filters: ReportFilters, offset: number, size: number) {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(filters.cycle)) throw new Error('Ciclo inválido')
  let q = client.from('matricula_reporte_ciclo').select(columns[filters.kind], { count: 'exact' }).eq('ciclo_id', filters.cycle)
  if (filters.kind !== 0 || !filters.includeCancelled) q = q.eq('matricula_estado', 'ACTIVO')
  if (filters.search.trim()) q = q.or(studentSearchFilter(filters.search))
  return q.order('apellido_paterno').order('apellido_materno').order('nombres').order('matricula_id').range(offset, offset + size - 1)
}
// Quote every cell, retain Unicode, and neutralize formulas even after leading whitespace/control marks.
export function csvCell(value: string) {
  const safe = /^[\s\p{Cc}\p{Cf}]*[-=+@]/u.test(value) ? "'" + value : value
  return '"' + safe.replaceAll('"', '""') + '"'
}
export function reportCsv(rows: ReportRow[], kind: ReportKind) {
  return '\uFEFF' + [reportHeaders[kind], ...rows.map(r => reportCells(r, kind))].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
export async function exportReport(client: SupabaseClient, filters: ReportFilters, signal: AbortSignal) {
  const rows: ReportRow[] = []
  const seen = new Set<string>()
  let expected: number | undefined
  // Fetch all matching rows in bounded requests, with exactly the same server filters/order as the grid.
  for (let offset = 0; ; offset += 500) {
    if (signal.aborted) throw new Error('Exportación cancelada')
    const r = await reportQuery(client, filters, offset, 500).abortSignal(signal)
    if (r.error || signal.aborted) throw new Error('No se pudo completar la exportación')
    if (typeof r.count !== 'number' || (expected !== undefined && expected !== r.count)) throw new Error('El conjunto cambió; vuelve a exportar')
    expected = r.count
    const page = r.data as unknown as ReportRow[]
    for (const row of page) {
      if (seen.has(row.matricula_id)) throw new Error('El conjunto cambió; vuelve a exportar')
      seen.add(row.matricula_id)
    }
    rows.push(...page)
    if (rows.length > expected) throw new Error('El conjunto cambió; vuelve a exportar')
    if (page.length < 500) break
  }
  if (rows.length !== expected) throw new Error('No se pudo completar la exportación')
  return reportCsv(rows, filters.kind)
}
