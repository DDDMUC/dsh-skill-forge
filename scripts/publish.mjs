/**
 * Publish the working tree to GitHub via the Git Data API.
 * Works when git-over-https to github.com is blocked (GFW etc.) —
 * api.github.com usually stays reachable.
 *
 * Usage:
 *   GITHUB_TOKEN=<token> node scripts/publish.mjs [commit-message]
 *
 * The token is read from the environment only and never stored.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const token = process.env.GITHUB_TOKEN
if (!token) {
  console.error('GITHUB_TOKEN environment variable is required')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
const repo = (pkg.repository?.url ?? '')
  .replace(/^git\+/, '')
  .replace(/\.git$/, '')
  .replace(/^https:\/\/github\.com\//, '')
  .replace(/^git@github\.com:/, '')
if (!repo || !repo.includes('/')) {
  console.error('cannot infer owner/repo from package.json repository:', pkg.repository?.url)
  process.exit(1)
}
const branch = process.env.GITHUB_BRANCH ?? 'main'
const message = process.argv[2] ?? `release: ${pkg.name} ${pkg.version}`

const api = `https://api.github.com/repos/${repo}`
const headers = {
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
}

async function req(method, path, body) {
  const res = await fetch(api + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${data.message ?? text}`)
  return data
}

const IGNORE = new Set(['.git', 'node_modules'])
const IGNORE_NAMES = ['DESIGN.md']

function collect(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry) || IGNORE_NAMES.includes(entry)) continue
    const full = join(dir, entry)
    const info = statSync(full)
    if (info.isDirectory()) files.push(...collect(full))
    else files.push({ path: relative(rootDir, full).split(sep).join('/'), full })
  }
  return files
}

const files = collect(rootDir)
console.log(`[publish] ${repo}@${branch}: ${files.length} files`)

const blobShas = new Map()
for (const file of files) {
  const content = readFileSync(file.full).toString('base64')
  const blob = await req('POST', '/git/blobs', { content, encoding: 'base64' })
  blobShas.set(file.path, blob.sha)
}

async function buildTree(dirPath) {
  const entries = []
  for (const name of readdirSync(join(rootDir, dirPath))) {
    if (IGNORE.has(name) || IGNORE_NAMES.includes(name)) continue
    const rel = dirPath ? `${dirPath}/${name}` : name
    if (statSync(join(rootDir, dirPath, name)).isDirectory()) {
      entries.push({ path: name, mode: '040000', type: 'tree', sha: await buildTree(rel) })
    } else {
      entries.push({ path: name, mode: '100644', type: 'blob', sha: blobShas.get(rel) })
    }
  }
  const tree = await req('POST', '/git/trees', { tree: entries })
  return tree.sha
}

console.log('[publish] building tree…')
const treeSha = await buildTree('')

let parent = null
try {
  const ref = await req('GET', `/git/ref/heads/${branch}`)
  parent = ref.object.sha
} catch {
  /* first commit */
}
const commit = await req('POST', '/git/commits', {
  message,
  tree: treeSha,
  ...(parent ? { parents: [parent] } : {}),
})
await req('PATCH', `/git/refs/heads/${branch}`, { sha: commit.sha, force: true })
console.log(`[publish] done: ${commit.sha}`)
