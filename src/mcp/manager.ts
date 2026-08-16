/**
 * MCP connection manager: mounts/unmounts dsh-mcp-client plugin instances per
 * enabled server record. Enabled servers register their tools as
 * `mcp__<serverName>__<tool>`; toggling connects/disconnects for real.
 */
import type { Context } from '@deepseek-ai/cordis'
import { loadMcpFile, saveMcpFile, type McpServerRecord } from './store.js'

/** Runtime status of one server. */
export interface McpStatus {
  running: boolean
  lastError?: string
}

/**
 * Manager bound to one plugin context. Mounts enabled servers on start and
 * tracks per-server fibers.
 */
export class McpManager {
  private readonly fibers = new Map<string, { dispose(): void }>()
  private readonly status = new Map<string, McpStatus>()
  private clientModule: unknown = null

  constructor(
    private readonly ctx: Context,
    private readonly stateDir: string,
  ) {}

  /** Load the client plugin module once (dsh-mcp-client is a cordis plugin). */
  private async client(): Promise<unknown> {
    if (!this.clientModule) {
      this.clientModule = await import('@deepseek-ai/dsh-mcp-client')
    }
    return this.clientModule
  }

  /** Load all enabled servers from disk and mount them. */
  async start(): Promise<void> {
    const file = await loadMcpFile(this.stateDir)
    for (const server of file.servers) {
      if (server.enabled) await this.mount(server)
    }
  }

  /** Current status map (id -> running/error). */
  statuses(): Record<string, McpStatus> {
    const out: Record<string, McpStatus> = {}
    for (const [id, status] of this.status) out[id] = status
    return out
  }

  /** Persist a server record and reconcile the live fiber. */
  async save(record: McpServerRecord): Promise<McpServerRecord> {
    const file = await loadMcpFile(this.stateDir)
    const index = file.servers.findIndex((server) => server.id === record.id)
    const next: McpServerRecord = { ...record, updatedAt: Date.now() }
    if (index >= 0) file.servers[index] = next
    else file.servers.push(next)
    await saveMcpFile(this.stateDir, file)
    await this.unmount(record.id)
    this.status.delete(record.id)
    if (next.enabled) await this.mount(next)
    return next
  }

  /** Enable/disable a server (real connect/disconnect). */
  async toggle(id: string, enabled: boolean): Promise<void> {
    const file = await loadMcpFile(this.stateDir)
    const server = file.servers.find((entry) => entry.id === id)
    if (!server) throw new Error('server not found')
    server.enabled = enabled
    server.updatedAt = Date.now()
    await saveMcpFile(this.stateDir, file)
    await this.unmount(id)
    this.status.delete(id)
    if (enabled) await this.mount(server)
  }

  /** Delete a server (disconnect first). */
  async remove(id: string): Promise<void> {
    await this.unmount(id)
    this.status.delete(id)
    const file = await loadMcpFile(this.stateDir)
    file.servers = file.servers.filter((server) => server.id !== id)
    await saveMcpFile(this.stateDir, file)
  }

  /** Connect one server for real; on failure record the error and unmount. */
  private async mount(server: McpServerRecord): Promise<void> {
    try {
      const plugin = await this.client()
      const fiber = this.ctx.plugin(plugin as never, server.config as never)
      this.fibers.set(server.id, fiber)
      this.status.set(server.id, { running: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.status.set(server.id, { running: false, lastError: message })
      const file = await loadMcpFile(this.stateDir)
      const record = file.servers.find((entry) => entry.id === server.id)
      if (record) {
        record.lastError = message
        await saveMcpFile(this.stateDir, file)
      }
    }
  }

  private async unmount(id: string): Promise<void> {
    const fiber = this.fibers.get(id)
    if (fiber) {
      try {
        fiber.dispose()
      } catch {
        /* teardown races are harmless */
      }
      this.fibers.delete(id)
    }
  }

  /** Dispose everything (plugin teardown). */
  async dispose(): Promise<void> {
    for (const id of [...this.fibers.keys()]) {
      await this.unmount(id)
    }
  }
}
