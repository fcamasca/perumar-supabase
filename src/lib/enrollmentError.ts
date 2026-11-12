import { paymentError } from '../payments/paymentError'
export function enrollmentError(error: {
    code?: string;
    message?: string;
} | null) {
    if(error?.message?.startsWith('PAYMENT_')) return paymentError(error);
    const validationMessages: Record<string,string> = {
        'Descuento no válido': 'El descuento debe ser un importe no negativo con un máximo de dos decimales.',
        'Complete la ficha del Alumno': 'Completa los datos obligatorios de la ficha del alumno antes de matricularlo.',
        'Se requiere contacto de emergencia activo y válido': 'El alumno necesita al menos un contacto de emergencia activo y válido para matricularse. Completa sus datos en la ficha del alumno.',
        'El Ciclo requiere exactamente una tarifa Carrera activa obligatoria': 'El Ciclo debe tener exactamente una tarifa de tipo Curso activa y obligatoria. Revisa la pestaña Tarifas del Ciclo.',
        'Ciclo no elegible': 'El Ciclo ya no permite matrículas. Solo puedes matricular en un Ciclo Programado o En curso.',
        'Selección opcional no válida': 'Algún concepto opcional ya no está disponible para este Ciclo. Revisa sus tarifas.',
        'Referencia geográfica no válida o inactiva': 'La ficha del alumno tiene una ubicación no válida o inactiva. Revisa su lugar de nacimiento y domicilio.',
    };
    if (error?.code === '23514' && error.message?.endsWith('violates check constraint "matricula_cargo_check"'))
        return 'El descuento no puede superar el importe original del cargo del Curso y solo puede aplicarse a ese cargo.';
    if (error?.code === '23514' && error.message && Object.hasOwn(validationMessages,error.message))
        return validationMessages[error.message];
    if (['PT409', '40001', '40P01'].includes(error?.code ?? ''))
        return 'La información cambió. Recarga y revisa antes de volver a guardar.';
    if (error?.code === '23505')
        return 'El documento, RUC, código o par Alumno y Ciclo ya está registrado.';
    if (error?.code === '42501')
        return 'No tienes permiso para esta operación.';
    return 'No se pudo guardar. Revisa los campos, referencias activas, tarifas y estado del Ciclo. Recarga para consultar el resultado antes de reintentar.';
}
