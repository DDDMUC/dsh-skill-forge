/**
 * CRUD operations over user-level skill roots: create / update / rename /
 * delete. All writes are atomic (temp file + rename); nothing touches files
 * outside the two user roots.
 *
 * WRITE PROTECTION: skills under the shared agents root (~/.agents/skills,
 * also consumed by other tools such as opencode) are READ-ONLY here —
 * editing, renaming, or deleting them is refused. Only ~/.dsh/skills is
 * managed directly.
 */
import { mkdir, readFile, readdir, rename as fsRename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { buildSkillDoc, isSkillName, parseFrontmatter } from './frontmatter.js'
import { findDiskSkill } from './catalog.js'

/** Root set for CRUD. */
export interface CrudRoots {
  dshHome: string
  agentsHome: string
}

/** Refuse mutations on skills living under the shared agents root. */
export function assertWritableRoot(
  roots: CrudRoots,
  path: string,
  name: string,
  action: string,
): void {
  const agentsPrefix = roots.agentsHome.replace(/[\\/]+$/, '').replace(/\\/g, '/') + '/'
  const normalized = path.replace(/\\/g, '/')
  if (normalized.startsWith(agentsPrefix)) {
    throw new Error(
      `cannot ${action} "${name}": the ~/.agents/skills root is read-only (shared with other tools); copy it to ~/.dsh/skills first`,
    )
  }
}

/** Create a new skill as a directory bundle under ~/.dsh/skills. */
export async function createSkill(
  roots: CrudRoots,
  input: { name: string; description: string; whenToUse?: string; content?: string },
): Promise<{ name: string; path: string }> {
  const name = input.name.trim()
  if (!isSkillName(name)) throw new Error(`"${name}" is not a valid kebab-case skill name`)
  if (!input.description.trim()) throw new Error('description is required')
  const target = join(roots.dshHome, 'skills', name, 'SKILL.md')
  const existing = await findDiskSkill(roots.dshHome, roots.agentsHome, name)
  if (existing) throw new Error(`skill "${name}" already exists`)
  const doc = buildSkillDoc(
    {
      name,
      description: input.description.trim(),
      whenToUse: input.whenToUse?.trim() || undefined,
      extra: [],
    },
    input.content ?? '',
  )
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, doc, 'utf8')
  return { name, path: target }
}

/** Read a skill's current frontmatter + body for the editor. */
export async function readSkillForEdit(
  roots: CrudRoots,
  name: string,
): Promise<{ path: string; flat: boolean; description: string; whenToUse?: string; content: string }> {
  const located = await findDiskSkill(roots.dshHome, roots.agentsHome, name)
  if (!located) throw new Error(`skill "${name}" not found`)
  const raw = await readFile(located.path, 'utf8')
  const parsed = parseFrontmatter(raw)
  return {
    path: located.path,
    flat: located.flat,
    description: parsed?.fm.description ?? '',
    whenToUse: parsed?.fm.whenToUse,
    content: parsed ? parsed.body : raw,
  }
}

/** Overwrite a skill's description/whenToUse/body, preserving other fields. */
export async function updateSkill(
  roots: CrudRoots,
  input: { name: string; description?: string; whenToUse?: string; content?: string },
): Promise<{ name: string; path: string }> {
  const located = await findDiskSkill(roots.dshHome, roots.agentsHome, input.name)
  if (!located) throw new Error(`skill "${input.name}" not found`)
  assertWritableRoot(roots, located.path, input.name, 'edit')
  const raw = await readFile(located.path, 'utf8')
  const parsed = parseFrontmatter(raw)
  if (!parsed) throw new Error(`skill "${input.name}" has no valid frontmatter`)
  if (input.description !== undefined) parsed.fm.description = input.description.trim()
  if (input.whenToUse !== undefined) {
    parsed.fm.whenToUse = input.whenToUse.trim() || undefined
  }
  const body = input.content !== undefined ? input.content : parsed.body
  const doc = buildSkillDoc(parsed.fm, body)
  await atomicWrite(located.path, doc)
  return { name: input.name, path: located.path }
}

/** Rename a skill (directory/file) and sync its frontmatter name. */
export async function renameSkill(
  roots: CrudRoots,
  input: { name: string; newName: string },
): Promise<{ name: string; path: string }> {
  const newName = input.newName.trim()
  if (!isSkillName(newName)) throw new Error(`"${newName}" is not a valid kebab-case skill name`)
  if (newName === input.name) return { name: input.name, path: '' }
  const located = await findDiskSkill(roots.dshHome, roots.agentsHome, input.name)
  if (!located) throw new Error(`skill "${input.name}" not found`)
  assertWritableRoot(roots, located.path, input.name, 'rename')
  const existing = await findDiskSkill(roots.dshHome, roots.agentsHome, newName)
  if (existing) throw new Error(`skill "${newName}" already exists`)

  const raw = await readFile(located.path, 'utf8')
  const parsed = parseFrontmatter(raw)
  if (!parsed) throw new Error(`skill "${input.name}" has no valid frontmatter`)

  // Move the whole bundle directory (or flat file), then rewrite the doc.
  const rootDir = located.flat ? dirname(located.path) : dirname(dirname(located.path))
  const source = located.flat ? located.path : dirname(located.path)
  const target = located.flat ? join(rootDir, `${newName}.md`) : join(rootDir, newName)
  await fsRename(source, target)
  const targetFile = located.flat ? target : join(target, 'SKILL.md')

  parsed.fm.name = newName
  const doc = buildSkillDoc(parsed.fm, parsed.body)
  await atomicWrite(targetFile, doc)
  return { name: newName, path: targetFile }
}

/** Delete a skill (directory bundle or flat file). */
export async function deleteSkill(
  roots: CrudRoots,
  name: string,
): Promise<{ name: string }> {
  const located = await findDiskSkill(roots.dshHome, roots.agentsHome, name)
  if (!located) throw new Error(`skill "${name}" not found`)
  assertWritableRoot(roots, located.path, name, 'delete')
  if (located.flat) {
    await rm(located.path, { force: true })
  } else {
    await rm(dirname(located.path), { recursive: true, force: true })
  }
  return { name }
}

/** Atomic file write (temp file + rename). */
export async function atomicWrite(path: string, content: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`
  await writeFile(tmp, content, 'utf8')
  await fsRename(tmp, path)
}
