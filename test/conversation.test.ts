import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readConversation, sessionShadowedNames } from '../src/core/conversation.js'

function mockScope(config: Record<string, unknown> = {}) {
  return { get: () => config }
}

describe('readConversation', () => {
  it('reads the conversation config from a settings scope', () => {
    expect(readConversation(mockScope())).toEqual({})
    expect(
      readConversation(mockScope({ conversation: { 's1': { skills: ['a', 'b'] } } })),
    ).toEqual({ s1: { skills: ['a', 'b'] } })
  })
})

describe('sessionShadowedNames', () => {
  async function roots(): Promise<{ dshHome: string; agentsHome: string; base: string }> {
    const base = await mkdtemp(join(tmpdir(), 'skillforge-conv-'))
    const dshHome = join(base, 'dsh')
    const agentsHome = join(base, 'agents')
    await mkdir(join(dshHome, 'skills'), { recursive: true })
    for (const name of ['alpha', 'beta', 'gamma']) {
      await mkdir(join(dshHome, 'skills', name), { recursive: true })
      await writeFile(
        join(dshHome, 'skills', name, 'SKILL.md'),
        `---\nname: ${name}\ndescription: skill ${name}\n---\n`,
        'utf8',
      )
    }
    return { dshHome, agentsHome, base }
  }

  it('no selection -> only globally disabled names', async () => {
    const { dshHome, agentsHome, base } = await roots()
    try {
      const scope = mockScope({ disabled: { alpha: { disabledAt: 1 } } })
      const names = await sessionShadowedNames(scope, dshHome, agentsHome, 's1')
      expect(names).toEqual(['alpha'])
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('selection -> disabled + unselected skills are shadowed', async () => {
    const { dshHome, agentsHome, base } = await roots()
    try {
      const scope = mockScope({
        disabled: { alpha: { disabledAt: 1 } },
        conversation: { s1: { skills: ['beta'] } },
      })
      const names = await sessionShadowedNames(scope, dshHome, agentsHome, 's1')
      expect(names.sort()).toEqual(['alpha', 'gamma'])
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('empty selection means default (all loaded)', async () => {
    const { dshHome, agentsHome, base } = await roots()
    try {
      const scope = mockScope({ conversation: { s1: { skills: [] } } })
      const names = await sessionShadowedNames(scope, dshHome, agentsHome, 's1')
      expect(names).toEqual([])
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('other sessions are unaffected', async () => {
    const { dshHome, agentsHome, base } = await roots()
    try {
      const scope = mockScope({ conversation: { s1: { skills: ['beta'] } } })
      const names = await sessionShadowedNames(scope, dshHome, agentsHome, 's2')
      expect(names).toEqual([])
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})
