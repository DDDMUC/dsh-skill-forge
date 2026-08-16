/**
 * Skill groups: user-defined display groupings stored in the plugin's own
 * config (~/.dsh/skillforge/groups.json). Groups never touch skill files.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SkillGroup } from '../protocol.js'

export interface GroupsFile {
  groups: SkillGroup[]
}

export async function loadGroups(stateDir: string): Promise<GroupsFile> {
  try {
    const raw = await readFile(join(stateDir, 'groups.json'), 'utf8')
    const parsed = JSON.parse(raw) as GroupsFile
    if (parsed && Array.isArray(parsed.groups)) return parsed
    return { groups: [] }
  } catch {
    return { groups: [] }
  }
}

export async function saveGroups(stateDir: string, file: GroupsFile): Promise<void> {
  await mkdir(stateDir, { recursive: true })
  await writeFile(join(stateDir, 'groups.json'), JSON.stringify(file, null, 2), 'utf8')
}

/** Apply one group mutation. */
export async function mutateGroups(
  stateDir: string,
  op: 'create' | 'rename' | 'delete' | 'setMembers',
  id?: string,
  name?: string,
  members?: string[],
): Promise<GroupsFile> {
  const file = await loadGroups(stateDir)
  switch (op) {
    case 'create': {
      const groupName = name?.trim()
      if (!groupName) throw new Error('group name is required')
      const existing = file.groups.find((group) => group.name === groupName)
      if (existing) throw new Error(`group "${groupName}" already exists`)
      file.groups.push({ id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: groupName, members: [] })
      break
    }
    case 'rename': {
      const group = file.groups.find((entry) => entry.id === id)
      if (!group) throw new Error('group not found')
      const next = name?.trim()
      if (!next) throw new Error('group name is required')
      group.name = next
      break
    }
    case 'delete':
      file.groups = file.groups.filter((entry) => entry.id !== id)
      break
    case 'setMembers': {
      const group = file.groups.find((entry) => entry.id === id)
      if (!group) throw new Error('group not found')
      group.members = Array.from(new Set(members ?? []))
      break
    }
  }
  await saveGroups(stateDir, file)
  return file
}
