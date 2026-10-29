'use client'

import { useCallback, useEffect, useState } from 'react'
import { CURRENCIES, money, parseSponsor, summarize, sum, type Ledger, type LedgerMonth, type Line, type Sponsor } from '@/lib/support-shared'

type Data = { ledger: Ledger; sponsor: Sponsor; canEdit: boolean }
type Draft = { month: string; income: string; costs: string; note: string }

const toText = (lines: Line[]) => lines.map((l) => `${l.label} | ${l.amount}`).join('\n')
function fromText(t: string): Line[] {
  return t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.lastIndexOf('|')
      return { label: (i < 0 ? l : l.slice(0, i)).trim(), amount: Number((i < 0 ? '' : l.slice(i + 1)).trim().replace(/,/g, '')) }
    })
}

// Owner's editor for the public "Where the money goes" ledger and the single labelled sponsor slot.
export default function AdminSupport() {
  const [data, setData] = useState<Data | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [sponsor, setSponsor] = useState<Sponsor | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/support', { cache: 'no-store' })
    if (res.ok) {
      const d = (await res.json()) as Data
      setData(d)
      setSponsor((cur) => cur ?? d.sponsor)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function save(body: object, ok: string) {
    setBusy(true)
    setNote('')
    try {
      const res = await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'That did not work.')
      setNote(ok)
      await load()
      return true
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'That did not work.')
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <p className="text-sm text-gray-500">Loading…</p>
  const cur = data.ledger.currency
  const s = summarize(data.ledger)
  const input = 'mt-1 w-full px-2 py-1.5 rounded border border-gray-300 bg-white'

  async function saveMonth() {
    if (!draft || !data) return
    const m: LedgerMonth = { month: draft.month, income: fromText(draft.income), costs: fromText(draft.costs), note: draft.note }
    const months = [...data.ledger.months.filter((x) => x.month !== m.month), m]
    if (await save({ ledger: { ...data.ledger, months } }, 'Saved. The Support page shows it within a few minutes.')) setDraft(null)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm space-y-4" data-testid="admin-support">
      {note && <p className="text-[#0F766E]" role="status">{note}</p>}
      {!data.canEdit && <p className="text-red-600">Editing needs the shared store (Redis), which is not connected.</p>}

      <div className="space-y-2">
        <h3 className="font-semibold">Public ledger — “Where the money goes”</h3>
        <p className="text-gray-600 text-xs">Type each month’s real income and costs. Users see it on the Support page. Be exact: it is a trust.</p>
        <label className="block text-xs">Currency
          <select value={cur} onChange={(e) => void save({ ledger: { ...data.ledger, currency: e.target.value } }, 'Currency saved.')} disabled={!data.canEdit} className="ml-2 px-2 py-1 rounded border border-gray-300 bg-white">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <p className="text-xs">Total received <b>{money(s.income, cur)}</b> · spent <b>{money(s.costs, cur)}</b> · left <b>{money(s.balance, cur)}</b></p>
        <ul className="divide-y divide-gray-100">
          {s.rows.map((m) => (
            <li key={m.month} className="py-1.5 flex items-center gap-2">
              <span className="flex-1">{m.month}: in {money(m.totalIncome, cur)}, out {money(m.totalCosts, cur)}</span>
              {data.canEdit && (
                <span className="flex gap-3 text-xs">
                  <button onClick={() => setDraft({ month: m.month, income: toText(m.income), costs: toText(m.costs), note: m.note })} className="text-[#0F766E] underline">Edit</button>
                  <button onClick={() => confirm(`Remove ${m.month} from the public ledger?`) && void save({ ledger: { ...data.ledger, months: data.ledger.months.filter((x) => x.month !== m.month) } }, 'Month removed.')} className="text-red-600 underline">Remove</button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {data.canEdit && !draft && (
          <button onClick={() => setDraft({ month: new Date().toISOString().slice(0, 7), income: '', costs: '', note: '' })} className="px-3 py-2 rounded-lg bg-[#0F766E] text-white font-semibold" data-testid="add-month">
            Add or change a month
          </button>
        )}
        {draft && (
          <form onSubmit={(e) => { e.preventDefault(); void saveMonth() }} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
            <label className="block">Month<input type="month" value={draft.month} onChange={(e) => setDraft({ ...draft, month: e.target.value })} required className={input} /></label>
            <label className="block">Money received — one per line, as: Name | amount<textarea value={draft.income} onChange={(e) => setDraft({ ...draft, income: e.target.value })} rows={3} placeholder={'Supporters (12 people) | 85\nSponsor: Example Bookshop | 50'} className={`${input} font-mono text-xs`} /></label>
            <label className="block">Money spent — one per line, as: Name | amount<textarea value={draft.costs} onChange={(e) => setDraft({ ...draft, costs: e.target.value })} rows={3} placeholder={'Hosting (Vercel Pro) | 20\nDomain | 1.25'} className={`${input} font-mono text-xs`} /></label>
            <p className="text-xs text-gray-500">This month: in {money(sum(fromText(draft.income).filter((l) => Number.isFinite(l.amount))), cur)}, out {money(sum(fromText(draft.costs).filter((l) => Number.isFinite(l.amount))), cur)}</p>
            <label className="block">A note for readers (optional)<textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} maxLength={300} rows={2} className={input} /></label>
            <div className="flex gap-2">
              <button disabled={busy} className="px-3 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50">Save month</button>
              <button type="button" onClick={() => setDraft(null)} className="px-3 py-2 rounded-lg border border-gray-300 bg-white">Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <h3 className="font-semibold">Sponsor slot</h3>
        <p className="text-gray-600 text-xs">One labelled line on the home and More pages. https links only. Never shown on worship screens.</p>
        {sponsor && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void save({ sponsor }, sponsor.active ? 'Sponsor is live.' : 'Sponsor is switched off.')
            }}
            className="space-y-2"
          >
            <label className="block">Name<input value={sponsor.name} onChange={(e) => setSponsor({ ...sponsor, name: e.target.value })} maxLength={50} className={input} /></label>
            <label className="block">One short line<input value={sponsor.line} onChange={(e) => setSponsor({ ...sponsor, line: e.target.value })} maxLength={90} className={input} /></label>
            <label className="block">Website (https://…)<input value={sponsor.url} onChange={(e) => setSponsor({ ...sponsor, url: e.target.value })} maxLength={300} className={input} /></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={sponsor.active} onChange={(e) => setSponsor({ ...sponsor, active: e.target.checked })} /> Show it to visitors</label>
            {!parseSponsor(sponsor) && <p className="text-xs text-amber-700">Needs a name, a line and an https:// website before it can be saved.</p>}
            <button disabled={busy || !data.canEdit} className="px-3 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50">Save sponsor</button>
          </form>
        )}
      </div>
    </div>
  )
}
