import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/lib/alerts'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { flushCounters, track } from '@/lib/ops'
import { redis, redisConfigured } from '@/lib/redis'

// POST /api/account/signup-problem — the sign-up form tells us when the confirmation e-mail could not be sent, so the owner finds out
// from the control room (and a phone alert, at most once every 6 hours) instead of from an unhappy visitor. Carries no e-mail address
// or any other personal detail: it only counts. Safe to call by anyone; each visitor is limited.
export async function POST(request: NextRequest) {
  const limit = await rateLimit(`signup-problem:${clientIp(request.headers)}`, 5, 3600_000)
  if (!limit.ok) return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  track('signup-mail-fail')
  await flushCounters().catch(() => {})
  try {
    if (redisConfigured()) {
      const [first] = (await redis([['SET', 'ops:alerted:signup-mail', '1', 'NX', 'EX', 6 * 3600]])) as [string | null]
      if (first === 'OK') {
        await sendAlert('warn', 'People cannot sign up: the confirmation e-mail is not being sent', 'Fix it in Supabase → Authentication → SMTP Settings (check the username and App Password), or switch “Confirm email” off in Providers → Email.', { component: 'signup-mail' })
      }
    }
  } catch {}
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
