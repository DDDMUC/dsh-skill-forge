import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadGroups, mutateGroups } from '../src/core/groups.js'
import { moveSkill, type MoveRoots } from '../src/core/move.js'
import { createSkill } from '../src/core/crud.js'

describe('groups', () => {
  it('create / rename / setMembers / delete lifecycle', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-groups-'))
    try {
      const created = await mutateGroups(root, 'create', undefined, '写作')
      expect(created.groups).toHaveLength(1)
      const id = created.groups[0].id

      const renamed = await mutateGroups(root, 'rename', id, '写作与编辑')
      expect(renamed.groups[0].name).toBe('写作与编辑')

      const members = await mutateGroups(root, 'setMembers', id, undefined, ['a-b', 'c-d', 'a-b'])
      expect(members.groups[0].members).toEqual(['a-b', 'c-d'])

      await expect(mutateGroups(root, 'create', undefined, '写作与编辑')).rejects.toThrow('already exists')

      const deleted = await mutateGroups(root, 'delete', id)
      expect(deleted.groups).toHaveLength(0)
      expect(await loadGroups(root)).toEqual({ groups: [] })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('recovers from corrupt files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-groups2-'))
    try {
      await writeFile(join(root, 'groups.json'), 'corrupt', 'utf8')
      expect(await loadGroups(root)).toEqual({ groups: [] })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('moveSkill', () => {
  async function makeRoots(): Promise<{ roots: MoveRoots; base: string }> {
    const base = await mkdtemp(join(tmpdir(), 'skillforge-move-'))
    const dshHome = join(base, 'dsh')
    const agentsHome = join(base, 'agents')
    const stateDir = join(base, 'state')
    const workspacePath = join(base, 'project-a')
    await mkdir(join(dshHome, 'skills'), { recursive: true })
    await mkdir(join(workspacePath, '.dsh', 'skills'), { recursive: true })
    await createSkill({ dshHome, agentsHome }, { name: 'movable', description: 'x', content: 'body' })
    return {
      roots: {
        dshHome,
        agentsHome,
        stateDir,
        workspaces: () => [{ id: 'ws-1', title: 'project-a', path: workspacePath }],
      },
      base,
    }
  }

  it('moves a skill into a workspace and back', async () => {
    const { roots, base } = await makeRoots()
    try {
      const moved = await moveSkill(roots, { name: 'movable', to: 'workspace', workspaceId: 'ws-1' })
      expect(moved.copied).toBe(false)
      const content = await readFile(join(base, 'project-a', '.dsh', 'skills', 'movable', 'SKILL.md'), 'utf8')
      expect(content).toContain('name: movable')
      await expect(readFile(join(base, 'dsh', 'skills', 'movable', 'SKILL.md'), 'utf8')).rejects.toThrow()

      await moveSkill(roots, { name: 'movable', to: 'user-dsh' })
      const back = await readFile(join(base, 'dsh', 'skills', 'movable', 'SKILL.md'), 'utf8')
      expect(back).toContain('name: movable')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('copies keep the source intact', async () => {
    const { roots, base } = await makeRoots()
    try {
      await moveSkill(roots, { name: 'movable', to: 'workspace', workspaceId: 'ws-1', copy: true })
      await expect(readFile(join(base, 'dsh', 'skills', 'movable', 'SKILL.md'), 'utf8')).resolves.toContain('name: movable')
      await expect(readFile(join(base, 'project-a', '.dsh', 'skills', 'movable', 'SKILL.md'), 'utf8')).resolves.toContain('name: movable')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('rejects unknown workspaces and the read-only agents root', async () => {
    const { roots, base } = await makeRoots()
    try {
      await expect(moveSkill(roots, { name: 'movable', to: 'workspace', workspaceId: 'nope' })).rejects.toThrow('workspace not found')
      await expect(moveSkill(roots, { name: 'movable', to: 'user-agents' })).rejects.toThrow('read-only')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})
