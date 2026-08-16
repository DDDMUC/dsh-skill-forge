/**
 * Toggle logic: enable/disable a skill by writing the disabled map into the
 * skillforge settings namespace (shadow provider) AND, for skills under the
 * dsh root, renaming SKILL.md <-> SKILL.md.disabled (rename fallback that
 * works for every filesystem-based preset, even ones without a skills
 * service). The agents root is shadow-only: renaming would break other tools
 * that share ~/.agents/skills.
 *
 * NOTE: settings `update` merges patches recursively (plain objects merge,
 * arrays/other values replace). Disabling therefore patches the full map,
 * while enabling removes the entry through a path `unset` mutate — patching
 * `{ disabled: {} }` would no-op against an existing map.
 */
import { rename } from 'node:fs/promises'
import { join } from 'node:path'
import { findDiskSkill } from './catalog.js'
import { readDisabledMap, type DisabledMap } from './shadow.js'

/** Write operations backed by the settings service. */
export interface ToggleWriter {
  getDisabled(): DisabledMap
  /** Replace the whole disabled map (deep-merge semantics make this safe). */
  writeDisabled(map: DisabledMap): Promise<void>
  /** Remove one entry from the disabled map. */
  unsetDisabled(name: string): Promise<void>
}

/** Roots for the rename fallback. */
export interface ToggleRoots {
  dshHome: string
  agentsHome: string
}

export interface ToggleResult {
  name: string
  enabled: boolean
}

/** Rename fallback: SKILL.md <-> SKILL.md.disabled for dsh-root skills. */
async function renameFallback(roots: ToggleRoots, name: string, enabled: boolean): Promise<boolean> {
  const located = await findDiskSkill(roots.dshHome, roots.agentsHome, name)
  if (!located) return false
  // Only dsh-root skills are renamed (agents root is shared read-only).
  const inDshRoot = located.path
    .replace(/\\/g, '/')
    .startsWith(roots.dshHome.replace(/\\/g, '/'))
  if (!inDshRoot) return false
  if (enabled && located.renamedDisabled) {
    // Restore: <...>/SKILL.md.disabled -> <...>/SKILL.md.
    const livePath = located.flat
      ? join(roots.dshHome, 'skills', `${name}.md`)
      : join(roots.dshHome, 'skills', name, 'SKILL.md')
    try {
      await rename(located.path, livePath)
      return true
    } catch {
      return false
    }
  }
  if (!enabled && !located.renamedDisabled) {
    const disabledFile = located.flat
      ? join(roots.dshHome, 'skills', `${name}.md.disabled`)
      : join(roots.dshHome, 'skills', name, 'SKILL.md.disabled')
    try {
      await rename(located.path, disabledFile)
      return true
    } catch {
      return false
    }
  }
  return false
}

/** Merge the disabled map and persist it through the writer. */
export async function setEnabled(
  writer: ToggleWriter,
  roots: ToggleRoots,
  name: string,
  enabled: boolean,
  invalidate: () => void,
): Promise<ToggleResult> {
  if (enabled) {
    await writer.unsetDisabled(name)
  } else {
    const next: DisabledMap = { ...readDisabledMap({ get: () => writer.getDisabled() }) }
    next[name] = { disabledAt: Date.now() }
    await writer.writeDisabled(next)
  }
  await renameFallback(roots, name, enabled)
  invalidate()
  return { name, enabled }
}
