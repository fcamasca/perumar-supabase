// Independent ZIP local-header reader used only to inspect generated OOXML fixtures.
export async function wordParts(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer()), view = new DataView(bytes.buffer), result: Record<string, Uint8Array> = {}
  let offset = 0
  while (view.getUint32(offset, true) === 0x04034b50) {
    if (view.getUint16(offset + 8, true) !== 0) throw new Error('Expected stored OOXML member')
    const length = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true), extra = view.getUint16(offset + 28, true)
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength)), start = offset + 30 + nameLength + extra
    result[name] = bytes.slice(start, start + length); offset = start + length
  }
  return result
}
export function wordText(bytes: Uint8Array) {
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Malformed XML')
  return [...doc.getElementsByTagName('w:t')].map(node => node.textContent).join(' ')
}
