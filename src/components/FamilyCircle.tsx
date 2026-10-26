'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useLang } from '@/lib/languages'
import { useStored } from '@/lib/storage'

type MemberView = { name: string; me: boolean; streak: number; week: number; today: boolean }
type CircleView = {
  code: string
  name: string
  members: MemberView[]
  joined: boolean
  verse: { ref: string; arabic?: string; text?: string; href?: string }
  question: string
  today: string
}
type Mine = { code: string; name: string }

const localDay = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function newDevice() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// A private circle for a family or a class: check in each day you read Quran, see each other's streaks, and talk about one verse a week.
export default function FamilyCircle() {
  const { lang } = useLang()
  const [device, setDevice, deviceReady] = useStored<string>('deen:device', '')
  const [myName, setMyName] = useStored<string>('deen:circle-name', '')
  const [mine, setMine] = useStored<Mine[]>('deen:circles', [])
  const [open, setOpen] = useState<string | null>(null)
  const [view, setView] = useState<CircleView | null | undefined>(undefined)
  const [circleName, setCircleName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (deviceReady && !device) setDevice(newDevice())
  }, [deviceReady, device, setDevice])

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await fetch('/api/circle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device, ...body }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Something went wrong.')
      return d
    },
    [device]
  )

  const refresh = useCallback(
    async (code: string) => {
      if (!device) return
      try {
        const r = await fetch(`/api/circle?code=${code}&device=${device}&lang=${lang}`, { cache: 'no-store' })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        setView(d)
      } catch {
        setView(null)
      }
    },
    [device, lang]
  )

  useEffect(() => {
    if (!open || !device) return
    setView(undefined)
    refresh(open)
    const id = setInterval(() => refresh(open), 60_000)
    return () => clearInterval(id)
  }, [open, device, refresh])

  const remember = (code: string, name: string) => setMine([{ code, name }, ...mine.filter((c) => c.code !== code)].slice(0, 8))

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      const d = await post({ action: 'create', circle: circleName, name: myName })
      remember(d.code, circleName.trim())
      setCircleName('')
      setOpen(d.code)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }
  async function join(e: React.FormEvent, codeIn?: string) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      const d = await post({ action: 'join', code: codeIn ?? joinCode, name: myName })
      remember(d.code, view?.name ?? 'Family circle')
      setJoinCode('')
      setOpen(d.code)
      await refresh(d.code)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }
  async function checkin() {
    if (!open) return
    setBusy(true)
    try {
      await post({ action: 'checkin', code: open, date: localDay() })
      await refresh(open)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }
  async function leave() {
    if (!open || !window.confirm('Leave this circle? Your check-ins in it will be removed.')) return
    await post({ action: 'leave', code: open }).catch(() => {})
    setMine(mine.filter((c) => c.code !== open))
    setOpen(null)
  }
  async function share() {
    if (!view) return
    const text = `Join our Quran circle “${view.name}” on Deen Companion with the code ${view.code}: ${location.origin}/circle?code=${view.code}`
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {}
  }

  // A link with ?code= pre-fills the join box.
  useEffect(() => {
    const c = new URLSearchParams(location.search).get('code')
    if (c) setJoinCode(c.toUpperCase().slice(0, 12))
  }, [])

  const card = 'rounded-2xl border border-gray-200 bg-white p-4'
  const input = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm'
  const primary = 'px-4 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold disabled:opacity-50'

  // ───────── inside a circle ─────────
  if (open) {
    const myRow = view?.members.find((m) => m.me)
    return (
      <div className="space-y-4">
        <button onClick={() => { setOpen(null); setView(undefined) }} className="text-sm text-[#0F766E] underline">← My circles</button>
        {view === undefined && <p className="text-gray-500">Loading…</p>}
        {view === null && <p className="text-gray-700">This circle could not be opened. It may have been removed, or you are offline.</p>}
        {view && !view.joined && (
          <form onSubmit={(e) => join(e, view.code)} className={card}>
            <p className="text-sm">You are not in this circle yet. Write your name to join <strong>{view.name}</strong>.</p>
            <input value={myName} onChange={(e) => setMyName(e.target.value.slice(0, 20))} placeholder="Your name" aria-label="Your name" className={`${input} mt-2`} />
            <button disabled={busy || !myName.trim()} className={`${primary} mt-2`}>Join</button>
            {msg && <p className="text-sm text-red-700 mt-2" role="alert">{msg}</p>}
          </form>
        )}
        {view && view.joined && (
          <>
            <header>
              <h1 className="text-2xl font-black text-[#0F766E]">{view.name}</h1>
              <p className="text-sm text-gray-600">Code <strong className="tracking-widest" data-testid="circle-code">{view.code}</strong> · {view.members.length} {view.members.length === 1 ? 'person' : 'people'}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={share} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm">{copied ? '✓ Copied' : 'Invite someone'}</button>
                <button onClick={leave} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-600">Leave</button>
              </div>
            </header>

            <section className={card} aria-label="Today">
              {myRow?.today ? (
                <p className="font-semibold text-[#0F766E]" data-testid="circle-checked">✓ You read Quran today. Streak: {myRow.streak} {myRow.streak === 1 ? 'day' : 'days'}.</p>
              ) : (
                <button onClick={checkin} disabled={busy} className={`${primary} w-full py-3 text-base`}>I read Quran today</button>
              )}
              {msg && <p className="text-sm text-red-700 mt-2" role="alert">{msg}</p>}
            </section>

            <section className={card} aria-label="Verse of the week">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#0F766E]">Verse of the week</h2>
              {view.verse.arabic && <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-[2.1] text-center mt-2">{view.verse.arabic}</p>}
              {view.verse.text && <p className="text-gray-800 mt-1">{view.verse.text}</p>}
              <p className="text-xs text-gray-500 mt-1">{view.verse.ref}</p>
              <p className="mt-3 text-sm"><strong>To talk about:</strong> {view.question}</p>
              {view.verse.href && <Link href={view.verse.href} className="inline-block mt-2 text-sm underline text-[#0F766E]">Study this verse together →</Link>}
            </section>

            <section className={card} aria-label="The circle">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#0F766E] mb-2">This week</h2>
              <ul className="divide-y divide-gray-100" data-testid="circle-members">
                {view.members.map((m) => (
                  <li key={m.name} className="py-2 flex items-center gap-3">
                    <span className={`w-6 text-center ${m.today ? 'text-[#0F766E]' : 'text-gray-300'}`} aria-label={m.today ? 'read today' : 'not yet today'}>{m.today ? '✓' : '○'}</span>
                    <span className="flex-1 font-semibold">{m.name}{m.me ? ' (you)' : ''}</span>
                    <span className="text-sm text-gray-600">{m.week}/7 days</span>
                    <span className="text-sm font-bold text-[#0F766E] w-16 text-right">🔥 {m.streak}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-3">Only names and the days people checked in are shared with the circle. Anyone who has the code can join, so share it only with people you trust.</p>
            </section>
          </>
        )}
      </div>
    )
  }

  // ───────── my circles ─────────
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">Family circle</h1>
        <p className="text-sm text-gray-600 mt-1">A private circle for your family or class. Check in each day you read Quran, see each other’s streaks, and talk about one verse a week. No accounts: you share a short code.</p>
      </header>

      {mine.length > 0 && (
        <ul className="space-y-2" data-testid="my-circles">
          {mine.map((c) => (
            <li key={c.code}>
              <button onClick={() => setOpen(c.code)} className="w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-[#0F766E]">
                <span className="font-semibold">{c.name}</span> <span className="text-xs text-gray-500 tracking-widest">{c.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className={card}>
        <label className="text-sm font-semibold" htmlFor="myname">Your name (shown to the circle)</label>
        <input id="myname" value={myName} onChange={(e) => setMyName(e.target.value.slice(0, 20))} placeholder="e.g. Aisha" className={`${input} mt-1`} />
      </section>

      <form onSubmit={create} className={card}>
        <h2 className="font-bold">Start a circle</h2>
        <input value={circleName} onChange={(e) => setCircleName(e.target.value.slice(0, 30))} placeholder="Circle name, e.g. Bah family" aria-label="Circle name" className={`${input} mt-2`} />
        <button disabled={busy || !device || !circleName.trim() || !myName.trim()} className={`${primary} mt-2`}>Create</button>
      </form>

      <form onSubmit={join} className={card}>
        <h2 className="font-bold">Join with a code</h2>
        <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="Code, e.g. K7M2PX" aria-label="Circle code" className={`${input} mt-2 tracking-widest`} />
        <button disabled={busy || !device || joinCode.trim().length < 6 || !myName.trim()} className={`${primary} mt-2`}>Join</button>
      </form>
      {msg && <p className="text-sm text-red-700" role="alert">{msg}</p>}
    </div>
  )
}
