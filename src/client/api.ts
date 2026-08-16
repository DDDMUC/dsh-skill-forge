/**
 * Browser-side API bridge: typed fetch over the same-origin skillforge API.
 */
import type {
  ApiEnvelope,
  CatalogResponse,
  CheckResponse,
  EditResponse,
  ImportResponse,
  SkillDetailResponse,
} from '../protocol.js'
import { API_BASE } from '../protocol.js'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  let envelope: ApiEnvelope<T>
  try {
    envelope = (await res.json()) as ApiEnvelope<T>
  } catch {
    throw new Error(`unexpected response (${res.status})`)
  }
  if (!envelope.ok) throw new Error(envelope.error)
  return envelope.data
}

export function fetchCatalog(): Promise<CatalogResponse> {
  return call<CatalogResponse>('/catalog')
}

export function fetchSkill(name: string): Promise<SkillDetailResponse> {
  return call<SkillDetailResponse>('/skill?name=' + encodeURIComponent(name))
}

export function toggleSkill(name: string, enabled: boolean): Promise<{ name: string; enabled: boolean }> {
  return call<{ name: string; enabled: boolean }>('/toggle', {
    method: 'POST',
    body: JSON.stringify({ name, enabled } satisfies { name: string; enabled: boolean }),
  })
}

export function checkSkills(): Promise<CheckResponse> {
  return call<CheckResponse>('/check', { method: 'POST', body: '{}' })
}

export function fetchEdit(name: string): Promise<EditResponse> {
  return call<EditResponse>('/edit?name=' + encodeURIComponent(name))
}

export function createSkill(input: {
  name: string
  description: string
  whenToUse?: string
  content?: string
}): Promise<{ name: string }> {
  return call<{ name: string }>('/create', { method: 'POST', body: JSON.stringify(input) })
}

export function updateSkill(input: {
  name: string
  description?: string
  whenToUse?: string
  content?: string
}): Promise<{ name: string }> {
  return call<{ name: string }>('/update', { method: 'POST', body: JSON.stringify(input) })
}

export function renameSkill(name: string, newName: string): Promise<{ name: string }> {
  return call<{ name: string }>('/rename', {
    method: 'POST',
    body: JSON.stringify({ name, newName }),
  })
}

export function deleteSkill(name: string): Promise<{ name: string }> {
  return call<{ name: string }>('/delete', { method: 'POST', body: JSON.stringify({ name }) })
}

/** Archive import (base64 payload; 48 MiB server cap). */
export async function importArchive(
  bytes: Uint8Array,
  conflict: 'skip' | 'overwrite',
  dryRun: boolean,
): Promise<ImportResponse> {
  let base64: string
  try {
    base64 = btoa(String.fromCharCode(...bytes))
  } catch {
    const chunks: string[] = []
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunk)))
    }
    base64 = btoa(chunks.join(''))
  }
  return call<ImportResponse>('/import', {
    method: 'POST',
    body: JSON.stringify({ kind: 'archive', data: base64, conflict, dryRun }),
  })
}

/** Directory import. */
export function importDir(
  path: string,
  conflict: 'skip' | 'overwrite',
  dryRun: boolean,
): Promise<ImportResponse> {
  return call<ImportResponse>('/import', {
    method: 'POST',
    body: JSON.stringify({ kind: 'dir', path, conflict, dryRun }),
  })
}

/** Download URL for a .skill export. */
export function exportUrl(name: string): string {
  return `${API_BASE}/export?name=${encodeURIComponent(name)}`
}

