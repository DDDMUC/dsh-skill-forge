/**
 * MCP server configuration store (~/.dsh/skillforge/mcp.json).
 * Each server entry carries a full dsh-mcp-client Config plus management
 * fields (id, enabled, lastError).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Management fields around a dsh-mcp-client config. */
export interface McpServerRecord {
  id: string
  enabled: boolean
  /** Display name (not the wire serverName). */
  name: string
  /** Transport + server configuration (dsh-mcp-client Config). */
  config: Record<string, unknown>
  lastError?: string
  updatedAt: number
}

export interface McpFile {
  servers: McpServerRecord[]
}

export async function loadMcpFile(stateDir: string): Promise<McpFile> {
  try {
    const raw = await readFile(join(stateDir, 'mcp.json'), 'utf8')
    const parsed = JSON.parse(raw) as McpFile
    if (parsed && Array.isArray(parsed.servers)) return parsed
    return { servers: [] }
  } catch {
    return { servers: [] }
  }
}

export async function saveMcpFile(stateDir: string, file: McpFile): Promise<void> {
  await mkdir(stateDir, { recursive: true })
  await writeFile(join(stateDir, 'mcp.json'), JSON.stringify(file, null, 2), 'utf8')
}

/** Validate a serverName per the dsh-mcp-client contract. */
export function isServerName(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,32}$/.test(value)
}
