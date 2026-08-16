/**
 * Skill package (.skill) handling: discover skills inside an extracted
 * archive (directory bundles or flat .md files) and pack a skill directory
 * tree back into a .skill zip.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { isSkillName, parseFrontmatter } from '../core/frontmatter.js'
import type { ZipEntry } from './zip.js'

/**
 * Strip a single redundant root directory segment (codeload zipballs wrap
 * everything under "<repo>-<branch>/"). Only strips when every file entry
 * shares one top-level segment, and the segment is not itself a skill name
 * candidate — i.e. the archive clearly is a repository dump, not a skill
 * bundle already laid out flat.
 */
export function stripSingleRoot(entries: ZipEntry[]): ZipEntry[] {
  const nonDir = entries.filter((entry) => !entry.name.endsWith('/'))
  if (nonDir.length === 0) return entries
  const tops = new Set<string>()
  for (const entry of nonDir) {
    const top = entry.name.includes('/') ? entry.name.split('/')[0] : null
    if (top === null) return entries // a top-level file exists: not a wrapped dump
    tops.add(top)
  }
  if (tops.size !== 1) return entries
  const top = [...tops][0]
  if (isSkillName(top) && nonDir.length === 1) return entries
  const prefix = `${top}/`
  const stripped: ZipEntry[] = []
  let strippedFiles = 0
  for (const entry of entries) {
    if (entry.name.endsWith('/')) continue
    if (entry.name.startsWith(prefix)) {
      stripped.push({ name: entry.name.slice(prefix.length), data: entry.data })
      strippedFiles += 1
    }
  }
  return strippedFiles === nonDir.length ? stripped : entries
}

/** One candidate skill found inside an archive. */
export interface ArchiveSkill {
  name: string
  description: string
  whenToUse?: string
  /** True when the skill is a single flat file inside the archive. */
  flat: boolean
  /** Files belonging to this skill: archive-relative paths -> contents. */
  files: Map<string, Uint8Array>
}

/** Discover skill candidates in extracted archive entries (top-level only). */
export function discoverSkillsInArchive(entries: ZipEntry[]): ArchiveSkill[] {
  // Group by top-level path segment. A top-level flat .md file groups under
  // its name without the extension.
  const byTop = new Map<string, ZipEntry[]>()
  for (const entry of entries) {
    if (entry.name.endsWith('/')) continue // directory marker
    const top = entry.name.includes('/')
      ? entry.name.split('/')[0]
      : entry.name.endsWith('.md')
        ? entry.name.slice(0, -3)
        : entry.name
    if (!byTop.has(top)) byTop.set(top, [])
    byTop.get(top)!.push(entry)
  }

  const skills: ArchiveSkill[] = []
  for (const [top, files] of byTop) {
    const flat = files.some((file) => file.name === `${top}.md`)
    const bundleSkill = files.find((file) => file.name === `${top}/SKILL.md`)
    if (flat) {
      const md = files.find((file) => file.name === `${top}.md`)!
      const fm = parseFrontmatter(new TextDecoder('utf-8').decode(md.data))
      if (!fm || !isSkillName(top) || !fm.fm.description) continue
      const filesMap = new Map<string, Uint8Array>()
      filesMap.set(`${top}.md`, md.data)
      skills.push({
        name: top,
        description: fm.fm.description,
        whenToUse: fm.fm.whenToUse,
        flat: true,
        files: filesMap,
      })
      continue
    }
    if (bundleSkill) {
      const fm = parseFrontmatter(new TextDecoder('utf-8').decode(bundleSkill.data))
      if (!fm || !isSkillName(top) || !fm.fm.description) continue
      const filesMap = new Map<string, Uint8Array>()
      for (const file of files) {
        if (file.name.startsWith(`${top}/`)) filesMap.set(file.name, file.data)
      }
      skills.push({
        name: top,
        description: fm.fm.description,
        whenToUse: fm.fm.whenToUse,
        flat: false,
        files: filesMap,
      })
    }
  }
  return skills
}

/** Pack a skill directory into .skill zip bytes (symlinks dereferenced). */
export async function packSkill(
  skillDir: string,
  name: string,
): Promise<{ entries: Array<{ name: string; data: Uint8Array }> }> {
  const entries: Array<{ name: string; data: Uint8Array }> = []
  const enc = new TextEncoder()
  const walk = async (dir: string): Promise<void> => {
    const items = await readdir(dir, { withFileTypes: true })
    for (const item of items) {
      const full = join(dir, item.name)
      const rel = relative(skillDir, full).split(sep).join('/')
      const targetName = `${name}/${rel}`
      if (item.isDirectory()) {
        await walk(full)
      } else if (item.isFile()) {
        const data = await readFile(full)
        entries.push({ name: targetName, data: new Uint8Array(data) })
      } else if (item.isSymbolicLink()) {
        // Dereference: read the target file, fall back to skipping.
        try {
          const target = await stat(full)
          if (target.isFile()) {
            const data = await readFile(full)
            entries.push({ name: targetName, data: new Uint8Array(data) })
          }
        } catch {
          /* broken link: skip */
        }
      }
    }
  }
  await walk(skillDir)
  // Ensure SKILL.md is present in the pack.
  if (!entries.some((entry) => entry.name === `${name}/SKILL.md`)) {
    throw new Error(`"${name}" has no SKILL.md`)
  }
  void enc
  return { entries }
}
