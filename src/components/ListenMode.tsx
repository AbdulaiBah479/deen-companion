'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ReadAloudBar, useReadAloud, type Para } from '@/components/ReadAloud'
import { useAudio } from '@/lib/audio'
import { useLang } from '@/lib/languages'
import { useStored } from '@/lib/storage'
import { loadSurahData, type SurahInfo } from '@/lib/surah-list'

type Phase = 'idle' | 'recitation' | 'meaning' | 'reflection' | 'done'
const REFLECTION = [
  'Take a quiet moment. Which verse stayed with you?',
  'Say Alhamdulillah for the guidance you were given today, and ask Allah to help you act on what you heard.',
  'Ameen.',
]

// A hands-free session for the car or for bed: the recitation of a surah, then its meaning read aloud, then a short quiet reflection.
// Nothing has to be touched in between. (Listening needs the phone to keep the page open; it cannot play when the screen is locked on some phones.)
export default function ListenMode() {
  const { lang } = useLang()
  const audio = useAudio()
  const [surahs, setSurahs] = useState<SurahInfo[]>([])
  const [surah, setSurah] = useStored<number>('deen:listen-surah', 112)
  const [withMeaning, setWithMeaning] = useStored<boolean>('deen:listen-meaning', true)
  const [phase, setPhase] = useState<Phase>('idle')
  const [verses, setVerses] = useState<{ arabic: string; text: string }[]>([])
  const sawPlaying = useRef(false)
  const idleSince = useRef<number | null>(null)
  const started = useRef({ meaning: false, reflection: false })

  useEffect(() => {
    loadSurahData().then((d) => setSurahs(d.surahs))
  }, [])
  const info = surahs.find((s) => s.id === surah)

  const meaningParas = useMemo<Para[]>(() => verses.map((v, i) => ({ text: `${i + 1}. ${v.text}` })), [verses])
  const reflectionParas = useMemo<Para[]>(() => REFLECTION.map((text) => ({ text })), [])
  const meaning = useReadAloud(meaningParas, lang)
  const reflection = useReadAloud(reflectionParas, lang)

  const begin = async () => {
    setPhase('recitation')
    sawPlaying.current = false
    idleSince.current = null
    try {
      const r = await fetch(`/api/quran/surah/${surah}?lang=${lang}`)
      const d = await r.json()
      setVerses(((d.verses ?? []) as { text_uthmani: string; translations: { text: string }[] }[]).map((v) => ({ arabic: v.text_uthmani, text: v.translations?.[0]?.text ?? '' })))
    } catch {
      setVerses([])
    }
    if (info) audio.playRange(surah, 1, info.verses_count, 1)
  }

  const next = () => {
    if (phase === 'recitation') {
      audio.stop()
      if (withMeaning && meaningParas.length) {
        setPhase('meaning')
        setTimeout(() => meaning.play(), 300)
      } else {
        setPhase('reflection')
        setTimeout(() => reflection.play(), 300)
      }
    } else if (phase === 'meaning') {
      meaning.stop()
      setPhase('reflection')
      setTimeout(() => reflection.play(), 300)
    } else if (phase === 'reflection') {
      reflection.stop()
      setPhase('done')
    }
  }

  // When the recitation has finished (it played, and nothing has played for a few seconds), move on.
  useEffect(() => {
    if (phase !== 'recitation') return
    if (audio.playing || audio.loading) {
      sawPlaying.current = true
      idleSince.current = null
      return
    }
    if (!sawPlaying.current) return
    idleSince.current = idleSince.current ?? Date.now()
    const t = setTimeout(() => next(), 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, audio.playing, audio.loading])

  // Each read-aloud finishing moves the session on.
  useEffect(() => {
    if (phase === 'meaning' && meaning.state === 'idle' && meaning.active === -1 && started.current.meaning) next()
    if (phase === 'reflection' && reflection.state === 'idle' && reflection.active === -1 && started.current.reflection) next()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meaning.state, reflection.state])
  useEffect(() => {
    if (meaning.state === 'speaking') started.current.meaning = true
    if (reflection.state === 'speaking') started.current.reflection = true
  }, [meaning.state, reflection.state])

  const stopAll = () => {
    audio.stop()
    meaning.stop()
    reflection.stop()
    started.current = { meaning: false, reflection: false }
    setPhase('idle')
  }
  useEffect(
    () => () => {
      audio.stop()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const label: Record<Phase, string> = { idle: '', recitation: 'Listening to the recitation', meaning: 'Listening to the meaning', reflection: 'A quiet reflection', done: 'Finished' }
  const btn = 'px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold'
  const primary = 'px-4 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold'

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-[#0F766E]">Listen mode</h1>
        <p className="text-sm text-gray-600 mt-1">Press once and just listen: the recitation of a surah, then its meaning read aloud, then a short reflection. Good for the car, for walking, or before sleep.</p>
      </header>

      {phase === 'idle' || phase === 'done' ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          {phase === 'done' && <p className="font-semibold text-[#0F766E]" data-testid="listen-done">Finished. May Allah accept it. 🤍</p>}
          <label className="block text-sm font-semibold" htmlFor="ls">Surah</label>
          <select id="ls" value={surah} onChange={(e) => setSurah(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm">
            {surahs.map((s) => (
              <option key={s.id} value={s.id}>{s.id}. {s.name_simple} — {s.translated_name.name} ({s.verses_count} verses)</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withMeaning} onChange={(e) => setWithMeaning(e.target.checked)} /> Read the meaning aloud after the recitation
          </label>
          {info && info.verses_count > 80 && <p className="text-xs text-amber-700">This is a long surah — the recitation will take a while. You can stop at any time.</p>}
          <button onClick={begin} className={primary}>▶ Start listening</button>
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 text-center" data-testid="listen-running">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{info?.name_simple}</p>
          <p className="text-xl font-black text-[#0F766E]">{label[phase]}</p>
          {phase === 'meaning' && <ReadAloudBar reader={meaning} label="Listen" />}
          {phase === 'reflection' && <ReadAloudBar reader={reflection} label="Listen" />}
          {phase === 'meaning' && meaning.active >= 0 && verses[meaning.active] && <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-loose">{verses[meaning.active].arabic}</p>}
          {phase === 'reflection' && <p className="text-gray-700 whitespace-pre-line">{REFLECTION.join('\n\n')}</p>}
          <div className="flex justify-center gap-2">
            <button onClick={next} className={btn}>Skip ⏭</button>
            <button onClick={stopAll} className={btn}>Stop</button>
          </div>
        </section>
      )}
    </div>
  )
}
