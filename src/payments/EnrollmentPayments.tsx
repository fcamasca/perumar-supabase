import { useCallback, useEffect, useRef, useState } from 'react'
import { InlineForm, StatusBadge, useConfirmation } from '../academic/AcademicUi'
import { useSession } from '../security/SessionProvider'
import { cents, decimal, pen } from './money'
import { paymentError } from './paymentError'
import { clearPaymentReference, readPaymentReference, savePaymentReference } from './paymentRecovery'
import './payments.css'

type Charge = { id: string; nombre: string; pendiente: number | string }
type Payment = { id: string; importe: string | number; estado_codigo: string; created_at: string; updated_at: string; medio_etiqueta: string; observaciones: string | null; motivo_anulacion: string | null; pago_aplicacion: { id: string; importe: string | number; matricula_cargo: { nombre: string } }[] }
type Summary = { base: number | string; abonado: number | string; pendiente: number | string }
type Medium = { id: string; nombre: string }
type Payload = Record<string, unknown>
const unknownResult = 'Resultado sin confirmar. Consulta el estado antes de registrar otro pago. No se ha realizado ningún reintento automático.'

export function EnrollmentPayments({ enrollment, version, enrollmentState, cycleState, onChanged }: { enrollment: string; version: string; enrollmentState: string; cycleState: string; onChanged: () => void }) {
  const { client, state } = useSession(), user = state.userId ?? ''
  const [summary, setSummary] = useState<Summary>(), [charges, setCharges] = useState<Charge[]>([]), [history, setHistory] = useState<Payment[]>([]), [media, setMedia] = useState<Medium[]>([])
  const [amounts, setAmounts] = useState<Record<string, string>>({}), [medium, setMedium] = useState(''), [notes, setNotes] = useState('')
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [open, setOpen] = useState(false), [page, setPage] = useState(0), [revision, setRevision] = useState(0)
  const [pending, setPending] = useState<string | null>(null), [uncertainCancellation, setUncertainCancellation] = useState<string | null>(null)
  const attempt = useRef<{ key: string; payload: Payload } | null>(null), alive = useRef(true), saving = useRef(false)
  const { ask, dialog } = useConfirmation(busy)
  const director = state.roles?.includes('DIRECTOR_ACADEMICO'), canRegister = enrollmentState === 'ACTIVO' && ['PROGRAMADO', 'EN_CURSO', 'CERRADO'].includes(cycleState)
  const loadRevision = useCallback(() => { setRevision(x => x + 1); onChanged() }, [onChanged])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    try { setPending(readPaymentReference(user, enrollment)?.key ?? null) }
    catch { setPending('unavailable'); setMessage('No se pudo leer la referencia de recuperación. No registres otro pago hasta consultar el historial.') }
  }, [user, enrollment])
  useEffect(() => {
    let active = true
    setReady(false)
    void (async () => {
      const [s, c, h, cat] = await Promise.all([
        client.from('matricula_saldo').select('base,abonado,pendiente').eq('matricula_id', enrollment).single(),
        client.from('matricula_cargo_saldo').select('id,nombre,pendiente').eq('matricula_id', enrollment).eq('activo', true).order('id'),
        client.from('pago').select('id,importe,estado_codigo,created_at,updated_at,medio_etiqueta,observaciones,motivo_anulacion,pago_aplicacion(id,importe,matricula_cargo(nombre))').eq('matricula_id', enrollment).order('created_at', { ascending: false }).order('id').range(page * 20, page * 20 + 19),
        client.from('catalogo').select('id').eq('codigo', 'MEDIO_PAGO').eq('activo', true).single(),
      ])
      if (!active) return
      if (s.error || c.error || h.error || cat.error) throw new Error('read')
      const m = await client.from('catalogo_valor').select('id,nombre').eq('catalogo_id', cat.data.id).eq('activo', true).order('nombre')
      if (!active) return
      if (m.error) throw new Error('catalog')
      setSummary(s.data as Summary); setCharges(c.data as Charge[]); setHistory(h.data as unknown as Payment[]); setMedia(m.data); setReady(true)
    })().catch(() => { if (active) { setSummary(undefined); setCharges([]); setHistory([]); setMessage('No se pudo consultar el saldo e historial completos. Vuelve a consultar antes de operar.') } })
    return () => { active = false }
  }, [client, enrollment, version, page, revision, user])
  const recover = useCallback(async (key: string) => {
    if (key === 'unavailable') return
    setBusy(true)
    try {
      const r = await client.from('pago').select('id,estado_codigo').eq('idempotency_key', key).eq('matricula_id', enrollment).maybeSingle()
      if (!alive.current) return
      if (r.error || !r.data) { setMessage(unknownResult); return }
      clearPaymentReference(user, enrollment); setPending(null); attempt.current = null; setOpen(false); setAmounts({}); setNotes('')
      setMessage(`Pago recuperado. Estado actual: ${r.data.estado_codigo === 'ANULADO' ? 'Anulado' : 'Confirmado'}.`); loadRevision()
    } catch { if (alive.current) setMessage(unknownResult) }
    finally { if (alive.current) setBusy(false) }
  }, [client, enrollment, user, loadRevision])
  // Restore minimal opaque reference after reload; SELECT only, never an automatic write.
  const recoveryStarted = useRef<string | null>(null)
  useEffect(() => { if (pending && recoveryStarted.current !== pending) { recoveryStarted.current = pending; void recover(pending) } }, [pending, recover])
  async function send(payload: Payload, key: string) {
    if (saving.current) return
    saving.current = true; setBusy(true); setMessage('')
    try {
      const r = await client.rpc('registrar_pago', { p: payload })
      if (!alive.current) return
      if (r.error) {
        // SQLSTATE is a definitive failed transaction. Transport errors are ambiguous.
        if (/^[0-9A-Z]{5}$/.test(r.error.code ?? '')) {
          clearPaymentReference(user, enrollment); setPending(null); attempt.current = null; setMessage(paymentError(r.error))
        } else setMessage(unknownResult)
        return
      }
      clearPaymentReference(user, enrollment); setPending(null); attempt.current = null; setOpen(false); setAmounts({}); setNotes(''); setMedium('')
      setMessage('Pago registrado.'); loadRevision()
    } catch { if (alive.current) setMessage(unknownResult) }
    finally { saving.current = false; if (alive.current) setBusy(false) }
    // Keep the same key/payload in memory only if the result is uncertain.
    void key
  }
  async function register() {
    if (busy || pending || !ready || !canRegister) return
    const applications: { matricula_cargo_id: string; importe: string }[] = []
    let total = 0n
    for (const charge of charges) {
      const raw = amounts[charge.id] || '0', value = cents(raw), available = cents(String(charge.pendiente))
      if (value === null || available === null || value > available) { setMessage('Revisa los importes: máximo dos decimales y sin superar el pendiente por cargo.'); return }
      if (value > 0n) { applications.push({ matricula_cargo_id: charge.id, importe: decimal(value) }); total += value }
    }
    if (!applications.length || !medium || total > 999999999999n) { setMessage('Selecciona un medio y al menos un cargo con importe positivo dentro del límite permitido.'); return }
    const key = crypto.randomUUID(), payload = { matricula_id: enrollment, expected_matricula_updated_at: version, idempotency_key: key, importe: decimal(total), medio_pago_id: medium, observaciones: notes.trim() || null, aplicaciones: applications }
    try { savePaymentReference(user, enrollment, key) }
    catch { setMessage('No se pudo conservar la referencia de recuperación. El pago no fue enviado.'); return }
    attempt.current = { key, payload }; recoveryStarted.current = key; setPending(key)
    await send(payload, key)
  }
  async function annul(payment: Payment) {
    const reason = await ask({ title: 'Anular pago', description: 'Conserva el pago y sus aplicaciones históricas. El importe deja de abonar a los cargos. No realiza una devolución.', reason: true, sensitive: true, confirmLabel: 'Anular pago' })
    if (reason === null || !alive.current) return
    if (reason.trim().length > 500) { setMessage('El motivo admite hasta 500 caracteres.'); return }
    setBusy(true)
    try {
      const r = await client.rpc('anular_pago', { id: payment.id, expected_updated_at: payment.updated_at, motivo: reason })
      if (!alive.current) return
      if (r.error) {
        if (/^[0-9A-Z]{5}$/.test(r.error.code ?? '')) setMessage(paymentError(r.error))
        else { setUncertainCancellation(payment.id); setMessage(unknownResult) }
      } else { setMessage('Pago anulado.'); loadRevision() }
    } catch { if (alive.current) { setUncertainCancellation(payment.id); setMessage(unknownResult) } }
    finally { if (alive.current) setBusy(false) }
  }
  async function queryCancellation() {
    if (!uncertainCancellation) return
    setBusy(true)
    try {
      const r = await client.from('pago').select('estado_codigo').eq('id', uncertainCancellation).single()
      if (!alive.current) return
      if (r.error) setMessage(unknownResult)
      else { setUncertainCancellation(null); setMessage(`Estado consultado: ${r.data.estado_codigo === 'ANULADO' ? 'Anulado' : 'Confirmado'}. No se repitió la anulación.`); loadRevision() }
    } catch { if (alive.current) setMessage(unknownResult) }
    finally { if (alive.current) setBusy(false) }
  }
  const total = Object.values(amounts).reduce((sum, raw) => sum + (cents(raw || '0') ?? 0n), 0n)
  return <section className="payments" aria-label="Pagos de matrícula">{dialog}
    <div className="payments-heading"><h3>Pagos</h3><button type="button" className="secondary" disabled={busy} onClick={() => setRevision(x => x + 1)}>Consultar saldo e historial</button></div>
    {message && <p role="status" className="payment-message">{message}</p>}
    {!ready && <p role="status">Saldo no disponible para operar.</p>}
    {summary && <dl className="payment-summary"><div><dt>Base de cargos activos</dt><dd>{pen(summary.base)}</dd></div><div><dt>Abonado vigente</dt><dd>{pen(summary.abonado)}</dd></div><div><dt>Pendiente</dt><dd><strong>{pen(summary.pendiente)}</strong></dd></div></dl>}
    {pending && <div className="payment-recovery"><p>Hay un intento pendiente de confirmar. La clave se conserva para evitar duplicados.</p><button type="button" disabled={busy} onClick={() => void recover(pending)}>Consultar resultado del intento</button>{attempt.current && <button type="button" className="secondary" disabled={busy} onClick={() => void send(attempt.current!.payload, attempt.current!.key)}>Reenviar el mismo intento</button>}</div>}
    {uncertainCancellation && <button type="button" disabled={busy} onClick={() => void queryCancellation()}>Consultar estado de anulación</button>}
    {canRegister && !open && <button type="button" disabled={busy || !ready || !!pending || !!uncertainCancellation} onClick={() => { setOpen(true); setMessage('') }}>Registrar pago</button>}
    {open && <InlineForm className="payment-form" onSubmit={() => void register()}><fieldset disabled={busy || !!pending || !!uncertainCancellation || !ready}><legend>Registrar pago</legend>
      <p className="help-text">Selecciona los cargos y cuánto pagar en cada uno. La fecha y el saldo definitivo los confirma la base de datos.</p>
      <button type="button" className="secondary" onClick={() => setAmounts(Object.fromEntries(charges.map(c => [c.id, String(c.pendiente)])))}>Seleccionar todos los pendientes</button>
      <div className="table-scroll"><table><thead><tr><th>Selección</th><th>Concepto</th><th className="payment-money">Pendiente</th><th className="payment-money">Pagar (S/)</th></tr></thead><tbody>{charges.map(c => <tr key={c.id}><td><input type="checkbox" aria-label={`Pagar ${c.nombre}`} disabled={cents(String(c.pendiente)) === 0n} checked={(cents(amounts[c.id] || '0') ?? 0n) > 0n} onChange={e => setAmounts({ ...amounts, [c.id]: e.target.checked ? String(c.pendiente) : '0' })}/></td><td>{c.nombre}</td><td className="payment-money">{pen(c.pendiente)}</td><td className="payment-money"><input aria-label={`Importe para ${c.nombre}`} inputMode="decimal" type="text" maxLength={13} value={amounts[c.id] ?? ''} onChange={e => setAmounts({ ...amounts, [c.id]: e.target.value })}/></td></tr>)}</tbody><tfoot><tr><th colSpan={3}>Total a pagar</th><td className="payment-money"><strong>{pen(total)}</strong></td></tr></tfoot></table></div>
      <div className="payment-fields"><label>Medio de pago *<select required value={medium} onChange={e => setMedium(e.target.value)}><option value="">Seleccionar</option>{media.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label><label>Observaciones (opcional)<textarea rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)}/></label></div>
      <div className="form-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar registro</button><button>Confirmar pago</button></div>
    </fieldset></InlineForm>}
    {!canRegister && <p className="help-text">Solo consulta: no se registran pagos para esta matrícula o estado del Ciclo.</p>}
    <h3>Historial de pagos</h3><div className="table-scroll"><table aria-label="Historial de pagos"><thead><tr><th>Fecha de registro</th><th>Medio</th><th className="payment-money">Importe</th><th>Estado</th><th>Detalle</th><th>Acciones</th></tr></thead><tbody>{history.map(p => <tr key={p.id}><td>{new Date(p.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</td><td>{p.medio_etiqueta}</td><td className="payment-money">{pen(p.importe)}</td><td><StatusBadge value={p.estado_codigo === 'ANULADO' ? 'ANULADO' : 'Confirmado'}/></td><td><details><summary>Ver aplicaciones</summary><ul>{p.pago_aplicacion.map(a => <li key={a.id}>{a.matricula_cargo.nombre}: {pen(a.importe)}</li>)}</ul>{p.observaciones && <p>Observaciones: {p.observaciones}</p>}{p.motivo_anulacion && <p>Motivo de anulación: {p.motivo_anulacion}</p>}</details></td><td>{director && enrollmentState === 'ACTIVO' && p.estado_codigo === 'CONFIRMADO' && <button type="button" className="sensitive" disabled={busy || !!pending || !!uncertainCancellation} onClick={() => void annul(p)}>Anular</button>}</td></tr>)}{ready && !history.length && <tr><td colSpan={6}>No hay pagos en esta página.</td></tr>}</tbody></table></div>
    <div className="form-actions"><span>Página {page + 1}</span><button type="button" className="secondary" disabled={busy || page === 0} onClick={() => setPage(page - 1)}>Página anterior</button><button type="button" className="secondary" disabled={busy || !ready || history.length < 20} onClick={() => setPage(page + 1)}>Página siguiente</button></div>
  </section>
}
