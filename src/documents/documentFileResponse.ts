// Preserve binary bytes returned by functions-js and restore the server-verified display MIME.
export function documentFileBlob(data: unknown, response?: Response): Blob {
  if (!(data instanceof Blob)) throw new Error('No se recibió un archivo binario válido.')
  const mime = (response?.headers.get('X-Documento-Mime') ?? data.type).split(';')[0].trim().toLowerCase()
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mime))
    throw new Error('No se recibió un formato de archivo admitido.')
  return data.type === mime ? data : new Blob([data], { type: mime })
}
