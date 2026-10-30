'use client'

import { useCallback, useEffect, useState } from 'react'
import { checkEmailLocally } from '@/lib/email-check'
import AdminCauses from './AdminCauses'
import AdminSupport from './AdminSupport'

type Status = 'up' | 'degraded' | 'down'
type Tab = 'today' | 'people' | 'money' | 'system'
type Component = { status: Status; since: number; checkedAt: number; detail: string; ms?: number }
type Overview = {
  time: string
  statuses: Record<string, Component & { label?: string }>
  incidents: { at: number; level: string; component: string; message: string }[]
  counters: { day: string; counts: Record<string, number> }[]
  errors: { sig: string; count: number; kind: string; page: string; message: string; last: number }[]
  ai: {
    configured: number
    cachedAnswers: number
    providers: { name: string; available: boolean; retryInSeconds: number; reason?: string; session: { ok: number; fail: number; ewmaMs: number } | null; history: { ok: number; fail: number; ewmaMs: number; lastError?: string; lastOk?: number } | null }[]
    discoveredModels: Record<string, string[]>
  }
  todo?: { id: string; done: boolean; unknown?: boolean; title: string; how: string }[]
  reminders: { configured: boolean; devices: number | null; adminDevices: number }
  config: Record<string, boolean | number>
}
type ReportRow = { id: string; at: number; category: string; message: string; page: string; ref?: string; contact?: string; status: 'open' | 'looking' | 'resolved' }
type Users = { configured: boolean; total?: number; error?: string; users?: { id: string; email: string; name: string; created: string; lastSignIn: string | null; confirmed: boolean }[] }

const LABELS: Record<string, string> = {
  app: 'App and its data',
  redis: 'Shared store (Redis)',
  ai: 'AI companion',
  'hadith-cdn': 'Hadith source',
  'tafsir-api': 'Tafsir source',
  books: 'Book sources',
  'prayer-api': 'Prayer-times service',
  audio: 'Recitation audio',
  maps: 'Mosque map services',
  push: 'Prayer reminders',
  accounts: 'Accounts',
}
const DOT: Record<Status, string> = { up: 'bg-green-500', degraded: 'bg-amber-500', down: 'bg-red-500' }
const COUNT_ROWS: [string, string][] = [
  ['ai.ask', 'AI questions asked'],
  ['tafsir.explain', 'Verse explanations written'],
  ['khutbah.make', 'Sermon drafts prepared'],
  ['books.ai', 'Book paragraphs translated or explained'],
  ['books.ask', 'Questions asked to a book'],
  ['circle.create', 'Family circles created'],
  ['circle.join', 'People who joined a family circle'],
  ['ai.llm', '…answered by an AI model'],
  ['ai.cache', '…answered from saved answers'],
  ['ai.sources', '…answered from sources only'],
  ['mosques', 'Mosque searches'],
  ['search', 'Searches'],
  ['prayer', 'Prayer-time lookups'],
  ['push.subscribe', 'Reminders switched on'],
  ['client-error', 'Page errors reported'],
]

