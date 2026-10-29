import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { readLedger, readSponsor, writeLedger, writeSponsor } from '@/lib/support'
import { addIncident } from '@/lib/ops'
import { parseLedger, parseSponsor } from '@/lib/support-shared'
import { redisConfigured } from '@/lib/redis'

// GET  /api/admin/support                      -> the ledger and the sponsor, as saved
// POST /api/admin/support { ledger: {...} }    -> replace the ledger      (a bad line anywhere refuses the whole save)
// POST /api/admin/support { sponsor: {...} }   -> replace the sponsor slot (https link on a real domain only)
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const [ledger, sponsor] = await Promise.all([readLedger(), readSponsor()])
  return NextResponse.json({ ledger, sponsor, canEdit: redisConfigured() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  if (!redisConfigured()) return NextResponse.json({ error: 'Editing needs the shared store (Redis)' }, { status: 503 })
  const body = (await request.json().catch(() => ({}))) as { ledger?: unknown; sponsor?: unknown }
  if (body.ledger !== undefined) {
    const ledger = parseLedger(body.ledger)
    if (!ledger) return NextResponse.json({ error: 'Check the figures: each line needs a name and a number (0 or more), and each month must be written like 2026-11, once.' }, { status: 400 })
    await writeLedger(ledger)
    await addIncident({ level: 'info', component: 'admin', message: `Public ledger saved (${ledger.months.length} month(s))` })
    return NextResponse.json({ ok: true })
  }
  if (body.sponsor !== undefined) {
    const sponsor = parseSponsor(body.sponsor)
    if (!sponsor) return NextResponse.json({ error: 'A sponsor needs a name, a short line, and a website that starts with https://' }, { status: 400 })
    await writeSponsor(sponsor)
    await addIncident({ level: 'info', component: 'admin', message: sponsor.active ? `Sponsor slot switched on: ${sponsor.name}` : 'Sponsor slot switched off' })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
}
