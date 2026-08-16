/**
 * Skill market sources: skills.sh (vercel-labs ecosystem) search + install
 * via GitHub raw/codeload, plus GitHub repository import. All remote sources
 * are configurable and fail soft — one market being down never breaks others.
 */
import { downloadGithubArchive, fetchJson, HttpError } from './github.js'
import { parseZip, type ZipEntry } from './zip.js'
import { discoverSkillsInArchive, stripSingleRoot, type ArchiveSkill } from './skillpkg.js'
import { isSkillName, parseFrontmatter } from '../core/frontmatter.js'

/** One market search result. */
export interface MarketItem {
  id: string
  name: string
  installs: number
  source: string
  market: 'skills.sh'
}

/** skills.sh search API response shape. */
interface SkillsShResponse {
  skills?: Array<{
    id: string
    skillId: string
    name: string
    installs: number
    source: string
  }>
}

/** Default skills.sh API base. */
export const DEFAULT_SKILLS_SH_BASE = 'https://skills.sh'

/** Search skills.sh (requires a keyword of >= 2 chars). */
export async function searchSkillsSh(
  keyword: string,
  base: string = DEFAULT_SKILLS_SH_BASE,
): Promise<MarketItem[]> {
  const q = keyword.trim()
  if (q.length < 2) return []
  const json = await fetchJson<SkillsShResponse>(
    `${base}/api/search?q=${encodeURIComponent(q)}`,
  )
  return (json.skills ?? []).map((skill) => ({
    id: skill.id,
    name: skill.skillId,
    installs: skill.installs ?? 0,
    source: skill.source ?? '',
    market: 'skills.sh' as const,
  }))
}

/** Split a skills.sh id ("owner/repo/skill-path") into its parts. */
export function splitSkillShId(id: string): { owner: string; repo: string; path: string } {
  const parts = id.split('/')
  if (parts.length < 2) throw new Error(`invalid skills.sh id "${id}"`)
  return { owner: parts[0], repo: parts[1], path: parts.slice(2).join('/') }
}

/** Locate the real repo-relative skill directory via the git trees API. */
export async function locateSkillDir(owner: string, repo: string, path: string): Promise<string | null> {
  const paths = await fetchRepoTree(owner, repo)
  if (paths === null) return null
  const candidates = skillFileCandidates(paths, path)
  if (candidates.length === 0) return null
  const file = candidates[0]
  if (file === 'SKILL.md') return '' // repo root is the skill
  if (file.endsWith('SKILL.md')) return file.slice(0, -'/SKILL.md'.length) // bundle dir
  return file // flat skill file (e.g. "<name>.md")
}

/**
 * Install a skills.sh skill by locating its real path via the GitHub API and
 * extracting it from a repository archive (raw.githubusercontent is typically
 * unreachable from CN networks; codeload + the API are not).
 */
export async function fetchSkillShSkill(
  id: string,
): Promise<{ skill: ArchiveSkill; repoArchive: boolean }> {
  const { owner, repo, path } = splitSkillShId(id)
  if (!path) {
    return { skill: await scanRepoForSkill(owner, repo, ''), repoArchive: true }
  }
  const realPath = await locateSkillDir(owner, repo, path)
  if (realPath === null) throw new Error(`skill "${path}" not found in ${owner}/${repo}`)
  return { skill: await scanRepoForSkill(owner, repo, realPath), repoArchive: true }
}

/** Download a repo archive and find a skill by path (or the first one). */
async function scanRepoForSkill(
  owner: string,
  repo: string,
  path: string,
): Promise<ArchiveSkill> {
  const bytes = await downloadGithubArchive(owner, repo)
  const stripped = stripSingleRoot(parseZip(bytes))
  if (path) {
    const skill = extractSkillAtPath(stripped, path)
    if (skill) return skill
  }
  const skills = discoverSkillsInArchive(stripped)
  if (skills.length === 0) {
    const rootSkill = discoverRootLevelSkill(stripped, repo)
    if (rootSkill) return rootSkill
  }
  if (path) {
    const wanted = path.split('/').pop()?.replace(/\.md$/, '')
    const found = skills.find((skill) => skill.name === wanted) ?? skills[0]
    if (!found) throw new Error(`no skill found in ${owner}/${repo}`)
    return found
  }
  if (skills.length === 0) throw new Error(`no skills found in ${owner}/${repo}`)
  return skills[0]
}

/** Extract a skill at an exact repo-relative path (dir bundle or flat file). */
function extractSkillAtPath(stripped: ZipEntry[], path: string): ArchiveSkill | null {
  const enc = new TextDecoder('utf-8')
  if (path.endsWith('.md')) {
    const entry = stripped.find((file) => file.name === path)
    if (!entry) return null
    const name = path.split('/').pop()!.replace(/\.md$/, '')
    const fm = parseFrontmatter(enc.decode(entry.data))
    const files = new Map<string, Uint8Array>()
    files.set(`${name}.md`, entry.data)
    return {
      name,
      description: fm?.fm.description ?? '',
      whenToUse: fm?.fm.whenToUse,
      flat: true,
      files,
    }
  }
  const prefix = `${path}/`
  const members = stripped.filter((file) => file.name.startsWith(prefix))
  if (members.length === 0) return null
  const skillMd = members.find((file) => file.name === `${prefix}SKILL.md`)
  if (!skillMd) return null
  const fm = parseFrontmatter(enc.decode(skillMd.data))
  const name = path.split('/').pop()!
  const files = new Map<string, Uint8Array>()
  for (const member of members) {
    files.set(`${name}/${member.name.slice(prefix.length)}`, member.data)
  }
  return {
    name,
    description: fm?.fm.description ?? '',
    whenToUse: fm?.fm.whenToUse,
    flat: false,
    files,
  }
}

