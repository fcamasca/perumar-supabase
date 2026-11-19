export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function uploadSizeError(file: Pick<File, 'size'>) {
  if (!file.size) return 'El archivo está vacío. Selecciona otro archivo.'
  return file.size > MAX_UPLOAD_BYTES
    ? `El archivo supera el máximo de 5 MiB (tamaño detectado: ${(file.size / 1048576).toFixed(2)} MiB).`
    : ''
}
