'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ReadAloudBar, useReadAloud, type Para } from '@/components/ReadAloud'
import { useAudio } from '@/lib/audio'
import { careLang, careText, needsCare } from '@/lib/care'
import { useLang } from '@/lib/languages'
import { SITUATIONS, findSituations, type Situation } from '@/lib/situations'
import { useStored } from '@/lib/storage'

type Verse = { verse_key: string; text_uthmani: string; translations: { text: string }[] }
type Passage = { arabic: string; text: string; ref: string; surah: number; from: number; to: number; note: string }
type Section = { title: string; body: string }
type Progress = { count: number; days: string[] } // how many journeys were completed, and on which days (last 30)

const MINUTES = [1, 3, 5]
const STEPS = ['Pause', 'The verse', 'Understand it', 'A dua', 'A quiet moment'] as const

const today = () => new Date().toISOString().slice(0, 10)

// A short guided session for a feeling: breathe, a verse, what it means, a dua, and a quiet minute with the recitation.
// Everything comes from the verified situations list (Quran and checked hadith); the only AI part is the plain explanation, which is labelled.
export default function VerseJourney() {
  const { lang } = useLang()
  const audio = useAudio()
  const [text, setText] = useState('')
  const [careMsg, setCareMsg] = useState('')
  const [picked, setPicked] = useState<Situation | null>(null)
  const [step, setStep] = useState(0)
  const [passages, setPassages] = useState<Passage[] | null>(null)
  const [explain, setExplain] = useState<Section[] | 'loading' | 'error' | null>(null)
  const [minutes, setMinutes] = useState(1)
  const [left, setLeft] = useState<number | null>(null)
  const [progress, setProgress] = useStored<Progress>('deen:journeys', { count: 0, days: [] })
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const matches = useMemo(() => (text.trim() ? findSituations(text, 3) : []), [text])

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }
  useEffect(() => stopTimer, [])

  // Load the verses of the chosen feeling in the chosen language.
  useEffect(() => {
    if (!picked) return
    let off = false
    setPassages(null)
    Promise.all(
      picked.quran.map(async (q) => {
        const r = await fetch(`/api/quran/passage?surah=${q.surah}&from=${q.from}&to=${q.to}&lang=${lang}`)
        if (!r.ok) return null
        const vs = ((await r.json()).verses ?? []) as Verse[]
        if (!vs.length) return null
        return { arabic: vs.map((v) => v.text_uthmani).join(' '), text: vs.map((v) => v.translations[0]?.text ?? '').join(' '), ref: `${q.surah}:${q.from}${q.to > q.from ? '–' + q.to : ''}`, surah: q.surah, from: q.from, to: q.to, note: q.note } as Passage
      })
    )
      .then((list) => !off && setPassages(list.filter((p): p is Passage => !!p)))
      .catch(() => !off && setPassages([]))
    return () => {
      off = true
    }
  }, [picked, lang])

  const start = (s: Situation) => {
    setPicked(s)
    setStep(0)
    setExplain(null)
    setDone(false)
    setLeft(null)
    stopTimer()
    window.scrollTo({ top: 0 })
  }
  const search = () => {
    if (needsCare(text)) {
      setCareMsg(careText(careLang(text, lang)))
      return
    }
    setCareMsg('')
  }

  const runExplain = async () => {
    const p = passages?.[0]
    if (!p) return
    setExplain('loading')
    try {
      const r = await fetch('/api/tafsir/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: `${p.surah}:${p.from}`, lang, level: 'simple' }) })
      const d = await r.json()
      if (!r.ok || !d.sections?.length) throw new Error('x')
      setExplain(d.sections)
    } catch {
      setExplain('error')
    }
  }

  const beginQuiet = () => {
    const p = passages?.[0]
    setLeft(minutes * 60)
    if (p) audio.playRange(p.surah, p.from, p.to, 60)
    stopTimer()
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l === null) return l
        if (l <= 1) {
          stopTimer()
          audio.stop()
          finish()
          return 0
        }
        return l - 1
      })
    }, 1000)
  }
  const finish = () => {
    setDone(true)
    setProgress((p) => ({ count: p.count + 1, days: [...new Set([...p.days, today()])].slice(-30) }))
  }
  const endQuiet = () => {
    stopTimer()
    audio.stop()
    setLeft(null)
    finish()
  }

  const paras = useMemo<Para[]>(() => {
    if (!picked) return []
    if (step === 1 && passages) return passages.flatMap((p) => [{ text: p.arabic, lang: 'ar-SA' }, { text: p.text }])
    if (step === 2 && Array.isArray(explain)) return explain.flatMap((s) => [{ text: s.title + '.' }, { text: s.body }])
    if (step === 3) return picked.duas.flatMap((d) => [{ text: d.arabic, lang: 'ar-SA' }, { text: d.meaning }])
    return []
  }, [picked, step, passages, explain])
  const reader = useReadAloud(paras, lang)

  const btn = 'px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold'
  const primary = 'px-4 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold'
  const card = 'rounded-2xl border border-gray-200 bg-white p-4'

  // ───────── choose a feeling ─────────
  if (!picked) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-black text-[#0F766E]">Verse Journey</h1>
          <p className="text-sm text-gray-600 mt-1">Tell us what is on your heart. You will be guided through a few quiet minutes: a pause, a verse, what it means, a dua, and a moment of stillness with the recitation.</p>
          {progress.count > 0 && <p className="text-xs text-gray-500 mt-1">You have completed {progress.count} {progress.count === 1 ? 'journey' : 'journeys'}{progress.days.length > 1 ? ` on ${progress.days.length} different days` : ''}.</p>}
        </header>
        <form onSubmit={(e) => { e.preventDefault(); search() }} className={card}>
          <label className="text-sm font-semibold" htmlFor="feel">How are you feeling?</label>
          <div className="flex gap-2 mt-1">
            <input id="feel" value={text} onChange={(e) => { setText(e.target.value.slice(0, 200)); setCareMsg('') }} placeholder="e.g. I am anxious about my exam" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            <button className={primary}>Find</button>
          </div>
          {careMsg && <p className="mt-3 text-sm text-gray-800 whitespace-pre-line rounded-lg bg-amber-50 border border-amber-200 p-3" role="alert">{careMsg}</p>}
          {!careMsg && matches.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {matches.map((s) => (
                <li key={s.id}><button onClick={() => start(s)} className={btn}>{s.emoji} {s.title}</button></li>
              ))}
            </ul>
          )}
          {!careMsg && text.trim().length > 2 && matches.length === 0 && <p className="mt-2 text-xs text-gray-500">Nothing matched; choose one below.</p>}
        </form>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="journey-feelings">
          {SITUATIONS.map((s) => (
            <li key={s.id}>
              <button onClick={() => start(s)} className="w-full text-left p-3 rounded-xl border border-gray-200 bg-white hover:border-[#0F766E]">
                <span className="text-xl mr-2">{s.emoji}</span><span className="font-semibold text-sm">{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500">The verses and duas come from the Qur’an and from hadith checked against Sahih al-Bukhari. This is not a replacement for a scholar or a doctor.</p>
      </div>
    )
  }

  // ───────── the journey ─────────
  const p0 = passages?.[0]
  return (
    <div className="space-y-4">
      <button onClick={() => { stopTimer(); audio.stop(); setPicked(null) }} className="text-sm text-[#0F766E] underline">← Choose another feeling</button>
      <header>
        <h1 className="text-xl font-black text-[#0F766E]">{picked.emoji} {picked.title}</h1>
        <p className="text-sm text-gray-600">{picked.intro}</p>
      </header>
      <ol className="flex gap-1" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-[#0F766E]' : 'bg-gray-200'}`} title={s} />
        ))}
      </ol>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

      {step === 0 && (
        <section className={card} aria-label="Pause">
          <p className="text-gray-800 leading-relaxed">Sit comfortably. Breathe in slowly for four counts, hold for four, breathe out for six. Do this three times. Say <strong>Bismillah</strong>, and let the rest of the day wait for a few minutes.</p>
          <button onClick={() => setStep(1)} className={`${primary} mt-4`}>I am ready</button>
        </section>
      )}

      {step === 1 && (
        <section className={card} aria-label="The verse" data-testid="journey-verse">
          {passages === null && <p className="text-gray-500">Loading…</p>}
          {passages?.length === 0 && <p className="text-gray-600">The verses could not be loaded right now. You can still continue.</p>}
          {passages?.map((p) => (
            <div key={p.ref} className="mb-5 last:mb-0">
              <p dir="rtl" lang="ar" className="font-arabic text-3xl leading-[2.2] text-center">{p.arabic}</p>
              <p className="mt-2 text-gray-800">{p.text}</p>
              <p className="text-xs text-gray-500 mt-1">{p.ref} — {p.note}</p>
              <button onClick={() => audio.playRange(p.surah, p.from, p.to, 1)} className={`${btn} mt-2`}>▶ Hear it</button>
            </div>
          ))}
          <ReadAloudBar reader={reader} label="Listen to the meaning" className="mt-3" />
          <button onClick={() => { reader.stop(); setStep(2) }} className={`${primary} mt-4`}>Continue</button>
        </section>
      )}

      {step === 2 && (
        <section className={card} aria-label="Understand it">
          <p className="text-xs text-gray-500">A short explanation in plain words, written by AI from the classical commentaries. It can make mistakes.</p>
          {explain === null && p0 && <button onClick={runExplain} className={`${btn} mt-2`}>Explain this verse simply</button>}
          {explain === 'loading' && <p className="text-gray-500 mt-2">Writing…</p>}
          {explain === 'error' && <p className="text-sm text-gray-700 mt-2">An explanation is not available right now. <Link href={p0 ? `/tafsir/${p0.surah}/${p0.from}` : '/tafsir'} className="underline text-[#0F766E]">Read the classical commentary</Link>.</p>}
          {Array.isArray(explain) && (
            <div className="mt-3 space-y-3">
              {explain.map((s) => (
                <div key={s.title}><h3 className="font-semibold text-[#0F766E]">{s.title}</h3><p className="text-gray-800 whitespace-pre-line">{s.body}</p></div>
              ))}
              <ReadAloudBar reader={reader} label="Listen" />
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={() => { reader.stop(); setStep(1) }} className={btn}>Back</button>
            <button onClick={() => { reader.stop(); setStep(3) }} className={primary}>Continue</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className={card} aria-label="A dua" data-testid="journey-dua">
          {picked.duas.map((d) => (
            <div key={d.source.label} className="mb-5 last:mb-0">
              <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-[2.1] text-center">{d.arabic}</p>
              <p className="text-sm text-gray-600 italic mt-2">{d.transliteration}</p>
              <p className="text-gray-800 mt-1">{d.meaning}</p>
              <p className="text-xs text-gray-500 mt-1">
                {d.source.book && d.source.number ? <Link href={`/hadith?book=${d.source.book}&number=${d.source.number}`} className="underline text-[#0F766E]">{d.source.label}</Link> : d.source.label}
              </p>
            </div>
          ))}
          <ReadAloudBar reader={reader} label="Listen to the dua" className="mt-3" />
          <p className="text-xs text-gray-500 mt-3">Say it in Arabic if you can, and in your own words too; Allah understands every language.</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => { reader.stop(); setStep(2) }} className={btn}>Back</button>
            <button onClick={() => { reader.stop(); setStep(4) }} className={primary}>Continue</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className={`${card} text-center`} aria-label="A quiet moment" data-testid="journey-quiet">
          {!done && left === null && (
            <>
              <p className="text-gray-800">Close your eyes. The verse will be recited softly while you sit in stillness. Say the dua in your heart, and let the words settle.</p>
              <div className="flex justify-center gap-2 mt-4" role="group" aria-label="How long">
                {MINUTES.map((m) => (
                  <button key={m} onClick={() => setMinutes(m)} aria-pressed={minutes === m} className={`px-3 py-1.5 rounded-full border text-sm ${minutes === m ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'bg-white border-gray-300'}`}>{m} min</button>
                ))}
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={() => setStep(3)} className={btn}>Back</button>
                <button onClick={beginQuiet} className={primary}>Begin</button>
              </div>
            </>
          )}
          {!done && left !== null && (
            <>
              <p className="text-5xl font-black text-[#0F766E] tabular-nums" aria-live="off">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
              <p className="text-sm text-gray-600 mt-2">Stay with the words. When you are ready, you can finish.</p>
              <button onClick={endQuiet} className={`${btn} mt-4`}>Finish now</button>
            </>
          )}
          {done && (
            <div data-testid="journey-done">
              <p className="text-2xl">🤍</p>
              <p className="font-bold mt-1">May Allah accept it and ease your heart.</p>
              <p className="text-sm text-gray-600 mt-1">That was journey number {progress.count}. Come back whenever you need a quiet moment.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <button onClick={() => setPicked(null)} className={btn}>Another feeling</button>
                {p0 && <Link href={`/tafsir/${p0.surah}/${p0.from}`} className={btn}>Study this verse deeper</Link>}
                {picked.ruqyah && <Link href="/ruqyah" className={btn}>Ruqyah</Link>}
              </div>
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-gray-500">If you ever feel you might harm yourself, please contact your local emergency number or someone you trust right now. You are not alone.</p>
    </div>
  )
}
