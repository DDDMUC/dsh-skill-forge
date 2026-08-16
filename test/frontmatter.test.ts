import { describe, expect, it } from 'vitest'
import {
  parseFrontmatter,
  serializeFrontmatter,
  buildSkillDoc,
  stripBom,
  parseBoolean,
  isSkillName,
} from '../src/core/frontmatter.js'

describe('parseFrontmatter', () => {
  it('parses scalar fields and strips quotes', () => {
    const doc = '---\nname: foo-bar\ndescription: "A skill"\nwhenToUse: \'when needed\'\n---\nbody text'
    const parsed = parseFrontmatter(doc)
    expect(parsed).not.toBeNull()
    expect(parsed!.fm.name).toBe('foo-bar')
    expect(parsed!.fm.description).toBe('A skill')
    expect(parsed!.fm.whenToUse).toBe('when needed')
    expect(parsed!.body).toBe('body text')
  })

  it('parses invocation booleans leniently', () => {
    const doc = '---\nname: x\ndescription: y\ndisable-model-invocation: TRUE\nuser-invocable: no\n---\n'
    const parsed = parseFrontmatter(doc)
    expect(parsed!.fm.disableModelInvocation).toBe(true)
    expect(parsed!.fm.userInvocable).toBe(false)
  })

  it('preserves unknown lines verbatim', () => {
    const doc = '---\nname: x\ndescription: y\nlicense: MIT\nmetadata:\n  a: 1\n---\n'
    const parsed = parseFrontmatter(doc)
    expect(parsed!.fm.extra).toEqual(['license: MIT', 'metadata:', '  a: 1'])
  })

  it('strips UTF-8 BOM', () => {
    const doc = '\uFEFF---\nname: x\ndescription: y\n---\n'
    const parsed = parseFrontmatter(doc)
    expect(parsed).not.toBeNull()
    expect(parsed!.fm.name).toBe('x')
  })

  it('returns null without frontmatter', () => {
    expect(parseFrontmatter('just text')).toBeNull()
    expect(parseFrontmatter('---\nunterminated')).toBeNull()
  })
})

describe('serializeFrontmatter / buildSkillDoc', () => {
  it('rebuilds canonical order with extra lines preserved', () => {
    const fm = {
      name: 'a-b',
      description: 'd',
      whenToUse: 'w',
      disableModelInvocation: true,
      userInvocable: false,
      extra: ['license: MIT'],
    }
    const doc = buildSkillDoc(fm, 'body')
    expect(doc).toBe('---\nname: a-b\ndescription: d\nwhenToUse: w\ndisable-model-invocation: true\nuser-invocable: false\nlicense: MIT\n---\n\nbody\n')
    const round = parseFrontmatter(doc)
    expect(round!.fm.disableModelInvocation).toBe(true)
    expect(round!.fm.userInvocable).toBe(false)
    expect(round!.fm.extra).toEqual(['license: MIT'])
    expect(round!.body).toBe('body')
  })
})

describe('helpers', () => {
  it('stripBom', () => {
    expect(stripBom('\uFEFFabc')).toBe('abc')
    expect(stripBom('abc')).toBe('abc')
  })

  it('parseBoolean', () => {
    expect(parseBoolean('TRUE')).toBe(true)
    expect(parseBoolean('1')).toBe(true)
    expect(parseBoolean('on')).toBe(true)
    expect(parseBoolean('yes')).toBe(true)
    expect(parseBoolean('false')).toBe(false)
    expect(parseBoolean('0')).toBe(false)
    expect(parseBoolean('off')).toBe(false)
    expect(parseBoolean('no')).toBe(false)
    expect(parseBoolean('maybe')).toBeUndefined()
  })

  it('isSkillName', () => {
    expect(isSkillName('article-writing')).toBe(true)
    expect(isSkillName('a')).toBe(true)
    expect(isSkillName('a-b-c')).toBe(true)
    expect(isSkillName('A-b')).toBe(false)
    expect(isSkillName('a_b')).toBe(false)
    expect(isSkillName('')).toBe(false)
    expect(isSkillName('-a')).toBe(false)
  })
})