const msSince = (t: number) => Date.now() - t
const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 90) return `${s}s ago`
  if (s < 5400) return `${Math.round(s / 60)} min ago`
  if (s < 129600) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4)
  const raw = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export default function AdminConsole() {
  const [state, setState] = useState<'loading' | 'signed-out' | 'ready'>('loading')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<Overview | null>(null)
  const [users, setUsers] = useState<Users | null>(null)
  const [reports, setReports] = useState<ReportRow[] | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [tab, setTab] = useState<Tab>('today')
  const [showAllTodo, setShowAllTodo] = useState(false)
  const [showAllHealth, setShowAllHealth] = useState(false)
  const [alertBusy, setAlertBusy] = useState(false)
  const [alertMsg, setAlertMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [env, setEnv] = useState({ pushOk: false, ios: false, standalone: false, permission: 'default' as string })
  const toast = note

  // What this device can do about alerts, shown in plain words in the Alerts box.
  useEffect(() => {
    const ua = navigator.userAgent
    setEnv({
      pushOk: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
      ios: /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1),
      standalone: window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
      permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
    })
  }, [state])
  // A message stays long enough to read, then goes away by itself.
  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(''), 10_000)
    return () => clearTimeout(t)
  }, [note])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' })
      if (res.status === 401) return setState('signed-out')
      if (!res.ok) throw new Error('Could not load')
      setData(await res.json())
      setState('ready')
      fetch('/api/admin/users', { cache: 'no-store' })
        .then((r) => r.json())
        .then(setUsers)
        .catch(() => {})
      fetch('/api/admin/reports', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => setReports(d.reports ?? []))
        .catch(() => {})
    } catch {
      setError('Could not reach the server.')
      setState((s) => (s === 'loading' ? 'signed-out' : s))
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => document.visibilityState === 'visible' && void load(), 60_000)
    return () => clearInterval(t)
  }, [load])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) return setError(d.error || 'Could not sign in')
    setKey('')
    await load()
  }

  async function act(action: string, label: string) {
    setBusy(action)
    setNote('')
    try {
      const res = await fetch('/api/admin/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      if (action === 'test') setNote(`Test alert sent to ${d.push} phone(s)${d.webhook ? ' and the webhook' : ''}.`)
      else if (action === 'models') setNote(Object.keys(d.found).length ? `Found working models: ${Object.entries(d.found).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' · ')}` : `No change. ${d.notes.join(' · ')}`)
      else if (action === 'check') setNote(d.report.ok ? 'Checks finished: everything important is fine.' : 'Checks finished: something important is down — see below.')
      else setNote(`${label} done.`)
      await load()
    } catch (e) {
      setNote(e instanceof Error && e.message ? e.message : 'That did not work.')
    } finally {
      setBusy('')
    }
  }

  async function enableAlerts() {
    setAlertMsg(null)
    setAlertBusy(true)
    const step = (text: string) => setAlertMsg({ ok: true, text })
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
        throw new Error(env.ios && !env.standalone ? 'On iPhone, alerts only work from the installed app. Tap Share → Add to Home Screen, open Deen Companion from your home screen, sign in here again and press this button.' : 'This browser cannot receive alerts. Use Chrome on Android, or the installed app.')
      }
      step('1 of 4: checking the server…')
      const status = await (await fetch('/api/push/status', { cache: 'no-store' })).json()
      if (!status.configured) throw new Error('Push is not set up on the server yet.')
      step('2 of 4: asking your phone to allow notifications… tap Allow when it asks.')
      const perm = await Notification.requestPermission()
      if (perm === 'denied') throw new Error('Notifications are blocked for this site. Open your browser’s site settings for this website, set Notifications to Allow, reload this page and try again.')
      if (perm !== 'granted') throw new Error('You did not allow notifications. Press the button again and tap Allow.')
      step('3 of 4: connecting this device…')
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('The app’s background helper (service worker) did not start. Reload the page once and try again.')), 10_000))])
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(status.publicKey) }))
      step('4 of 4: saving it…')
      const res = await fetch('/api/admin/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'The server did not accept this device.')
      setAlertMsg({ ok: true, text: '✅ Done. This device will now get alerts. Press “Send a test alert” to check.' })
      await load()
    } catch (e) {
      setAlertMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not turn on alerts.' })
    } finally {
      setAlertBusy(false)
      setEnv((x) => ({ ...x, permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission }))
    }
  }

  async function setReport(id: string, status: ReportRow['status']) {
    await fetch('/api/admin/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    setReports((r) => (r ? r.map((x) => (x.id === id ? { ...x, status } : x)) : r))
  }
  async function dropReport(id: string) {
    if (!confirm('Remove this report?')) return
    await fetch('/api/admin/reports?id=' + id, { method: 'DELETE' })
    setReports((r) => (r ? r.filter((x) => x.id !== id) : r))
  }

  async function removeUser(id: string, email: string) {
    if (!confirm(`Delete the account ${email}? This also removes its saved progress and cannot be undone.`)) return
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    setNote(res.ok ? 'Account deleted.' : (await res.json()).error || 'Could not delete.')
    await load()
  }

  async function removeMany(list: { id: string; email: string }[]) {
    const names = list.map((u) => u.email).join(', ')
    if (!confirm(`Delete these ${list.length} account(s)? ${names}. Their saved progress is removed too. This cannot be undone.`)) return
    let done = 0
    for (const u of list) if ((await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' })).ok) done++
    setNote(`Deleted ${done} of ${list.length} account(s).`)
    await load()
  }

  if (state === 'loading') return <main className="p-6 text-gray-500">Loading…</main>

  if (state === 'signed-out') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-[#F8FAFC]">
        <form onSubmit={login} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-black text-[#0F766E]">Control room</h1>
          <p className="text-sm text-gray-600">Only the owner can open this. Enter your admin key.</p>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="current-password" aria-label="Admin key" placeholder="Admin key" className="w-full px-3 py-2 rounded-lg border border-gray-300" />
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button className="w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold">Open</button>
        </form>
      </main>
    )
  }

  const d = data!
  const entries = Object.entries(d.statuses)
  const bad = entries.filter(([, s]) => s.status !== 'up')
  const worst: Status = entries.some(([, s]) => s.status === 'down') ? 'down' : entries.some(([, s]) => s.status === 'degraded') ? 'degraded' : 'up'
  const newestCheck = entries.reduce((m, [, s]) => Math.max(m, s.checkedAt), 0)
  const stale = entries.length > 0 && msSince(newestCheck) > 30 * 60_000
  const banner = { up: ['bg-green-50 border-green-300 text-green-900', 'Everything is working.'], degraded: ['bg-amber-50 border-amber-300 text-amber-900', 'Working, but something needs attention.'], down: ['bg-red-50 border-red-300 text-red-900', 'Something is down.'] }[worst]
  const today = d.counters[0]?.counts ?? {}
  const todoLeft = d.todo ? d.todo.filter((t) => !t.done) : []
  const openReports = reports ? reports.filter((r) => r.status !== 'resolved').length : 0
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'today', label: 'Today', badge: todoLeft.length + bad.length },
    { id: 'people', label: 'People', badge: openReports },
    { id: 'money', label: 'Money' },
    { id: 'system', label: 'System' },
  ]
  const card = 'bg-white border border-gray-200 rounded-xl p-4'

  return (
    <main className="min-h-screen bg-[#F8FAFC] max-w-4xl mx-auto pb-24">
      <header className="sticky top-0 z-20 bg-[#F8FAFC]/95 backdrop-blur border-b border-gray-200 px-4 pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-black text-[#0F766E]">Control room</h1>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${banner[0]}`} role="status">
            <span className={`w-2 h-2 rounded-full ${DOT[worst]}`} aria-hidden="true" />
            {entries.length === 0 ? 'Not checked yet' : worst === 'up' ? 'All good' : worst === 'degraded' ? 'Needs attention' : 'Something is down'}
          </span>
          <div className="flex gap-2 text-sm w-full sm:w-auto sm:ml-auto">
            <button onClick={() => act('check', 'Checks')} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50">{busy === 'check' ? 'Checking…' : 'Run checks'}</button>
            <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white" aria-label="Refresh">⟳</button>
            <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); setState('signed-out') }} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white">Sign out</button>
          </div>
        </div>
        <nav className="grid grid-cols-4 gap-1 mt-2" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`px-1 py-2 text-sm font-semibold rounded-t-lg border-b-2 ${tab === t.id ? 'border-[#0F766E] text-[#0F766E]' : 'border-transparent text-gray-600'}`}>
              {t.label}
              {t.badge ? <span className="ml-1.5 text-[11px] bg-amber-500 text-white rounded-full px-1.5 py-0.5">{t.badge}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[92vw] bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-lg flex items-start gap-3" role="status" data-testid="admin-toast">
          <span className="min-w-0 break-words">{toast}</span>
          <button onClick={() => setNote('')} aria-label="Close message" className="text-gray-300 shrink-0">✕</button>
        </div>
      )}

      <div className="px-4 py-5 space-y-5">
        {tab === 'today' && (
          <>
            {stale && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="stale-checks">
                <b>The automatic health checks have not run for {ago(newestCheck).replace(' ago', '')}.</b> They should run every 10 minutes. Press <b>Run checks</b> now. If this keeps happening, the outside timer is not set up: see the first item of your to-do list (cron-job.org).
              </div>
            )}
            {entries.length === 0 && <div className={card}>The health checks have not run yet. Press <b>Run checks</b> at the top.</div>}

            {todoLeft.length > 0 ? (
              <section aria-labelledby="h-todo" className="bg-amber-50 border border-amber-200 rounded-xl p-4" data-testid="admin-todo">
                <h2 id="h-todo" className="font-bold">Your to-do list <span className="text-amber-800 font-semibold">({todoLeft.length} left)</span></h2>
                <p className="text-xs text-amber-900 mb-2">Worked out live from the app’s set-up. Each item ticks itself when it is done.</p>
                <ul className="space-y-2.5">
                  {(showAllTodo ? d.todo! : todoLeft.slice(0, 3)).map((t) => (
                    <li key={t.id} className="text-sm">
                      <p className="font-semibold">{t.done ? '✅' : t.unknown ? '❔' : '⬜'} {t.title}</p>
                      {!t.done && <p className="text-xs text-gray-700 ml-6">{t.unknown ? 'Could not check this automatically. ' : ''}{t.how}</p>}
                    </li>
                  ))}
                </ul>
                {(todoLeft.length > 3 || d.todo!.some((t) => t.done)) && (
                  <button onClick={() => setShowAllTodo((v) => !v)} className="mt-3 text-xs underline text-amber-900 font-semibold">{showAllTodo ? 'Show only the next 3' : `Show everything (${d.todo!.length} items, including the ${d.todo!.length - todoLeft.length} done)`}</button>
                )}
              </section>
            ) : (
              <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-900">✅ Your to-do list is empty. Everything is set up.</div>
            )}

            <section aria-label="Right now" className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="admin-numbers">
              {[
                ['Accounts', users?.total ?? '–'],
                ['Open reports', reports ? openReports : '–'],
                ['AI questions today', today['ai.ask'] ?? 0],
                ['Reminder phones', d.reminders.devices ?? '–'],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-[#0F766E] tabular-nums">{value}</div>
                  <div className="text-[11px] text-gray-600">{label}</div>
                </div>
              ))}
            </section>

            <section aria-labelledby="h-alerts" className={`${card} space-y-3`} data-testid="admin-alerts">
              <h2 id="h-alerts" className="font-bold">Alerts to your phone</h2>
              <p className="text-sm text-gray-600">When something breaks, and when it recovers, you are told. Right now: <b>{d.reminders.adminDevices}</b> phone(s) registered; chat webhook {d.config['Alert webhook'] ? <b>is set</b> : 'is not set'}.</p>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm space-y-1" data-testid="alert-diagnosis">
                <p className="font-semibold">This device</p>
                <p>{env.pushOk ? '✅' : '⬜'} {env.pushOk ? 'Can receive alerts.' : env.ios && !env.standalone ? 'iPhone in Safari: alerts only work from the installed app. Tap Share → Add to Home Screen → Add, then open Deen Companion from your home screen and come back here.' : 'This browser cannot receive alerts. Try Chrome on Android, or the installed app.'}</p>
                <p>{env.permission === 'granted' ? '✅ Notifications are allowed.' : env.permission === 'denied' ? '⬜ Notifications are blocked for this site. Open the browser’s site settings for this website and set Notifications to Allow, then reload.' : '⬜ Notifications are not allowed yet. Pressing the button below will ask.'}</p>
              </div>
              <div className="flex gap-2 flex-wrap text-sm">
                <button onClick={enableAlerts} disabled={alertBusy} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50">{alertBusy ? 'Working…' : 'Turn on alerts on this device'}</button>
                <button onClick={() => act('test', 'Test')} disabled={!!busy} className="px-4 py-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50">Send a test alert</button>
              </div>
              {alertMsg && <p className={`text-sm rounded-lg p-2 ${alertMsg.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-800'}`} role="status" data-testid="alert-result">{alertMsg.text}</p>}
              <details className="text-sm text-gray-700">
                <summary className="cursor-pointer font-semibold">Can’t get phone alerts to work? Use the free ntfy app instead</summary>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Install the free app <b>ntfy</b> on your phone (App Store or Google Play).</li>
                  <li>In the app, tap + and subscribe to a topic with a long private name, for example <code>deen-alerts-x7k2q9m4</code>.</li>
                  <li>In Vercel → Settings → Environment Variables add <code>ALERT_WEBHOOK_URL</code> = <code>https://ntfy.sh/deen-alerts-x7k2q9m4</code> (your topic), then Redeploy.</li>
                  <li>Come back here and press <b>Send a test alert</b>. It should appear in the ntfy app.</li>
                </ol>
              </details>
            </section>

            <section aria-labelledby="h-health">
              <h2 id="h-health" className="font-bold mb-2">Health</h2>
              {bad.length === 0 && entries.length > 0 && <p className="text-sm text-green-800 mb-2">✅ All {entries.length} services are working.</p>}
              <div className="grid sm:grid-cols-2 gap-2">
                {(showAllHealth ? entries : bad).map(([id, s]) => (
                  <div key={id} className="bg-white border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${DOT[s.status]}`} aria-hidden="true" />
                      <span className="font-semibold text-sm">{LABELS[id] ?? id}</span>
                      <span className="ml-auto text-xs text-gray-500">{s.status}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{s.detail}{s.ms !== undefined ? ` · ${s.ms} ms` : ''}</p>
                    <p className="text-[11px] text-gray-500">{s.status === 'up' ? 'fine since' : `${s.status} since`} {ago(s.since)} · checked {ago(s.checkedAt)}</p>
                  </div>
                ))}
              </div>
              {entries.length > 0 && <button onClick={() => setShowAllHealth((v) => !v)} className="mt-2 text-xs underline text-gray-600">{showAllHealth ? 'Show only problems' : `Show all ${entries.length} services`}</button>}
            </section>
          </>
        )}

        {tab === 'people' && (
          <>
            <section aria-labelledby="h-users">
              <h2 id="h-users" className="font-bold mb-2">Accounts</h2>
              <div className={`${card} text-sm`}>
                {!users ? 'Loading…' : !users.configured ? (
                  <p className="text-gray-600">Accounts are not switched on yet (Supabase keys missing). Visitors can use the whole app without one; progress stays on their phone.</p>
                ) : users.error ? (
                  <p className="text-red-600">{users.error}</p>
                ) : (
                  <>
                    <p className="mb-2"><b>{users.total}</b> account(s). Newest first:</p>
                    {(() => {
                      const fake = (users.users ?? []).filter((u) => !checkEmailLocally(u.email).ok)
                      return fake.length > 0 ? (
                        <p className="mb-2 rounded-lg bg-red-50 border border-red-200 p-2 text-red-800 text-xs" data-testid="fake-accounts">
                          {fake.length} account(s) use an e-mail that looks fake or temporary (marked ⚠ below).{' '}
                          <button onClick={() => removeMany(fake)} className="underline font-semibold">Delete them</button>
                        </p>
                      ) : null
                    })()}
                    <ul className="divide-y divide-gray-100">
                      {users.users?.map((u) => (
                        <li key={u.id} className="py-2 flex items-center gap-2">
                          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{!checkEmailLocally(u.email).ok && <span title="looks fake or temporary">⚠ </span>}{u.email}</span><span className="block text-xs text-gray-500">{u.name || 'no name'} · joined {ago(Date.parse(u.created))} · {u.confirmed ? 'email confirmed' : 'not confirmed'}{u.lastSignIn ? ` · last in ${ago(Date.parse(u.lastSignIn))}` : ''}</span></span>
                          <button onClick={() => removeUser(u.id, u.email)} className="text-xs text-red-600 underline shrink-0">Delete</button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>

            <section aria-labelledby="h-rep">
              <h2 id="h-rep" className="font-bold mb-2">Reports from users{reports ? ` (${openReports} open)` : ''}</h2>
              <div className={`${card} text-sm`}>
                {!reports ? 'Loading…' : reports.length === 0 ? <p className="text-gray-600">No reports yet.</p> : (
                  <ul className="divide-y divide-gray-100">
                    {reports.map((r) => (
                      <li key={r.id} className="py-2 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase text-gray-600">{r.category}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${r.status === 'open' ? 'bg-amber-100 text-amber-800' : r.status === 'looking' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{r.status}</span>
                          <span className="text-xs text-gray-500 ml-auto">{ago(r.at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{r.message}</p>
                        <p className="text-xs text-gray-500 break-all">{r.ref ? `About: ${r.ref} · ` : ''}{r.page ? `From: ${r.page} · ` : ''}{r.contact ? `Contact: ${r.contact}` : 'No contact left'}</p>
                        <div className="flex gap-3 text-xs">
                          {r.status !== 'looking' && <button onClick={() => setReport(r.id, 'looking')} className="text-[#0F766E] underline">Looking into it</button>}
                          {r.status !== 'resolved' && <button onClick={() => setReport(r.id, 'resolved')} className="text-[#0F766E] underline">Mark resolved</button>}
                          {r.status === 'resolved' && <button onClick={() => setReport(r.id, 'open')} className="text-[#0F766E] underline">Reopen</button>}
                          <button onClick={() => dropReport(r.id)} className="text-red-600 underline ml-auto">Remove</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'money' && (
          <>
            <section aria-labelledby="h-support">
              <h2 id="h-support" className="font-bold mb-2">Support page: money ledger and sponsor</h2>
              <AdminSupport />
            </section>
            <section aria-labelledby="h-causes">
              <h2 id="h-causes" className="font-bold mb-2">Where donations go (Zakat page)</h2>
              <AdminCauses />
            </section>
          </>
        )}

        {tab === 'system' && (
          <>
            <section aria-labelledby="h-ai">
              <h2 id="h-ai" className="font-bold mb-2">AI providers</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500"><th className="p-2">Provider</th><th className="p-2">Now</th><th className="p-2">Answered</th><th className="p-2">Failed</th><th className="p-2">Speed</th></tr></thead>
                  <tbody>
                    {d.ai.providers.map((p) => {
                      const h = p.history ?? p.session
                      return (
                        <tr key={p.name} className="border-t border-gray-100">
                          <td className="p-2 font-medium">{p.name}</td>
                          <td className="p-2">{p.available ? <span className="text-green-700">ready</span> : <span className="text-amber-700">resting {p.retryInSeconds}s{p.reason ? ` (${p.reason})` : ''}</span>}</td>
                          <td className="p-2">{h?.ok ?? 0}</td>
                          <td className="p-2" title={p.history?.lastError}>{h?.fail ?? 0}</td>
                          <td className="p-2">{h ? `${(h.ewmaMs / 1000).toFixed(1)}s` : '–'}</td>
                        </tr>
                      )
                    })}
                    {d.ai.providers.length === 0 && <tr><td className="p-3 text-gray-500" colSpan={5}>No AI keys are set, so answers come from sources only.</td></tr>}
                  </tbody>
                </table>
              </div>
              {Object.keys(d.ai.discoveredModels).length > 0 && <p className="text-xs text-gray-600 mt-2">Models in use (found automatically): {Object.entries(d.ai.discoveredModels).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' · ')}</p>}
              <div className="flex gap-2 mt-2 text-sm flex-wrap">
                <button onClick={() => act('models', 'Lookup')} disabled={!!busy} className="px-3 py-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50">{busy === 'models' ? 'Looking…' : 'Look up current AI models'}</button>
                <button onClick={() => act('reset-ai', 'Cool-downs cleared')} disabled={!!busy} className="px-3 py-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50">Clear AI cool-downs</button>
              </div>
            </section>

            <section aria-labelledby="h-use">
              <h2 id="h-use" className="font-bold mb-2">Usage (counts only — no personal data)</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500"><th className="p-2">What</th>{d.counters.slice(0, 7).map((c) => <th key={c.day} className="p-2">{c.day.slice(5)}</th>)}</tr></thead>
                  <tbody>
                    {COUNT_ROWS.map(([k, label]) => (
                      <tr key={k} className="border-t border-gray-100"><td className="p-2">{label}</td>{d.counters.slice(0, 7).map((c) => <td key={c.day} className="p-2 tabular-nums">{c.counts[k] ?? 0}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-1">{d.ai.cachedAnswers} answers saved on this server · {d.reminders.devices ?? '–'} reminder devices.</p>
            </section>

            <section aria-labelledby="h-err">
              <h2 id="h-err" className="font-bold mb-2">Page errors today</h2>
              <div className={`${card} text-sm`}>
                {d.errors.length === 0 ? <p className="text-gray-600">None reported.</p> : (
                  <ul className="space-y-2">{d.errors.map((e) => <li key={e.sig}><b>{e.count}×</b> {e.message} <span className="text-xs text-gray-500">on {e.page} · {e.kind} · {ago(e.last)}</span></li>)}</ul>
                )}
              </div>
            </section>

            <section aria-labelledby="h-inc">
              <h2 id="h-inc" className="font-bold mb-2">What the autopilot noticed and did</h2>
              <div className={`${card} text-sm`}>
                {d.incidents.length === 0 ? <p className="text-gray-600">Nothing yet.</p> : (
                  <ul className="space-y-1.5">{d.incidents.map((i, k) => <li key={k}><span className={i.level === 'critical' ? 'text-red-700' : i.level === 'warn' ? 'text-amber-700' : 'text-gray-500'}>{i.level === 'critical' ? '●' : i.level === 'warn' ? '●' : '○'}</span> {i.message} <span className="text-xs text-gray-500">· {i.component} · {ago(i.at)}</span></li>)}</ul>
                )}
              </div>
            </section>

            <section aria-labelledby="h-set">
              <h2 id="h-set" className="font-bold mb-2">Setup checklist</h2>
              <ul className="bg-white border border-gray-200 rounded-xl p-3 text-sm grid sm:grid-cols-2 gap-1">
                {Object.entries(d.config).map(([k, v]) => (
                  <li key={k}>{typeof v === 'number' ? (v > 0 ? '✅' : '⬜') : v ? '✅' : '⬜'} {k}{typeof v === 'number' ? `: ${v}` : ''}</li>
                ))}
              </ul>
            </section>
          </>
        )}

        <p className="text-xs text-gray-500">Updated {new Date(d.time).toLocaleTimeString()} · refreshes every minute.</p>
      </div>
    </main>
  )
}
