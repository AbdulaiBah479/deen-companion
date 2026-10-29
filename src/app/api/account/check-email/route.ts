import { NextRequest, NextResponse } from 'next/server'
import { checkEmailLocally } from '@/lib/email-check'
import { readJsonLimited } from '@/lib/http'
import { clientIp, rateLimit } from '@/lib/ratelimit'

// POST /api/account/check-email { email } -> { ok: true } | { ok: false, reason }
// Used by the sign-up form before it creates an account. Looks right? Not a throw-away service? Can the domain receive mail (MX
// record, asked through a public DNS-over-HTTPS service)? If the DNS lookup itself cannot be done, the address is allowed (fail open),
// so a DNS outage never stops a real person signing up. This is a filter, not proof of ownership: only a confirmation e-mail proves that.
async function domainReceivesMail(domain: string): Promise<boolean | null> {
  const ask = async (type: 'MX' | 'A') => {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3500),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('dns ' + res.status)
    return (await res.json()) as { Status: number; Answer?: { type: number; data: string }[] }
  }
  try {
    const mx = await ask('MX')
    if (mx.Status === 3) return false // the domain does not exist
    if ((mx.Answer ?? []).some((a) => a.type === 15 && a.data.trim() !== '0 .')) return true
    // No MX record: mail servers fall back to the domain's own address record.
    const a = await ask('A')
    if (a.Status === 3) return false
    return (a.Answer ?? []).some((x) => x.type === 1 || x.type === 28)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const limit = await rateLimit(`check-email:${clientIp(request.headers)}`, 30, 3600_000)
  if (!limit.ok) return NextResponse.json({ ok: false, reason: 'Too many tries. Please wait a little and try again.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const body = (await readJsonLimited(request, 600)) as { email?: unknown } | null
  const local = checkEmailLocally(body?.email)
  if (!local.ok) return NextResponse.json(local, { headers: { 'Cache-Control': 'no-store' } })
  const receives = await domainReceivesMail(local.domain)
  if (receives === false) return NextResponse.json({ ok: false, reason: 'That e-mail domain cannot receive mail. Please check the spelling.' }, { headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
