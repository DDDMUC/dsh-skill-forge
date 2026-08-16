/**
 * Model tools: let the agent search/install skills and list/toggle them from
 * the conversation. ToolDefinitions are hand-built plain objects (the runtime
 * only needs name/description/parameters/output/execute — no defineTool
 * import, keeping the zero-dsh-runtime-dependency rule intact).
 */
import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parseFrontmatter, isSkillName } from './core/frontmatter.js'
import { resolveDshHome } from './core/catalog.js'
import { installOneSkill, skillExists, type ImportTarget } from './install/installer.js'
import { searchSkillsSh, fetchSkillShSkill } from './install/market.js'
import type { DisabledMap } from './core/shadow.js'
import { setEnabled, type ToggleWriter } from './core/toggle.js'

/** Minimal structural type of what ctx.tools.register accepts. */
export interface ToolDefinitionLike {
  name: string
  description: string
  parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  output: {
    schema: unknown
    render(args: Record<string, unknown>, value: unknown): Array<{ type: 'text'; text: string }>
  }
  execute(args: Record<string, unknown>): Promise<unknown>
}

/** Build a text-rendering tool with hand-rolled argument checks. */
function makeTool(
  name: string,
  description: string,
  properties: Record<string, { type: string; description: string }>,
  required: string[],
  execute: (args: Record<string, unknown>) => Promise<unknown>,
): ToolDefinitionLike {
  return {
    name,
    description,
    parameters: { type: 'object', properties, required },
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [
        { type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
      ],
    },
    execute: async (args) => {
      for (const key of required) {
        if (args[key] === undefined) throw new Error(`missing argument "${key}"`)
      }
      return execute(args)
    },
  }
}

/** Scan the user roots and return lightweight skill rows. */
async function scanRows(
  dshHome: string,
  agentsHome: string,
  disabled: DisabledMap,
): Promise<Array<{ name: string; description: string; source: string; enabled: boolean }>> {
  const rows: Array<{ name: string; description: string; source: string; enabled: boolean }> = []
  for (const root of [
    { path: join(dshHome, 'skills'), source: 'user-dsh' },
    { path: join(agentsHome, 'skills'), source: 'user-agents' },
  ]) {
    let entries
    try {
      entries = await readdir(root.path, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const flat = entry.isFile() && entry.name.endsWith('.md')
      const bundle = entry.isDirectory()
      if (!flat && !bundle) continue
      const base = flat ? entry.name.slice(0, -3) : entry.name
      if (!isSkillName(base)) continue
      const skillPath = flat ? join(root.path, entry.name) : join(root.path, base, 'SKILL.md')
      let raw = ''
      try {
        raw = await readFile(skillPath, 'utf8')
      } catch {
        continue
      }
      const fm = parseFrontmatter(raw)
      if (!fm || !fm.fm.description) continue
      rows.push({
        name: base,
        description: fm.fm.description,
        source: root.source,
        enabled: !Object.prototype.hasOwnProperty.call(disabled, base),
      })
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

/** Context shape the tool registration needs (structural, not cordis). */
export interface ToolHost {
  tools?: { register(definition: ToolDefinitionLike): () => void }
  logger: { warn(...args: unknown[]): void }
  settings: {
    get(ns: string): unknown
    update(ns: string, patch: object): Promise<void>
    mutate(ns: string, ops: Array<{ op: 'unset'; path: string[] }>): Promise<void>
  }
}

/**
 * Register the skillforge model tools on ctx.tools (best-effort; never throws).
 */
export function registerModelTools(ctx: ToolHost, getDisabled: () => DisabledMap): void {
  try {
    if (!ctx.tools) return
    const dshHome = resolveDshHome()
    const agentsHome = process.env.DSH_AGENTS_HOME || join(homedir(), '.agents')
    const target: ImportTarget = {
      dshHome,
      agentsHome,
      stateDir: join(dshHome, 'skillforge'),
    }

    const writer: ToggleWriter = {
      getDisabled,
      writeDisabled: (map) => ctx.settings.update('skillforge', { disabled: map }),
      unsetDisabled: (name) => ctx.settings.mutate('skillforge', [{ op: 'unset', path: ['disabled', name] }]),
    }

    const tools: ToolDefinitionLike[] = [
      makeTool(
        'skillforge_search',
        'Search the skills.sh skill market for installable skills. Use ONLY when the user asks to find or install a skill by keyword. Returns skill ids you can pass to skillforge_install.',
        { keyword: { type: 'string', description: 'Search keyword (>= 2 chars, e.g. "ppt", "pdf", "excel")' } },
        ['keyword'],
        async (args) => {
          const items = await searchSkillsSh(String(args.keyword))
          if (items.length === 0) return 'no skills found'
          return items
            .slice(0, 10)
            .map((item) => `${item.name} | installs: ${item.installs} | source: ${item.source} | id: ${item.id}`)
            .join('\n')
        },
      ),
      makeTool(
        'skillforge_install',
        'Install a skill from the skills.sh market into the user skill root. Use AFTER skillforge_search returned an id and the user confirmed.',
        { id: { type: 'string', description: 'Skill id from skillforge_search (e.g. "owner/repo/skill-name")' } },
        ['id'],
        async (args) => {
          const id = String(args.id)
          const guessed = id.split('/').pop() ?? id
          const exists = await skillExists(target, guessed)
          if (exists) return `skill already exists: ${guessed}`
          const { skill } = await fetchSkillShSkill(id)
          await installOneSkill(target, skill, { kind: 'github', location: id, installedAt: Date.now() })
          return `installed ${skill.name}`
        },
      ),
      makeTool(
        'skills_list',
        'List installed skills with their enabled state. Use when the user asks what skills exist or to see their skills.',
        {},
        [],
        async () => {
          const rows = await scanRows(dshHome, agentsHome, getDisabled())
          if (rows.length === 0) return 'no skills installed'
          return rows
            .map((row) => `${row.enabled ? '[on] ' : '[off]'} ${row.name} (${row.source}) - ${row.description.slice(0, 80)}`)
            .join('\n')
        },
      ),
      makeTool(
        'skills_toggle',
        'Enable or disable a skill. Disabling hides it from the model catalog, the skill tool and slash gestures; enabling restores it. Never deletes files.',
        {
          name: { type: 'string', description: 'Skill name (kebab-case)' },
          enabled: { type: 'boolean', description: 'true to enable, false to disable' },
        },
        ['name', 'enabled'],
        async (args) => {
          const name = String(args.name)
          const enabled = Boolean(args.enabled)
          await setEnabled(writer, { dshHome, agentsHome }, name, enabled, () => {})
          return `${enabled ? 'enabled' : 'disabled'} ${name}`
        },
      ),
    ]

    for (const tool of tools) {
      try {
        ctx.tools.register(tool)
      } catch (error) {
        ctx.logger.warn('[skillforge] tool registration failed:', error)
      }
    }
  } catch (error) {
    ctx.logger.warn('[skillforge] model tools disabled:', error)
  }
}
