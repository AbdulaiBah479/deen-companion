'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminCauses from './AdminCauses'

type Status = 'up' | 'degraded' | 'down'
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
  'prayer-api': 'Prayer-times service',
  audio: 'Recitation audio',
  maps: 'Mosque map services',
  push: 'Prayer reminders',
  accounts: 'Accounts',
}
const DOT: Record<Status, string> = { up: 'bg-green-500', degraded: 'bg-amber-500', down: 'bg-red-500' }
const COUNT_ROWS: [string, string][] = [
  ['ai.ask', 'AI questions asked'],
  ['ai.llm', '…answered by an AI model'],
  ['ai.cache', '…answered from saved answers'],
  ['ai.sources', '…answered from sources only'],
  ['mosques', 'Mosque searches'],
  ['search', 'Searches'],
  ['prayer', 'Prayer-time lookups'],
  ['push.subscribe', 'Reminders switched on'],
  ['client-error', 'Page errors reported'],
]

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
    setNote('')
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('This browser cannot receive alerts. On iPhone, add the app to the Home Screen first.')
      const status = await (await fetch('/api/push/status', { cache: 'no-store' })).json()
      if (!status.configured) throw new Error('Push is not set up on the server yet.')
      if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications were not allowed.')
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(status.publicKey) }))
      const res = await fetch('/api/admin/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) })
      if (!res.ok) throw new Error((await res.json()).error || 'Could not register this device')
      setNote('This device will now get alerts.')
      await load()
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not turn on alerts.')
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
  const worst: Status = entries.some(([, s]) => s.status === 'down') ? 'down' : entries.some(([, s]) => s.status === 'degraded') ? 'degraded' : 'up'
  const banner = { up: ['bg-green-50 border-green-300 text-green-900', 'Everything is working.'], degraded: ['bg-amber-50 border-amber-300 text-amber-900', 'Working, but something needs attention.'], down: ['bg-red-50 border-red-300 text-red-900', 'Something is down.'] }[worst]
  const today = d.counters[0]?.counts ?? {}

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-5 max-w-4xl mx-auto space-y-5">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-black text-[#0F766E]">Control room</h1>
        <div className="flex gap-2 text-sm">
          <button onClick={() => act('check', 'Checks')} disabled={!!busy} className="px-3 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50">{busy === 'check' ? 'Checking…' : 'Run checks now'}</button>
          <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 bg-white">Refresh</button>
          <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); setState('signed-out') }} className="px-3 py-2 rounded-lg border border-gray-300 bg-white">Sign out</button>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-gray-300 bg-white p-4 text-sm">The watchdog has not run yet. Press <b>Run checks now</b>, or set up the scheduler (see below).</div>
      ) : (
        <div className={`rounded-xl border p-4 font-semibold ${banner[0]}`} role="status">{banner[1]}</div>
      )}
      {note && <p className="text-sm text-[#0F766E]" role="status">{note}</p>}

      <section aria-labelledby="h-health">
        <h2 id="h-health" className="font-bold mb-2">Health</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {entries.map(([id, s]) => (
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
      </section>

      <section aria-labelledby="h-alerts" className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <h2 id="h-alerts" className="font-bold">Alerts to you</h2>
        <p className="text-sm text-gray-600">When something breaks (and when it recovers) you are told here: {d.reminders.adminDevices} phone(s) registered; chat webhook {d.config['Alert webhook'] ? 'is set' : 'is not set'}.</p>
        <div className="flex gap-2 flex-wrap text-sm">
          <button onClick={enableAlerts} className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] font-semibold">Get alerts on this device</button>
          <button onClick={() => act('test', 'Test')} disabled={!!busy} className="px-3 py-2 rounded-lg border border-gray-300 bg-white disabled:opacity-50">Send a test alert</button>
        </div>
      </section>

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
        <p className="text-xs text-gray-500 mt-1">Today: {today['ai.ask'] ?? 0} AI questions · {d.ai.cachedAnswers} answers saved on this server · {d.reminders.devices ?? '–'} reminder devices.</p>
      </section>

      <section aria-labelledby="h-users">
        <h2 id="h-users" className="font-bold mb-2">Accounts</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
          {!users ? 'Loading…' : !users.configured ? (
            <p className="text-gray-600">Accounts are not switched on yet (Supabase keys missing). Visitors can use the whole app without one; progress stays on their phone.</p>
          ) : users.error ? (
            <p className="text-red-600">{users.error}</p>
          ) : (
            <>
              <p className="mb-2"><b>{users.total}</b> account(s). Newest first:</p>
              <ul className="divide-y divide-gray-100">
                {users.users?.map((u) => (
                  <li key={u.id} className="py-2 flex items-center gap-2">
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{u.email}</span><span className="block text-xs text-gray-500">{u.name || 'no name'} · joined {ago(Date.parse(u.created))} · {u.confirmed ? 'email confirmed' : 'not confirmed'}{u.lastSignIn ? ` · last in ${ago(Date.parse(u.lastSignIn))}` : ''}</span></span>
                    <button onClick={() => removeUser(u.id, u.email)} className="text-xs text-red-600 underline shrink-0">Delete</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="h-rep">
        <h2 id="h-rep" className="font-bold mb-2">Reports from users{reports ? ` (${reports.filter((r) => r.status !== 'resolved').length} open)` : ''}</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
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

      <section aria-labelledby="h-causes">
        <h2 id="h-causes" className="font-bold mb-2">Where donations go (Zakat page)</h2>
        <AdminCauses />
      </section>

      <section aria-labelledby="h-err">
        <h2 id="h-err" className="font-bold mb-2">Page errors today</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
          {d.errors.length === 0 ? <p className="text-gray-600">None reported.</p> : (
            <ul className="space-y-2">{d.errors.map((e) => <li key={e.sig}><b>{e.count}×</b> {e.message} <span className="text-xs text-gray-500">on {e.page} · {e.kind} · {ago(e.last)}</span></li>)}</ul>
          )}
        </div>
      </section>

      <section aria-labelledby="h-inc">
        <h2 id="h-inc" className="font-bold mb-2">What the autopilot noticed and did</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm">
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
      <p className="text-xs text-gray-500 pb-6">Updated {new Date(d.time).toLocaleTimeString()} · refreshes every minute.</p>
    </main>
  )
}
