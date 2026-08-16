import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseZip, writeZip } from '../src/install/zip.js'
import { discoverSkillsInArchive, packSkill, stripSingleRoot } from '../src/install/skillpkg.js'
import { loadRegistry, planImport, runImport, saveRegistry } from '../src/install/installer.js'

const enc = new TextEncoder()

function archiveOf(skills: Array<{ name: string; files: Record<string, string> }>): Uint8Array {
  const entries: Array<{ name: string; data: Uint8Array }> = []
  for (const skill of skills) {
    for (const [rel, content] of Object.entries(skill.files)) {
      entries.push({ name: `${skill.name}/${rel}`, data: enc.encode(content) })
    }
  }
  return writeZip(entries)
}

describe('discoverSkillsInArchive', () => {
  it('finds bundles and flat files, skips invalid', () => {
    const zip = writeZip([
      { name: 'good-skill/SKILL.md', data: enc.encode('---\nname: good-skill\ndescription: good\n---\nbody') },
      { name: 'good-skill/asset.txt', data: enc.encode('x') },
      { name: 'flat-skill.md', data: enc.encode('---\nname: flat-skill\ndescription: flat\n---\n') },
      { name: 'no-frontmatter/SKILL.md', data: enc.encode('no frontmatter here') },
    ])
    const skills = discoverSkillsInArchive(parseZip(zip))
    const names = skills.map((skill) => skill.name).sort()
    expect(names).toEqual(['flat-skill', 'good-skill'])
    const good = skills.find((skill) => skill.name === 'good-skill')!
    expect(good.files.has('good-skill/SKILL.md')).toBe(true)
    expect(good.files.has('good-skill/asset.txt')).toBe(true)
    expect(good.flat).toBe(false)
    const flat = skills.find((skill) => skill.name === 'flat-skill')!
    expect(flat.flat).toBe(true)
  })
})

