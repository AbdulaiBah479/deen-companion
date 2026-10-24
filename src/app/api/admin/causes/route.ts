import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { addIncident } from '@/lib/ops'
import { customize, parseCause, readCauses, removeCause, resetCauses, upsertCause } from '@/lib/causes'
import { redisConfigured } from '@/lib/redis'

// GET    /api/admin/causes                      -> every cause (also the inactive ones) and whether the list is customised
// POST   /api/admin/causes { action: 'customize' | 'reset' }  or  { cause: {...} }  -> start editing / go back to the starter list / save one cause
// DELETE /api/admin/causes?id=<id>              -> remove one
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ ...(await readCauses()), canEdit: redisConfigured() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  if (!redisConfigured()) return NextResponse.json({ error: 'Editing needs the shared store (Redis)' }, { status: 503 })
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; cause?: unknown }
  if (body.action === 'customize') {
    await customize()
    return NextResponse.json({ ok: true })
  }
  if (body.action === 'reset') {
    await resetCauses()
    await addIncident({ level: 'info', component: 'admin', message: 'Zakat causes list reset to the starter list' })
    return NextResponse.json({ ok: true })
  }
  const cause = parseCause(body.cause)
  if (!cause) return NextResponse.json({ error: 'Check the form: every cause needs a title, a short description, and at least one website that starts with https://' }, { status: 400 })
  await customize() // editing the starter list copies it first, so nothing is lost
  await upsertCause(cause)
  await addIncident({ level: 'info', component: 'admin', message: `Zakat cause saved: ${cause.title}${cause.active ? '' : ' (hidden)'}` })
  return NextResponse.json({ ok: true, cause })
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const id = request.nextUrl.searchParams.get('id') ?? ''
  if (!/^[a-z0-9-]{1,40}$/.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  await customize()
  await removeCause(id)
  await addIncident({ level: 'info', component: 'admin', message: `Zakat cause removed: ${id}` })
  return NextResponse.json({ ok: true })
}
