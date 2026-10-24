import { NextRequest, NextResponse } from 'next/server'
import { parseAdminSub, saveAdminDevice } from '@/lib/alerts'
import { requireAdmin } from '@/lib/admin-guard'
import { pushConfigured } from '@/lib/push'

// POST /api/admin/alerts { endpoint, keys } — registers this phone/browser to receive alerts. Admin only.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  if (!pushConfigured()) return NextResponse.json({ error: 'Push is not set up (needs VAPID keys and Redis)' }, { status: 503 })
  const sub = parseAdminSub(await request.json().catch(() => null))
  if (!sub) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  await saveAdminDevice(sub)
  return NextResponse.json({ ok: true })
}
