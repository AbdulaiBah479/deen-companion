import { NextRequest, NextResponse } from 'next/server'
import { errorKey, parseClientError } from '@/lib/error-report'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// POST /api/client-error — the browser reports a crash. It is written to the server log (visible in Vercel → Logs) and, if
// ERROR_WEBHOOK_URL is set (a Discord/Slack-style webhook), forwarded there at most once per error per 10 minutes.
const forwarded = new Map<string, number>()

export async function POST(request: NextRequest) {
  const limit = await rateLimit(`clienterr:${clientIp(request.headers)}`, 20, 60_000)
  if (!limit.ok) return new NextResponse(null, { status: 429 })

  const raw = await request.text()
  if (raw.length > 4000) return new NextResponse(null, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  const report = parseClientError(body)
  if (!report) return new NextResponse(null, { status: 400 })

  console.error('[client-error]', JSON.stringify(report))

  const hook = process.env.ERROR_WEBHOOK_URL
  const key = errorKey(report)
  const now = Date.now()
  if (hook && now - (forwarded.get(key) ?? 0) > 10 * 60_000) {
    forwarded.set(key, now)
    if (forwarded.size > 500) forwarded.delete(forwarded.keys().next().value as string)
    const text = `Deen Companion error (${report.kind}) on ${report.page}: ${report.message}${report.source ? ' @ ' + report.source : ''}`
    // fire and forget: reporting must never slow down or break the response
    fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, text }), signal: AbortSignal.timeout(4000) }).catch(() => {})
  }
  return new NextResponse(null, { status: 204 })
}
