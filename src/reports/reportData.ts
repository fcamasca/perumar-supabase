import type { SupabaseClient } from '@supabase/supabase-js'
import { studentSearchFilter } from '../lib/studentSearch'
import { pen } from '../payments/money'

export type ReportKind = 0 | 1 | 2
export type ReportFilters = { cycle: string; kind: ReportKind; search: string; includeCancelled: boolean }
export type MatrixColumn = { codigo: string; nombre: string }
export type MatrixDocument = MatrixColumn & { estado: 'PENDIENTE' | 'CARGADO' | 'GENERADO' | null }
export type ReportRow = {
  matricula_id: string; apellido_paterno: string; apellido_materno: string
  nombres: string; numero_di: string; codigo_matricula: string; matricula_estado: string
  aplicables: number; completados: number; pendientes: number; faltantes: string[]
  base: string; abonado: string; pendiente: string
  documentos: MatrixDocument[]
}
export const reportNames = ['Alumnos matriculados', 'Documentos pendientes', 'Saldos']
const identity = 'matricula_id,apellido_paterno,apellido_materno,nombres,numero_di'
const columns = [identity + ',codigo_matricula,matricula_estado', identity + ',documentos', identity + ',codigo_matricula,base::text,abonado::text,pendiente::text']
export const reportHeaders = [
  ['Doc. Identidad', 'Apellidos y nombres', 'Código matrícula', 'Estado matrícula'],
  ['Doc. Identidad', 'Apellidos y nombres'],
  ['Doc. Identidad', 'Apellidos y nombres', 'Código matrícula', 'Base', 'Abonado', 'Saldo pendiente'],
]
export const reportName = (r: ReportRow) => `${r.apellido_paterno} ${r.apellido_materno}, ${r.nombres}`
export const missingNames = (r: ReportRow) => r.aplicables === 0 ? 'Sin documentos aplicables' : r.pendientes === 0 ? 'Completo' : r.faltantes.join(', ')
// This formats the DB decimal only; no financial aggregation or debt equation here.
export function matrixLabel(doc: MatrixDocument): string {
  return doc.estado === null ? 'No aplica' : doc.estado === 'PENDIENTE' ? 'Pendiente' : 'Completo'
}
export function checkMatrix(rows: ReportRow[], documents: MatrixColumn[]) {
  for (const row of rows) {
    if (!Array.isArray(row.documentos) || row.documentos.length !== documents.length || documents.some(c => !row.documentos.some(d => d.codigo === c.codigo && d.nombre === c.nombre && [null, 'PENDIENTE', 'CARGADO', 'GENERADO'].includes(d.estado))))
      throw new Error('La configuración documental cambió. Vuelve a consultar.')
  }
}
export async function matrixColumns(client: SupabaseClient, cycle: string, signal: AbortSignal): Promise<MatrixColumn[]> {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(cycle)) throw new Error('Ciclo inválido')
  const columns: MatrixColumn[] = []
  for (let offset = 0; ; offset += 500) {
    const r = await client.from('ciclo_documento').select('tipo_documento!inner(codigo,nombre)').eq('ciclo_id', cycle).eq('activo', true)
      .order('tipo_documento_id').range(offset, offset + 499).abortSignal(signal)
    if (r.error || signal.aborted) throw new Error('No se pudo consultar la configuración documental')
    const page = r.data as unknown as { tipo_documento: MatrixColumn }[]
    columns.push(...page.map(c => c.tipo_documento))
    if (page.length < 500) break
  }
  return columns.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.codigo.localeCompare(b.codigo))
}
export function reportCells(r: ReportRow, kind: ReportKind, documents: MatrixColumn[] = []): string[] {
  const common = [r.numero_di, reportName(r)]
  return kind === 0 ? [...common, r.codigo_matricula, r.matricula_estado === 'ACTIVO' ? 'Activa' : 'Anulada']
    : kind === 1 ? [...common, ...documents.map(c => matrixLabel(r.documentos.find(d => d.codigo === c.codigo)!))]
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
export function reportCsv(rows: ReportRow[], kind: ReportKind, documents: MatrixColumn[] = []) {
  if (kind === 1) checkMatrix(rows, documents)
  const headers = kind === 1 ? [...reportHeaders[kind], ...documents.map(c => c.nombre)] : reportHeaders[kind]
  return '\uFEFF' + [headers, ...rows.map(r => reportCells(r, kind, documents))].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
export async function exportReport(client: SupabaseClient, filters: ReportFilters, signal: AbortSignal) {
  const documents = filters.kind === 1 ? await matrixColumns(client, filters.cycle, signal) : []
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
    if (filters.kind === 1) checkMatrix(page, documents)
    for (const row of page) {
      if (seen.has(row.matricula_id)) throw new Error('El conjunto cambió; vuelve a exportar')
      seen.add(row.matricula_id)
    }
    rows.push(...page)
    if (rows.length > expected) throw new Error('El conjunto cambió; vuelve a exportar')
    if (page.length < 500) break
  }
  if (rows.length !== expected) throw new Error('No se pudo completar la exportación')
  return reportCsv(rows, filters.kind, documents)
}
