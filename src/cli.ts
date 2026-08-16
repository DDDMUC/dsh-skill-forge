/**
 * dsh-skillforge CLI — manage skills from the terminal.
 *
 * Commands:
 *   list                          list skills (enabled state, source)
 *   add <path>                    import a single .md or a SKILL.md bundle into ~/.dsh/skills
 *   enable <name>                 enable a skill
 *   disable <name>                disable a skill
 *   delete <name>                 delete a skill (requires --yes)
 *   check                         run the DSH-spec audit (state-driven fix)
 *
 * Enable/disable/check go through the dsh web HTTP API when the gateway is
 * running (hot effect); otherwise they fall back to direct settings.yaml
 * edits (effective on next gateway start).
 */
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, isAbsolute } from 'node:path'
import { isSkillName, parseFrontmatter } from './core/frontmatter.js'
import { auditRoots, listUserSkillEntries } from './core/audit.js'
import { createSkill } from './core/crud.js'
import { resolveDshHome } from './core/catalog.js'

const API_BASE = 'http://127.0.0.1:3080/plugins/skillforge/api'

async function isGatewayUp(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/catalog`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  const body = (await res.json()) as { ok: boolean; data?: T; error?: string }
  if (!body.ok) throw new Error(body.error ?? `request failed (${res.status})`)
  return body.data as T
}

function fail(message: string): never {
  console.error(`error: ${message}`)
  process.exit(1)
}

/** Direct settings.yaml edit (gateway down): manage the skillforge.disabled section. */
async function toggleViaSettings(name: string, enabled: boolean): Promise<void> {
  const settingsPath = join(resolveDshHome(), 'settings.yaml')
  let text = ''
  try {
    text = await readFile(settingsPath, 'utf8')
  } catch {
    /* file may not exist yet */
  }
  const lines = text.split(/\r?\n/)
  const out: string[] = []
  let inSkillforge = false
  let inDisabled = false
  let written = false
  for (const line of lines) {
    if (/^skillforge:/.test(line)) inSkillforge = true
    else if (inSkillforge && /^\S/.test(line)) inSkillforge = false
    if (inSkillforge && /^  disabled:/.test(line)) inDisabled = true
    else if (inDisabled && /^  \S/.test(line)) inDisabled = false
    if (inDisabled && new RegExp(`^    ${escapeRe(name)}:`).test(line)) {
      if (enabled) continue // drop the entry
      written = true
      out.push(line)
      continue
    }
    out.push(line)
  }
  if (!enabled && !written) {
    const hasSection = text.includes('skillforge:')
    const hasDisabled = text.includes('disabled:')
    const indent = hasSection ? (hasDisabled ? '    ' : '  ') : ''
    out.push(
      `${hasSection ? '' : 'skillforge:'}`,
      `${hasSection ? (hasDisabled ? '' : '  disabled:') : '  disabled:'}`,
      `${indent}${name}:`,
      `${indent}  disabledAt: ${Date.now()}`,
    )
  }
  await writeFile(settingsPath, out.join('\n'), 'utf8')
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function cmdList(): Promise<void> {
  const gatewayUp = await isGatewayUp()
  if (gatewayUp) {
    const catalog = await api<{
      skills: Array<{ name: string; enabled: boolean; source: string; description: string }>
    }>('/catalog')
    for (const skill of catalog.skills) {
      const state = skill.enabled ? 'enabled ' : 'disabled'
      console.log(`${state.padEnd(9)} ${skill.name.padEnd(28)} [${skill.source}] ${skill.description.slice(0, 60)}`)
    }
    return
  }
  const dshHome = resolveDshHome()
  const agentsHome = process.env.DSH_AGENTS_HOME || join(homedir(), '.agents')
  for (const entry of await listUserSkillEntries(dshHome, agentsHome)) {
    console.log(`${'enabled '.padEnd(9)} ${entry.name.padEnd(28)} [${entry.source}] ${entry.path}`)
  }
}

async function cmdAdd(path: string): Promise<void> {
  const dshHome = resolveDshHome()
  const targetRoot = join(dshHome, 'skills')
  let skillPath: string
  let name: string
  let source: string
  try {
    const info = await stat(path)
    if (info.isDirectory()) {
      skillPath = join(path, 'SKILL.md')
      const parent = path.replace(/[\\/]+$/, '')
      name = parent.slice(parent.lastIndexOf('\\') + 1, parent.length)
      source = await readFile(skillPath, 'utf8')
    } else {
      if (!path.endsWith('.md')) fail('only .md files or SKILL.md bundles are accepted')
      skillPath = path
      name = path.slice(path.lastIndexOf('\\') + 1, path.length - 3)
      source = await readFile(path, 'utf8')
    }
  } catch {
    fail(`cannot read ${path}`)
  }
  if (!isSkillName(name)) fail(`"${name}" is not a valid kebab-case skill name`)
  const parsed = parseFrontmatter(source)
  if (!parsed) fail('file has no YAML frontmatter (must start with ---)')
  if (!parsed.fm.description) fail('frontmatter missing description')
  const target = isAbsolute(targetRoot) ? join(targetRoot, name, 'SKILL.md') : ''
  void target
  await createSkill(
    { dshHome, agentsHome: process.env.DSH_AGENTS_HOME || join(homedir(), '.agents') },
    { name, description: parsed.fm.description ?? '', whenToUse: parsed.fm.whenToUse, content: parsed.body },
  )
  console.log(`added ${name} -> ~/.dsh/skills/${name}/`)
}

async function cmdToggle(name: string, enabled: boolean): Promise<void> {
  if (!isSkillName(name)) fail(`"${name}" is not a valid skill name`)
  if (await isGatewayUp()) {
    await api('/toggle', { method: 'POST', body: JSON.stringify({ name, enabled }) })
    console.log(`${enabled ? 'enabled' : 'disabled'} ${name} (hot)`)
  } else {
    await toggleViaSettings(name, enabled)
    console.log(`${enabled ? 'enabled' : 'disabled'} ${name} (settings.yaml, effective on next gateway start)`)
  }
}

async function cmdDelete(name: string, yes: boolean): Promise<void> {
  if (!yes) fail(`deleting "${name}" requires --yes`)
  if (!(await isGatewayUp())) fail('gateway is down; deletion requires the running dsh web')
  await api('/delete', { method: 'POST', body: JSON.stringify({ name }) })
  console.log(`deleted ${name}`)
}

async function cmdCheck(): Promise<void> {
  const dshHome = resolveDshHome()
  const agentsHome = process.env.DSH_AGENTS_HOME || join(homedir(), '.agents')
  const result = await auditRoots(dshHome, agentsHome, join(dshHome, 'skillforge'))
  console.log(`checked: ${result.checked.length}  fixed: ${result.fixed.length}  skipped: ${result.skipped.length}`)
  for (const name of result.fixed) console.log(`  fixed: ${name}`)
  for (const entry of result.errors) console.error(`  error: ${entry.name}: ${entry.error}`)
}

const [, , command, ...args] = process.argv

switch (command) {
  case 'list':
    void cmdList().catch((error) => fail(error instanceof Error ? error.message : String(error)))
    break
  case 'add':
    if (!args[0]) fail('usage: dsh-skillforge add <path>')
    void cmdAdd(args[0]).catch((error) => fail(error instanceof Error ? error.message : String(error)))
    break
  case 'enable':
    if (!args[0]) fail('usage: dsh-skillforge enable <name>')
    void cmdToggle(args[0], true).catch((error) => fail(error instanceof Error ? error.message : String(error)))
    break
  case 'disable':
    if (!args[0]) fail('usage: dsh-skillforge disable <name>')
    void cmdToggle(args[0], false).catch((error) => fail(error instanceof Error ? error.message : String(error)))
    break
  case 'delete':
    if (!args[0]) fail('usage: dsh-skillforge delete <name> --yes')
    void cmdDelete(args[0], args.includes('--yes')).catch((error) =>
      fail(error instanceof Error ? error.message : String(error)),
    )
    break
  case 'check':
    void cmdCheck().catch((error) => fail(error instanceof Error ? error.message : String(error)))
    break
  default:
    console.log(
      [
        'dsh-skillforge — manage DSH skills from the terminal',
        '',
        'usage:',
        '  dsh-skillforge list',
        '  dsh-skillforge add <path>',
        '  dsh-skillforge enable <name>',
        '  dsh-skillforge disable <name>',
        '  dsh-skillforge delete <name> --yes',
        '  dsh-skillforge check',
      ].join('\n'),
    )
    process.exit(command ? 1 : 0)
}
