/**
 * GitHub archive downloader: fetches a repository zipball from codeload with
 * size cap, timeout, branch fallback (main -> master) and one retry.
 */

const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024
const TIMEOUT_MS = 30_000

/** Download a repository zipball. Throws on failure. */
export async function downloadGithubArchive(
  owner: string,
  repo: string,
): Promise<Uint8Array> {
  const branches = ['main', 'master']
  let lastError: unknown
  for (const branch of branches) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const url = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/refs/heads/${branch}`
      try {
        const bytes = await fetchBounded(url, MAX_ARCHIVE_BYTES)
        return bytes
      } catch (error) {
        lastError = error
        // A 404 for this branch: try the next branch immediately.
        if (error instanceof HttpError && error.status === 404 && attempt === 0) {
          break
        }
      }
    }
  }
  throw new Error(
    `failed to download github.com/${owner}/${repo}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  )
}

/** HTTP error carrying a status code. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Fetch a URL with byte cap and timeout. */
export async function fetchBounded(url: string, maxBytes: number): Promise<Uint8Array> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status} for ${url}`)
    if (!res.body) throw new Error(`no body for ${url}`)
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > maxBytes) {
        throw new Error(`download exceeds ${maxBytes} bytes`)
      }
      chunks.push(value)
    }
    const out = new Uint8Array(total)
    let pos = 0
    for (const chunk of chunks) {
      out.set(chunk, pos)
      pos += chunk.length
    }
    return out
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch a small text/JSON resource (raw.githubusercontent) with timeout. */
export async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status} for ${url}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}
