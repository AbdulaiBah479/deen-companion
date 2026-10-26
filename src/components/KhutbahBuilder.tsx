'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toHijri } from '@/lib/hijri'
import { ReadAloudBar, useReadAloud, type Para } from '@/components/ReadAloud'
import { AMMA_BA3D, AUDIENCES, CLOSING_AR, CLOSING_EN, HAJAH_AR, HAJAH_EN, LENGTHS, SECOND_OPENING_AR, SECOND_OPENING_EN, TOPICS, suggestTopic, topicById } from '@/lib/khutbah'
import { sermonText } from '@/lib/khutbah-text'
import { useLang } from '@/lib/languages'
import { useStored } from '@/lib/storage'

type Ev = { id: string; kind: 'quran' | 'hadith'; ref: string; arabic?: string; text: string; href: string }
type Fixed = { ref: string; arabic?: string; text?: string }
type Sermon = {
  title: string
  minutes: number
  sections: { heading: string; body: string }[]
  evidence: Ev[]
  fixed: { hajah: Fixed[]; salawat: Fixed; closing: Fixed }
  source: 'ai' | 'outline'
}
type Part = { label: string; arabic?: string; text: string; ev?: Ev[] }
type Saved = { at: number; sermon: Sermon }

// The sermon as it is read out: the opening, the first khutbah, the short sit, the second khutbah.
function toParts(s: Sermon): Part[] {
  const intro = s.sections[0]
  const rest = s.sections.slice(1, 4)
  const dua = s.sections[4]
  const evFor = (body: string) => s.evidence.filter((e) => body.includes(`[${e.id}]`))
  return [
    { label: 'Opening praise', arabic: HAJAH_AR, text: HAJAH_EN },
    ...s.fixed.hajah.map((v) => ({ label: `Verse ${v.ref}`, arabic: v.arabic, text: v.text ?? '' })),
    { label: 'Then', arabic: AMMA_BA3D, text: '' },
    { label: intro.heading, text: intro.body, ev: evFor(intro.body) },
    ...rest.map((r) => ({ label: r.heading, text: r.body, ev: evFor(r.body) })),
    { label: 'Sit briefly between the two sermons', text: '' },
    { label: 'Second sermon', arabic: SECOND_OPENING_AR, text: SECOND_OPENING_EN },
    { label: `Blessings on the Prophet ﷺ — ${s.fixed.salawat.ref}`, arabic: s.fixed.salawat.arabic, text: s.fixed.salawat.text ?? '' },
    { label: dua.heading, text: dua.body, ev: evFor(dua.body) },
    { label: `Closing verse ${s.fixed.closing.ref}`, arabic: s.fixed.closing.arabic, text: s.fixed.closing.text ?? '' },
    { label: 'End', arabic: CLOSING_AR, text: CLOSING_EN },
  ].map((p) => ({ ...p, text: p.text.replace(/\s*\[(?:Q|H)\d+\]/g, '') }))
}

