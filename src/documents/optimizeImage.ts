import { MAX_UPLOAD_BYTES, uploadSizeError } from './uploadLimits'

// Explicit user action: rebuild a copy with the browser decoder; never change the disk original.
export async function optimizeImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Solo se pueden optimizar imágenes JPG/JPEG o PNG.')
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const picture = new Image()
      picture.onload = () => resolve(picture)
      picture.onerror = () => reject(new Error('No se pudo leer la imagen. Selecciona otra copia del archivo.'))
      picture.src = url
    })
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('La imagen no tiene contenido legible.')
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    let width = Math.max(1, Math.round(image.naturalWidth * scale))
    let height = Math.max(1, Math.round(image.naturalHeight * scale))
    let quality = .9
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El navegador no pudo preparar la copia optimizada.')
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = width; canvas.height = height
      context.drawImage(image, 0, 0, width, height)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        value => value ? resolve(value) : reject(new Error('No se pudo preparar la copia optimizada.')),
        file.type, quality,
      ))
      if (blob.type !== file.type) throw new Error('El navegador no pudo conservar el formato de la imagen.')
      if (blob.size <= MAX_UPLOAD_BYTES) {
        const copy = new File([blob], `imagen-optimizada.${blob.type === 'image/png' ? 'png' : 'jpg'}`, { type: blob.type })
        const error = uploadSizeError(copy)
        if (error) throw new Error(error)
        return copy
      }
      if (file.type === 'image/jpeg' && quality > .65) {
        quality = Math.max(.65, quality - .1)
      } else {
        // PNG has no lossy quality setting: reduce pixels while retaining PNG/transparency.
        const reduction = Math.min(.85, Math.sqrt(MAX_UPLOAD_BYTES / blob.size) * .95)
        width = Math.max(1, Math.floor(width * reduction))
        height = Math.max(1, Math.floor(height * reduction))
      }
    }
    throw new Error('No se pudo reducir la copia a 5 MiB. Prueba con otra copia de la imagen.')
  } finally { URL.revokeObjectURL(url) }
}
