/**
 * Cross-level move/copy: relocate a skill between user roots and workspace
 * project roots. Moves the whole bundle directory (or flat file); copies keep
 * the source intact. Provenance is re-recorded at the destination.
 */
import { copyFile, cp, mkdir, readFile, rename as fsRename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { findDiskSkill, type ProjectWorkspace } from './catalog.js'
import { buildSkillDoc, parseFrontmatter } from './frontmatter.js'
import { loadRegistry, saveRegistry } from '../install/installer.js'
import type { MoveRequest } from '../protocol.js'

/** Root resolution for a move target. */
export interface MoveRoots {
  dshHome: string
  agentsHome: string
  stateDir: string
  workspaces: () => ProjectWorkspace[]
}

/** Locate a skill across user roots AND workspace project roots. */
async function findSkillAnywhere(
  roots: MoveRoots,
  name: string,
): Promise<{ path: string; flat: boolean } | undefined> {
  const user = await findDiskSkill(roots.dshHome, roots.agentsHome, name)
  if (user) return user
  for (const workspace of roots.workspaces()) {
    const located = await findDiskSkill(
      join(workspace.path, '.dsh'),
      join(workspace.path, '.agents'),
      name,
    )
    if (located) return located
  }
  return undefined
}

/** Move or copy a skill to a target root. */
export async function moveSkill(
  roots: MoveRoots,
  request: MoveRequest,
): Promise<{ name: string; path: string; copied: boolean }> {
  const located = await findSkillAnywhere(roots, request.name)
  if (!located) throw new Error(`skill "${request.name}" not found`)

  let targetRoot: string
  if (request.to === 'user-dsh') {
    targetRoot = join(roots.dshHome, 'skills')
  } else if (request.to === 'user-agents') {
    throw new Error('cannot move into ~/.agents/skills: the agents root is read-only (shared with other tools)')
  } else {
    if (!request.workspaceId) throw new Error('workspaceId is required for workspace targets')
    const workspace = roots.workspaces().find((entry) => entry.id === request.workspaceId)
    if (!workspace) throw new Error('workspace not found')
    targetRoot = join(workspace.path, '.dsh', 'skills')
  }

  // The source "root dir" is where the skill entity lives (bundle dir or the
  // root holding a flat file); a move to the same root is a no-op.
  const sourceRootDir = located.flat ? dirname(located.path) : dirname(dirname(located.path))
  if (samePath(sourceRootDir, targetRoot)) {
    return { name: request.name, path: located.path, copied: false }
  }

  const copy = request.copy === true
  if (located.flat) {
    await mkdir(targetRoot, { recursive: true })
    const targetFile = join(targetRoot, `${request.name}.md`)
    if (copy) {
      await copyFile(located.path, targetFile)
    } else {
      await fsRename(located.path, targetFile)
    }
  } else {
    if (copy) {
      await cp(dirname(located.path), join(targetRoot, request.name), { recursive: true })
    } else {
      await fsRename(dirname(located.path), join(targetRoot, request.name))
    }
  }

  const finalPath = located.flat
    ? join(targetRoot, `${request.name}.md`)
    : join(targetRoot, request.name, 'SKILL.md')

  // On copy, sync the frontmatter name (the copy inherits it anyway) and drop
  // the provenance record — the copy is a fresh local skill.
  if (copy) {
    const raw = await readFile(finalPath, 'utf8')
    const parsed = parseFrontmatter(raw)
    if (parsed && parsed.fm.name !== request.name) {
      parsed.fm.name = request.name
      const doc = buildSkillDoc(parsed.fm, parsed.body)
      const tmp = `${finalPath}.tmp-${Date.now()}`
      await writeFile(tmp, doc, 'utf8')
      await fsRename(tmp, finalPath)
    }
    const registry = await loadRegistry(roots.stateDir)
    delete registry[request.name]
    await saveRegistry(roots.stateDir, registry)
  }
  return { name: request.name, path: finalPath, copied: copy }
}

function samePath(a: string, b: string): boolean {
  return a.replace(/[\\/]+$/, '').toLowerCase() === b.replace(/[\\/]+$/, '').toLowerCase()
}
