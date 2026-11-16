import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

// The scheduler proves itself with  Authorization: Bearer <secret>.  Up to two secrets are accepted at once, CRON_SECRET and
// CRON_SECRET_NEXT, so the secret can be changed without a gap: add the new one as CRON_SECRET_NEXT, change the timer to use it,
// then move it into CRON_SECRET and delete the other. A missing or weak (under 16 characters) secret never matches anything.
export function cronSecrets(env: Record<string, string | undefined> = process.env): string[] {
  return [env.CRON_SECRET, env.CRON_SECRET_NEXT].filter((s): s is string => typeof s === 'string' && s.length >= 16)
}

export function bearerMatches(header: string | null | undefined, secrets: string[]): boolean {
  const given = Buffer.from(header || '')
  let ok = false
  for (const s of secrets) {
    const want = Buffer.from(`Bearer ${s}`)
    // Every secret is compared, so the time taken does not tell which one (if any) was close.
    if (given.length === want.length && timingSafeEqual(given, want)) ok = true
  }
  return ok
}

export function cronAuthorised(request: NextRequest): boolean {
  return bearerMatches(request.headers.get('authorization'), cronSecrets())
}
