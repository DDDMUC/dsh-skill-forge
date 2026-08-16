import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isServerName, loadMcpFile, saveMcpFile, type McpServerRecord } from '../src/mcp/store.js'

describe('mcp store', () => {
  it('persists and reloads server records', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-mcp-'))
    try {
      const record: McpServerRecord = {
        id: 'mcp-1',
        enabled: true,
        name: 'memory',
        config: { transport: 'stdio', serverName: 'sf_memory', command: 'mcp-server-memory', args: [], env: {}, cwd: '' },
        updatedAt: 1,
      }
      await saveMcpFile(root, { servers: [record] })
      const loaded = await loadMcpFile(root)
      expect(loaded.servers).toHaveLength(1)
      expect(loaded.servers[0].config.serverName).toBe('sf_memory')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('recovers from corrupt files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-mcp2-'))
    try {
      await writeFile(join(root, 'mcp.json'), 'corrupt', 'utf8')
      expect(await loadMcpFile(root)).toEqual({ servers: [] })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('isServerName', () => {
  it('validates the dsh-mcp-client namespace contract', () => {
    expect(isServerName('sf_memory')).toBe(true)
    expect(isServerName('a-b_c1')).toBe(true)
    expect(isServerName('a'.repeat(32))).toBe(true)
    expect(isServerName('a'.repeat(33))).toBe(false)
    expect(isServerName('')).toBe(false)
    expect(isServerName('has space')).toBe(false)
    expect(isServerName('中文')).toBe(false)
  })
})
