// Crash reports from the browser: the smallest useful description of what broke, with nothing personal in it.
// Shared by the browser reporter and the /api/client-error route (and unit-tested).

export type ClientError = { message: string; source: string; page: string; kind: 'error' | 'rejection' | 'boundary' }

const clip = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

// Page address without the query string or #fragment (they can carry personal data, e.g. a typed search).
export function cleanPage(href: string): string {
  try {
    const u = new URL(href, 'https://x.invalid')
    return u.pathname.slice(0, 120)
  } catch {
    return clip(href.split(/[?#]/)[0], 120)
  }
}

// Checks and trims whatever the browser sent. Returns null for anything that doesn't look like our report.
export function parseClientError(body: unknown): ClientError | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const message = clip(b.message, 300)
  if (!message) return null
  const kind = b.kind === 'rejection' || b.kind === 'boundary' ? b.kind : 'error'
  return { message, source: clip(String(b.source ?? '').replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0], 160), page: cleanPage(String(b.page ?? '')), kind }
}

// Stable short key so the same error is only forwarded once in a while.
export function errorKey(e: ClientError): string {
  let h = 0
  const s = `${e.kind}|${e.message}|${e.source}`
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h.toString(36)
}
