/**
 * Zero-dependency frontmatter parse / serialize for SKILL.md files.
 * Parses the scalar subset dsh skills use; serialization rebuilds the block
 * with a canonical field order while preserving unknown lines' text.
 */

/** Frontmatter fields this plugin manages. */
export interface SkillFrontmatter {
  name?: string
  description?: string
  whenToUse?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  /** Unknown keys preserved verbatim (raw line text, original order). */
  extra: string[]
}

/** Parse the frontmatter block of a raw skill file. Returns null when absent. */
export function parseFrontmatter(raw: string): { fm: SkillFrontmatter; body: string } | null {
  const text = stripBom(raw)
  const lines = text.split(/\r?\n/)
  if (lines.length < 3 || !lines[0].trim().startsWith('---')) return null
  let end = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i
      break
    }
  }
  if (end < 0) return null
  const fm: SkillFrontmatter = { extra: [] }
  for (let i = 1; i < end; i++) {
    const line = lines[i]
    const match = /^([a-zA-Z][a-zA-Z0-9-]*)\s*:\s*(.*)$/.exec(line.trim())
    if (!match) {
      fm.extra.push(line)
      continue
    }
    const key = match[1]
    const rawValue = match[2].trim()
    switch (key) {
      case 'name':
      case 'description':
      case 'whenToUse':
        if (rawValue) fm[key] = unquote(rawValue)
        else fm.extra.push(line)
        break
      case 'disable-model-invocation':
        fm.disableModelInvocation = parseBoolean(rawValue)
        break
      case 'user-invocable':
        fm.userInvocable = parseBoolean(rawValue)
        break
      default:
        fm.extra.push(line)
    }
  }
  return { fm, body: lines.slice(end + 1).join('\n').trim() }
}

/** Lenient boolean parsing matching the dsh frontmatter contract. */
export function parseBoolean(value: string): boolean | undefined {
  switch (value.toLowerCase()) {
    case 'true':
    case 'yes':
    case 'on':
    case '1':
      return true
    case 'false':
    case 'no':
    case 'off':
    case '0':
      return false
    default:
      return undefined
  }
}

/** Serialize a frontmatter block (canonical order, unknown lines preserved). */
export function serializeFrontmatter(fm: SkillFrontmatter): string {
  const lines: string[] = []
  if (fm.name !== undefined) lines.push(`name: ${fm.name}`)
  if (fm.description !== undefined) lines.push(`description: ${fm.description}`)
  if (fm.whenToUse !== undefined) lines.push(`whenToUse: ${fm.whenToUse}`)
  if (fm.disableModelInvocation !== undefined)
    lines.push(`disable-model-invocation: ${fm.disableModelInvocation}`)
  if (fm.userInvocable !== undefined) lines.push(`user-invocable: ${fm.userInvocable}`)
  lines.push(...fm.extra)
  return lines.join('\n')
}

/** Assemble a complete SKILL.md document from frontmatter + body. */
export function buildSkillDoc(fm: SkillFrontmatter, body: string): string {
  const frontmatter = serializeFrontmatter(fm)
  const trimmed = body.trim()
  return `---\n${frontmatter}\n---\n${trimmed ? `\n${trimmed}\n` : ''}`
}

/** Strip a UTF-8 BOM. */
export function stripBom(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
}

/** Remove a single pair of surrounding quotes from a scalar. */
function unquote(value: string): string {
  return value.replace(/^['"]|['"]$/g, '')
}

/** Kebab-case skill-name grammar (mirrors dsh-skill's isSkillName). */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Whether a string is a valid kebab-case skill name. */
export function isSkillName(name: string): boolean {
  return SKILL_NAME.test(name)
}
