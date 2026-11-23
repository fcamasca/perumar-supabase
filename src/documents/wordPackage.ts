// Small uncompressed OOXML package writer: fixed local parts, no external relationships/macros.
export function wordPackage(parts: Record<string, string | Uint8Array>) {
  const encoder = new TextEncoder(), entries: Uint8Array[] = [], directory: Uint8Array[] = []
  let offset = 0
  const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff
    for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0) }
    return (crc ^ 0xffffffff) >>> 0
  }
  for (const [path, value] of Object.entries(parts)) {
    const name = encoder.encode(path), bytes = typeof value === 'string' ? encoder.encode(value) : value, crc = crc32(bytes)
    const local = new Uint8Array(30 + name.length + bytes.length), l = new DataView(local.buffer)
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x800, true); l.setUint16(12, 33, true)
    l.setUint32(14, crc, true); l.setUint32(18, bytes.length, true); l.setUint32(22, bytes.length, true); l.setUint16(26, name.length, true)
    local.set(name, 30); local.set(bytes, 30 + name.length); entries.push(local)
    const central = new Uint8Array(46 + name.length), c = new DataView(central.buffer)
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 33, true)
    c.setUint32(16, crc, true); c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true)
    central.set(name, 46); directory.push(central); offset += local.length
  }
  const directorySize = directory.reduce((n, p) => n + p.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, directorySize, true); e.setUint32(16, offset, true)
  return new Blob([...entries, ...directory, end].map(p => new Uint8Array(p)), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}
