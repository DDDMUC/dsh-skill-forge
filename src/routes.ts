/**
 * Same-origin HTTP API routes for the settings panel, registered on the dsh
 * web server. All routes are loopback-only (source address + Host header
 * double-check) and speak a unified `{ok, data?} / {ok:false, error}` JSON
 * envelope.
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { ApiEnvelope } from './protocol.js'
import { API_BASE } from './protocol.js'
import { buildCatalog, findDiskSkill, splitSkillDoc } from './core/catalog.js'
import { auditRoots } from './core/audit.js'
import {
  createSkill,
  deleteSkill,
  readSkillForEdit,
  renameSkill,
  updateSkill,
  type CrudRoots,
} from './core/crud.js'
import { setEnabled, type ToggleWriter } from './core/toggle.js'
import { loadRegistry, planImport, runImport, saveRegistry, installOneSkill, skillExists } from './install/installer.js'
import { packSkill } from './install/skillpkg.js'
import { writeZip } from './install/zip.js'
import { searchSkillsSh, fetchSkillShSkill, scanGithubRepo, fetchSkillShDescription } from './install/market.js'
import { loadGroups, mutateGroups } from './core/groups.js'
import { moveSkill } from './core/move.js'
import type { ProjectWorkspace } from './core/catalog.js'
import { readConversation } from './core/conversation.js'
import { McpManager } from './mcp/manager.js'
import { isServerName, loadMcpFile, type McpServerRecord } from './mcp/store.js'
import type { McpServerView } from './protocol.js'

/** Roots used by the detail route's disk lookup. */
export interface CatalogRoots extends CrudRoots {
  /** Directory for audit state / logs. */
  stateDir: string
}

/** True when the request arrives from a loopback interface. */
function isLoopback(req: IncomingMessage): boolean {
  const addr = req.socket.remoteAddress ?? ''
  return (
    addr === '127.0.0.1' ||
    addr === '::1' ||
    addr === '::ffff:127.0.0.1' ||
    addr.startsWith('127.') ||
    addr === 'localhost'
  )
}

/** True when the Host header names the local machine. */
function isLocalHost(req: IncomingMessage): boolean {
  const host = (req.headers.host ?? '').toLowerCase()
  return (
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]')
  )
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

function ok<T>(res: ServerResponse, data: T): void {
  send(res, 200, { ok: true, data } satisfies ApiEnvelope<T>)
}

function fail(res: ServerResponse, status: number, error: string): void {
  send(res, status, { ok: false, error } satisfies ApiEnvelope)
}

