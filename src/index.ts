/**
 * dsh-skillforge host half: registers the skillforge settings namespace, the
 * shadow provider (global layer + every agent layer), and the same-origin API
 * routes.
 *
 * Runtime-import policy: only @deepseek-ai/schemastery is imported as a value
 * (a side-effect-free schema library). Every other @deepseek-ai import is
 * type-only — see core/catalog.ts for why dual module instances are fatal.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { registerRoutes } from './routes.js'
import { resolveDshHome } from './core/catalog.js'
import {
  readDisabledMap,
  registerShadowForCtx,
  type ShadowRegistration,
} from './core/shadow.js'
import { sessionShadowedNames, resolveAgentsHome } from './core/conversation.js'
import type { ToggleWriter } from './core/toggle.js'
import { McpManager } from './mcp/manager.js'
import { registerModelTools } from './tools.js'

export const name = 'skillforge'
export const inject = ['skills', 'settings', 'webServer', 'sessions', 'loader']

/** Plugin configuration (schema defaults only; all behavior is runtime state). */
export interface Config {
  /**
   * Whether the shadow provider may ever be bypassed. Kept for future
   * mechanisms; the shadow provider is always the primary toggle path.
   */
  useShadowProvider: boolean
}

export const Config = z.object({
  useShadowProvider: z.boolean().default(true),
})

export function apply(ctx: Context, config: Config): void {
  const ns = 'skillforge' as SettingsNamespace
  const scope = ctx.settings.register(
    ns,
    z.object({
      disabled: z.dict(z.any()).default({}),
      conversation: z.dict(z.any()).default({}),
    }),
  )
  const disabled = () => readDisabledMap(scope)

  const registrations: ShadowRegistration[] = []
  const invalidateAll = () => {
    for (const registration of registrations) registration.invalidate()
  }

  // Global-layer registration must never take the plugin (or the composition)
  // down; a failure only means shadowing is unavailable.
  try {
    registrations.push(registerShadowForCtx(ctx, disabled))
  } catch (error) {
    ctx.logger.warn('[skillforge] global shadow provider registration failed:', error)
  }

  // Per-agent registration is best-effort and MUST NEVER throw: the listener
  // runs inside the agent creation/resume flow, and an uncaught error there
  // breaks session restore and workspace flows. Agents whose scoped context
  // does not resolve `skills` (e.g. presets without skill tooling) are simply
  // skipped — shadowing degrades, nothing else does.
  const dshHome = resolveDshHome()
  const agentsHome = resolveAgentsHome()
  const stateDir = join(dshHome, 'skillforge')
  const registeredAgents = new WeakMap<object, boolean>()
  ctx.on('agent/created', ({ agent }) => {
    try {
      if (registeredAgents.has(agent)) return
      registeredAgents.set(agent, true)
      const sessionId = (agent as unknown as { session?: { id: string } }).session?.id ?? ''
      registrations.push(
        registerShadowForCtx(agent.ctx, () =>
          sessionShadowedNames(scope, dshHome, agentsHome, sessionId),
        ),
      )
    } catch (error) {
      ctx.logger.warn('[skillforge] agent shadow provider registration skipped:', error)
    }
  })

  const writer: ToggleWriter = {
    getDisabled: () => readDisabledMap(scope),
    writeDisabled: (map) => ctx.settings.update(ns, { disabled: map }),
    unsetDisabled: (name) =>
      ctx.settings.mutate(ns, [{ op: 'unset', path: ['disabled', name] }]),
  }

  const mcp = new McpManager(ctx, stateDir)
  ctx.effect(() => {
    void mcp.start().catch((error) => {
      ctx.logger.warn('[skillforge] MCP startup failed:', error)
    })
    return () => {
      void mcp.dispose().catch(() => {
        /* teardown is best-effort */
      })
    }
  })

  // Model tools (best-effort; the tools service may be absent).
  registerModelTools(ctx as never, () => readDisabledMap(scope))

  void config
  registerRoutes(
    ctx,
    writer,
    { invalidate: invalidateAll },
    { dshHome, agentsHome, stateDir },
    mcp,
    {
      get: () => scope.get(),
      update: (patch) => scope.update(patch),
      mutate: (ops) => ctx.settings.mutate(ns, ops),
    },
  )
}
