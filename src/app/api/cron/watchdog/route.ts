import { NextRequest, NextResponse } from 'next/server'
import { runAutopilot } from '@/lib/autopilot'
import { cronAuthorised } from '@/lib/cron-auth'

// POST /api/cron/watchdog — called every few minutes by the scheduler (.github/workflows/watchdog.yml). Needs the CRON_SECRET.
// Checks the app and the services it depends on, fixes what it can, and alerts the owner. Replies { ok, checks, alerts, fixes }.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!cronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await runAutopilot(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 200) : 'watchdog failed' }, { status: 500 })
  }
}