/** Ask the host to open a skill's folder in the file manager. */
export function openFolder(name: string): Promise<{ opened: string }> {
  return call<{ opened: string }>('/open', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/** Market item from the host search. */
export interface MarketItem {
  id: string
  name: string
  installs: number
  source: string
  market: 'skills.sh'
}

/** Search the skill market. */
export function marketSearch(keyword: string): Promise<MarketItem[]> {
  return call<MarketItem[]>('/market/search', {
    method: 'POST',
    body: JSON.stringify({ keyword }),
  })
}

/** Install a market skill (optionally to a workspace project root). */
export function marketInstall(
  id: string,
  workspaceId?: string,
): Promise<{ installed: string; target?: string }> {
  return call<{ installed: string; target?: string }>('/market/install', {
    method: 'POST',
    body: JSON.stringify({ id, workspaceId }),
  })
}

/** Fetch a market skill's description (raw SKILL.md, host-cached). */
export function marketDescribe(id: string): Promise<{ id: string; description: string | null }> {
  return call<{ id: string; description: string | null }>('/market/describe', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

/** Scan a GitHub repo for skills. */
export function githubScan(
  owner: string,
  repo: string,
): Promise<{ skills: Array<{ name: string; description: string; flat: boolean }> }> {
  return call<{ skills: Array<{ name: string; description: string; flat: boolean }> }>('/github/scan', {
    method: 'POST',
    body: JSON.stringify({ owner, repo }),
  })
}

/** Update a github-sourced skill. */
export function updateMarketSkill(name: string): Promise<{ updated: string }> {
  return call<{ updated: string }>('/update', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/** Skill group shape. */
export interface SkillGroup {
  id: string
  name: string
  members: string[]
}

/** Fetch groups. */
export function fetchGroups(): Promise<{ groups: SkillGroup[] }> {
  return call<{ groups: SkillGroup[] }>('/groups')
}

/** Mutate groups. */
export function mutateGroups(input: {
  op: 'create' | 'rename' | 'delete' | 'setMembers'
  id?: string
  name?: string
  members?: string[]
}): Promise<{ groups: SkillGroup[] }> {
  return call<{ groups: SkillGroup[] }>('/groups', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** Move/copy a skill to another root. */
export function moveSkill(input: {
  name: string
  to: 'user-dsh' | 'user-agents' | 'workspace'
  workspaceId?: string
  copy?: boolean
}): Promise<{ name: string; copied: boolean }> {
  return call<{ name: string; copied: boolean }>('/move', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** MCP server row. */
export interface McpServerView {
  id: string
  name: string
  enabled: boolean
  transport: 'stdio' | 'streamable-http'
  serverName: string
  command?: string
  args?: string[]
  url?: string
  running: boolean
  lastError?: string
}

/** Fetch MCP servers. */
export function fetchMcp(): Promise<{ servers: McpServerView[] }> {
  return call<{ servers: McpServerView[] }>('/mcp')
}

/** Save an MCP server. */
export function saveMcp(input: {
  id?: string
  name: string
  transport: 'stdio' | 'streamable-http'
  serverName?: string
  command?: string
  args?: string[]
  url?: string
  enabled?: boolean
}): Promise<{ id: string }> {
  return call<{ id: string }>('/mcp', {
    method: 'POST',
    body: JSON.stringify({ op: 'save', ...input }),
  })
}

/** Toggle an MCP server. */
export function toggleMcp(id: string, enabled: boolean): Promise<{ id: string; enabled: boolean }> {
  return call<{ id: string; enabled: boolean }>('/mcp', {
    method: 'POST',
    body: JSON.stringify({ op: 'toggle', id, enabled }),
  })
}

/** Delete an MCP server. */
export function deleteMcp(id: string): Promise<{ removed: string }> {
  return call<{ removed: string }>('/mcp', {
    method: 'POST',
    body: JSON.stringify({ op: 'delete', id }),
  })
}

/** Test an MCP server connection. */
export function testMcp(id: string): Promise<{ ok: boolean; error?: string }> {
  return call<{ ok: boolean; error?: string }>('/mcp', {
    method: 'POST',
    body: JSON.stringify({ op: 'test', id }),
  })
}

/** Conversation loading: config + host session list. */
export function fetchConversation(): Promise<{
  config: Record<string, { skills?: string[] }>
  sessions: Array<{ id: string; cwd: string }>
}> {
  return call<{ config: Record<string, { skills?: string[] }>; sessions: Array<{ id: string; cwd: string }> }>(
    '/conversation',
  )
}

/** Save a session's skill selection (empty clears it -> load all). */
export function saveConversation(
  sessionId: string,
  skills: string[],
): Promise<{ config: Record<string, { skills?: string[] }> }> {
  return call<{ config: Record<string, { skills?: string[] }> }>('/conversation', {
    method: 'POST',
    body: JSON.stringify({ sessionId, skills }),
  })
}

/** Plugin inventory rows. */
export interface PluginRow {
  moduleName: string
  enabled: boolean
  fiberPhase: string | null
}

/** Fetch the plugin inventory (official / third-party groups). */
export function fetchPlugins(): Promise<{ official: PluginRow[]; other: PluginRow[] }> {
  return call<{ official: PluginRow[]; other: PluginRow[] }>('/plugins')
}
