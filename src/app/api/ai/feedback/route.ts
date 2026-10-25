import { NextRequest, NextResponse } from 'next/server'
import { readJsonLimited } from '@/lib/http'
import { track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// POST { rating: 'good' | 'bad' } — the 👍 / 👎 under an AI answer. Only a daily total is kept (no question, no answer, no person).
export async function POST(request: NextRequest) {
  const limit = await rateLimit(`aifb:${clientIp(request.headers)}`, 30, 60_000)
  if (!limit.ok) return new NextResponse(null, { status: 429 })
  const body = (await readJsonLimited(request, 200)) as { rating?: unknown } | null
  if (!body || (body.rating !== 'good' && body.rating !== 'bad')) return new NextResponse(null, { status: 400 })
  track(body.rating === 'good' ? 'ai.good' : 'ai.bad')
  return new NextResponse(null, { status: 204 })
}
