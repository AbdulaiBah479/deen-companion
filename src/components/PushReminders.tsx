'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EXTRAS, LEADS, PRAYERS, type ExtraKey, type PrayerKey } from '@/lib/push-shared'
import { PRAYER_NAMES } from '@/lib/prayer'
import { useStored } from '@/lib/storage'
import type { Place } from '@/lib/use-prayer-times'

type Saved = { on: boolean; lead: number; prayers: PrayerKey[]; extras?: ExtraKey[] }
const DEFAULT: Saved = { on: false, lead: 0, prayers: [...PRAYERS], extras: [] }

// The browser wants the server's public key as bytes.
function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4)
  const raw = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// Where the reminders should be calculated for: the shared position (device time zone) or a saved city (its own time zone).
function whereOf(place: Place): { lat: number; lng: number; tz: string } | null {
  if (place.kind === 'coords') return { lat: place.lat, lng: place.lng, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
  return place.geo ?? null
}

// Prayer page: "Remind me even when the app is closed" (Web Push). Hidden on servers that haven't set reminders up.
export default function PushReminders({ place, method }: { place: Place; method: number }) {
  const [status, setStatus] = useState<{ configured: boolean; publicKey: string | null } | null>(null)
  const [saved, setSaved, ready] = useStored<Saved>('deen:push', DEFAULT)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [supported, setSupported] = useState<boolean | null>(null)
  const lastSent = useRef('')

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)
    fetch('/api/push/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, publicKey: null }))
  }, [])

  const post = useCallback(
    async (path: string, body: unknown) => {
      const r = await fetch(`/api/push/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed')
    },
    []
  )

  const sync = useCallback(
    async (sub: PushSubscription, s: Saved) => {
      const where = whereOf(place)
      if (!where) throw new Error('Choose your location on this page first, so reminders match your prayer times.')
      await post('subscribe', { subscription: sub.toJSON(), ...where, method, prayers: s.prayers, leadMin: s.lead, extras: s.extras ?? [] })
    },
    [place, method, post]
  )

  // Keep the server in step when you change city, method, lead time or the prayers you want.
  useEffect(() => {
    if (!ready || !saved.on || !status?.configured || !supported) return
    const key = JSON.stringify([place, method, saved.lead, saved.prayers, saved.extras ?? []])
    if (key === lastSent.current) return
    lastSent.current = key
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => (sub ? sync(sub, saved) : undefined))
      .catch(() => {})
  }, [ready, saved, place, method, status, supported, sync])

  if (!status?.configured || supported === null) return null
  if (!supported) {
    return <p className="text-xs text-gray-500 mb-3">This browser can’t send reminders when the app is closed. (On iPhone, add Deen Companion to your Home Screen first.)</p>
  }

  async function enable() {
    setBusy(true)
    setMsg('')
    try {
      if (!whereOf(place)) throw new Error('Choose your location on this page first, so reminders match your prayer times.')
      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser’s site settings to get reminders.')
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(status!.publicKey!) }))
      const next = { ...saved, on: true }
      await sync(sub, next)
      setSaved(next)
      setMsg('Reminders are on. You will be notified even when the app is closed.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not switch reminders on.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setMsg('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await post('unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
        await sub.unsubscribe()
      }
      setSaved({ ...saved, on: false })
      setMsg('Reminders are off.')
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setBusy(true)
    setMsg('')
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
      if (!sub) throw new Error('Reminders are not switched on yet.')
      await post('test', { endpoint: sub.endpoint })
      setMsg('Test sent — it should appear in a few seconds.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not send a test.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (p: PrayerKey) => {
    const has = saved.prayers.includes(p)
    if (has && saved.prayers.length === 1) return // at least one
    setSaved({ ...saved, prayers: has ? saved.prayers.filter((x) => x !== p) : PRAYERS.filter((x) => x === p || saved.prayers.includes(x)) })
  }

  const toggleExtra = (id: ExtraKey) => {
    const cur = saved.extras ?? []
    setSaved({ ...saved, extras: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
  }

  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3" data-testid="push-reminders">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={saved.on} disabled={busy} onChange={(e) => (e.target.checked ? enable() : disable())} aria-label="Remind me even when the app is closed" />
        Remind me even when the app is closed
      </label>
      <p className="text-xs text-gray-500 mt-1">Sent to this device as a notification. Needs your location (so the times are right) and notification permission.</p>
      {saved.on && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap gap-3">
            {PRAYERS.map((p) => (
              <label key={p} className="flex items-center gap-1">
                <input type="checkbox" checked={saved.prayers.includes(p)} onChange={() => toggle(p)} />
                {PRAYER_NAMES[p].en}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2">
            When:
            <select value={saved.lead} onChange={(e) => setSaved({ ...saved, lead: Number(e.target.value) })} aria-label="How early" className="px-2 py-1 rounded-lg border border-gray-300 bg-white">
              {LEADS.map((l) => (
                <option key={l} value={l}>
                  {l === 0 ? 'At prayer time' : `${l} minutes before`}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="pt-1">
            <legend className="text-xs font-semibold text-gray-600 mb-1">Also remind me (sunnah)</legend>
            <div className="space-y-1">
              {EXTRAS.map((x) => (
                <label key={x.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={(saved.extras ?? []).includes(x.id)} onChange={() => toggleExtra(x.id)} />
                  {x.label}
                </label>
              ))}
            </div>
          </fieldset>
          <button onClick={test} disabled={busy} className="px-3 py-1.5 rounded-lg border border-[#0F766E] text-[#0F766E] font-semibold disabled:opacity-50">
            Send a test reminder
          </button>
        </div>
      )}
      {msg && (
        <p className="text-xs mt-2 text-[#0F766E]" role="status">
          {msg}
        </p>
      )}
    </section>
  )
}