/** Fetch a market skill's one-line description via the GitHub contents API
 * (raw.githubusercontent is often unreachable; the API endpoint is not). */
const descriptionCache = new Map<string, string>()

interface GithubContentEntry {
  name?: string
  type?: string
  content?: string
  encoding?: string
  download_url?: string | null
}

async function githubContent(owner: string, repo: string, path: string): Promise<GithubContentEntry | null> {
  try {
    return await fetchJson<GithubContentEntry>(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,
      15_000,
    )
  } catch {
    return null
  }
}

/** Recursive git tree cache: repo -> file paths. */
const treeCache = new Map<string, string[] | null>()

/** Fetch a repo's full recursive file tree (git trees API). */
async function fetchRepoTree(owner: string, repo: string): Promise<string[] | null> {
  const key = `${owner}/${repo}`
  if (treeCache.has(key)) return treeCache.get(key) ?? null
  try {
    const json = await fetchJson<{ tree?: Array<{ path?: string; type?: string }> }>(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`,
      20_000,
    )
    const paths = (json.tree ?? []).filter((entry) => entry.type === 'blob').map((entry) => entry.path ?? '')
    treeCache.set(key, paths)
    return paths
  } catch {
    treeCache.set(key, null)
    return null
  }
}

/** Candidate file paths for a skill in a repo file tree. */
function skillFileCandidates(paths: string[], path: string): string[] {
  const wanted = path.split('/').pop() ?? path
  const exact = [`${path}/SKILL.md`, `${path}.md`]
  for (const candidate of exact) {
    if (paths.includes(candidate)) return [candidate]
  }
  // Suffix matches: */<path>/SKILL.md, */<path>.md — shortest first.
  const suffixes = paths
    .filter(
      (file) =>
        file.endsWith(`/${path}/SKILL.md`) ||
        file.endsWith(`/${wanted}/SKILL.md`) ||
        file.endsWith(`/${path}.md`) ||
        file.endsWith(`/${wanted}.md`),
    )
    .sort((a, b) => a.length - b.length)
  if (suffixes.length > 0) return suffixes
  // Root-level skill (top-level SKILL.md).
  if (paths.includes('SKILL.md')) return ['SKILL.md']
  return []
}

async function readDescriptionFromApi(owner: string, repo: string, path: string): Promise<string | null> {
  const paths = await fetchRepoTree(owner, repo)
  if (paths === null) return null
  for (const file of skillFileCandidates(paths, path)) {
    const entry = await githubContent(owner, repo, file)
    if (entry?.content && entry.encoding === 'base64') {
      const text = Buffer.from(entry.content, 'base64').toString('utf-8')
      const fm = parseFrontmatter(text)
      if (fm?.fm.description?.trim()) return fm.fm.description.trim()
    }
  }
  return null
}

export async function fetchSkillShDescription(id: string): Promise<string | null> {
  if (descriptionCache.has(id)) return descriptionCache.get(id) ?? null
  const { owner, repo, path } = splitSkillShId(id)
  let description: string | null = null
  if (path) {
    description = await readDescriptionFromApi(owner, repo, path)
  }
  descriptionCache.set(id, description ?? '')
  return description
}

/**
 * Discover skills in a GitHub zipball: strips the codeload wrapper root, runs
 * the generic discovery, and falls back to "repo root IS the skill" (a
 * top-level SKILL.md) — the common layout for single-skill repositories.
 */
export async function scanGithubRepo(owner: string, repo: string): Promise<ArchiveSkill[]> {
  const bytes = await downloadGithubArchive(owner, repo)
  const raw = parseZip(bytes)
  const stripped = stripSingleRoot(raw)
  const skills = discoverSkillsInArchive(stripped)
  if (skills.length > 0) return skills

  const rootSkill = discoverRootLevelSkill(stripped, repo)
  return rootSkill ? [rootSkill] : []
}

/** Detect a repo whose root itself is a skill (top-level SKILL.md). */
function discoverRootLevelSkill(stripped: ZipEntry[], fallbackName: string): ArchiveSkill | null {
  const skillMd = stripped.find((entry) => entry.name === 'SKILL.md')
  if (!skillMd) return null
  const fm = parseFrontmatter(new TextDecoder('utf-8').decode(skillMd.data))
  if (!fm || !fm.fm.description) return null
  const candidate = fm.fm.name?.trim() ?? ''
  const name = isSkillName(candidate) ? candidate : fallbackName
  const files = new Map<string, Uint8Array>()
  for (const entry of stripped) {
    if (entry.name.endsWith('/')) continue
    files.set(`${name}/${entry.name}`, entry.data)
  }
  return {
    name,
    description: fm.fm.description,
    whenToUse: fm.fm.whenToUse,
    flat: false,
    files,
  }
}

export { HttpError }
