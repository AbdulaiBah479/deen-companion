import { NextRequest, NextResponse } from 'next/server'
import { allowedEndpoint, deleteReminder, pushConfigured } from '@/lib/push'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// POST /api/push/unsubscribe — switch prayer reminders off. Body: { endpoint }
export async function POST(request: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ error: 'Reminders are not set up on this server' }, { status: 503 })
  const limit = await rateLimit(`push-unsub:${clientIp(request.headers)}`, 10, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null
  if (!body || typeof body.endpoint !== 'string' || !allowedEndpoint(body.endpoint)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  await deleteReminder(body.endpoint).catch(() => {})
  return NextResponse.json({ ok: true })
}
