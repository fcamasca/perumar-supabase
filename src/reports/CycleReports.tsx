import { useEffect, useRef, useState } from 'react'
import { AcademicPagination, AcademicSearch, AcademicTabs } from '../academic/AcademicLayout'
import { useSession } from '../security/SessionProvider'
import { exportReport, reportCells, reportHeaders, reportNames, reportQuery, type ReportKind, type ReportRow } from './reportData'

export function CycleReports({ cycle }: { cycle: string }) {
  const { client, state } = useSession()
  const allowed = !!state.roles?.some(role => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(role))
  const [kind, setKind] = useState<ReportKind>(0), [search, setSearch] = useState(''), [includeCancelled, setIncludeCancelled] = useState(false)
  const [page, setPage] = useState(0), [rows, setRows] = useState<ReportRow[]>([]), [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('')
  const [resolvedKey, setResolvedKey] = useState('')
  const requestKey = JSON.stringify([state.userId, cycle, kind, search, includeCancelled, page, revision])
  // A new tab/filter renders before its effect runs. Never present a previous projection as the new one.
  const pending = loading || resolvedKey !== requestKey
  const exportingRef = useRef(false), exportAbort = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setRows([]); setCount(0); setError(''); setLoading(allowed)
    if (allowed) void (async () => {
      try {
        const r = await reportQuery(client, { cycle, kind, search, includeCancelled }, page * 30, 30).abortSignal(controller.signal)
        if (controller.signal.aborted) return
        if (r.error) throw r.error
        setRows(r.data as unknown as ReportRow[]); setCount(r.count ?? 0)
      } catch { if (!controller.signal.aborted) setError('No se pudo consultar el reporte. Vuelve a consultar.') }
      finally { if (!controller.signal.aborted) { setResolvedKey(requestKey); setLoading(false) } }
    })()
    return () => controller.abort()
  }, [client, allowed, state.userId, cycle, kind, search, includeCancelled, page, revision, requestKey])
  useEffect(() => () => { exportAbort.current?.abort() }, [cycle, kind, search, includeCancelled, allowed, state.userId])
  async function download() {
    if (exportingRef.current || !allowed) return
    exportingRef.current = true; setExporting(true); setExportError('')
    const controller = new AbortController(); exportAbort.current = controller
    try {
      const csv = await exportReport(client, { cycle, kind, search, includeCancelled }, controller.signal)
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = `reporte-ciclo-${['alumnos', 'documentos', 'saldos'][kind]}.csv`
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { if (!controller.signal.aborted) setExportError('No se pudo exportar el reporte completo. No se descargó un archivo parcial.') }
    finally { exportingRef.current = false; setExporting(false) }
  }
  if (!allowed) return <p role="alert">No tienes acceso académico a estos reportes.</p>
  return <section className="cycle-reports" aria-label="Reportes del Ciclo">
    <h3>Reportes del Ciclo</h3>
    <AcademicTabs id="cycle-reports" names={reportNames} active={kind} disabled={exporting} onChange={index => { setKind(index as ReportKind); setPage(0); setExportError('') }}/>
    <div role="tabpanel" id={`cycle-reports-panel-${kind}`} aria-labelledby={`cycle-reports-tab-${kind}`} tabIndex={0}>
      <div className="filters academic-toolbar" role="search" aria-label="Filtros del reporte">
        <AcademicSearch label="Buscar alumno" placeholder="Apellidos, nombres o DI" value={search} onChange={value => { setSearch(value); setPage(0); setExportError('') }}/>
        {kind === 0 && <label className="report-checkbox"><input type="checkbox" checked={includeCancelled} disabled={exporting} onChange={e => { setIncludeCancelled(e.target.checked); setPage(0) }}/>Incluir anulados</label>}
        <button type="button" className="secondary" disabled={pending || exporting} onClick={() => setRevision(value => value + 1)}>Consultar</button>
        <button type="button" className="secondary" disabled={pending || exporting || !!error} onClick={() => void download()}>{exporting ? 'Exportando…' : 'Exportar CSV'}</button>
      </div>
      {kind !== 0 && <p className="help-text">Solo matrículas activas. {kind === 1 ? 'Pendientes según el expediente vigente del alumno.' : 'Importes registrados; no se recalculan desde tarifas actuales.'}</p>}
      {pending && <p role="status">Consultando reporte…</p>}
      {exporting && <p role="status">Preparando exportación con los filtros activos…</p>}
      {!pending && error && <p role="alert" className="validation-message">{error}</p>}
      {exportError && <p role="alert" className="validation-message">{exportError}</p>}
      <div className="table-scroll"><table aria-label={reportNames[kind]}><thead><tr>{reportHeaders[kind].map((h, index) => <th key={h} scope="col" className={kind === 2 && index >= 4 ? 'payment-money' : undefined}>{h}</th>)}</tr></thead><tbody>
        {!pending && !error && rows.map(row => <tr key={row.matricula_id}>{reportCells(row, kind).map((value, index) => <td key={index} className={kind === 2 && index >= 4 ? 'payment-money' : undefined}>{value}</td>)}</tr>)}
        {!pending && !error && !rows.length && <tr><td colSpan={reportHeaders[kind].length}>No hay matrículas para estos filtros.</td></tr>}
      </tbody></table></div>
      <AcademicPagination page={page} count={pending ? 0 : rows.length} disabled={pending || exporting} onChange={setPage}/>
      {!pending && !error && <small>{count} matrículas coinciden con los filtros.</small>}
    </div>
  </section>
}
