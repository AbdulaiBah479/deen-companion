'use client'

import { useCallback, useEffect, useState } from 'react'
import { readSaved } from '@/lib/location'
import { allGood, diagnose, type Facts, type Finding } from '@/lib/push-check'

const ICON = { ok: '✅', warn: '⚠️', bad: '❌' } as const

// Prayer page: "Not getting notifications?" Checks the phone and the server, says in plain words what is wrong, and can fix the
// common problem (the server forgot this device) in one tap. Works even where reminders cannot be switched on, to say why.
export default function NotificationCheckup() {
  const [items, setItems] = useState<Finding[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)

  const run = useCallback(async () => {
    setBusy(true)
    setMsg('')
    try {
      const nav = navigator as Navigator & { standalone?: boolean }
      const ua = navigator.userAgent
      const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
      const hasSW = 'serviceWorker' in navigator
      const hasPush = 'PushManager' in window
      const hasNotification = 'Notification' in window
      let subscribed = false
      let serverKnows: boolean | null = null
      let serverPrayers = 0
      if (hasSW && hasPush) {
        try {
          const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))])
          const sub = await reg.pushManager.getSubscription()
          subscribed = !!sub
          if (sub) {
            const r = await fetch('/api/push/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
            if (r.ok) {
              const d = await r.json()
              serverKnows = !!d.known
              serverPrayers = d.prayers ?? 0
            }
          }
        } catch {}
      }
      let schedulerOk: boolean | null = null
      try {
        const s = await (await fetch('/api/push/status', { cache: 'no-store' })).json()
        if (typeof s.schedulerOk === 'boolean') schedulerOk = s.schedulerOk
      } catch {}
      const place = readSaved<{ kind?: string; geo?: unknown }>('deen:place')
      const facts: Facts = {
        secure: window.isSecureContext,
        hasSW,
        hasPush,
        hasNotification,
        permission: hasNotification ? Notification.permission : 'unsupported',
        ios,
        standalone,
        subscribed,
        serverKnows,
        serverPrayers,
        schedulerOk,
        locationSaved: !!place && (place.kind === 'coords' || !!place.geo),
      }
      setItems(diagnose(facts))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (open && !items) void run()
  }, [open, items, run])

  async function sendTest() {
    setMsg('')
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
      if (!sub) throw new Error('Reminders are not switched on in this browser yet.')
      const r = await fetch('/api/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'The test was not accepted.')
      setMsg('A test notification was sent. If it does not appear within a minute, follow the advice above.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not send a test.')
    }
  }
  function fix() {
    setMsg('Signing this device up again…')
    window.dispatchEvent(new Event('deen:push-resync'))
    setTimeout(() => void run().then(() => setMsg('')), 2500)
  }

  const needsFix = items?.some((i) => i.id === 'server-missing')
  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3" data-testid="notification-checkup">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full text-left font-semibold text-sm">
        🔔 Not getting notifications? <span className="text-[#0F766E] underline font-normal">{open ? 'Hide' : 'Check now'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {busy && !items && <p className="text-sm text-gray-500" role="status">Checking…</p>}
          {items && (
            <>
              <p className="text-sm font-semibold" data-testid="checkup-verdict">{allGood(items) ? 'Everything that can be checked here looks fine.' : 'Here is what was found:'}</p>
              <ul className="space-y-2" data-testid="checkup-list">
                {items.map((i) => (
                  <li key={i.id} className="text-sm">
                    <p>{ICON[i.level]} {i.title}</p>
                    {i.fix && <p className="text-xs text-gray-600 ml-6">{i.fix}</p>}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {needsFix && <button type="button" onClick={fix} className="rounded-lg bg-[#0F766E] text-white px-3 py-1.5 text-sm font-semibold">Fix it</button>}
                <button type="button" onClick={() => void run()} disabled={busy} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold disabled:opacity-50">Check again</button>
                {items.some((i) => i.id === 'subscribed') && <button type="button" onClick={() => void sendTest()} className="rounded-lg border border-[#0F766E] text-[#0F766E] px-3 py-1.5 text-sm font-semibold">Send a test now</button>}
              </div>
            </>
          )}
          {msg && <p className="text-sm text-[#0F766E]" role="status">{msg}</p>}
        </div>
      )}
    </section>
  )
}
