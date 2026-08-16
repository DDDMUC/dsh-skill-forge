/**
 * Per-conversation skill loading: a conversation's selection (stored in the
 * skillforge settings namespace as `conversation.<sessionId>.skills`) limits
 * which skills that agent's catalog carries. Skills outside the selection are
 * shadowed for that agent only; conversations without a selection load
 * everything (dsh default).
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { scanUserRoots } from './catalog.js'
import { readDisabledMap, type DisabledMap } from './shadow.js'

/** Stored per-session selection shape. */
export interface ConversationSelection {
  skills?: string[]
  updatedAt?: number
}

/** conversation config: sessionId -> selection. */
export type ConversationConfig = Record<string, ConversationSelection>

/** Read the conversation config from a settings scope. */
export function readConversation(scope: { get(): unknown }): ConversationConfig {
  const value = scope.get() as { conversation?: ConversationConfig } | undefined
  const config = value?.conversation
  return config && typeof config === 'object' ? config : {}
}

/** Effective shadowed names for one session: global disabled + unselected. */
export async function sessionShadowedNames(
  scope: { get(): unknown },
  dshHome: string,
  agentsHome: string,
  sessionId: string,
): Promise<string[]> {
  const disabled = Object.keys(readDisabledMap(scope))
  const selection = readConversation(scope)[sessionId]?.skills
  if (!selection || selection.length === 0) return disabled
  const selected = new Set(selection)
  const { skills } = await scanUserRoots(dshHome, agentsHome)
  const unselected = skills.map((skill) => skill.name).filter((name) => !selected.has(name))
  return [...new Set([...disabled, ...unselected])]
}

/** Resolve the agents home (shared with catalog). */
export function resolveAgentsHome(): string {
  return process.env.DSH_AGENTS_HOME || join(homedir(), '.agents')
}

export type { DisabledMap }
