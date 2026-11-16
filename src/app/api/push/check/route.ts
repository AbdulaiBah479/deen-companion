import { NextRequest, NextResponse } from 'next/server'
import { readJsonLimited } from '@/lib/http'
import { allowedEndpoint, getReminder, pushConfigured } from '@/lib/push'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// POST /api/push/check { endpoint } — "does the server know this device?" for the notification checkup on the Prayer page.
// Only tells whether a reminder exists for that private endpoint, and how many prayers it covers. Nothing else is revealed.
export async function POST(request: NextRequest) {
  if (!pushConfigured()) return NextResponse.json({ configured: false, known: false }, { headers: { 'Cache-Control': 'no-store' } })
  const limit = await rateLimit(`push-check:${clientIp(request.headers)}`, 20, 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Please wait a minute' }, { status: 429 })
  const body = (await readJsonLimited(request, 2_000)) as { endpoint?: unknown } | null
  if (!body || typeof body.endpoint !== 'string' || !allowedEndpoint(body.endpoint)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const r = await getReminder(body.endpoint).catch(() => null)
  return NextResponse.json({ configured: true, known: !!r, prayers: r?.prayers.length ?? 0, extras: r?.extras?.length ?? 0 }, { headers: { 'Cache-Control': 'no-store' } })
}
