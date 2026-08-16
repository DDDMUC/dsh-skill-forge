/**
 * DSH-spec audit: state-driven checks and automatic fixes over user-level
 * skill roots. Only files whose content fingerprint changed since the last
 * successful audit are re-checked (red dots), so repeated runs stay cheap.
 *
 * Fixes (all idempotent, logged to audit.log):
 *  - directory/file name not kebab-case            -> rename + sync frontmatter name
 *  - frontmatter name missing / non-kebab / mismatch-> adopt the directory name
 *  - description missing                           -> placeholder text
 *  - camelCase invocation keys / non-boolean values -> canonical form
 *  - UTF-8 BOM                                     -> stripped
 */
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { parseFrontmatter, serializeFrontmatter, stripBom, isSkillName, parseBoolean } from './frontmatter.js'
import { userScanRoots } from './catalog.js'

/** One audited entry. */
export interface AuditEntry {
  name: string
  path: string
  flat: boolean
  source: 'user-dsh' | 'user-agents'
}

/** Audit outcome for one root. */
export interface AuditResult {
  checked: string[]
  fixed: string[]
  skipped: string[]
  errors: Array<{ name: string; error: string }>
}

/** sha1 fingerprint of a skill document. */
export function fingerprint(raw: string): string {
  return createHash('sha1').update(stripBom(raw)).digest('hex')
}

/** Locate every skill-shaped entry under the user roots. */
export async function listUserSkillEntries(
  dshHome: string,
  agentsHome: string,
): Promise<AuditEntry[]> {
  const entries: AuditEntry[] = []
  for (const root of userScanRoots(dshHome, agentsHome)) {
    let names
    try {
      names = await readdir(root.path)
    } catch {
      continue
    }
    for (const name of names) {
      if (name === '.system' || name.endsWith('.disabled')) continue
      if (name.endsWith('.md')) {
        entries.push({ name: name.slice(0, -3), path: join(root.path, name), flat: true, source: root.source })
      } else {
        entries.push({ name, path: join(root.path, name, 'SKILL.md'), flat: false, source: root.source })
      }
    }
  }
  return entries
}

/** Read a checked-state store. */
export interface CheckedStore {
  load(): Promise<Record<string, string>>
  save(map: Record<string, string>): Promise<void>
}

/** File-backed checked store (~/.dsh/skillforge/checked.json). */
export function fileCheckedStore(dir: string): CheckedStore {
  return {
    async load() {
      try {
        const raw = await readFile(join(dir, 'checked.json'), 'utf8')
        const parsed = JSON.parse(raw) as Record<string, string>
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    },
    async save(map) {
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'checked.json'), JSON.stringify(map, null, 2), 'utf8')
    },
  }
}

/** Append one line to the audit log (best-effort). */
export async function appendAuditLog(dir: string, line: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true })
    const file = join(dir, 'audit.log')
    await writeFile(file, `${new Date().toISOString()} ${line}\n`, { flag: 'a' })
  } catch {
    /* logging never blocks the audit */
  }
}

/**
 * Fix one skill document in place. Returns the fixed frontmatter/body or null
 * when nothing needed fixing.
 */
export async function fixSkillFile(entry: AuditEntry): Promise<{ reason: string } | null> {
  const raw = await readFile(entry.path, 'utf8')
  const parsed = parseFrontmatter(raw)
  if (!parsed) {
    return { reason: 'no frontmatter' } // surfaced as an error upstream; not auto-fixable
  }
  const { fm, body } = parsed
  const fixes: string[] = []
  // Skill root: for a bundle the SKILL.md sits one level below the root.
  const rootDir = entry.flat ? dirname(entry.path) : dirname(dirname(entry.path))

  if (!isSkillName(entry.name)) {
    // Rename the whole bundle directory (or flat file) to a kebab form.
    const candidate = kebabize(entry.name)
    if (!candidate || !isSkillName(candidate)) return { reason: `cannot kebabize "${entry.name}"` }
    const sourceDir = entry.flat ? entry.path : dirname(entry.path)
    const target = entry.flat ? join(rootDir, `${candidate}.md`) : join(rootDir, candidate)
    await rename(sourceDir, target)
    entry.name = candidate
    entry.path = entry.flat ? target : join(target, 'SKILL.md')
    fixes.push(`renamed to ${candidate}`)
  }

  if (fm.name !== entry.name) {
    fm.name = entry.name
    fixes.push('frontmatter name synced')
  }
  if (!fm.description) {
    fm.description = 'No description provided.'
    fixes.push('description placeholder added')
  }
  if (fm.disableModelInvocation === undefined) {
    const legacy = fm.extra.find((line) => /^disableModelInvocation\s*:/.test(line))
    if (legacy) {
      fm.disableModelInvocation = parseBoolean(legacy.slice(legacy.indexOf(':') + 1).trim()) ?? false
      fixes.push('camelCase disable-model-invocation normalized')
    }
  }
  if (fm.userInvocable === undefined) {
    const legacy = fm.extra.find((line) => /^userInvocable\s*:/.test(line))
    if (legacy) {
      fm.userInvocable = parseBoolean(legacy.slice(legacy.indexOf(':') + 1).trim()) ?? true
      fixes.push('camelCase user-invocable normalized')
    }
  }

  const cleanedExtra = fm.extra.filter(
    (line) => !/^(disableModelInvocation|userInvocable)\s*:/.test(line),
  )
  if (cleanedExtra.length !== fm.extra.length) {
    fm.extra = cleanedExtra
    fixes.push('legacy invocation keys removed')
  }

  if (fixes.length === 0) return null
  const rebuilt = `---\n${serializeFrontmatter(fm)}\n---\n${body ? `\n${body}\n` : ''}`
  await writeFile(entry.path, rebuilt, 'utf8')
  return { reason: fixes.join(', ') }
}

/** Best-effort kebab-case conversion of an arbitrary name. */
export function kebabize(name: string): string {
  const kebab = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return kebab
}

/**
 * Run the state-driven audit: re-check only changed/unchecked entries, fix
 * everything fixable, and record fingerprints for clean entries.
 */
export async function auditRoots(
  dshHome: string,
  agentsHome: string,
  stateDir: string,
): Promise<AuditResult> {
  const store = fileCheckedStore(stateDir)
  const checked = await store.load()
  const result: AuditResult = { checked: [], fixed: [], skipped: [], errors: [] }
  const next: Record<string, string> = { ...checked }

  for (const entry of await listUserSkillEntries(dshHome, agentsHome)) {
    let raw: string
    try {
      raw = await readFile(entry.path, 'utf8')
    } catch (error) {
      // A directory without SKILL.md is not a skill; skip silently.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      result.errors.push({ name: entry.name, error: 'cannot read' })
      continue
    }
    const fp = fingerprint(raw)
    if (checked[entry.name] === fp) {
      result.skipped.push(entry.name)
      continue
    }
    try {
      const fixed = await fixSkillFile(entry)
      if (fixed) {
        result.fixed.push(entry.name)
        await appendAuditLog(stateDir, `fixed ${entry.name}: ${fixed.reason}`)
      }
      const after = await readFile(entry.path, 'utf8')
      next[entry.name] = fingerprint(after)
      result.checked.push(entry.name)
    } catch (error) {
      result.errors.push({ name: entry.name, error: error instanceof Error ? error.message : String(error) })
    }
  }

  await store.save(next)
  return result
}
