/**
 * Shared wire types and endpoint table between host half and browser half.
 */

/** API prefix registered on the web server (same-origin, loopback-only). */
export const API_BASE = '/plugins/skillforge/api'

/** One skill row in the catalog. */
export interface SkillForgeSkill {
  /** Kebab-case skill name. */
  name: string
  /** Short routing description. */
  description: string
  /** Optional extra routing guidance. */
  whenToUse?: string
  /** Discovery source bucket (user-dsh / user-agents / custom / bundled / ...). */
  source: string
  /** Provider owning the skill body. */
  provider: string
  /** Whether the model-facing catalog includes this skill. */
  modelInvocable: boolean
  /** Whether the human-facing catalog includes this skill. */
  userInvocable: boolean
  /** Whether the skill is enabled (not shadowed by skillforge). */
  enabled: boolean
  /** Absolute file path when the skill came from disk. */
  path?: string
  /** Whether the audited content fingerprint is current (green dot). */
  checked?: boolean
  /** Disk form: flat single-file or directory bundle. */
  flat?: boolean
  /** Provenance when the skill was installed through skillforge. */
  provenance?: { kind: string; location: string; installedAt: number }
}

/** One entry of the disabled map persisted under the skillforge settings namespace. */
export interface DisabledEntry {
  /** When the skill was disabled (epoch ms). */
  disabledAt?: number
}

/** A file that exists under a scan root but never made the registry. */
export interface SkillForgeDiagnostic {
  /** Absolute path of the offending file/directory. */
  path: string
  /** Human-readable reason (frontmatter missing, name missing, ...). */
  reason: string
}

/** Full catalog response. */
export interface CatalogResponse {
  /** Sorted invocation-neutral skill rows with enabled state merged. */
  skills: SkillForgeSkill[]
  /** Disabled map (source of truth for the shadow provider). */
  disabled: Record<string, DisabledEntry>
  /** Files under scan roots that the registry ignored. */
  diagnostics: SkillForgeDiagnostic[]
  /** Project-level skills grouped by workspace. */
  workspaces: Array<{
    id: string
    title: string
    path: string
    skills: SkillForgeSkill[]
  }>
  /** Resolved harness home (for display). */
  dshHome: string
  /** Scan roots actually inspected for diagnostics. */
  roots: string[]
}

/** One skill detail response. */
export interface SkillDetailResponse {
  name: string
  description: string
  whenToUse?: string
  source: string
  provider: string
  enabled: boolean
  path?: string
  /** Rendered markdown body (frontmatter stripped). */
  content: string
  /** Raw frontmatter text block (between the first --- fences). */
  frontmatter: string
}

/** Unified API envelope. */
export type ApiEnvelope<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/** POST /toggle body. */
export interface ToggleRequest {
  name: string
  enabled: boolean
}

/** POST /check response. */
export interface CheckResponse {
  checked: string[]
  fixed: string[]
  skipped: string[]
  errors: Array<{ name: string; error: string }>
}

/** POST /create body. */
export interface CreateRequest {
  name: string
  description: string
  whenToUse?: string
  content?: string
}

/** POST /update body. */
export interface UpdateRequest {
  name: string
  description?: string
  whenToUse?: string
  content?: string
}

/** POST /rename body. */
export interface RenameRequest {
  name: string
  newName: string
}

/** GET /edit response. */
export interface EditResponse {
  name: string
  path: string
  flat: boolean
  description: string
  whenToUse?: string
  content: string
}

/** POST /import body. */
export interface ImportRequest {
  kind: 'archive' | 'dir'
  /** Base64 archive bytes (kind=archive). */
  data?: string
  /** Local directory path (kind=dir). */
  path?: string
  conflict?: 'skip' | 'overwrite'
  dryRun?: boolean
}

/** POST /import response (plan or run). */
export interface ImportResponse {
  kind: 'archive' | 'dir'
  pending: string[]
  conflicts: string[]
  imported: string[]
  skipped: string[]
  failed: Array<{ name: string; error: string }>
}

/** GET /registry response. */
export type RegistryResponse = Record<
  string,
  { kind: 'archive' | 'dir' | 'github' | 'manual'; location: string; installedAt: number }
>

/** POST /move body. */
export interface MoveRequest {
  name: string
  /** Target root kind. */
  to: 'user-dsh' | 'user-agents' | 'workspace'
  /** Workspace id when to === 'workspace'. */
  workspaceId?: string
  /** True to copy instead of move. */
  copy?: boolean
}

/** Skill group record. */
export interface SkillGroup {
  id: string
  name: string
  members: string[]
}

/** GET /groups response. */
export interface GroupsResponse {
  groups: SkillGroup[]
}

/** POST /groups body. */
export interface GroupsRequest {
  op: 'create' | 'rename' | 'delete' | 'setMembers'
  id?: string
  name?: string
  members?: string[]
}

/** One MCP server row for the panel. */
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

/** GET /mcp response. */
export interface McpListResponse {
  servers: McpServerView[]
}

/** POST /mcp body. */
export interface McpRequest {
  op: 'save' | 'delete' | 'toggle' | 'test'
  id?: string
  name?: string
  transport?: 'stdio' | 'streamable-http'
  serverName?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
  enabled?: boolean
}

/** POST /mcp test result. */
export interface McpTestResult {
  ok: boolean
  error?: string
}
