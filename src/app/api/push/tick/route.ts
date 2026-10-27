import { NextRequest, NextResponse } from 'next/server'
import { dispatch, markRun, pushConfigured } from '@/lib/push'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis } from '@/lib/redis'

// POST /api/push/tick — a backup for the scheduler. A phone that has reminders switched on calls this while the app is open, so due
// reminders (for everyone) are still sent even when the GitHub scheduler is not running. Safe to call by anyone: it does nothing more
// than the real scheduler does, each reminder is sent once a day regardless of who calls, and at most one run happens every 3 minutes.
export async function POST(request: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ ran: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  const limit = await rateLimit(`push-tick:${clientIp(request.headers)}`, 30, 3600_000)
  if (!limit.ok) return NextResponse.json({ ran: false }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  try {
    const [lock] = (await redis([['SET', 'push:tick-lock', '1', 'NX', 'EX', 180]])) as [string | null]
    if (lock !== 'OK') return NextResponse.json({ ran: false }, { headers: { 'Cache-Control': 'no-store' } })
    const out = await dispatch(new Date(), 6)
    await markRun().catch(() => {})
    return NextResponse.json({ ran: true, sent: out.sent }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ran: false }, { status: 200 })
  }
}
