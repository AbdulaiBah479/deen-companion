import { NextRequest, NextResponse } from 'next/server'
import { allowedEndpoint, getReminder, pushConfigured, sendTo } from '@/lib/push'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// POST /api/push/test — "Send me a test reminder" button. Body: { endpoint }. Only works for an endpoint that is already subscribed.
export async function POST(request: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ error: 'Reminders are not set up on this server' }, { status: 503 })
  const limit = await rateLimit(`push-test:${clientIp(request.headers)}`, 10, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Please wait a minute before sending another test' }, { status: 429 })
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null
  if (!body || typeof body.endpoint !== 'string' || !allowedEndpoint(body.endpoint)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const reminder = await getReminder(body.endpoint).catch(() => null)
  if (!reminder) return NextResponse.json({ error: 'Reminders are not switched on for this device' }, { status: 404 })
  const result = await sendTo(reminder, { title: 'Test reminder 🕌', body: 'Prayer reminders are working on this device.', url: '/prayer', tag: 'prayer-test' })
  return result === 'sent' ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'The browser’s push service did not accept it' }, { status: 502 })
}
