import { NextRequest, NextResponse, after } from 'next/server'
import { runAutopilotIfDue } from '@/lib/autopilot'
import { cronAuthorised } from '@/lib/cron-auth'
import { dispatch, markRun, pushConfigured } from '@/lib/push'

// POST /api/push/dispatch — called every few minutes by a scheduler (see .github/workflows/prayer-reminders.yml).
// Needs  Authorization: Bearer <CRON_SECRET>.  Sends every reminder whose prayer time has just arrived.
export async function POST(request: NextRequest) {
  if (!cronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!pushConfigured()) return NextResponse.json({ error: 'Reminders are not set up on this server' }, { status: 503 })
  // Tests may pretend it is another moment (only when explicitly enabled; never in production).
  const fake = process.env.PUSH_ALLOW_TEST_NOW === '1' ? Date.parse(request.headers.get('x-now') || '') : NaN
  const now = Number.isFinite(fake) ? new Date(fake) : new Date()
  const windowMin = Math.min(15, Math.max(1, Number(request.nextUrl.searchParams.get('window')) || 6))
  try {
    const out = await dispatch(now, windowMin)
    await markRun().catch(() => {})
    // The same timer also keeps the health checks running (at most once every 9 minutes), so one timer is enough. Skipped in tests.
    if (process.env.PUSH_ALLOW_TEST_NOW !== '1') after(() => runAutopilotIfDue().catch(() => {}))
    return NextResponse.json({ ok: true, ...out })
  } catch {
    return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 })
  }
}
