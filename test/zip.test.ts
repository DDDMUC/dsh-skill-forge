import { describe, expect, it } from 'vitest'
import { crc32, parseZip, writeZip, ZipError, safeZipName } from '../src/install/zip.js'

const enc = new TextEncoder()

function zipFromEntries(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  return writeZip(entries)
}

describe('crc32', () => {
  it('matches known values', () => {
    expect(crc32(enc.encode(''))).toBe(0)
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926)
    expect(crc32(enc.encode('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })
})

describe('writeZip / parseZip round trip', () => {
  it('round-trips store entries', () => {
    const entries = [
      { name: 'a-b/SKILL.md', data: enc.encode('---\nname: a-b\n---\nbody') },
      { name: 'a-b/asset.txt', data: enc.encode('hello world') },
    ]
    const zip = zipFromEntries(entries)
    const parsed = parseZip(zip)
    expect(parsed.length).toBe(2)
    expect(parsed[0].name).toBe('a-b/SKILL.md')
    expect(new TextDecoder().decode(parsed[0].data)).toContain('name: a-b')
    expect(new TextDecoder().decode(parsed[1].data)).toBe('hello world')
  })

  it('round-trips large content', () => {
    const content = enc.encode('x'.repeat(100_000))
    const zip = zipFromEntries([{ name: 'flat.md', data: content }])
    const parsed = parseZip(zip)
    expect(parsed[0].data.length).toBe(100_000)
  })
})

describe('parseZip safety', () => {
  it('rejects traversal names', () => {
    expect(() => safeZipName('../evil')).toThrow(ZipError)
    expect(() => safeZipName('a/../../evil')).toThrow(ZipError)
    expect(() => safeZipName('/abs')).toThrow(ZipError)
    expect(() => safeZipName('C:/evil')).toThrow(ZipError)
    expect(safeZipName('a/b/SKILL.md')).toBe('a/b/SKILL.md')
  })

  it('rejects garbage input', () => {
    expect(() => parseZip(enc.encode('not a zip at all'))).toThrow(ZipError)
    expect(() => parseZip(new Uint8Array(10))).toThrow(ZipError)
  })

  it('rejects corrupted archives', () => {
    const zip = zipFromEntries([{ name: 'x.md', data: enc.encode('hello') }])
    // Flip a byte in the middle of the buffer 鈥?any rejection is a pass.
    zip[Math.floor(zip.length / 2)] ^= 0xff
    expect(() => parseZip(zip)).toThrow(ZipError)
  })
})

describe('writeZip integrity', () => {
  it('produces a parseable archive with correct names and content', () => {
    const zip = writeZip([
      { name: 'my-skill/SKILL.md', data: enc.encode('---\nname: my-skill\ndescription: x\n---\n') },
      { name: 'my-skill/scripts/run.py', data: enc.encode('print("hi")') },
    ])
    const parsed = parseZip(zip)
    const names = parsed.map((entry) => entry.name).sort()
    expect(names).toEqual(['my-skill/SKILL.md', 'my-skill/scripts/run.py'])
    expect(new TextDecoder().decode(parsed.find((entry) => entry.name.endsWith('run.py'))!.data)).toBe('print("hi")')
  })
})
