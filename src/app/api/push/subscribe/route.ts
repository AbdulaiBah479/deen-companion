import { NextRequest, NextResponse } from 'next/server'
import { track } from '@/lib/ops'
import { parseReminder, pushConfigured, saveReminder } from '@/lib/push'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// POST /api/push/subscribe — switch prayer reminders on (or update them). Body: { subscription, lat, lng, tz, method, prayers, leadMin }
export async function POST(request: NextRequest) {
  track('push.subscribe')
  if (!pushConfigured()) return NextResponse.json({ error: 'Reminders are not set up on this server' }, { status: 503 })
  const limit = await rateLimit(`push-sub:${clientIp(request.headers)}`, 10, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const raw = await request.text()
  if (raw.length > 4000) return NextResponse.json({ error: 'Too large' }, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const reminder = parseReminder(body)
  if (!reminder) return NextResponse.json({ error: 'Invalid reminder settings' }, { status: 400 })
  try {
    await saveReminder(reminder)
  } catch {
    return NextResponse.json({ error: 'Could not save right now' }, { status: 503 })
  }
  return NextResponse.json({ ok: true })
}