export default function KhutbahBuilder() {
  const { lang } = useLang()
  const [mode, setMode] = useState<'evergreen' | 'occasion' | 'custom'>('evergreen')
  const [topicId, setTopicId] = useState('taqwa')
  const [custom, setCustom] = useState('')
  const [minutes, setMinutes] = useStored<number>('deen:khutbah-minutes', 10)
  const [audience, setAudience] = useStored<string>('deen:khutbah-audience', 'general')
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')
  const [sermon, setSermon] = useState<Sermon | null>(null)
  const [saved, setSaved] = useStored<Saved[]>('deen:khutbahs', [])
  const [prompter, setPrompter] = useState(false)
  const [size, setSize] = useState(32)
  const [copied, setCopied] = useState(false)
  // Mosque mode: a stopwatch against the planned length, and the screen stays on while reading.
  const [secs, setSecs] = useState(0)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!prompter || !running) return
    const t = setInterval(() => setSecs((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [prompter, running])
  useEffect(() => {
    if (!prompter) return
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => {
      lock?.release().catch(() => {})
    }
  }, [prompter])
  const jumpTo = (i: number) => document.getElementById('khutbah-part-' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // The topic that suits today's date (an occasion that is near, otherwise one that changes every week).
  const [suggested, setSuggested] = useState<string | null>(null)
  useEffect(() => {
    const now = new Date()
    setSuggested(suggestTopic(toHijri(now), Math.floor(now.getTime() / (7 * 86400_000))))
  }, [])
  const suggestedTopic = suggested ? topicById(suggested) : undefined
  const topics = TOPICS.filter((t) => t.kind === mode)
  const parts = useMemo(() => (sermon ? toParts(sermon) : []), [sermon])
  const paras = useMemo<Para[]>(() => parts.flatMap((p) => [...(p.arabic ? [{ text: p.arabic, lang: 'ar-SA' }] : []), ...(p.text ? [{ text: p.text }] : [])]), [parts])
  const reader = useReadAloud(paras, lang)

  const make = async () => {
    if (mode === 'custom' && custom.trim().length < 3) {
      setError('Write the topic first (a few words).')
      setState('error')
      return
    }
    setState('loading')
    setError('')
    try {
      const r = await fetch('/api/khutbah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'custom' ? { custom, minutes, lang, audience } : { topic: topicId, minutes, lang, audience }),
      })
      const d = await r.json()
      if (!r.ok || !d.sections) throw new Error(d.error || 'Could not prepare the sermon.')
      setSermon(d)
      setState('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare the sermon.')
      setState('error')
    }
  }

  const flat = () => (sermon ? sermonText(sermon.title, parts.map((p) => ({ label: p.label, arabic: p.arabic, text: p.text }))) : '')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(flat())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([flat()], { type: 'text/plain;charset=utf-8' }))
    a.download = `khutbah-${(sermon?.title ?? 'sermon').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const save = () => sermon && setSaved([{ at: Date.now(), sermon }, ...saved.filter((s) => s.sermon.title !== sermon.title)].slice(0, 12))

  const btn = 'px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm'
  const pill = (on: boolean) => `px-3 py-1.5 rounded-full border text-sm ${on ? 'bg-[#0F766E] border-[#0F766E] text-white font-semibold' : 'bg-white border-gray-300'}`

  if (prompter && sermon) {
    return (
      <div className="fixed inset-0 z-50 bg-black text-white overflow-y-auto p-5" role="dialog" aria-label="Reading view">
        <div className="sticky top-0 flex flex-wrap items-center gap-2 pb-3 bg-black">
          <button onClick={() => setPrompter(false)} className="px-3 py-1.5 rounded-lg bg-white text-black text-sm font-semibold">✕ Close</button>
          <button onClick={() => setSize((s) => Math.max(20, s - 4))} className="px-3 py-1.5 rounded-lg border border-white/40 text-sm" aria-label="Smaller text">A−</button>
          <button onClick={() => setSize((s) => Math.min(72, s + 4))} className="px-3 py-1.5 rounded-lg border border-white/40 text-sm" aria-label="Bigger text">A+</button>
          <button onClick={() => setRunning((r) => !r)} className="px-3 py-1.5 rounded-lg border border-white/40 text-sm tabular-nums" aria-label={running ? 'Pause the timer' : 'Start the timer'} data-testid="khutbah-timer">
            {running ? '⏸' : '▶'} {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')} / {sermon.minutes}:00
          </button>
          {secs > 0 && <button onClick={() => { setSecs(0); setRunning(false) }} className="px-2 py-1.5 text-xs text-white/70 underline">Reset</button>}
          <span className={`text-xs font-bold ${secs > sermon.minutes * 60 ? 'text-red-400' : secs > sermon.minutes * 54 ? 'text-amber-300' : 'text-teal-300'}`}>
            {secs === 0 ? '' : secs > sermon.minutes * 60 ? 'Over time' : secs > sermon.minutes * 54 ? 'Time to conclude' : 'On time'}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-2" aria-label="Jump to a part">
          {parts.map((p, i) => (p.label.startsWith('Verse ') || p.label === 'Then' || p.label === 'End' ? null : (
            <button key={i} onClick={() => jumpTo(i)} className="shrink-0 px-2 py-1 rounded-full border border-white/30 text-xs">{p.label.replace(/ — .*/, '').replace('Sit briefly between the two sermons', 'Sit').replace('Blessings on the Prophet ﷺ', 'Salawat').replace('Closing verse ', 'Closing ')}</button>
          )))}
        </div>
        <div style={{ fontSize: size }} className="leading-relaxed max-w-3xl mx-auto pb-24">
          <h1 className="font-black mb-6">{sermon.title}</h1>
          {parts.map((p, i) => (
            <div key={i} id={'khutbah-part-' + i} className="mb-6">
              <p className="text-teal-300 text-[0.5em] font-bold uppercase tracking-wide">{p.label}</p>
              {p.arabic && <p dir="rtl" lang="ar" className="font-arabic leading-[2] mt-1">{p.arabic}</p>}
              {p.text && <p className="mt-1 whitespace-pre-line">{p.text}</p>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="print:hidden">
        <h1 className="text-2xl font-black text-[#0F766E]">Sermons (khutbah)</h1>
        <p className="text-sm text-gray-600 mt-1">
          Choose a topic or an occasion, or write your own. You get a sermon with the opening praise, verses and hadith taken from the app’s own Quran and Bukhari/Muslim data, a pause between the two sermons, and a closing. You can listen to it, read it large from a screen, copy it or print it.
        </p>
        <p className="text-xs text-amber-700 mt-1">The explanation is a draft written by AI. The imam must read it, check it, and make it his own before delivering it.</p>
      </header>

      {suggestedTopic && (
        <p className="text-sm rounded-xl bg-teal-50 border border-teal-200 p-3 print:hidden" data-testid="khutbah-suggestion">
          Suggested for now: <strong>{suggestedTopic.title}</strong>{' '}
          <button onClick={() => { setMode(suggestedTopic.kind); setTopicId(suggestedTopic.id) }} className="underline text-[#0F766E] font-semibold">Use this topic</button>
        </p>
      )}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 print:hidden" aria-label="Choose a topic">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Kind of sermon">
          {([['evergreen', 'Any Friday'], ['occasion', 'Occasions'], ['custom', 'Write my own topic']] as const).map(([id, label]) => (
            <button key={id} onClick={() => { setMode(id); if (id !== 'custom') setTopicId(TOPICS.find((t) => t.kind === id)!.id) }} aria-pressed={mode === id} className={pill(mode === id)}>
              {label}
            </button>
          ))}
        </div>
        {mode === 'custom' ? (
          <input value={custom} onChange={(e) => setCustom(e.target.value.slice(0, 100))} placeholder="e.g. Keeping the faith at university" aria-label="Your topic" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto" data-testid="khutbah-topics">
            {topics.map((t) => (
              <button key={t.id} onClick={() => setTopicId(t.id)} aria-pressed={topicId === t.id} className={`text-left p-3 rounded-xl border ${topicId === t.id ? 'border-[#0F766E] bg-teal-50' : 'border-gray-200 bg-white'}`}>
                <span className="block font-semibold text-sm">{t.title}</span>
                <span className="block text-xs text-gray-500">{t.blurb}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            Length
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-gray-300 bg-white">
              {LENGTHS.map((l) => <option key={l.minutes} value={l.minutes}>{l.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            For
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-300 bg-white">
              {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
        </div>
        <button onClick={make} disabled={state === 'loading'} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-60">
          {state === 'loading' ? 'Preparing…' : 'Prepare the sermon'}
        </button>
        {state === 'error' && <p className="text-sm text-red-700" role="alert">{error}</p>}
      </section>

      {sermon && (
        <article className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4" data-testid="khutbah-result">
          <header>
            <h2 className="text-xl font-black">{sermon.title}</h2>
            <p className="text-xs text-gray-500">About {sermon.minutes} minutes{sermon.source === 'outline' ? ' · The AI helper is busy, so this is an outline from the verses and hadith — expand it in your own words' : ' · Draft written by AI from the evidence shown'}</p>
          </header>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={() => setPrompter(true)} className={btn}>🖥 Read large</button>
            <button onClick={copy} className={btn}>{copied ? '✓ Copied' : 'Copy'}</button>
            <button onClick={download} className={btn}>Download .txt</button>
            <button onClick={() => window.print()} className={btn}>Print</button>
            <button onClick={save} className={btn}>Save on this device</button>
          </div>
          <ReadAloudBar reader={reader} label="Listen to the sermon" className="print:hidden" />
          <div className="space-y-4">
            {parts.map((p, i) => (
              <section key={i} className={`rounded-xl p-3 ${p.text === '' && !p.arabic ? 'bg-gray-50 text-center text-sm text-gray-500' : ''}`}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#0F766E]">{p.label}</h3>
                {p.arabic && <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-[2.1] mt-1">{p.arabic}</p>}
                {p.text && <p className="mt-1 text-gray-800 whitespace-pre-line leading-relaxed">{p.text}</p>}
                {p.ev && p.ev.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {p.ev.map((e) => (
                      <li key={e.id} className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm">
                        <Link href={e.href} className="font-bold text-[#0F766E] underline">{e.ref}</Link>
                        {e.arabic && <span dir="rtl" lang="ar" className="block font-arabic text-lg leading-loose">{e.arabic}</span>}
                        <span className="block text-gray-700">{e.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Verses link to the tafsir study page; hadith are from Sahih al-Bukhari and Sahih Muslim. This is a draft to help preparation, not a ruling; a qualified scholar should review it.
          </p>
        </article>
      )}

      {saved.length > 0 && (
        <section aria-label="Saved sermons" className="rounded-2xl border border-gray-200 bg-white p-4 print:hidden">
          <h2 className="font-bold">Saved on this device</h2>
          <ul className="mt-2 divide-y divide-gray-100">
            {saved.map((s) => (
              <li key={s.at} className="py-2 flex items-center gap-2 text-sm">
                <button onClick={() => setSermon(s.sermon)} className="flex-1 text-left underline text-[#0F766E]">{s.sermon.title}</button>
                <span className="text-xs text-gray-500">{new Date(s.at).toLocaleDateString()}</span>
                <button onClick={() => setSaved(saved.filter((x) => x.at !== s.at))} aria-label={`Delete ${s.sermon.title}`} className="text-gray-500">✕</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
