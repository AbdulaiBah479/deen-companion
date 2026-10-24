'use client'

import { useCallback, useEffect, useState } from 'react'
import { CAUSE_CATEGORIES, ZAKAT_FIT_LABEL, type Cause, type ZakatFit } from '@/lib/causes-shared'

type Draft = { id: string; title: string; summary: string; category: string; zakat: ZakatFit; zakatNote: string; links: string; active: boolean }
const EMPTY: Draft = { id: '', title: '', summary: '', category: 'emergency', zakat: 'depends', zakatNote: '', links: '', active: true }
const toDraft = (c: Cause): Draft => ({ ...c, links: c.links.map((l) => `${l.name} | ${l.url}`).join('\n') })

// Owner's editor for "Where your zakat can go": add, change, hide or remove causes. Every link must start with https://.
export default function AdminCauses() {
  const [data, setData] = useState<{ customized: boolean; causes: Cause[]; canEdit: boolean } | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/causes', { cache: 'no-store' })
    if (res.ok) setData(await res.json())
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function post(body: object) {
    setBusy(true)
    setNote('')
    try {
      const res = await fetch('/api/admin/causes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'That did not work.')
      await load()
      return true
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'That did not work.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!draft) return
    const links = draft.links
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, ...rest] = l.split('|')
        return { name: (name ?? '').trim(), url: rest.join('|').trim() }
      })
    const id = draft.id || draft.title
    if (await post({ cause: { ...draft, id, links } })) {
      setDraft(null)
      setNote('Saved. It is live on the Zakat page within a few minutes.')
    }
  }

  async function remove(c: Cause) {
    if (!confirm(`Remove “${c.title}” from the Zakat page?`)) return
    setBusy(true)
    await fetch('/api/admin/causes?id=' + c.id, { method: 'DELETE' })
    setBusy(false)
    await load()
  }

  if (!data) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm space-y-3">
      <p className="text-gray-600">
        These appear on the Zakat page under “Where your zakat can go”. {data.customized ? 'This is your own list.' : 'Right now the visitor sees the starter list below — check every organisation, then press “Customize” to make it yours.'} The app never handles money; links open the charity’s own website.
      </p>
      {!data.canEdit && <p className="text-red-600">Editing needs the shared store (Redis), which is not connected.</p>}
      {note && <p className="text-[#0F766E]" role="status">{note}</p>}

      <ul className="divide-y divide-gray-100">
        {data.causes.map((c) => (
          <li key={c.id} className="py-2 flex items-start gap-2">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{c.title} {!c.active && <span className="text-xs text-amber-700">(hidden)</span>}</span>
              <span className="block text-xs text-gray-500">{CAUSE_CATEGORIES.find((x) => x.id === c.category)?.label} · {ZAKAT_FIT_LABEL[c.zakat]} · {c.links.map((l) => l.name).join(', ')}</span>
            </span>
            {data.canEdit && (
              <span className="flex gap-3 text-xs shrink-0">
                <button onClick={() => setDraft(toDraft(c))} className="text-[#0F766E] underline">Edit</button>
                <button onClick={() => post({ cause: { ...c, active: !c.active } })} className="text-[#0F766E] underline">{c.active ? 'Hide' : 'Show'}</button>
                <button onClick={() => remove(c)} className="text-red-600 underline">Remove</button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {data.canEdit && !draft && (
        <div className="flex gap-2 flex-wrap">
          {!data.customized && <button onClick={() => post({ action: 'customize' })} disabled={busy} className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] font-semibold disabled:opacity-50">Customize this list</button>}
          <button onClick={() => setDraft({ ...EMPTY })} className="px-3 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">Add a cause</button>
          {data.customized && (
            <button
              onClick={() => {
                if (confirm('Go back to the starter list? Your changes will be lost.')) void post({ action: 'reset' })
              }}
              className="px-3 py-2 rounded-lg border border-gray-300"
            >
              Reset to the starter list
            </button>
          )}
        </div>
      )}

      {draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
          className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50"
        >
          <p className="font-semibold">{draft.id ? 'Edit cause' : 'New cause'}</p>
          <label className="block">Title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={80} required className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 bg-white" placeholder="Gaza: emergency relief" /></label>
          <label className="block">Who it helps (one or two sentences)<textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} maxLength={300} required rows={2} className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 bg-white" /></label>
          <div className="flex gap-2 flex-wrap">
            <label className="block flex-1 min-w-[10rem]">Type<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 bg-white">{CAUSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
            <label className="block flex-1 min-w-[10rem]">Is it zakat?<select value={draft.zakat} onChange={(e) => setDraft({ ...draft, zakat: e.target.value as ZakatFit })} className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 bg-white">{(Object.keys(ZAKAT_FIT_LABEL) as ZakatFit[]).map((z) => <option key={z} value={z}>{ZAKAT_FIT_LABEL[z]}</option>)}</select></label>
          </div>
          <label className="block">Short note on zakat (optional)<textarea value={draft.zakatNote} onChange={(e) => setDraft({ ...draft, zakatNote: e.target.value })} maxLength={400} rows={2} className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 bg-white" /></label>
          <label className="block">Websites — one per line, as: Name | https://address<textarea value={draft.links} onChange={(e) => setDraft({ ...draft, links: e.target.value })} rows={3} required className="mt-1 w-full px-2 py-1.5 rounded border border-gray-300 bg-white font-mono text-xs" placeholder={'Islamic Relief | https://www.islamic-relief.org'} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Show on the Zakat page</label>
          <div className="flex gap-2">
            <button disabled={busy} className="px-3 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50">Save</button>
            <button type="button" onClick={() => setDraft(null)} className="px-3 py-2 rounded-lg border border-gray-300 bg-white">Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
