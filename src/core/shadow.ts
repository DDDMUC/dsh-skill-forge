/**
 * Shadow provider: a ctx.skills provider whose candidates are placeholder
 * rows for every skill currently disabled through skillforge. The placeholder
 * wins duplicate names by an extreme low rank, carries invocation controls
 * that exclude it from every model/user surface, and swaps the description so
 * the catalog digest changes and consumers resend the filtered catalog.
 *
 * Registration follows the registry's layer semantics: a registration on the
 * host context lands in the global layer, a registration on an agent's scoped
 * context lands in that agent's layer (where preset skills live). Enabling
 * through skillforge never touches any SKILL.md file.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {
  SkillCandidate,
  SkillLookupOptions,
  SkillProvider,
  SkillProviderControl,
  SkillDefinition,
} from '@deepseek-ai/dsh-skill'

export const SHADOW_PROVIDER_NAME = 'skillforge'
export const SHADOW_RANK = -1_000_000_000

/** Disabled map shape stored in the skillforge settings namespace. */
export type DisabledMap = Record<string, { disabledAt?: number }>

/** Read the current disabled map from a settings scope. */
export function readDisabledMap(scope: { get(): unknown }): DisabledMap {
  const value = scope.get() as { disabled?: DisabledMap } | undefined
  const map = value?.disabled
  return map && typeof map === 'object' ? map : {}
}

/** Build the placeholder candidate for one disabled skill. */
export function shadowCandidate(name: string): SkillCandidate {
  return {
    name,
    description: `(disabled by dsh-skillforge)`,
    invocation: { modelInvocable: false, userInvocable: false },
    source: 'custom',
    provider: SHADOW_PROVIDER_NAME,
    rank: SHADOW_RANK,
    locator: name,
  }
}

/** Create the shadow provider against a live shadowed-names resolver. */
export function createShadowProvider(
  shadowed: () => Promise<readonly string[]> | readonly string[],
): SkillProvider {
  return {
    name: 'skillforge-shadow',
    list: async (_options: SkillLookupOptions) =>
      (await shadowed()).map((name) => shadowCandidate(name)),
    get: async (_candidate: SkillCandidate): Promise<SkillDefinition | undefined> => undefined,
  }
}

/** One registered shadow provider + its invalidation control. */
export interface ShadowRegistration {
  readonly control: SkillProviderControl | null
  invalidate(): void
}

/**
 * Register the shadow provider on a context's skills registry. The provider
 * lands in the layer of the calling context's scope (global for the host
 * context, per-agent for an agent scoped context).
 */
export function registerShadowForCtx(
  ctx: Context,
  shadowed: () => DisabledMap | readonly string[] | Promise<readonly string[]>,
): ShadowRegistration {
  let controlRef: SkillProviderControl | null = null
  ctx.skills.registerProvider((control) => {
    controlRef = control
    return createShadowProvider(async () => {
      const value = await shadowed()
      if (Array.isArray(value)) return value
      return Object.keys(value)
    })
  })
  return {
    get control() {
      return controlRef
    },
    invalidate() {
      controlRef?.invalidate()
    },
  }
}
