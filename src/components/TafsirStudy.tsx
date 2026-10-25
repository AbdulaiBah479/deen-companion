'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ReadAloudBar, useReadAloud, type Para } from '@/components/ReadAloud'
import { useAudio } from '@/lib/audio'
import { useLang } from '@/lib/languages'
import { useStored } from '@/lib/storage'
import { loadSurahData, type SurahInfo } from '@/lib/surah-list'
import { TAFSIRS, defaultTafsirFor } from '@/lib/tafsirs'

type Verse = { verse_key: string; text_uthmani: string; translations: { text: string }[] }
type Section = { title: string; body: string }
type Explain = { sections: Section[]; source: 'ai' | 'tafsir' }
type Linked = { ref: string; surah: number; from: number; arabic: string; text: string; truncated: boolean; mentions?: number }
type Connections = { pointed: Linked[]; similar: Linked[] }
type Level = 'simple' | 'standard' | 'deep'
const LEVELS: { id: Level; label: string }[] = [
  { id: 'simple', label: 'Simple' },
  { id: 'standard', label: 'Standard' },
  { id: 'deep', label: 'Deeper' },
]

// Everything about one verse in one place: the verse (with recitation), a plain explanation, the classical commentaries, and the
// other verses it connects to. Each part can be listened to.
export default function TafsirStudy({ surahNum, ayahNum }: { surahNum: number; ayahNum: number }) {
  const { lang } = useLang()
  const audio = useAudio()
  const key = `${surahNum}:${ayahNum}`
  const [surahs, setSurahs] = useState<SurahInfo[]>([])
  const [verse, setVerse] = useState<Verse | null | undefined>(undefined)
  const [level, setLevel] = useStored<Level>('deen:tafsir-level', 'standard')
  const [explain, setExplain] = useState<Explain | null>(null)
  const [explainState, setExplainState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [pref, setPref] = useStored<number>('deen:tafsir', 0)
  const tafsirId = pref || defaultTafsirFor(lang)
  const [tafsir, setTafsir] = useState<{ source: string; paragraphs: string[] } | null | undefined>(undefined)
  const [links, setLinks] = useState<Connections | null | undefined>(undefined)

  useEffect(() => {
    loadSurahData().then((d) => setSurahs(d.surahs))
  }, [])
  const info = surahs.find((s) => s.id === surahNum)
  const valid = Number.isInteger(surahNum) && Number.isInteger(ayahNum) && surahNum >= 1 && surahNum <= 114 && ayahNum >= 1

  useEffect(() => {
    if (!valid) return
    let off = false
    setVerse(undefined)
    setExplain(null)
    setExplainState('idle')
    setLinks(undefined)
    fetch(`/api/quran/passage?surah=${surahNum}&from=${ayahNum}&to=${ayahNum}&lang=${lang}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !off && setVerse(d?.verses?.[0] ?? null))
      .catch(() => !off && setVerse(null))
    fetch(`/api/tafsir/connections?key=${key}&lang=${lang}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !off && setLinks(d ? { pointed: d.pointed ?? [], similar: d.similar ?? [] } : null))
      .catch(() => !off && setLinks(null))
    return () => {
      off = true
    }
  }, [valid, surahNum, ayahNum, key, lang])

  useEffect(() => {
    if (!valid) return
    let off = false
    setTafsir(undefined)
    fetch(`/api/tafsir?key=${key}&id=${tafsirId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !off && setTafsir(d ? { source: d.source, paragraphs: d.paragraphs } : null))
      .catch(() => !off && setTafsir(null))
    return () => {
      off = true
    }
  }, [valid, key, tafsirId])

  const runExplain = async () => {
    setExplainState('loading')
    try {
      const r = await fetch('/api/tafsir/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, lang, level }) })
      const d = await r.json()
      if (!r.ok || !d.sections?.length) throw new Error(d.error || 'failed')
      setExplain(d)
      setExplainState('idle')
    } catch {
      setExplainState('error')
    }
  }

  const tafsirMeta = TAFSIRS.find((t) => t.id === tafsirId)
  const explainParas = useMemo<Para[]>(() => (explain ? explain.sections.flatMap((s) => [{ text: s.title + '.' }, { text: s.body }]) : []), [explain])
  const tafsirParas = useMemo<Para[]>(() => (tafsir ? tafsir.paragraphs.map((text) => ({ text, lang: tafsirMeta?.lang === 'ar' ? 'ar-SA' : undefined })) : []), [tafsir, tafsirMeta])
  const explainReader = useReadAloud(explainParas, lang)
  const tafsirReader = useReadAloud(tafsirParas, lang)

  if (!valid || verse === null) {
    return (
      <p className="text-gray-600">
        We could not find that verse. <Link href="/tafsir" className="underline text-[#0F766E]">Choose another</Link>
      </p>
    )
  }
  const count = info?.verses_count ?? 0
  const prev = ayahNum > 1 ? `/tafsir/${surahNum}/${ayahNum - 1}` : surahNum > 1 ? `/tafsir/${surahNum - 1}/${surahs.find((s) => s.id === surahNum - 1)?.verses_count ?? 1}` : null
  const next = count && ayahNum < count ? `/tafsir/${surahNum}/${ayahNum + 1}` : count && surahNum < 114 ? `/tafsir/${surahNum + 1}/1` : null
  const nav = 'px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm'
  const card = 'rounded-2xl border border-gray-200 bg-white p-4'
  const rtl = tafsirMeta?.lang === 'ar' || tafsirMeta?.lang === 'ur'

  return (
    <div className="space-y-4">
      <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Verse navigation">
        <Link href={`/tafsir/${surahNum}`} className="text-[#0F766E] underline">
          ← {info?.name_simple ?? 'Surah'}
        </Link>
        <span className="flex gap-2">
          {prev ? <Link href={prev} className={nav} aria-label="Previous verse">‹ Prev</Link> : null}
          {next ? <Link href={next} className={nav} aria-label="Next verse">Next ›</Link> : null}
        </span>
      </nav>

      <section className={card} aria-label="The verse">
        <p className="text-xs text-gray-500 mb-2">
          {info?.name_simple} {key}
        </p>
        {verse === undefined ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <p dir="rtl" lang="ar" className="font-arabic text-3xl leading-[2.2] text-center">{verse.text_uthmani}</p>
            <p className="mt-3 text-gray-700">{verse.translations[0]?.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => audio.playVerse(surahNum, ayahNum)} className="px-3 py-1.5 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold">
                ▶ Hear the recitation
              </button>
              <Link href={`/quran/${surahNum}`} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm">Open in reader</Link>
              <Link href={`/companion?ctx=${key}`} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm">Ask the Companion</Link>
            </div>
          </>
        )}
      </section>

      <section className={card} aria-label="Explanation in plain words">
        <h2 className="font-bold text-lg">Understand it</h2>
        <p className="text-xs text-gray-500">Written from the verse and the commentaries below, by AI. It can make mistakes — check it against the scholars’ words.</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden" role="group" aria-label="Level of detail">
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => { setLevel(l.id); setExplain(null) }} aria-pressed={level === l.id} className={`px-3 py-1.5 text-sm ${level === l.id ? 'bg-[#0F766E] text-white' : 'bg-white'}`}>
                {l.label}
              </button>
            ))}
          </div>
          <button onClick={runExplain} disabled={explainState === 'loading'} className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white text-sm font-semibold disabled:opacity-60">
            {explainState === 'loading' ? 'Writing…' : explain ? 'Write it again' : 'Explain this verse'}
          </button>
        </div>
        {explainState === 'error' && <p className="text-sm text-red-700 mt-2" role="alert">Could not get an explanation right now. The commentaries below still work.</p>}
        {explain && (
          <div className="mt-3 space-y-3" data-testid="tafsir-explain">
            {explain.source === 'tafsir' && <p className="text-xs text-amber-700">The AI helper is busy, so this is the start of the classical commentary as written.</p>}
            {explain.sections.map((s) => (
              <div key={s.title}>
                <h3 className="font-semibold text-[#0F766E]">{s.title}</h3>
                <p className="text-gray-700 whitespace-pre-line">{s.body}</p>
              </div>
            ))}
            <ReadAloudBar reader={explainReader} label="Listen to this explanation" />
          </div>
        )}
      </section>

      <section className={card} aria-label="Classical commentary">
        <h2 className="font-bold text-lg">What the scholars wrote</h2>
        <select value={tafsirId} onChange={(e) => setPref(Number(e.target.value))} aria-label="Tafsir source" className="w-full mt-2 px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-sm">
          {TAFSIRS.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {tafsirMeta?.about && <p className="text-xs text-gray-500 mt-1">{tafsirMeta.about}</p>}
        {tafsir === undefined && <p className="text-gray-500 mt-3">Loading…</p>}
        {tafsir === null && <p className="text-gray-600 mt-3 text-sm">This source has nothing on this verse (or is unavailable right now). Try another source above.</p>}
        {tafsir && (
          <>
            <ReadAloudBar reader={tafsirReader} label="Listen to this tafsir" className="mt-3" />
            <div dir={rtl ? 'rtl' : 'ltr'} className="mt-3 space-y-3 text-gray-800 max-h-[32rem] overflow-y-auto" data-testid="tafsir-text">
              {tafsir.paragraphs.map((p, i) => (
                <p key={i} className={`leading-relaxed rounded px-1 ${tafsirReader.active === i ? 'bg-teal-50' : ''}`}>{p}</p>
              ))}
            </div>
          </>
        )}
      </section>

      <section className={card} aria-label="Connected verses">
        <h2 className="font-bold text-lg">Connected verses</h2>
        {links === undefined && <p className="text-gray-500 text-sm mt-2">Looking for connections…</p>}
        {links === null && <p className="text-gray-600 text-sm mt-2">Connections are unavailable right now.</p>}
        {links && (
          <div className="space-y-4 mt-2">
            <LinkedList title="The scholars point to these verses" items={links.pointed} empty="The commentary does not point to other verses here." />
            <LinkedList title="Close in meaning" items={links.similar} empty="" />
          </div>
        )}
      </section>
    </div>
  )
}

function LinkedList({ title, items, empty }: { title: string; items: Linked[]; empty: string }) {
  if (!items.length) return empty ? <p className="text-sm text-gray-500">{empty}</p> : null
  return (
    <div>
      <h3 className="font-semibold text-sm text-[#0F766E] mb-1">{title}</h3>
      <ul className="space-y-2" data-testid="tafsir-linked">
        {items.map((v) => (
          <li key={v.ref}>
            <Link href={`/tafsir/${v.surah}/${v.from}`} className="block rounded-xl border border-gray-200 p-3 hover:border-[#0F766E]">
              <span className="text-xs font-bold text-[#0F766E]">{v.ref}</span>
              <span dir="rtl" lang="ar" className="block font-arabic text-xl leading-loose mt-1">{v.arabic}{v.truncated ? ' …' : ''}</span>
              <span className="block text-sm text-gray-700 mt-1">{v.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
