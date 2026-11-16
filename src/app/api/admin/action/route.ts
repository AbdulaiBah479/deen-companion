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
  let email = ''
  try {
    const b = (await request.json()) as { action?: unknown; email?: unknown }
    action = String(b.action ?? '')
    email = typeof b.email === 'string' ? b.email.trim().slice(0, 200) : ''
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
    case 'mailtest': {
      // Asks Supabase to send a password-reset e-mail to an existing account. If its mail setup is broken, Supabase says so here.
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !anon) return NextResponse.json({ ok: false, message: 'Accounts are not switched on (the Supabase address and key are missing).' })
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, message: 'Type the e-mail address of an account that already exists, then press the button.' })
      try {
        const r = await fetch(url.replace(/\/$/, '') + '/auth/v1/recover', { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }), signal: AbortSignal.timeout(15000), cache: 'no-store' })
        const d = (await r.json().catch(() => ({}))) as { msg?: string; message?: string; error_description?: string }
        const detail = String(d.msg || d.message || d.error_description || '').slice(0, 200)
        if (r.ok) return NextResponse.json({ ok: true, message: 'Supabase accepted it and handed it to the mail service. Check that inbox (and Spam) within a minute. If nothing arrives, the sender is being refused: re-check the SMTP username and App Password. If no account has that address, nothing is sent.' })
        return NextResponse.json({ ok: false, message: /sending|smtp/i.test(detail) ? 'Supabase could not send the e-mail: ' + detail + '. The SMTP username or password is wrong, or the sender is not allowed. Fix it under Authentication → SMTP Settings.' : 'Supabase refused: ' + (detail || 'HTTP ' + r.status) })
      } catch {
        return NextResponse.json({ ok: false, message: 'Could not reach Supabase just now. Try again in a minute.' })
      }
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
