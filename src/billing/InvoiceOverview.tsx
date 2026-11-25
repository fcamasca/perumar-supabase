import { pen } from '../payments/money'
import { steps, type Invoice } from './contracts'

const labels = ['Emitida', 'Registrada en el patrocinador', 'Aprobada', 'Pendiente de desembolso']
const dateLabel = (value?: string | null) => value ? value.split('-').reverse().join('/') : 'Sin registrar'

export function InvoiceOverview({ invoice }: { invoice: Invoice }) {
 const current = steps.indexOf(invoice.estado_codigo)
 const dates = [invoice.fecha_emision, invoice.fecha_registrada_patrocinador, invoice.fecha_aprobada, invoice.fecha_pendiente_desembolso]
 const payment = invoice.estado_financiero === 'SIN_DESEMBOLSO' ? 'Sin pagos registrados' : invoice.estado_financiero === 'PARCIAL' ? 'Pago parcial' : invoice.estado_financiero === 'DESEMBOLSADA' ? 'Pagada' : invoice.estado_financiero.replaceAll('_', ' ')
 return <>
  <dl className="review-fields invoice-detail-money" aria-label="Resumen financiero">
   <div><dt>Importe</dt><dd>{pen(invoice.importe)}</dd></div>
   <div><dt>Pagado</dt><dd>{pen(invoice.abonado)}</dd></div>
   <div className="invoice-detail-balance"><dt>Saldo pendiente</dt><dd>{pen(invoice.pendiente)}</dd></div>
  </dl>
  <section className="invoice-detail-tracking" aria-label="Seguimiento de la factura">
   <h4>Seguimiento de la factura</h4>
   <dl className="review-fields"><div><dt>Etapa actual</dt><dd>{labels[current] ?? 'No disponible'}</dd></div><div><dt>Pago</dt><dd>{payment}</dd></div></dl>
   <ol className="invoice-detail-steps">{labels.map((label, i) => <li key={label} aria-current={!invoice.anulado_at && current === i ? 'step' : undefined}>
    <span className="invoice-step-marker" aria-hidden="true">{i < current ? '✓' : i + 1}</span>
    <strong>{label}</strong><span>{dateLabel(dates[i])}</span>
    {invoice.anulado_at && current === i && <small>Última etapa registrada</small>}
   </li>)}</ol>
  </section>
  <dl className="review-fields invoice-detail-dates" aria-label="Fechas de la factura">
   <div><dt>Fecha de emisión</dt><dd>{dateLabel(invoice.fecha_emision)}</dd></div>
   <div><dt>Fecha de vencimiento</dt><dd>{dateLabel(invoice.fecha_vencimiento)}</dd></div>
  </dl>
 </>
}
