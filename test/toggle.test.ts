import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setEnabled, type ToggleWriter } from '../src/core/toggle.js'

function mockWriter(initial: Record<string, { disabledAt?: number }> = {}) {
  let disabled = { ...initial }
  const writer: ToggleWriter = {
    getDisabled: () => disabled,
    writeDisabled: vi.fn(async (map) => {
      disabled = { ...map }
    }),
    unsetDisabled: vi.fn(async (name) => {
      const next = { ...disabled }
      delete next[name]
      disabled = next
    }),
  }
  return { writer, get: () => disabled }
}

async function emptyRoots(): Promise<{ dshHome: string; agentsHome: string; base: string }> {
  const base = await mkdtemp(join(tmpdir(), 'skillforge-toggle-'))
  const dshHome = join(base, 'dsh')
  const agentsHome = join(base, 'agents')
  await mkdir(join(dshHome, 'skills'), { recursive: true })
  return { dshHome, agentsHome, base }
}

describe('setEnabled', () => {
  it('disable writes the whole map', async () => {
    const { writer, get } = mockWriter()
    const { dshHome, agentsHome, base } = await emptyRoots()
    try {
      const invalidate = vi.fn()
      const result = await setEnabled(writer, { dshHome, agentsHome }, 'a-b', false, invalidate)
      expect(result).toEqual({ name: 'a-b', enabled: false })
      expect(get()).toHaveProperty('a-b')
      expect(invalidate).toHaveBeenCalledOnce()
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('enable removes the entry via unset (deep-merge regression)', async () => {
    // Regression: settings update() merges recursively, so patching
    // { disabled: {} } cannot clear an existing map — enable must unset.
    const { writer, get } = mockWriter({ 'a-b': { disabledAt: 1 }, 'c-d': { disabledAt: 2 } })
    const { dshHome, agentsHome, base } = await emptyRoots()
    try {
      await setEnabled(writer, { dshHome, agentsHome }, 'a-b', true, () => {})
      expect(get()).not.toHaveProperty('a-b')
      expect(get()).toHaveProperty('c-d')
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })

  it('enable on a clean map is a no-op that still invalidates', async () => {
    const { writer, get } = mockWriter()
    const { dshHome, agentsHome, base } = await emptyRoots()
    try {
      const invalidate = vi.fn()
      await setEnabled(writer, { dshHome, agentsHome }, 'missing', true, invalidate)
      expect(get()).toEqual({})
      expect(invalidate).toHaveBeenCalledOnce()
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})
