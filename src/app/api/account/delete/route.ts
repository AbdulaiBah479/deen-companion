import { NextRequest, NextResponse } from 'next/server'
import { addIncident, track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { createAdminClient } from '@/lib/supabase-admin'

// POST /api/account/delete — a signed-in person deletes their OWN account and the progress saved online.
// Needs  Authorization: Bearer <their access token>.  The token is checked with Supabase first, and only the account it belongs to is deleted,
// so nobody can delete anyone else's account. (What is saved on the phone itself is not touched.)
export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Accounts are not switched on here.' }, { status: 503 })
  const limit = await rateLimit(`acct-del:${clientIp(request.headers)}`, 5, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Too many tries. Please wait a while.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })

  const header = request.headers.get('authorization') ?? ''
  const token = /^Bearer ([A-Za-z0-9._-]{20,4000})$/.exec(header)?.[1]
  if (!token) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  try {
    const sb = createAdminClient()
    const { data, error } = await sb.auth.getUser(token) // asks Supabase whose token this is (and whether it is still valid)
    if (error || !data.user) return NextResponse.json({ error: 'Your sign-in has expired. Sign in again, then retry.' }, { status: 401 })
    const { error: delError } = await sb.auth.admin.deleteUser(data.user.id) // profile and saved progress go with it (on delete cascade)
    if (delError) throw delError
    track('account.deleted')
    void addIncident({ level: 'info', component: 'accounts', message: 'An account was deleted by its owner' })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not delete the account right now. Please try again, or contact us.' }, { status: 502 })
  }
}
