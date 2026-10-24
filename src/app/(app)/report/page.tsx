'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { REPORT_CATEGORIES } from '@/lib/reports-shared'

function ReportForm() {
  const params = useSearchParams()
  const catParam = params.get('cat')
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES.some((c) => c.id === catParam) ? (catParam as string) : '')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const ref = (params.get('ref') ?? '').slice(0, 120)
  const from = params.get('from') ?? ''
  const page = from.startsWith('/') && !from.startsWith('//') ? from.slice(0, 200) : ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!category) return setError('Please choose what this is about.')
    if (message.trim().length < 10) return setError('Please describe it in at least a sentence (10 characters).')
    setBusy(true)
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, message, page, ref, contact }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not send. Please try again.')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-10 space-y-3" role="status">
        <p className="text-4xl">🤲</p>
        <h1 className="text-xl font-black text-[#0F766E]">Jazakum Allahu khayran</h1>
        <p className="text-gray-600">Your report was sent. It is read by the person who looks after this app.</p>
        <Link href="/dashboard" className="inline-block px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
          Back to the app
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#0F766E]">Report a problem</h1>
        <p className="text-sm text-gray-600 mt-1">Found a mistake, or something that is not right? Tell us — every report is read.</p>
      </div>

      {ref && (
        <p className="text-sm rounded-lg bg-gray-100 px-3 py-2">
          About: <b>{ref}</b>
        </p>
      )}

      <fieldset>
        <legend className="font-semibold text-sm mb-2">What is it about?</legend>
        <div className="space-y-2">
          {REPORT_CATEGORIES.map((c) => (
            <label key={c.id} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${category === c.id ? 'border-[#0F766E] bg-[#0F766E]/5' : 'border-gray-200 bg-white'}`}>
              <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="mt-1" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-semibold">
        What happened?
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1500}
          rows={5}
          required
          placeholder="Describe it so it can be checked — for example where you saw it, and what you expected."
          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 font-normal"
        />
        <span className="block text-right text-xs text-gray-500 font-normal">{message.length}/1500</span>
      </label>

      <label className="block text-sm font-semibold">
        How can we reach you? <span className="font-normal text-gray-500">(optional)</span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder="An email or phone number, only if you want a reply" className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 font-normal" />
      </label>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} className="w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-50">
        {busy ? 'Sending…' : 'Send report'}
      </button>
      <p className="text-xs text-gray-500">
        We keep your report, the page you came from, and the contact you choose to give — nothing else. See the <Link href="/legal/privacy" className="underline">privacy summary</Link>.
      </p>
    </form>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <ReportForm />
    </Suspense>
  )
}
