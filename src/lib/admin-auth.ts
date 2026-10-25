// Admin sign-in without any outside service: one long private key (ADMIN_KEY) that only the owner knows.
// Entering it gives a signed, HTTP-only cookie that expires after 12 hours. The key itself is never stored in the browser.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE = 'deen_admin'
export const SESSION_SECONDS = 12 * 3600
// 12 is the least we accept. A long random key is much safer; the sign-in route also caps guesses to a few per hour for everyone together.
const MIN_KEY_LENGTH = 12

export const adminConfigured = () => (process.env.ADMIN_KEY ?? '').length >= MIN_KEY_LENGTH

const sign = (payload: string) => createHmac('sha256', 'deen-admin-session:' + (process.env.ADMIN_KEY ?? '')).update(payload).digest('base64url')

// Compare two secrets without leaking, through timing, how many characters matched.
export function sameSecret(a: string, b: string): boolean {
  const ha = createHmac('sha256', 'cmp').update(a).digest()
  const hb = createHmac('sha256', 'cmp').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function keyIsCorrect(candidate: unknown): boolean {
  return adminConfigured() && typeof candidate === 'string' && candidate.length <= 512 && sameSecret(candidate, process.env.ADMIN_KEY!)
}

export function makeSession(now = Date.now()): string {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS
  return `${exp}.${sign('admin|' + exp)}`
}

export function sessionIsValid(token: string | undefined | null, now = Date.now()): boolean {
  if (!adminConfigured() || !token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || !/^\d{9,12}$/.test(exp)) return false
  if (Number(exp) * 1000 < now) return false
  const good = sign('admin|' + exp)
  return sig.length === good.length && sameSecret(sig, good)
}
