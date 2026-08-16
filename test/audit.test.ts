import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { auditRoots, fileCheckedStore, fingerprint, kebabize } from '../src/core/audit.js'

async function tempHome(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'skillforge-audit-'))
  await mkdir(join(root, 'dsh', 'skills'), { recursive: true })
  await mkdir(join(root, 'agents', 'skills'), { recursive: true })
  return root
}

describe('kebabize', () => {
  it('converts arbitrary names', () => {
    expect(kebabize('My Skill')).toBe('my-skill')
    expect(kebabize('guizang-ppt-skill-main')).toBe('guizang-ppt-skill-main')
    expect(kebabize('  Foo  Bar ')).toBe('foo-bar')
    expect(kebabize('!!!')).toBe('')
  })
})

describe('audit fix behavior', () => {
  it('renames dir, syncs name, adds description, normalizes invocation keys, strips BOM', async () => {
    const root = await tempHome()
    const dsh = join(root, 'dsh')
    const agents = join(root, 'agents')
    try {
      await mkdir(join(dsh, 'skills', 'Bad Name'), { recursive: true })
      await writeFile(
        join(dsh, 'skills', 'Bad Name', 'SKILL.md'),
        '\uFEFF---\nname: Bad Name\ndisableModelInvocation: TRUE\nuserInvocable: false\n---\nhello',
        'utf8',
      )
      const stateDir = join(root, 'state')
      const result = await auditRoots(dsh, agents, stateDir)

      expect(result.errors).toEqual([])
      expect(result.fixed).toContain('bad-name')

      const fixed = await readFile(join(dsh, 'skills', 'bad-name', 'SKILL.md'), 'utf8')
      expect(fixed.startsWith('---\nname: bad-name')).toBe(true)
      expect(fixed).toContain('description: No description provided.')
      expect(fixed).toContain('disable-model-invocation: true')
      expect(fixed).toContain('user-invocable: false')
      expect(fixed.startsWith('\uFEFF')).toBe(false)
      expect(fixed).toContain('\nhello')

      // second run: nothing to fix, everything skipped
      const second = await auditRoots(dsh, agents, stateDir)
      expect(second.fixed).toEqual([])
      expect(second.skipped).toContain('bad-name')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fixes flat files and missing whenToUse-independent fields', async () => {
    const root = await tempHome()
    const dsh = join(root, 'dsh')
    const agents = join(root, 'agents')
    try {
      await writeFile(
        join(dsh, 'skills', 'my-skill.md'),
        '---\nname: other-name\ndescription: "Real desc"\n---\nbody',
        'utf8',
      )
      const stateDir = join(root, 'state')
      const result = await auditRoots(dsh, agents, stateDir)
      expect(result.fixed).toContain('my-skill')

      const fixed = await readFile(join(dsh, 'skills', 'my-skill.md'), 'utf8')
      expect(fixed).toContain('name: my-skill')
      expect(fixed).toContain('description: Real desc')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('reports unreadable/unsalvageable entries as errors, not crashes', async () => {
    const root = await tempHome()
    const dsh = join(root, 'dsh')
    const agents = join(root, 'agents')
    try {
      await mkdir(join(dsh, 'skills', 'empty'), { recursive: true })
      const stateDir = join(root, 'state')
      const result = await auditRoots(dsh, agents, stateDir)
      expect(result.errors).toEqual([])
      expect(result.checked.length + result.fixed.length + result.skipped.length).toBe(0)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('checked store', () => {
  it('persists fingerprints', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-store-'))
    try {
      const store = fileCheckedStore(root)
      await store.save({ a: '1', b: '2' })
      expect(await store.load()).toEqual({ a: '1', b: '2' })
      // corrupt file -> empty
      await writeFile(join(root, 'checked.json'), 'not json', 'utf8')
      expect(await store.load()).toEqual({})
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fingerprint is stable and content-sensitive', () => {
    const a = fingerprint('---\nx\n---')
    const b = fingerprint('---\nx\n---')
    const c = fingerprint('---\ny\n---')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(fingerprint('\uFEFFabc')).toBe(fingerprint('abc'))
  })
})
