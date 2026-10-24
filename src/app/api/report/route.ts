import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/lib/alerts'
import { track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis, redisConfigured } from '@/lib/redis'
import { isUrgent, parseReport, saveReport } from '@/lib/reports'

// POST /api/report { category, message, page?, ref?, contact? } — a visitor tells the owner about a problem.
export async function POST(request: NextRequest) {
  const limit = await rateLimit(`report:${clientIp(request.headers)}`, 5, 15 * 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'You have sent several reports just now. Please wait a few minutes.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const raw = await request.text()
  if (raw.length > 6000) return NextResponse.json({ error: 'That is too long.' }, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const report = parseReport(body)
  if (!report) return NextResponse.json({ error: 'Please choose a topic and describe the problem in at least 10 characters.' }, { status: 400 })
  if (!redisConfigured()) return NextResponse.json({ error: 'Reports cannot be received right now.' }, { status: 503 })
  try {
    const saved = await saveReport(report)
    track('report')
    // Tell the owner, but at most once every 10 minutes so a flood cannot spam their phone.
    const urgent = isUrgent(saved.category)
    const [first] = (await redis([['SET', `ops:alerted:report:${urgent ? 'urgent' : 'normal'}`, '1', 'NX', 'EX', 600]])) as [string | null]
    if (first === 'OK') void sendAlert(urgent ? 'warn' : 'info', `New report: ${saved.category}`, saved.message.slice(0, 120), { component: 'reports' })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not save your report right now. Please try again.' }, { status: 503 })
  }
}
