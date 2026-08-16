/**
 * Zero-dependency ZIP reader/writer built on node:zlib (inflateRaw / deflateRaw).
 * Safe for untrusted archives: entry-name traversal is rejected, decompressed
 * size is bounded (zip-bomb budget), and CRC32 is verified on extraction.
 */

import { inflateRawSync, deflateRawSync } from 'node:zlib'

/** CRC32 (ISO 3309) table. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

/** CRC32 of a byte buffer. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** One parsed archive entry (decompressed). */
export interface ZipEntry {
  /** Normalized entry path (forward slashes). */
  name: string
  /** Decompressed content. */
  data: Uint8Array
}

/** Limits that keep untrusted archives safe. */
export interface ZipLimits {
  /** Total decompressed bytes allowed. */
  maxTotalBytes: number
  /** Max compression ratio (decompressed / compressed) per entry. */
  maxRatio: number
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
  maxTotalBytes: 256 * 1024 * 1024,
  maxRatio: 300,
}

/** Thrown when an archive is unsafe or malformed. */
export class ZipError extends Error {}

/** Normalize an entry name and reject traversal / absolute paths. */
export function safeZipName(raw: string): string {
  const name = raw.replace(/\\/g, '/')
  if (!name || name.startsWith('/') || /^[a-zA-Z]:/.test(name)) {
    throw new ZipError(`unsafe zip entry name "${raw}"`)
  }
  const parts = name.split('/')
  for (const part of parts) {
    if (part === '..' || part === '.') throw new ZipError(`unsafe zip entry name "${raw}"`)
  }
  return name
}

interface CentralEntry {
  method: number
  crc: number
  compressedSize: number
  uncompressedSize: number
  name: string
  localOffset: number
}

/** Parse a zip archive into its entries (verified + bounded). */
export function parseZip(buffer: Uint8Array, limits: ZipLimits = DEFAULT_ZIP_LIMITS): ZipEntry[] {
  if (buffer.length < 22) throw new ZipError('not a zip archive (too small)')
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  // Locate the End of Central Directory record (scan backwards).
  let eocd = -1
  const maxScan = Math.min(buffer.length, 22 + 0xffff)
  for (let i = buffer.length - 22; i >= buffer.length - maxScan; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new ZipError('not a zip archive (no end record)')

  const count = view.getUint16(eocd + 10, true)
  const cdSize = view.getUint32(eocd + 12, true)
  const cdOffset = view.getUint32(eocd + 16, true)
  if (cdOffset + cdSize > buffer.length) throw new ZipError('corrupt zip (central directory out of bounds)')

  // Read the central directory.
  const central: CentralEntry[] = []
  let pos = cdOffset
  for (let i = 0; i < count; i++) {
    if (pos + 46 > buffer.length || view.getUint32(pos, true) !== 0x02014b50) {
      throw new ZipError('corrupt zip (bad central directory entry)')
    }
    const method = view.getUint16(pos + 10, true)
    const crc = view.getUint32(pos + 16, true)
    const compressedSize = view.getUint32(pos + 20, true)
    const uncompressedSize = view.getUint32(pos + 24, true)
    const nameLen = view.getUint16(pos + 28, true)
    const extraLen = view.getUint16(pos + 30, true)
    const commentLen = view.getUint16(pos + 32, true)
    const localOffset = view.getUint32(pos + 42, true)
    const nameBytes = buffer.subarray(pos + 46, pos + 46 + nameLen)
    const name = safeZipName(new TextDecoder('utf-8').decode(nameBytes))
    if (method !== 0 && method !== 8) {
      throw new ZipError(`unsupported zip method ${method} for "${name}"`)
    }
    central.push({ method, crc, compressedSize, uncompressedSize, name, localOffset })
    pos += 46 + nameLen + extraLen + commentLen
  }

  // Extract entries.
  let total = 0
  const entries: ZipEntry[] = []
  for (const entry of central) {
    if (entry.uncompressedSize > limits.maxTotalBytes - total) {
      throw new ZipError(`zip-bomb guard: total size exceeds ${limits.maxTotalBytes} bytes`)
    }
    if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > limits.maxRatio) {
      throw new ZipError(`zip-bomb guard: "${entry.name}" ratio exceeds ${limits.maxRatio}`)
    }
    if (entry.localOffset + 30 > buffer.length || view.getUint32(entry.localOffset, true) !== 0x04034b50) {
      throw new ZipError(`corrupt zip (bad local header for "${entry.name}")`)
    }
    const localNameLen = view.getUint16(entry.localOffset + 26, true)
    const localExtraLen = view.getUint16(entry.localOffset + 28, true)
    const dataStart = entry.localOffset + 30 + localNameLen + localExtraLen
    const raw = buffer.subarray(dataStart, dataStart + entry.compressedSize)
    let data: Uint8Array
    if (entry.method === 0) {
      data = raw
    } else {
      try {
        data = inflateRawSync(raw)
      } catch {
        throw new ZipError(`failed to inflate "${entry.name}"`)
      }
    }
    if (data.length !== entry.uncompressedSize) {
      throw new ZipError(`size mismatch for "${entry.name}"`)
    }
    if (crc32(data) !== entry.crc) {
      throw new ZipError(`CRC32 mismatch for "${entry.name}"`)
    }
    total += data.length
    entries.push({ name: entry.name, data })
  }
  return entries
}

/** Write entries into a zip archive (store method; CRC computed). */
export function writeZip(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const enc = new TextEncoder()
  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name)
    const crc = crc32(entry.data)
    const local = new Uint8Array(30 + nameBytes.length + entry.data.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true) // version needed
    view.setUint16(6, 0, true) // flags
    view.setUint16(8, 0, true) // method: store
    view.setUint16(10, 0, true) // time
    view.setUint16(12, 0, true) // date
    view.setUint32(14, crc, true)
    view.setUint32(18, entry.data.length, true)
    view.setUint32(22, entry.data.length, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true) // extra field length
    local.set(nameBytes, 30)
    local.set(entry.data, 30 + nameBytes.length)
    chunks.push(local)

    const cd = new Uint8Array(46 + nameBytes.length)
    const cdv = new DataView(cd.buffer)
    cdv.setUint32(0, 0x02014b50, true)
    cdv.setUint16(4, 20, true)
    cdv.setUint16(6, 20, true)
    cdv.setUint16(10, 0, true) // method
    cdv.setUint32(16, crc, true)
    cdv.setUint32(20, entry.data.length, true)
    cdv.setUint32(24, entry.data.length, true)
    cdv.setUint16(28, nameBytes.length, true)
    cdv.setUint32(42, offset, true)
    cd.set(nameBytes, 46)
    central.push(cd)
    offset += local.length
  }
  const centralBytes = concat(central)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralBytes.length, true)
  ev.setUint32(16, offset, true)
  return concat([...chunks, centralBytes, eocd])
}

function concat(parts: Uint8Array[]): Uint8Array {
  let size = 0
  for (const part of parts) size += part.length
  const out = new Uint8Array(size)
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

/** Deflate a buffer (for future compressed writes). */
export function deflate(data: Uint8Array): Uint8Array {
  return deflateRawSync(data)
}
