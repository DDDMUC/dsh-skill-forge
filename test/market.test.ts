import { describe, expect, it, vi, afterEach } from 'vitest'
import { searchSkillsSh, splitSkillShId, DEFAULT_SKILLS_SH_BASE } from '../src/install/market.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchSkillsSh', () => {
  it('parses the skills.sh response shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toBe(`${DEFAULT_SKILLS_SH_BASE}/api/search?q=ppt`)
        return {
          ok: true,
          json: async () => ({
            skills: [
              { id: 'anthropics/skills/pptx', skillId: 'pptx', name: 'pptx', installs: 202349, source: 'anthropics/skills' },
              { id: 'op7418/guizang-ppt-skill/guizang-ppt-skill', skillId: 'guizang-ppt-skill', installs: 23311, source: 'op7418/guizang-ppt-skill' },
            ],
          }),
        }
      }),
    )
    const items = await searchSkillsSh('ppt')
    expect(items).toEqual([
      { id: 'anthropics/skills/pptx', name: 'pptx', installs: 202349, source: 'anthropics/skills', market: 'skills.sh' },
      { id: 'op7418/guizang-ppt-skill/guizang-ppt-skill', name: 'guizang-ppt-skill', installs: 23311, source: 'op7418/guizang-ppt-skill', market: 'skills.sh' },
    ])
  })

  it('rejects short queries and survives malformed responses', async () => {
    expect(await searchSkillsSh('a')).toEqual([])
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ unexpected: true }) })))
    expect(await searchSkillsSh('ppt')).toEqual([])
  })

  it('propagates upstream failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 502 })),
    )
    await expect(searchSkillsSh('ppt')).rejects.toThrow(/502/)
  })
})

describe('splitSkillShId', () => {
  it('splits owner/repo/path', () => {
    expect(splitSkillShId('anthropics/skills/pptx')).toEqual({ owner: 'anthropics', repo: 'skills', path: 'pptx' })
    expect(splitSkillShId('a/b/c/d')).toEqual({ owner: 'a', repo: 'b', path: 'c/d' })
    expect(() => splitSkillShId('only-owner')).toThrow(/invalid/)
  })
})
