import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/lib/alerts'
import { aiStatus, healModels } from '@/lib/ai'
import { requireAdmin } from '@/lib/admin-guard'
import { runAutopilot } from '@/lib/autopilot'
import { addIncident } from '@/lib/ops'

// POST /api/admin/action { action } — the buttons on the admin page. Admin only.
//   check       run the watchdog now          models   look up current AI model names
//   reset-ai    forget AI cool-downs          test     send a test alert to every alert channel
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  let action = ''
  try {
    action = String(((await request.json()) as { action?: unknown }).action ?? '')
  } catch {}

  switch (action) {
    case 'check':
      return NextResponse.json({ ok: true, report: await runAutopilot() })
    case 'models': {
      const r = await healModels(true)
      await addIncident({ level: 'info', component: 'admin', message: `Model lookup run by the admin: ${Object.keys(r.found).join(', ') || 'nothing found'}` })
      return NextResponse.json({ ok: true, found: r.found, notes: r.notes })
    }
    case 'reset-ai': {
      aiStatus() // makes sure the chain is built
      const { resetAiCooldowns } = await import('@/lib/ai')
      resetAiCooldowns()
      await addIncident({ level: 'info', component: 'admin', message: 'AI cool-downs cleared by the admin' })
      return NextResponse.json({ ok: true })
    }
    case 'test': {
      const sent = await sendAlert('info', 'Test alert', 'If you can read this, alerts reach you.', { component: 'test' })
      return NextResponse.json({ ok: true, ...sent })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
