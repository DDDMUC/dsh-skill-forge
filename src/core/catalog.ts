/**
 * Catalog engine. In dsh web profiles the host-layer filesystem provider is
 * disabled by design (discovery moves into agent preset layers), so the
 * catalog is assembled from two sources:
 *
 *  1. disk scanning (node fs, primary) — user roots `~/.dsh/skills` and
 *     `~/.agents/skills` plus the current session's project roots;
 *  2. the official registry snapshot (secondary) — bundled / custom /
 *     runtime contributions the registry sees at the global layer.
 *
 * Enable/disable state is merged from the skillforge disabled map, which is
 * also what the shadow provider uses to filter model/user surfaces.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillSummary } from '@deepseek-ai/dsh-skill'
import type { CatalogResponse, SkillForgeDiagnostic, SkillForgeSkill } from '../protocol.js'
import { SHADOW_PROVIDER_NAME, type DisabledMap } from './shadow.js'

/**
 * Runtime policy: this plugin keeps ZERO runtime imports of @deepseek-ai/dsh-*
 * packages. Every dsh package imported at runtime resolves from this
 * directory's own node_modules copy, and dual module instances (cordis,
 * typert protocol, session state) corrupt the host composition — the exact
 * failure behind broken Remote RPCs (plugin inventory, model selection,
 * conversation lists). Pure helpers are therefore inlined below; dsh imports
 * stay type-only.
 */

/** Kebab-case skill-name grammar (mirrors dsh-skill's isSkillName). */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Whether a string is a valid kebab-case skill name. */
export function isSkillName(name: string): boolean {
  return SKILL_NAME.test(name)
}

/** Resolve the harness home: explicit override, then $DSH_HOME, then ~/.dsh. */
export function resolveDshHome(): string {
  const override = process.env.DSH_HOME?.trim()
  if (override) return override
  return join(homedir(), '.dsh')
}

/** Symbolic display form of a resolved harness home. */
export function dshHomeDisplay(resolvedHome: string): string {
  const override = process.env.DSH_HOME?.trim()
  if (override && resolvedHome === override) return '$DSH_HOME'
  return '~/.dsh'
}

/** User-level scan roots (rank 400 / 500 roots). */
export function userScanRoots(
  dshHome: string,
  agentsHome: string,
): Array<{ path: string; source: 'user-dsh' | 'user-agents' }> {
  return [
    { path: join(dshHome, 'skills'), source: 'user-dsh' },
    { path: join(agentsHome, 'skills'), source: 'user-agents' },
  ]
}

/** Parsed frontmatter block (zero-dependency YAML scalar subset). */
export interface ParsedFrontmatter {
  name?: string
  description?: string
  whenToUse?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
}

/** Parse a boolean in the lenient way the dsh frontmatter contract allows. */
function toBoolean(value: string): boolean | undefined {
  switch (value.toLowerCase()) {
    case 'true':
    case 'yes':
    case 'on':
    case '1':
      return true
    case 'false':
    case 'no':
    case 'off':
    case '0':
      return false
    default:
      return undefined
  }
}

/** Extract frontmatter keys from a raw skill file, or null when it has none. */
export function peekFrontmatter(raw: string): ParsedFrontmatter | null {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
  const lines = text.split(/\r?\n/)
  if (lines.length < 3 || !lines[0].trim().startsWith('---')) return null
  const out: ParsedFrontmatter = {}
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '---') break
    const match = /^([a-z][a-z0-9-]*)\s*:\s*(.*)$/.exec(line.trim())
    if (!match) continue
    const key = match[1]
    const rawValue = match[2].trim()
    if (!rawValue) continue
    switch (key) {
      case 'name':
      case 'description':
      case 'whenToUse':
        out[key] = rawValue.replace(/^['"]|['"]$/g, '')
        break
      case 'disable-model-invocation':
        out.disableModelInvocation = toBoolean(rawValue)
        break
      case 'user-invocable':
        out.userInvocable = toBoolean(rawValue)
        break
    }
  }
  return out
}

/** One discovered disk skill before enabled-state merge. */
export interface DiskSkill {
  name: string
  description: string
  whenToUse?: string
  source: 'user-dsh' | 'user-agents' | 'project-dsh' | 'project-agents'
  path: string
  flat: boolean
  modelInvocable: boolean
  userInvocable: boolean
  /** True when the skill file was renamed to *.disabled (rename fallback). */
  renamedDisabled: boolean
}

/** A workspace contributing project-level skills. */
export interface ProjectWorkspace {
  id: string
  title: string
  path: string
}

