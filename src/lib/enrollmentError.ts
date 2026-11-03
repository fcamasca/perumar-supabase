export function enrollmentError(error: {
    code?: string;
} | null) {
    if (error?.code === '40001' || error?.code === '40P01')
        return 'La información cambió. Recarga y revisa antes de volver a guardar.';
    if (error?.code === '23505')
        return 'El documento, RUC, código o par Alumno y Ciclo ya está registrado.';
    if (error?.code === '42501')
        return 'No tienes permiso para esta operación.';
    return 'No se pudo guardar. Revisa los campos, referencias activas, tarifas y estado del Ciclo. Recarga para consultar el resultado antes de reintentar.';
}
