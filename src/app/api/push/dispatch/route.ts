import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { dispatch, pushConfigured } from '@/lib/push'

// POST /api/push/dispatch — called every few minutes by a scheduler (see .github/workflows/prayer-reminders.yml).
// Needs  Authorization: Bearer <CRON_SECRET>.  Sends every reminder whose prayer time has just arrived.
function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 16) return false // refuse to run with a missing or weak secret
  const given = request.headers.get('authorization') || ''
  const want = `Bearer ${secret}`
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want))
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!pushConfigured()) return NextResponse.json({ error: 'Reminders are not set up on this server' }, { status: 503 })
  // Tests may pretend it is another moment (only when explicitly enabled; never in production).
  const fake = process.env.PUSH_ALLOW_TEST_NOW === '1' ? Date.parse(request.headers.get('x-now') || '') : NaN
  const now = Number.isFinite(fake) ? new Date(fake) : new Date()
  const windowMin = Math.min(15, Math.max(1, Number(request.nextUrl.searchParams.get('window')) || 6))
  try {
    return NextResponse.json({ ok: true, ...(await dispatch(now, windowMin)) })
  } catch {
    return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 })
  }
}