describe('packSkill', () => {
  it('packs a skill directory into a parseable archive', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-pack-'))
    try {
      const dir = join(root, 'my-skill')
      await mkdir(join(dir, 'scripts'), { recursive: true })
      await writeFile(join(dir, 'SKILL.md'), '---\nname: my-skill\ndescription: x\n---\nbody', 'utf8')
      await writeFile(join(dir, 'scripts', 'run.py'), 'print(1)', 'utf8')
      const packed = await packSkill(dir, 'my-skill')
      const zip = writeZip(packed.entries)
      const parsed = parseZip(zip)
      const names = parsed.map((entry) => entry.name).sort()
      expect(names).toEqual(['my-skill/SKILL.md', 'my-skill/scripts/run.py'])
      // Round trip: the packed archive rediscovers the skill.
      const skills = discoverSkillsInArchive(parsed)
      expect(skills.map((skill) => skill.name)).toEqual(['my-skill'])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('stripSingleRoot', () => {
  it('strips codeload-style wrapper roots', () => {
    const zip = writeZip([
      { name: 'my-repo-main/skill-a/SKILL.md', data: enc.encode('---\nname: skill-a\ndescription: x\n---\n') },
      { name: 'my-repo-main/skill-a/asset.txt', data: enc.encode('asset') },
      { name: 'my-repo-main/skill-b.md', data: enc.encode('---\nname: skill-b\ndescription: y\n---\n') },
    ])
    const stripped = stripSingleRoot(parseZip(zip))
    expect(stripped.map((entry) => entry.name).sort()).toEqual(['skill-a/SKILL.md', 'skill-a/asset.txt', 'skill-b.md'])
    const skills = discoverSkillsInArchive(stripped)
    expect(skills.map((skill) => skill.name).sort()).toEqual(['skill-a', 'skill-b'])
  })

  it('leaves already-flat archives untouched', () => {
    const zip = writeZip([
      { name: 'skill-a/SKILL.md', data: enc.encode('---\nname: skill-a\ndescription: x\n---\n') },
      { name: 'top-level.txt', data: enc.encode('x') },
    ])
    const stripped = stripSingleRoot(parseZip(zip))
    expect(stripped.some((entry) => entry.name === 'top-level.txt')).toBe(true)
    expect(stripped.some((entry) => entry.name === 'skill-a/SKILL.md')).toBe(true)
  })
})

describe('root-level repo skill discovery (via scanGithubRepo internals)', () => {
  it('detects a repo whose root is the skill after stripping the wrapper', () => {
    const zip = writeZip([
      { name: 'ppt-skill-main/SKILL.md', data: enc.encode('---\nname: guizang-ppt-skill\ndescription: x\n---\nbody') },
      { name: 'ppt-skill-main/assets/logo.png', data: enc.encode('png') },
      { name: 'ppt-skill-main/.github/workflows/ci.yml', data: enc.encode('ci') },
    ])
    const stripped = stripSingleRoot(parseZip(zip))
    const skills = discoverSkillsInArchive(stripped)
    expect(skills.length).toBe(0) // top-level SKILL.md is not a flat/bundle shape
    // The root-level detection path is exercised through the market module;
    // here we assert the stripping contract only.
    expect(stripped.some((entry) => entry.name === 'SKILL.md')).toBe(true)
    expect(stripped.some((entry) => entry.name === 'assets/logo.png')).toBe(true)
  })
})

describe('installer', () => {
  it('plans, imports, records provenance, and detects conflicts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-install-'))
    try {
      const dshHome = join(root, 'dsh')
      const agentsHome = join(root, 'agents')
      const stateDir = join(root, 'state')
      await mkdir(join(dshHome, 'skills'), { recursive: true })
      const target = { dshHome, agentsHome, stateDir }

      const zip = archiveOf([
        {
          name: 'imported-skill',
          files: { 'SKILL.md': '---\nname: imported-skill\ndescription: from archive\n---\nbody' },
        },
        {
          name: 'dupe-skill',
          files: { 'SKILL.md': '---\nname: dupe-skill\ndescription: existing\n---\n' },
        },
      ])
      // Pre-existing skill.
      await mkdir(join(dshHome, 'skills', 'dupe-skill'), { recursive: true })
      await writeFile(join(dshHome, 'skills', 'dupe-skill', 'SKILL.md'), '---\nname: dupe-skill\ndescription: existing\n---\n', 'utf8')

      const plan = await planImport(target, { kind: 'archive', data: zip })
      expect(plan.pending).toEqual(['imported-skill'])
      expect(plan.conflicts).toEqual(['dupe-skill'])

      const result = await runImport(target, { kind: 'archive', data: zip }, 'skip', false)
      expect(result.imported).toEqual(['imported-skill'])
      expect(result.skipped).toEqual(['dupe-skill'])

      const installed = await readFile(join(dshHome, 'skills', 'imported-skill', 'SKILL.md'), 'utf8')
      expect(installed).toContain('from archive')

      const registry = await loadRegistry(stateDir)
      expect(registry['imported-skill'].kind).toBe('archive')

      // Overwrite policy replaces both the pre-existing and the just-installed.
      const overwrite = await runImport(target, { kind: 'archive', data: zip }, 'overwrite', false)
      expect(overwrite.imported.sort()).toEqual(['dupe-skill', 'imported-skill'])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('supports directory imports with dry-run', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-install2-'))
    try {
      const dshHome = join(root, 'dsh')
      const agentsHome = join(root, 'agents')
      const stateDir = join(root, 'state')
      await mkdir(join(dshHome, 'skills'), { recursive: true })
      const src = join(root, 'collection')
      await mkdir(join(src, 'dir-skill'), { recursive: true })
      await writeFile(join(src, 'dir-skill', 'SKILL.md'), '---\nname: dir-skill\ndescription: d\n---\nb', 'utf8')
      await writeFile(join(src, 'other.txt'), 'ignore me', 'utf8')

      const dry = await runImport({ dshHome, agentsHome, stateDir }, { kind: 'dir', path: src }, 'skip', true)
      expect(dry.pending).toEqual(['dir-skill'])
      expect(dry.imported).toEqual([])

      const real = await runImport({ dshHome, agentsHome, stateDir }, { kind: 'dir', path: src }, 'skip', false)
      expect(real.imported).toEqual(['dir-skill'])
      const raw = await readFile(join(dshHome, 'skills', 'dir-skill', 'SKILL.md'), 'utf8')
      expect(raw).toContain('name: dir-skill')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('detects conflicts across BOTH user roots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-install3-'))
    try {
      const dshHome = join(root, 'dsh')
      const agentsHome = join(root, 'agents')
      const stateDir = join(root, 'state')
      await mkdir(join(agentsHome, 'skills'), { recursive: true })
      await mkdir(join(agentsHome, 'skills', 'agents-skill'), { recursive: true })
      await writeFile(
        join(agentsHome, 'skills', 'agents-skill', 'SKILL.md'),
        '---\nname: agents-skill\ndescription: in agents root\n---\n',
        'utf8',
      )
      const zip = archiveOf([
        {
          name: 'agents-skill',
          files: { 'SKILL.md': '---\nname: agents-skill\ndescription: in archive\n---\n' },
        },
      ])
      const plan = await planImport({ dshHome, agentsHome, stateDir }, { kind: 'archive', data: zip })
      expect(plan.conflicts).toEqual(['agents-skill'])
      expect(plan.pending).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('registry persistence survives reload', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skillforge-reg-'))
    try {
      await saveRegistry(root, { a: { kind: 'archive', location: 'x', installedAt: 1 } })
      const loaded = await loadRegistry(root)
      expect(loaded.a).toEqual({ kind: 'archive', location: 'x', installedAt: 1 })
      await writeFile(join(root, 'registry.json'), 'corrupt', 'utf8')
      expect(await loadRegistry(root)).toEqual({})
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
