/**
 * Import engine: install skills from an archive (zip/.skill) or an existing
 * directory into a user root, with dry-run conflict preview, conflict
 * resolution (skip / overwrite), and provenance recording in registry.json.
 */
import { mkdir, readFile, readdir, stat, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { ArchiveSkill, } from './skillpkg.js'
import { discoverSkillsInArchive } from './skillpkg.js'
import { parseZip } from './zip.js'
import { isSkillName, parseFrontmatter } from '../core/frontmatter.js'

/** Provenance record for one installed skill. */
export interface ProvenanceRecord {
  kind: 'archive' | 'dir' | 'github' | 'manual'
  location: string
  installedAt: number
}

/** registry.json shape: skill name -> provenance. */
export type Registry = Record<string, ProvenanceRecord>

/** Load the provenance registry (best-effort). */
export async function loadRegistry(stateDir: string): Promise<Registry> {
  try {
    const raw = await readFile(join(stateDir, 'registry.json'), 'utf8')
    const parsed = JSON.parse(raw) as Registry
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Persist the provenance registry. */
export async function saveRegistry(stateDir: string, registry: Registry): Promise<void> {
  await mkdir(stateDir, { recursive: true })
  await writeFile(join(stateDir, 'registry.json'), JSON.stringify(registry, null, 2), 'utf8')
}

/** Import target selection. */
export interface ImportTarget {
  dshHome: string
  agentsHome: string
  stateDir: string
}

/** Conflict resolution policy. */
export type ConflictPolicy = 'skip' | 'overwrite'

/** Result of a dry-run or actual import. */
export interface ImportResult {
  kind: 'archive' | 'dir'
  pending: string[]
  conflicts: string[]
  imported: string[]
  skipped: string[]
  failed: Array<{ name: string; error: string }>
}

/** Discover skills from a source payload. */
export async function discoverFromSource(
  source: { kind: 'archive'; data: Uint8Array } | { kind: 'dir'; path: string },
): Promise<{ kind: 'archive' | 'dir'; skills: ArchiveSkill[] }> {
  if (source.kind === 'dir') {
    const root = source.path
    const skills: ArchiveSkill[] = []
    const entries = await readdir(root, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(root, entry.name)
      if (entry.isDirectory()) {
        const skillPath = join(path, 'SKILL.md')
        try {
          const raw = await readFile(skillPath, 'utf8')
          const parsed = parseFrontmatter(raw)
          if (!parsed || !isSkillName(entry.name) || !parsed.fm.description) continue
          const files = new Map<string, Uint8Array>()
          const enc = new TextEncoder()
          const walk = async (dir: string): Promise<void> => {
            for (const item of await readdir(dir, { withFileTypes: true })) {
              const full = join(dir, item.name)
              const rel = join(entry.name, full.slice(path.length + 1)).split('\\').join('/')
              if (item.isDirectory()) await walk(full)
              else if (item.isFile()) files.set(rel, enc.encode(await readFile(full, 'utf8')))
            }
          }
          await walk(path)
          skills.push({
            name: entry.name,
            description: parsed.fm.description,
            whenToUse: parsed.fm.whenToUse,
            flat: false,
            files,
          })
        } catch {
          /* not a skill dir */
        }
      } else if (entry.name.endsWith('.md')) {
        const raw = await readFile(path, 'utf8')
        const parsed = parseFrontmatter(raw)
        if (!parsed || !isSkillName(entry.name.slice(0, -3)) || !parsed.fm.description) continue
        const files = new Map<string, Uint8Array>()
        files.set(`${entry.name}`, new TextEncoder().encode(raw))
        skills.push({
          name: entry.name.slice(0, -3),
          description: parsed.fm.description,
          whenToUse: parsed.fm.whenToUse,
          flat: true,
          files,
        })
      }
    }
    return { kind: 'dir', skills }
  }

  const entries = parseZip(source.data)
  return { kind: 'archive', skills: discoverSkillsInArchive(entries) }
}

/** Plan an import without writing (conflict preview). */
export async function planImport(
  target: ImportTarget,
  source: { kind: 'archive'; data: Uint8Array } | { kind: 'dir'; path: string },
): Promise<{ kind: 'archive' | 'dir'; pending: string[]; conflicts: string[] }> {
  const { kind, skills } = await discoverFromSource(source)
  const pending: string[] = []
  const conflicts: string[] = []
  for (const skill of skills) {
    if (await skillExists(target, skill.name)) conflicts.push(skill.name)
    else pending.push(skill.name)
  }
  return { kind, pending, conflicts }
}

/** Install one already-discovered skill into the dsh root. */
export async function installOneSkill(
  target: ImportTarget,
  skill: ArchiveSkill,
  provenance: ProvenanceRecord,
): Promise<void> {
  const root = join(target.dshHome, 'skills')
  if (skill.flat) {
    await mkdir(root, { recursive: true })
    const md = skill.files.get(`${skill.name}.md`)
    if (!md) throw new Error('missing flat markdown in source')
    await writeFile(join(root, `${skill.name}.md`), md)
  } else {
    const dir = join(root, skill.name)
    await mkdir(dir, { recursive: true })
    for (const [rel, data] of skill.files) {
      const targetFile = join(dir, rel.slice(skill.name.length + 1))
      await mkdir(targetFile.slice(0, Math.max(targetFile.lastIndexOf('\\'), targetFile.lastIndexOf('/'))), {
        recursive: true,
      })
      await writeFile(targetFile, data)
    }
  }
  const registry = await loadRegistry(target.stateDir)
  registry[skill.name] = provenance
  await saveRegistry(target.stateDir, registry)
}

/** Execute an import with the given conflict policy. */
export async function runImport(
  target: ImportTarget,
  source: { kind: 'archive'; data: Uint8Array } | { kind: 'dir'; path: string },
  policy: ConflictPolicy,
  dryRun: boolean,
): Promise<ImportResult> {
  const { kind, skills } = await discoverFromSource(source)
  const result: ImportResult = { kind, pending: [], conflicts: [], imported: [], skipped: [], failed: [] }
  const root = join(target.dshHome, 'skills')

  for (const skill of skills) {
    const exists = await skillExists(target, skill.name)
    if (exists) {
      result.conflicts.push(skill.name)
      if (policy === 'skip') {
        result.skipped.push(skill.name)
        continue
      }
      if (!dryRun) await removeSkill(root, skill.name)
    }
    result.pending.push(skill.name)
    if (dryRun) continue
    try {
      await installOneSkill(target, skill, {
        kind: source.kind === 'archive' ? 'archive' : 'dir',
        location: source.kind === 'archive' ? 'archive' : source.path,
        installedAt: Date.now(),
      })
      result.imported.push(skill.name)
    } catch (error) {
      result.failed.push({
        name: skill.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return result
}

/** Whether a skill already exists in either user root. */
export async function skillExists(target: ImportTarget, name: string): Promise<boolean> {
  for (const root of [join(target.dshHome, 'skills'), join(target.agentsHome, 'skills')]) {
    try {
      const bundle = await stat(join(root, name, 'SKILL.md'))
      if (bundle.isFile()) return true
    } catch {
      /* check flat */
    }
    try {
      const flat = await stat(join(root, `${name}.md`))
      if (flat.isFile()) return true
    } catch {
      /* absent */
    }
  }
  return false
}

async function removeSkill(root: string, name: string): Promise<void> {
  await rm(join(root, name), { recursive: true, force: true })
  await rm(join(root, `${name}.md`), { force: true })
}
