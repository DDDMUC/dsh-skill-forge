/**
 * dsh-skillforge browser half: registers the settings.section entry and the
 * locale namespace for the skill management panel.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { NS, en, zh } from './locales.js'
import { SkillforgeSection } from './Section.js'

export const inject = ['slots', 'locale']

export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }))
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'skillforge',
        order: 20,
        label: () => t('nav'),
        locale: NS,
      },
      SkillforgeSection,
    ),
  )
}
