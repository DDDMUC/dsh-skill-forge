import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setEnabled, type ToggleWriter } from '../src/core/toggle.js'
import { findDiskSkill, scanUserRoots } from '../src/core/catalog.js'

function mockWriter(initial: Record<string, { disabledAt?: number }> = {}) {
  let disabled = { ...initial }
  const writer: ToggleWriter = {
    getDisabled: () => disabled,
    writeDisabled: async (map) => {
      disabled = { ...map }
    },
    unsetDisabled: async (name) => {
      const next = { ...disabled }
      delete next[name]
      disabled = next
    },
  }
  return { writer, get: () => disabled }
}

async function tempRoots(): Promise<{ dshHome: string; agentsHome: string; base: string }> {
  const base = await mkdtemp(join(tmpdir(), 'skillforge-rename-'))
  const dshHome = join(base, 'dsh')
  const agentsHome = join(base, 'agents')
  await mkdir(join(dshHome, 'skills', 'bundle-skill'), { recursive: true })
  await writeFile(
    join(dshHome, 'skills', 'bundle-skill', 'SKILL.md'),
    '---\nname: bundle-skill\ndescription: x\n---\nbody',
    'utf8',
  )
  await writeFile(join(dshHome, 'skills', 'flat-skill.md'), '---\nname: flat-skill\ndescription: x\n---\n', 'utf8')
  return { dshHome, agentsHome, base }
}

describe('rename fallback toggle', () => {
  it('disables dsh-root skills by renaming SKILL.md -> SKILL.md.disabled', async () => {
    const { dshHome, agentsHome, base } = await tempRoots()
    try {
      const { writer } = mockWriter()
      await setEnabled(writer, { dshHome, agentsHome }, 'bundle-skill', false, () => {})
      await expect(readFile(join(dshHome, 'skills', 'bundle-skill', 'SKILL.md'), 'utf8')).rejects.toThrow()
      const disabled = await readFile(join(dshHome, 'skills', 'bundle-skill', 'SKILL.md.disabled'), 'utf8')
      expect(disabled).toContain('name: bundle-skill')

      // flat files too
      await setEnabled(writer, { dshHome, agentsHome }, 'flat-skill', false, () => {})
      await expect(readFile(join(dshHome, 'skills', 'flat-skill.md'), 'utf8')).rejects.toThrow()
      await expect(readFile(join(dshHome, 'skills', 'flat-skill.md.disabled'), 'utf8')).resolves.toContain('name: flat-skill')

      // catalog sees both as disabled
      const scan = await scanUserRoots(dshHome, agentsHome)
      const names = new Map(scan.skills.map((skill) => [skill.name, skill]))
      expect(names.get('bundle-skill')?.renamedDisabled).toBe(true)
      expect(names.get('flat-skill')?.renamedDisabled).toBe(true)
      expect(scan.diagnostics).toEqual([])
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('enables renamed skills back', async () => {
    const { dshHome, agentsHome, base } = await tempRoots()
    try {
      const { writer } = mockWriter()
      await setEnabled(writer, { dshHome, agentsHome }, 'bundle-skill', false, () => {})
      await setEnabled(writer, { dshHome, agentsHome }, 'bundle-skill', true, () => {})
      const live = await readFile(join(dshHome, 'skills', 'bundle-skill', 'SKILL.md'), 'utf8')
      expect(live).toContain('name: bundle-skill')
      await expect(readFile(join(dshHome, 'skills', 'bundle-skill', 'SKILL.md.disabled'), 'utf8')).rejects.toThrow()
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('agents-root skills are shadow-only (never renamed)', async () => {
    const { dshHome, agentsHome, base } = await tempRoots()
    try {
      await mkdir(join(agentsHome, 'skills', 'shared'), { recursive: true })
      await writeFile(join(agentsHome, 'skills', 'shared', 'SKILL.md'), '---\nname: shared\ndescription: x\n---\n', 'utf8')
      const { writer, get } = mockWriter()
      await setEnabled(writer, { dshHome, agentsHome }, 'shared', false, () => {})
      // File untouched, map written.
      await expect(readFile(join(agentsHome, 'skills', 'shared', 'SKILL.md'), 'utf8')).resolves.toContain('name: shared')
      expect(get()).toHaveProperty('shared')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('findDiskSkill resolves renamed skills', async () => {
    const { dshHome, agentsHome, base } = await tempRoots()
    try {
      await rename(join(dshHome, 'skills', 'bundle-skill', 'SKILL.md'), join(dshHome, 'skills', 'bundle-skill', 'SKILL.md.disabled'))
      const located = await findDiskSkill(dshHome, agentsHome, 'bundle-skill')
      expect(located?.renamedDisabled).toBe(true)
      expect(located?.path.endsWith('SKILL.md.disabled')).toBe(true)
      // External rename (not via skillforge) is also detected.
      const flat = await findDiskSkill(dshHome, agentsHome, 'flat-skill')
      expect(flat?.renamedDisabled).toBe(false)
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})
