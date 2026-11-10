export function paymentError(error: { code?: string; message?: string }): string {
  const messages: Record<string, string> = {
    PAYMENT_PRECISION_INVALID: 'Usa un importe con máximo dos decimales, sin redondear.',
    PAYMENT_AMOUNT_POSITIVE: 'El importe debe ser mayor que cero.',
    PAYMENT_APPLICATION_AMOUNT_INVALID: 'Cada cargo seleccionado necesita un importe positivo con máximo dos decimales.',
    PAYMENT_APPLICATIONS_INVALID: 'La suma de los cargos debe coincidir con el total. No repitas cargos.',
    PAYMENT_EXCEEDS_PENDING: 'El importe supera el pendiente vigente de un cargo. Consulta el saldo antes de volver a registrar.',
    PAYMENT_CARGO_INVALID: 'El cargo no está activo o no pertenece a esta matrícula.',
    PAYMENT_ENROLLMENT_INACTIVE: 'La matrícula está anulada y admite únicamente consulta.',
    PAYMENT_CYCLE_INELIGIBLE: 'Solo se registran pagos en ciclos programados, en curso o cerrados.',
    PAYMENT_IDEMPOTENCY_CONFLICT: 'La clave ya corresponde a otro contenido. Consulta el pago existente; no se registró otro pago.',
    PAYMENT_ALREADY_CANCELLED: 'El pago ya fue anulado. Consulta su estado actual.',
    PAYMENT_CANCELLATION_REASON_REQUIRED: 'Indica un motivo de anulación de 1 a 500 caracteres.',
    PAYMENT_NOTES_TOO_LONG: 'Las observaciones admiten hasta 500 caracteres.',
    PAYMENT_PREVENTS_CARGO_RETIREMENT: 'El cargo tiene pagos vigentes y no puede retirarse.',
    PAYMENT_DISCOUNT_BELOW_PAID: 'El descuento dejaría el cargo por debajo de lo ya abonado.',
    PAYMENT_PREVENTS_CYCLE_TRANSFER: 'La matrícula tiene pagos registrados, incluso anulados, y no puede cambiar de Ciclo.',
    PAYMENT_PREVENTS_CYCLE_STATE: 'El Ciclo tiene pagos registrados y no puede pasar a desierto ni anulado.',
  }
  if (error.message && messages[error.message]) return messages[error.message]
  if (error.code === '42501') return 'No tienes permiso vigente para esta operación.'
  if (['40001', '40P01'].includes(error.code ?? '')) return 'La información cambió durante la operación. Consulta los datos y vuelve a confirmar; no se reintentó automáticamente.'
  if (error.message === 'Valor de catálogo no válido o inactivo') return 'Selecciona un medio de pago activo del catálogo Medios de pago.'
  return 'No se pudo completar la operación. Revisa los datos y consulta el estado antes de intentar otra vez.'
}
