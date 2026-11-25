export type Company = { id: string; razon_social: string; ruc: string }
export type Order = { id: string; empresa_patrocinadora_id: string; ciclo_id: string; ciclo?: {codigo_ciclo:string;carrera?:{nombre:string}}; serie: string; correlativo: string; fecha: string; monto: string; observacion: string | null; estado_codigo: string; updated_at: string; matriculas_cubiertas?: number; facturas_relacionadas?: number }
export type Invoice = { id: string; empresa_patrocinadora_id: string; serie: string; correlativo: string; importe: string; abonado: string; pendiente: string; fecha_emision: string; fecha_vencimiento: string; fecha_registrada_patrocinador?: string | null; fecha_aprobada?: string | null; fecha_pendiente_desembolso?: string | null; estado_codigo: string; estado_financiero: string; updated_at: string; anulado_at: string | null }
export type Transfer = { id: string; empresa_patrocinadora_id: string; importe: string; banco: string; fecha_efectiva: string; referencia_operacion: string | null; observacion: string | null; estado_codigo: string; updated_at: string; idempotency_key: string }
export type Cycle = { id: string; codigo_ciclo: string; updated_at: string }
export type Candidate = { id: string; codigo_matricula: string; updated_at: string; ciclo: { updated_at: string }; alumno: { apellido_paterno: string; apellido_materno: string; nombres: string } }
export const orderColumns = 'id,empresa_patrocinadora_id,ciclo_id,serie,correlativo,fecha,monto::text,observacion,estado_codigo,updated_at,matriculas_cubiertas,facturas_relacionadas,motivo_anulacion,anulado_at'
export const invoiceColumns = 'id,empresa_patrocinadora_id,serie,correlativo,importe::text,abonado::text,pendiente::text,fecha_emision,fecha_vencimiento,fecha_registrada_patrocinador,fecha_aprobada,fecha_pendiente_desembolso,estado_codigo,estado_financiero,updated_at,anulado_at,observacion,motivo_anulacion'
export const transferColumns = 'id,empresa_patrocinadora_id,importe::text,banco,fecha_efectiva,referencia_operacion,observacion,estado_codigo,updated_at,idempotency_key,motivo_anulacion,anulado_at'
export const reference = (r: {serie: string; correlativo: string}) => r.serie + '-' + r.correlativo
export const studentName = (r: Candidate) => r.alumno ? r.alumno.apellido_paterno + ' ' + r.alumno.apellido_materno + ', ' + r.alumno.nombres : 'Alumno no disponible'
export const todayLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
export const steps = ['EMITIDA','REGISTRADA_PATROCINADOR','APROBADA','PENDIENTE_DESEMBOLSO']
export const stepLabels = ['Registrar en patrocinador','Marcar aprobada','Pendiente de desembolso']
export const maxCents = 999999999999n
export function isDefinite(error: unknown): boolean { return /^[0-9A-Z]{5}$/.test(String((error as {code?: string})?.code ?? '')) }
export function billingError(error: unknown): string {
 const e = error as {code?: string; message?: string}
 if (['PT409','40001','40P01'].includes(e?.code ?? '')) return 'La información cambió. Se conserva el borrador. Vuelve a consultar y revisa Ciclo, matrícula, patrocinador e importes antes de confirmar; no se reintentó automáticamente.'
 if (e?.code === '42501') return 'No tienes permiso vigente para realizar esta operación.'
 if (e?.code === '23505') return 'La combinación de serie y correlativo ya está registrada, incluso si fue anulada.'
 if (e?.message === 'H7_OS_ALREADY_INVOICED') return 'Una de las órdenes seleccionadas ya tiene una factura vigente. Actualiza las órdenes y revisa la selección antes de guardar.'
 if (e?.message === 'H7_OS_HAS_LIVE_INVOICE') return 'No se puede anular la orden: tiene facturas no anuladas. Regulariza primero las facturas; no hay anulación en cascada.'
 if (e?.message === 'H7_INVOICE_HAS_LIVE_PAYMENT') return 'No se puede anular la factura: tiene pagos confirmados. Regulariza primero los pagos; no hay anulación en cascada.'
 if (e?.message === 'H7_EXCEEDS_PENDING') return 'El importe supera el pendiente de una factura. Vuelve a consultar los saldos y decide nuevamente.'
 if (e?.message === 'H7_OS_EXCEEDS_CYCLE_BALANCE') return 'El monto supera el saldo por cubrir del Ciclo. Actualiza los datos y revisa el monto antes de guardar.'
 if (e?.message === 'H7_CYCLE_NO_ENROLLMENTS') return 'El Ciclo no tiene matrículas activas para incluir en la orden.'
 if (isDefinite(error)) return 'No se guardó la operación. Revisa los campos, estados y relaciones; se conserva el borrador.'
 return 'Resultado sin confirmar. Consulta el resultado antes de volver a registrar; no se reintentó automáticamente.'
}
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
export const recoveryKey = (user: string, company: string) => 'perumar:h7-payment:' + user + ':' + company
export function readRecovery(user: string, company: string): string | null {
 const key = sessionStorage.getItem(recoveryKey(user,company))
 if (key !== null && !uuid.test(key)) throw new Error('Invalid recovery reference')
 return key
}
