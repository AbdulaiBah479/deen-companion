import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, SESSION_SECONDS, adminConfigured, keyIsCorrect, makeSession } from '@/lib/admin-auth'
import { addIncident } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// POST /api/admin/login { key } -> sets the admin cookie. Tries are rationed per visitor, and each wrong try is logged.
export async function POST(request: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'The admin area is not switched on. Set ADMIN_KEY (24+ characters) on the server.' }, { status: 503 })
  const ip = clientIp(request.headers)
  const limit = await rateLimit(`adminlogin:${ip}`, 6, 15 * 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many tries. Wait a few minutes.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })

  let body: { key?: unknown } = {}
  try {
    body = await request.json()
  } catch {}
  if (!keyIsCorrect(body.key)) {
    void addIncident({ level: 'warn', component: 'admin', message: 'A wrong admin key was entered' })
    return NextResponse.json({ error: 'That key is not right.' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, makeSession(), { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS })
  res.headers.set('Cache-Control', 'no-store')
  return res
}