/** Read a file, returning null on any failure. */
async function tryRead(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

/** Scan an arbitrary set of roots for skills + diagnostics. */
export async function scanRoots(
  roots: Array<{ path: string; source: DiskSkill['source'] }>,
): Promise<{ skills: DiskSkill[]; diagnostics: SkillForgeDiagnostic[] }> {
  const skills: DiskSkill[] = []
  const diagnostics: SkillForgeDiagnostic[] = []
  for (const root of roots) {
    let entries
    try {
      entries = await readdir(root.path, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const path = join(root.path, entry.name)
      // Flat form: <name>.md or <name>.md.disabled.
      if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.md.disabled'))) {
        const renamed = entry.name.endsWith('.disabled')
        const base = (renamed ? entry.name.slice(0, -'.disabled'.length) : entry.name).slice(0, -3)
        if (base === 'SKILL') continue
        if (!isSkillName(base)) {
          diagnostics.push({ path, reason: `name "${base}" is not kebab-case` })
          continue
        }
        const raw = await tryRead(path)
        const fm = raw === null ? null : peekFrontmatter(raw)
        if (!fm) {
          diagnostics.push({ path, reason: 'missing YAML frontmatter (must start with ---)' })
          continue
        }
        if (!fm.name || !fm.description) {
          const missing = [fm.name ? '' : 'name', fm.description ? '' : 'description']
            .filter(Boolean)
            .join(' / ')
          diagnostics.push({ path, reason: `frontmatter missing ${missing}` })
          continue
        }
        skills.push({
          name: fm.name,
          description: fm.description,
          whenToUse: fm.whenToUse,
          source: root.source,
          path,
          flat: true,
          modelInvocable: fm.disableModelInvocation !== true,
          userInvocable: fm.userInvocable !== false,
          renamedDisabled: renamed,
        })
        continue
      }
      if (!entry.isDirectory()) continue
      // Bundle form: <name>/SKILL.md or <name>/SKILL.md.disabled.
      const base = entry.name
      if (!isSkillName(base)) {
        diagnostics.push({ path, reason: `name "${base}" is not kebab-case` })
        continue
      }
      const livePath = join(path, 'SKILL.md')
      const disabledPath = join(path, 'SKILL.md.disabled')
      const liveRaw = await tryRead(livePath)
      const disabledRaw = liveRaw === null ? await tryRead(disabledPath) : null
      const renamed = disabledRaw !== null
      const raw = liveRaw ?? disabledRaw
      if (raw === null) {
        diagnostics.push({ path, reason: 'no SKILL.md inside bundle' })
        continue
      }
      const fm = peekFrontmatter(raw)
      if (!fm) {
        diagnostics.push({ path, reason: 'missing YAML frontmatter (must start with ---)' })
        continue
      }
      if (!fm.name || !fm.description) {
        const missing = [fm.name ? '' : 'name', fm.description ? '' : 'description']
          .filter(Boolean)
          .join(' / ')
        diagnostics.push({ path, reason: `frontmatter missing ${missing}` })
        continue
      }
      skills.push({
        name: fm.name,
        description: fm.description,
        whenToUse: fm.whenToUse,
        source: root.source,
        path: renamed ? disabledPath : livePath,
        flat: false,
        modelInvocable: fm.disableModelInvocation !== true,
        userInvocable: fm.userInvocable !== false,
        renamedDisabled: renamed,
      })
    }
  }
  return { skills, diagnostics }
}

/** Scan user-level roots for skills + diagnostics. */
export async function scanUserRoots(
  dshHome: string,
  agentsHome: string,
): Promise<{ skills: DiskSkill[]; diagnostics: SkillForgeDiagnostic[] }> {
  return scanRoots(userScanRoots(dshHome, agentsHome))
}

/** Project roots for one workspace. */
export function projectRoots(workspace: ProjectWorkspace): Array<{ path: string; source: 'project-dsh' | 'project-agents' }> {
  return [
    { path: join(workspace.path, '.dsh', 'skills'), source: 'project-dsh' },
    { path: join(workspace.path, '.agents', 'skills'), source: 'project-agents' },
  ]
}

/** Merge disk skills with registry summaries into catalog rows. */
export function mergeCatalog(
  disk: DiskSkill[],
  summaries: readonly SkillSummary[],
  disabled: DisabledMap,
  checked: Record<string, string>,
  diskByName: Map<string, { flat: boolean }>,
): SkillForgeSkill[] {
  const rows = new Map<string, SkillForgeSkill>()
  for (const skill of disk) {
    rows.set(skill.name, {
      name: skill.name,
      description: skill.description,
      whenToUse: skill.whenToUse,
      source: skill.source,
      provider: 'filesystem',
      modelInvocable: skill.modelInvocable,
      userInvocable: skill.userInvocable,
      enabled:
        !skill.renamedDisabled && !Object.prototype.hasOwnProperty.call(disabled, skill.name),
      path: skill.path,
      checked: Object.prototype.hasOwnProperty.call(checked, skill.name),
      flat: skill.flat,
    })
  }
  for (const skill of summaries) {
    if (rows.has(skill.name)) continue
    rows.set(skill.name, {
      name: skill.name,
      description: skill.description,
      whenToUse: skill.whenToUse,
      source: skill.source,
      provider: skill.provider,
      modelInvocable: skill.invocation.modelInvocable,
      userInvocable: skill.invocation.userInvocable,
      enabled: !Object.prototype.hasOwnProperty.call(disabled, skill.name),
      path: 'path' in skill ? (skill as { path?: string }).path : undefined,
      checked: Object.prototype.hasOwnProperty.call(checked, skill.name),
      flat: diskByName.get(skill.name)?.flat,
    })
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Assemble the full catalog response for the settings panel. */
export async function buildCatalog(
  ctx: Context,
  disabled: DisabledMap,
  stateDir?: string,
): Promise<CatalogResponse> {
  const dshHome = resolveDshHome()
  const agentsHome = process.env.DSH_AGENTS_HOME || join(homedir(), '.agents')
  const roots = userScanRoots(dshHome, agentsHome).map((root) => root.path)

  const { skills: diskSkills, diagnostics } = await scanUserRoots(dshHome, agentsHome)

  // Project-level skills from registered workspaces (best-effort).
  let workspaces: ProjectWorkspace[] = []
  try {
    const registry = (ctx as unknown as { workspaces?: { list(): Array<{ id: string; title: string; path: string }> } })
      .workspaces
    if (registry) {
      workspaces = registry.list().map((workspace) => ({
        id: workspace.id,
        title: workspace.title,
        path: workspace.path,
      }))
    }
  } catch {
    /* no workspace service */
  }
  const workspaceCatalogs: Array<{ id: string; title: string; path: string; skills: SkillForgeSkill[] }> = []
  for (const workspace of workspaces) {
    const scanned = await scanRoots(projectRoots(workspace))
    const rows = mergeCatalog(scanned.skills, [], disabled, {}, new Map())
    workspaceCatalogs.push({ id: workspace.id, title: workspace.title, path: workspace.path, skills: rows })
  }

  let summaries: readonly SkillSummary[] = []
  try {
    const snapshot = await ctx.skills.snapshot()
    summaries = snapshot.skills
  } catch {
    /* registry snapshot is best-effort; disk scan is authoritative */
  }

  let checked: Record<string, string> = {}
  if (stateDir) {
    try {
      const raw = await readFile(join(stateDir, 'checked.json'), 'utf8')
      const parsed = JSON.parse(raw) as Record<string, string>
      if (parsed && typeof parsed === 'object') checked = parsed
    } catch {
      /* no state yet */
    }
  }
  let registry: Record<string, { kind: string; location: string; installedAt: number }> = {}
  if (stateDir) {
    try {
      const raw = await readFile(join(stateDir, 'registry.json'), 'utf8')
      const parsed = JSON.parse(raw) as typeof registry
      if (parsed && typeof parsed === 'object') registry = parsed
    } catch {
      /* no registry yet */
    }
  }
  const diskByName = new Map(diskSkills.map((skill) => [skill.name, { flat: skill.flat }]))
  const merged = mergeCatalog(diskSkills, summaries, disabled, checked, diskByName)
  for (const skill of merged) {
    if (registry[skill.name]) skill.provenance = registry[skill.name]
  }
  return {
    skills: merged,
    disabled,
    diagnostics,
    workspaces: workspaceCatalogs,
    dshHome: dshHomeDisplay(dshHome),
    roots,
  }
}

/**
 * Diagnostics pass over registry-known candidates that did not appear in the
 * disk scan (e.g. files that exist under user roots but were shadowed or
 * skipped). Currently reports nothing beyond the scan; kept as a hook.
 */
async function scanUnregisteredBundles(
  _dshHome: string,
  _agentsHome: string,
  _known: Set<string>,
  _disabled: DisabledMap,
): Promise<SkillForgeDiagnostic[]> {
  void stat
  return []
}

/** Locate one skill on disk by name across the user roots (live or renamed). */
export async function findDiskSkill(
  dshHome: string,
  agentsHome: string,
  name: string,
): Promise<{ path: string; flat: boolean; renamedDisabled: boolean } | undefined> {
  for (const root of userScanRoots(dshHome, agentsHome)) {
    const candidates: Array<{ path: string; flat: boolean; renamedDisabled: boolean }> = [
      { path: join(root.path, `${name}.md`), flat: true, renamedDisabled: false },
      { path: join(root.path, `${name}.md.disabled`), flat: true, renamedDisabled: true },
      { path: join(root.path, name, 'SKILL.md'), flat: false, renamedDisabled: false },
      { path: join(root.path, name, 'SKILL.md.disabled'), flat: false, renamedDisabled: true },
    ]
    for (const candidate of candidates) {
      try {
        const info = await stat(candidate.path)
        if (info.isFile()) return candidate
      } catch {
        /* try next */
      }
    }
  }
  return undefined
}

/** Split a raw skill file into frontmatter block and body. */
export function splitSkillDoc(raw: string): { frontmatter: string; content: string } {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
  const lines = text.split(/\r?\n/)
  if (lines.length >= 3 && lines[0].trim().startsWith('---')) {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        return {
          frontmatter: lines.slice(1, i).join('\n').trim(),
          content: lines.slice(i + 1).join('\n').trim(),
        }
      }
    }
  }
  return { frontmatter: '', content: text.trim() }
}