function readBody(req: IncomingMessage, limitBytes = 1_000_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > limitBytes) {
        reject(new Error(`request body too large (limit ${limitBytes} bytes)`))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

/** Best-effort open of a skill's folder in the platform file manager.
 * On Windows, `explorer /select,<skill-file>` is used: it forces a NEW
 * window that steals focus (explorer has system foreground privilege; a
 * plain open from a background process never activates) and lands directly
 * in the skill directory with SKILL.md (or the flat .md) selected. */
function openDirectory(skillFile: string): void {
  try {
    if (process.platform === 'win32') {
      spawn('explorer', ['/select,' + skillFile], { detached: true, stdio: 'ignore' }).unref()
    } else if (process.platform === 'darwin') {
      spawn('open', [dirname(skillFile)], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn('xdg-open', [dirname(skillFile)], { detached: true, stdio: 'ignore' }).unref()
    }
  } catch {
    /* opening is best-effort */
  }
}

/** Remove an installed skill directory (dsh root only). */
async function removeSkillDir(roots: CatalogRoots, name: string): Promise<void> {
  const { rm } = await import('node:fs/promises')
  await rm(join(roots.dshHome, 'skills', name), { recursive: true, force: true })
  await rm(join(roots.dshHome, 'skills', `${name}.md`), { force: true })
}

/** Best-effort workspace projection from the host workspace service. */
function listWorkspaces(ctx: Context): ProjectWorkspace[] {
  try {
    const registry = (ctx as unknown as { workspaces?: { list(): Array<{ id: string; title: string; path: string }> } })
      .workspaces
    if (!registry) return []
    return registry.list().map((workspace) => ({
      id: workspace.id,
      title: workspace.title,
      path: workspace.path,
    }))
  } catch {
    return []
  }
}

/** Loose shape of the /mcp request body. */
interface McpRequestLike {
  op?: unknown
  id?: unknown
  name?: unknown
  transport?: unknown
  serverName?: unknown
  command?: unknown
  args?: unknown
  env?: unknown
  cwd?: unknown
  url?: unknown
  headers?: unknown
  enabled?: unknown
}

/** Build a server record from a save request. */
function buildMcpRecord(body: McpRequestLike): McpServerRecord {
  if (body.transport !== 'stdio' && body.transport !== 'streamable-http') {
    throw new Error('transport must be stdio | streamable-http')
  }
  if (typeof body.name !== 'string' || !body.name.trim()) {
    throw new Error('name is required')
  }
  const serverName = typeof body.serverName === 'string' && body.serverName.trim()
    ? body.serverName.trim()
    : `sf_${body.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 24)}`
  if (!isServerName(serverName)) {
    throw new Error('serverName must match [A-Za-z0-9_-]{1,32}')
  }
  const config: Record<string, unknown> = { serverName }
  if (body.transport === 'stdio') {
    if (typeof body.command !== 'string' || !body.command.trim()) {
      throw new Error('command is required for stdio servers')
    }
    config.transport = 'stdio'
    config.command = body.command.trim()
    config.args = Array.isArray(body.args) ? body.args.filter((arg): arg is string => typeof arg === 'string') : []
    config.env = body.env && typeof body.env === 'object' ? (body.env as Record<string, string>) : {}
    config.cwd = typeof body.cwd === 'string' ? body.cwd : ''
    config.toolCallTimeoutMs = 60_000
    config.failOnStartupError = false
  } else {
    if (typeof body.url !== 'string' || !body.url.trim()) {
      throw new Error('url is required for streamable-http servers')
    }
    config.transport = 'streamable-http'
    config.url = body.url.trim()
    config.headers = body.headers && typeof body.headers === 'object' ? (body.headers as Record<string, string>) : {}
    config.toolCallTimeoutMs = 60_000
    config.failOnStartupError = false
  }
  return {
    id: typeof body.id === 'string' && body.id ? body.id : `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: body.enabled === true,
    name: body.name.trim(),
    config,
    updatedAt: Date.now(),
  }
}

/** Connect a server for real and report whether the tools came up. */
async function testMcpServer(
  mcp: McpManager,
  stateDir: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const file = await loadMcpFile(stateDir)
  const server = file.servers.find((entry) => entry.id === id)
  if (!server) throw new Error('server not found')
  const wasEnabled = server.enabled
  // Mount with startup failure surfacing, wait for connection settle.
  await mcp.toggle(id, true)
  await new Promise((resolve) => setTimeout(resolve, 2500))
  const status = mcp.statuses()[id]
  const ok = status?.running === true && !status.lastError
  if (!ok && !wasEnabled) {
    await mcp.toggle(id, false)
  }
  return { ok, error: status?.lastError }
}

/** Register the skillforge API routes; returns the route disposer. */
export function registerRoutes(
  ctx: Context,
  writer: ToggleWriter,
  shadow: { invalidate(): void },
  roots: CatalogRoots,
  mcp: McpManager,
  settingsScope: {
    get(): unknown
    update(patch: object): Promise<void>
    mutate(ops: Array<{ op: 'unset'; path: string[] }>): Promise<void>
  },
): () => void {
  return ctx.webServer.register({
    kind: 'prefix',
    path: API_BASE,
    handler: async (req, res) => {
      if (!isLoopback(req) || !isLocalHost(req)) {
        fail(res, 403, 'forbidden')
        return
      }
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const route = url.pathname.slice(API_BASE.length) || '/'
        switch (req.method) {
          case 'GET':
            if (route === '/catalog') {
              const disabled = writer.getDisabled()
              ok(res, await buildCatalog(ctx, disabled, roots.stateDir))
              return
            }
            if (route === '/skill') {
              const name = url.searchParams.get('name')
              if (!name) {
                fail(res, 400, 'missing ?name=')
                return
              }
              const disabled = writer.getDisabled()
              const onDisk = await findDiskSkill(roots.dshHome, roots.agentsHome, name)
              if (onDisk) {
                const raw = await readFile(onDisk.path, 'utf8')
                const split = splitSkillDoc(raw)
                const fm = split.frontmatter
                const descriptionMatch = /^description\s*:\s*(.*)$/m.exec(fm)
                const whenToUseMatch = /^whenToUse\s*:\s*(.*)$/m.exec(fm)
                const modelDisabled = /^disable-model-invocation\s*:\s*(true|yes|on|1)\s*$/im.test(fm)
                const userDisabled = /^user-invocable\s*:\s*(false|no|off|0)\s*$/im.test(fm)
                ok(res, {
                  name,
                  description: descriptionMatch ? descriptionMatch[1].trim().replace(/^['"]|['"]$/g, '') : '',
                  whenToUse: whenToUseMatch ? whenToUseMatch[1].trim().replace(/^['"]|['"]$/g, '') : undefined,
                  source: onDisk.path.includes(`${roots.agentsHome}${process.platform === 'win32' ? '\\' : '/'}`) ? 'user-agents' : 'user-dsh',
                  provider: 'filesystem',
                  enabled: !Object.prototype.hasOwnProperty.call(disabled, name),
                  path: onDisk.path,
                  content: split.content,
                  frontmatter: fm,
                })
                return
              }
              const skill = await ctx.skills.get(name)
              if (!skill) {
                fail(res, 404, `skill "${name}" not found`)
                return
              }
              ok(res, {
                name: skill.name,
                description: skill.description,
                whenToUse: skill.whenToUse,
                source: skill.source,
                provider: skill.provider,
                enabled: !Object.prototype.hasOwnProperty.call(disabled, skill.name),
                path: skill.path,
                content: skill.content,
                frontmatter: '',
              })
              return
            }
            if (route === '/edit') {
              const name = url.searchParams.get('name')
              if (!name) {
                fail(res, 400, 'missing ?name=')
                return
              }
              try {
                ok(res, await readSkillForEdit(roots, name))
              } catch (error) {
                fail(res, 404, error instanceof Error ? error.message : String(error))
              }
              return
            }
            if (route === '/export') {
              const name = url.searchParams.get('name')
              if (!name) {
                fail(res, 400, 'missing ?name=')
                return
              }
              const located = await findDiskSkill(roots.dshHome, roots.agentsHome, name)
              if (!located) {
                fail(res, 404, `skill "${name}" not found`)
                return
              }
              let entries: Array<{ name: string; data: Uint8Array }>
              if (located.flat) {
                const data = await readFile(located.path)
                entries = [{ name: `${name}.md`, data: new Uint8Array(data) }]
              } else {
                const packed = await packSkill(dirname(located.path), name)
                entries = packed.entries
              }
              const zipBytes = writeZip(entries)
              res.writeHead(200, {
                'content-type': 'application/octet-stream',
                'content-disposition': `attachment; filename="${name}.skill"`,
                'content-length': String(zipBytes.length),
                'cache-control': 'no-store',
              })
              res.end(Buffer.from(zipBytes))
              return
            }
            if (route === '/registry') {
              ok(res, await loadRegistry(roots.stateDir))
              return
            }
            if (route === '/groups') {
              ok(res, await loadGroups(roots.stateDir))
              return
            }
            if (route === '/plugins') {
              let entries: Array<{ moduleName: string; enabled: boolean; fiberPhase: string | null }> = []
              try {
                const loader = (ctx as unknown as {
                  loader?: {
                    entries(): Array<{
                      id: string
                      options: { name?: string; group?: boolean }
                      disabled?: boolean
                      fiber?: { state: string }
                    }>
                  }
                }).loader
                if (loader) {
                  const raw = loader.entries()
                  entries = Array.from(raw as Iterable<{
                    options: { name?: string; group?: boolean }
                    disabled?: boolean
                    fiber?: { state: string }
                  }>)
                    .filter((entry) => !entry.options.group)
                    .map((entry) => ({
                      moduleName: entry.options.name ?? '',
                      enabled: !entry.disabled,
                      fiberPhase: entry.fiber ? entry.fiber.state : null,
                    }))
                    .filter((entry) => entry.moduleName)
                }
              } catch {
                /* loader service absent */
              }
              const official = entries.filter((entry) => entry.moduleName.startsWith('@deepseek-ai/'))
              const other = entries.filter((entry) => !entry.moduleName.startsWith('@deepseek-ai/'))
              ok(res, { official, other })
              return
            }
            if (route === '/conversation') {
              const config = readConversation(settingsScope)
              let sessions: Array<{ id: string; cwd: string }> = []
              try {
                const registry = (ctx as unknown as {
                  sessions?: { list(): Array<{ id: string; header?: { cwd?: string } }> }
                }).sessions
                if (registry) {
                  sessions = registry.list().map((session) => ({
                    id: String(session.id),
                    cwd: session.header?.cwd ?? '',
                  }))
                }
              } catch {
                /* no session service */
              }
              ok(res, { config, sessions })
              return
            }
            if (route === '/mcp') {
              const file = await loadMcpFile(roots.stateDir)
              const statuses = mcp.statuses()
              const servers: McpServerView[] = file.servers.map((server) => {
                const status = statuses[server.id] ?? { running: false }
                return {
                  id: server.id,
                  name: server.name,
                  enabled: server.enabled,
                  transport: (server.config.transport as 'stdio' | 'streamable-http') ?? 'stdio',
                  serverName: (server.config.serverName as string) ?? '',
                  command: (server.config.command as string | undefined) ?? undefined,
                  args: (server.config.args as string[] | undefined) ?? undefined,
                  url: (server.config.url as string | undefined) ?? undefined,
                  running: status.running === true,
                  lastError: status.lastError ?? server.lastError,
                }
              })
              ok(res, { servers })
              return
            }
            fail(res, 404, `unknown route ${route}`)
            return
          case 'POST':
            if (route === '/toggle') {
              const body = (await readBody(req)) as { name?: unknown; enabled?: unknown }
              if (typeof body.name !== 'string' || typeof body.enabled !== 'boolean') {
                fail(res, 400, 'body requires { name: string, enabled: boolean }')
                return
              }
              const result = await setEnabled(
                writer,
                { dshHome: roots.dshHome, agentsHome: roots.agentsHome },
                body.name,
                body.enabled,
                () => shadow.invalidate(),
              )
              ok(res, result)
              return
            }
            if (route === '/check') {
              ok(res, await auditRoots(roots.dshHome, roots.agentsHome, roots.stateDir))
              return
            }
            if (route === '/create') {
              const body = (await readBody(req)) as {
                name?: unknown
                description?: unknown
                whenToUse?: unknown
                content?: unknown
              }
              if (typeof body.name !== 'string' || typeof body.description !== 'string') {
                fail(res, 400, 'body requires { name: string, description: string }')
                return
              }
              ok(res, await createSkill(roots, {
                name: body.name,
                description: body.description,
                whenToUse: typeof body.whenToUse === 'string' ? body.whenToUse : undefined,
                content: typeof body.content === 'string' ? body.content : undefined,
              }))
              return
            }
            if (route === '/update') {
              const body = (await readBody(req)) as {
                name?: unknown
                description?: unknown
                whenToUse?: unknown
                content?: unknown
              }
              if (typeof body.name !== 'string') {
                fail(res, 400, 'body requires { name: string }')
                return
              }
              ok(res, await updateSkill(roots, {
                name: body.name,
                description: typeof body.description === 'string' ? body.description : undefined,
                whenToUse: typeof body.whenToUse === 'string' ? body.whenToUse : undefined,
                content: typeof body.content === 'string' ? body.content : undefined,
              }))
              return
            }
            if (route === '/rename') {
              const body = (await readBody(req)) as { name?: unknown; newName?: unknown }
              if (typeof body.name !== 'string' || typeof body.newName !== 'string') {
                fail(res, 400, 'body requires { name: string, newName: string }')
                return
              }
              ok(res, await renameSkill(roots, { name: body.name, newName: body.newName }))
              return
            }
            if (route === '/delete') {
              const body = (await readBody(req)) as { name?: unknown }
              if (typeof body.name !== 'string') {
                fail(res, 400, 'body requires { name: string }')
                return
              }
              try {
                await deleteSkill(roots, body.name)
              } catch (error) {
                fail(res, 400, error instanceof Error ? error.message : String(error))
                return
              }
              const registry = await loadRegistry(roots.stateDir)
              delete registry[body.name]
              await saveRegistry(roots.stateDir, registry)
              ok(res, { name: body.name })
              return
            }
            if (route === '/open') {
              const body = (await readBody(req)) as { name?: unknown }
              if (typeof body.name !== 'string') {
                fail(res, 400, 'body requires { name: string }')
                return
              }
              const located = await findDiskSkill(roots.dshHome, roots.agentsHome, body.name)
              if (!located) {
                fail(res, 404, `skill "${body.name}" not found`)
                return
              }
              openDirectory(located.path)
              ok(res, { opened: located.path })
              return
            }
            if (route === '/market/search') {
              const body = (await readBody(req)) as { keyword?: unknown }
              if (typeof body.keyword !== 'string' || body.keyword.trim().length < 2) {
                fail(res, 400, 'body requires { keyword: string } (>= 2 chars)')
                return
              }
              try {
                ok(res, await searchSkillsSh(body.keyword))
              } catch (error) {
                fail(res, 502, `skills.sh unavailable: ${error instanceof Error ? error.message : String(error)}`)
              }
              return
            }
            if (route === '/market/install') {
              const body = (await readBody(req)) as { id?: unknown; conflict?: unknown; workspaceId?: unknown }
              if (typeof body.id !== 'string') {
                fail(res, 400, 'body requires { id: string }')
                return
              }
              const conflict = body.conflict === 'overwrite' ? 'overwrite' : 'skip'
              // Project-level install: target the workspace's .dsh root.
              let target = roots
              if (typeof body.workspaceId === 'string' && body.workspaceId) {
                const workspace = listWorkspaces(ctx).find((ws) => ws.id === body.workspaceId)
                if (!workspace) {
                  fail(res, 400, 'workspace not found')
                  return
                }
                target = {
                  ...roots,
                  dshHome: join(workspace.path, '.dsh'),
                  agentsHome: join(workspace.path, '.agents'),
                }
              }
              try {
                const { skill } = await fetchSkillShSkill(body.id)
                const exists = await skillExists(target, skill.name)
                if (exists && conflict === 'skip') {
                  fail(res, 409, `skill "${skill.name}" already exists`)
                  return
                }
                if (exists) {
                  await removeSkillDir(target, skill.name)
                }
                await installOneSkill(target, skill, {
                  kind: 'github',
                  location: body.id,
                  installedAt: Date.now(),
                })
                ok(res, { installed: skill.name, target: body.workspaceId ? 'project' : 'user' })
              } catch (error) {
                fail(res, 502, error instanceof Error ? error.message : String(error))
              }
              return
            }
            if (route === '/market/describe') {
              const body = (await readBody(req)) as { id?: unknown }
              if (typeof body.id !== 'string') {
                fail(res, 400, 'body requires { id: string }')
                return
              }
              try {
                const description = await fetchSkillShDescription(body.id)
                ok(res, { id: body.id, description })
              } catch (error) {
                fail(res, 502, error instanceof Error ? error.message : String(error))
              }
              return
            }
            if (route === '/github/scan') {
              const body = (await readBody(req)) as { owner?: unknown; repo?: unknown }
              if (typeof body.owner !== 'string' || typeof body.repo !== 'string') {
                fail(res, 400, 'body requires { owner: string, repo: string }')
                return
              }
              try {
                const skills = await scanGithubRepo(body.owner, body.repo)
                ok(res, {
                  skills: skills.map((skill) => ({
                    name: skill.name,
                    description: skill.description,
                    flat: skill.flat,
                  })),
                })
              } catch (error) {
                fail(res, 502, error instanceof Error ? error.message : String(error))
              }
              return
            }
            if (route === '/update') {
              const body = (await readBody(req)) as { name?: unknown }
              if (typeof body.name !== 'string') {
                fail(res, 400, 'body requires { name: string }')
                return
              }
              const registry = await loadRegistry(roots.stateDir)
              const record = registry[body.name]
              if (!record || record.kind !== 'github') {
                fail(res, 400, `"${body.name}" has no updatable source (github only)`)
                return
              }
              try {
                const { skill } = await fetchSkillShSkill(record.location)
                await removeSkillDir(roots, skill.name)
                await installOneSkill(roots, skill, { ...record, installedAt: Date.now() })
                ok(res, { updated: skill.name })
              } catch (error) {
                fail(res, 502, error instanceof Error ? error.message : String(error))
              }
              return
            }
            if (route === '/groups') {
              const body = (await readBody(req)) as {
                op?: unknown
                id?: unknown
                name?: unknown
                members?: unknown
              }
              if (
                body.op !== 'create' &&
                body.op !== 'rename' &&
                body.op !== 'delete' &&
                body.op !== 'setMembers'
              ) {
                fail(res, 400, 'body requires op: create | rename | delete | setMembers')
                return
              }
              try {
                const file = await mutateGroups(
                  roots.stateDir,
                  body.op,
                  typeof body.id === 'string' ? body.id : undefined,
                  typeof body.name === 'string' ? body.name : undefined,
                  Array.isArray(body.members)
                    ? body.members.filter((member): member is string => typeof member === 'string')
                    : undefined,
                )
                ok(res, file)
              } catch (error) {
                fail(res, 400, error instanceof Error ? error.message : String(error))
              }
              return
            }
            if (route === '/move') {
              const body = (await readBody(req)) as {
                name?: unknown
                to?: unknown
                workspaceId?: unknown
                copy?: unknown
              }
              if (typeof body.name !== 'string') {
                fail(res, 400, 'body requires { name: string }')
                return
              }
              const to = body.to
              if (to !== 'user-dsh' && to !== 'user-agents' && to !== 'workspace') {
                fail(res, 400, 'body requires to: user-dsh | user-agents | workspace')
                return
              }
              try {
                const workspaces = listWorkspaces(ctx)
                const result = await moveSkill(
                  { dshHome: roots.dshHome, agentsHome: roots.agentsHome, stateDir: roots.stateDir, workspaces: () => workspaces },
                  {
                    name: body.name,
                    to,
                    workspaceId: typeof body.workspaceId === 'string' ? body.workspaceId : undefined,
                    copy: body.copy === true,
                  },
                )
                ok(res, result)
              } catch (error) {
                fail(res, 400, error instanceof Error ? error.message : String(error))
              }
              return
            }
            if (route === '/conversation') {
              const body = (await readBody(req)) as { sessionId?: unknown; skills?: unknown }
              if (typeof body.sessionId !== 'string' || !Array.isArray(body.skills)) {
                fail(res, 400, 'body requires { sessionId: string, skills: string[] }')
                return
              }
              const skills = body.skills.filter((skill): skill is string => typeof skill === 'string')
              if (skills.length === 0) {
                // settings update() deep-merges; use a path unset to remove.
                await settingsScope.mutate([{ op: 'unset', path: ['conversation', body.sessionId] }])
              } else {
                const config = { ...readConversation(settingsScope) }
                config[body.sessionId] = { skills, updatedAt: Date.now() }
                await settingsScope.update({ conversation: config })
              }
              shadow.invalidate()
              ok(res, { config: readConversation(settingsScope) })
              return
            }
            if (route === '/mcp') {
              const body = (await readBody(req)) as McpRequestLike
              try {
                if (body.op === 'save') {
                  const record = buildMcpRecord(body)
                  const saved = await mcp.save(record)
                  ok(res, { id: saved.id })
                  return
                }
                if (body.op === 'delete') {
                  if (typeof body.id !== 'string') {
                    fail(res, 400, 'body requires id')
                    return
                  }
                  await mcp.remove(body.id)
                  ok(res, { removed: body.id })
                  return
                }
                if (body.op === 'toggle') {
                  if (typeof body.id !== 'string' || typeof body.enabled !== 'boolean') {
                    fail(res, 400, 'body requires { id, enabled }')
                    return
                  }
                  await mcp.toggle(body.id, body.enabled)
                  ok(res, { id: body.id, enabled: body.enabled })
                  return
                }
                if (body.op === 'test') {
                  if (typeof body.id !== 'string') {
                    fail(res, 400, 'body requires id')
                    return
                  }
                  ok(res, await testMcpServer(mcp, roots.stateDir, body.id))
                  return
                }
                fail(res, 400, 'body requires op: save | delete | toggle | test')
              } catch (error) {
                fail(res, 400, error instanceof Error ? error.message : String(error))
              }
              return
            }
            if (route === '/import') {
              const body = (await readBody(req, 64 * 1024 * 1024)) as {
                kind?: unknown
                data?: unknown
                path?: unknown
                conflict?: unknown
                dryRun?: unknown
              }
              if (body.kind !== 'archive' && body.kind !== 'dir') {
                fail(res, 400, 'body requires kind: "archive" | "dir"')
                return
              }
              const conflict = body.conflict === 'overwrite' ? 'overwrite' : 'skip'
              const dryRun = body.dryRun === true
              if (body.kind === 'archive') {
                if (typeof body.data !== 'string') {
                  fail(res, 400, 'kind=archive requires data (base64)')
                  return
                }
                let bytes: Uint8Array
                try {
                  bytes = new Uint8Array(Buffer.from(body.data, 'base64'))
                } catch {
                  fail(res, 400, 'invalid base64 data')
                  return
                }
                if (bytes.length > 48 * 1024 * 1024) {
                  fail(res, 400, 'archive exceeds 48 MiB')
                  return
                }
                const source = { kind: 'archive' as const, data: bytes }
                if (dryRun) {
                  ok(res, { ...(await planImport(roots, source)), imported: [], skipped: [], failed: [] })
                } else {
                  ok(res, await runImport(roots, source, conflict, false))
                }
                return
              }
              if (typeof body.path !== 'string') {
                fail(res, 400, 'kind=dir requires path')
                return
              }
              const dirSource = { kind: 'dir' as const, path: body.path }
              if (dryRun) {
                ok(res, { ...(await planImport(roots, dirSource)), imported: [], skipped: [], failed: [] })
              } else {
                ok(res, await runImport(roots, dirSource, conflict, false))
              }
              return
            }
            fail(res, 404, `unknown route ${route}`)
            return
          default:
            fail(res, 405, 'method not allowed')
        }
      } catch (error) {
        fail(res, 500, error instanceof Error ? error.message : String(error))
      }
    },
  })
}
