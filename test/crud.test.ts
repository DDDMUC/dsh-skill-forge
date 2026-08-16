import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createSkill,
  updateSkill,
  renameSkill,
  deleteSkill,
  readSkillForEdit,
  type CrudRoots,
} from '../src/core/crud.js'

async function tempRoots(): Promise<{ roots: CrudRoots; base: string }> {
  const base = await mkdtemp(join(tmpdir(), 'skillforge-crud-'))
  await mkdir(join(base, 'dsh', 'skills'), { recursive: true })
  await mkdir(join(base, 'agents', 'skills'), { recursive: true })
  return { roots: { dshHome: join(base, 'dsh'), agentsHome: join(base, 'agents') }, base }
}

describe('createSkill', () => {
  it('creates a kebab bundle with canonical frontmatter', async () => {
    const { roots, base } = await tempRoots()
    try {
      const created = await createSkill(roots, {
        name: 'my-skill',
        description: 'Does things',
        whenToUse: 'when needed',
        content: 'body here',
      })
      expect(created.path).toContain(join('dsh', 'skills', 'my-skill', 'SKILL.md'))
      const raw = await readFile(created.path, 'utf8')
      expect(raw).toContain('name: my-skill')
      expect(raw).toContain('description: Does things')
      expect(raw).toContain('whenToUse: when needed')
      expect(raw).toContain('body here')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('rejects invalid names and duplicates', async () => {
    const { roots, base } = await tempRoots()
    try {
      await expect(createSkill(roots, { name: 'Bad Name', description: 'x' })).rejects.toThrow('kebab')
      await expect(createSkill(roots, { name: 'a-b', description: '' })).rejects.toThrow('description')
      await createSkill(roots, { name: 'a-b', description: 'x' })
      await expect(createSkill(roots, { name: 'a-b', description: 'x' })).rejects.toThrow('already exists')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})

describe('updateSkill', () => {
  it('updates fields and preserves unknown frontmatter lines', async () => {
    const { roots, base } = await tempRoots()
    try {
      await createSkill(roots, { name: 'a-b', description: 'old', content: 'OLD CONTENT' })
      const file = join(base, 'dsh', 'skills', 'a-b', 'SKILL.md')
      await writeFile(
        file,
        '---\nname: a-b\ndescription: old\nlicense: MIT\n---\nOLD CONTENT',
        'utf8',
      )
      await updateSkill(roots, { name: 'a-b', description: 'new desc', content: 'new body' })
      const raw = await readFile(file, 'utf8')
      expect(raw).toContain('description: new desc')
      expect(raw).toContain('license: MIT')
      expect(raw).toContain('new body')
      expect(raw).not.toContain('OLD CONTENT')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})

describe('renameSkill', () => {
  it('moves the bundle and syncs frontmatter name', async () => {
    const { roots, base } = await tempRoots()
    try {
      await createSkill(roots, { name: 'old-name', description: 'x', content: 'body' })
      const result = await renameSkill(roots, { name: 'old-name', newName: 'new-name' })
      expect(result.path).toContain(join('dsh', 'skills', 'new-name', 'SKILL.md'))
      await expect(stat(join(base, 'dsh', 'skills', 'old-name'))).rejects.toThrow()
      const raw = await readFile(result.path, 'utf8')
      expect(raw).toContain('name: new-name')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('rejects collisions and invalid new names', async () => {
    const { roots, base } = await tempRoots()
    try {
      await createSkill(roots, { name: 'a-b', description: 'x' })
      await createSkill(roots, { name: 'c-d', description: 'x' })
      await expect(renameSkill(roots, { name: 'a-b', newName: 'c-d' })).rejects.toThrow('already exists')
      await expect(renameSkill(roots, { name: 'a-b', newName: 'Bad Name' })).rejects.toThrow('kebab')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})

describe('deleteSkill', () => {
  it('deletes bundles and flat files', async () => {
    const { roots, base } = await tempRoots()
    try {
      await createSkill(roots, { name: 'a-b', description: 'x' })
      await writeFile(join(base, 'dsh', 'skills', 'flat-skill.md'), '---\nname: flat-skill\ndescription: x\n---\n', 'utf8')
      await deleteSkill(roots, 'a-b')
      await deleteSkill(roots, 'flat-skill')
      await expect(stat(join(base, 'dsh', 'skills', 'a-b'))).rejects.toThrow()
      await expect(stat(join(base, 'dsh', 'skills', 'flat-skill.md'))).rejects.toThrow()
      await expect(deleteSkill(roots, 'missing')).rejects.toThrow('not found')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})

describe('readSkillForEdit', () => {
  it('returns parsed fields for the editor', async () => {
    const { roots, base } = await tempRoots()
    try {
      await createSkill(roots, { name: 'a-b', description: 'desc', whenToUse: 'w', content: 'body' })
      const edit = await readSkillForEdit(roots, 'a-b')
      expect(edit.description).toBe('desc')
      expect(edit.whenToUse).toBe('w')
      expect(edit.content).toBe('body')
      expect(edit.flat).toBe(false)
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})

describe('agents-root write protection', () => {
  it('refuses delete/rename/update on ~/.agents/skills skills', async () => {
    const { roots, base } = await tempRoots()
    try {
      await mkdir(join(base, 'agents', 'skills', 'shared-skill'), { recursive: true })
      await writeFile(
        join(base, 'agents', 'skills', 'shared-skill', 'SKILL.md'),
        '---\nname: shared-skill\ndescription: shared\n---\n',
        'utf8',
      )
      await expect(deleteSkill(roots, 'shared-skill')).rejects.toThrow('read-only')
      await expect(renameSkill(roots, { name: 'shared-skill', newName: 'other-name' })).rejects.toThrow('read-only')
      await expect(updateSkill(roots, { name: 'shared-skill', description: 'x' })).rejects.toThrow('read-only')
      // File untouched.
      const raw = await readFile(join(base, 'agents', 'skills', 'shared-skill', 'SKILL.md'), 'utf8')
      expect(raw).toContain('name: shared-skill')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})
