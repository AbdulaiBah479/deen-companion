'use client'

import { useState } from 'react'
import { Timeline, WhoAmI } from '@/components/HeritageGames'
import { mulberry32, pick, shuffle } from '@/lib/random'
import { useStored } from '@/lib/storage'

type Surah = { id: number; name_simple: string; name_arabic: string; translated_name: { name: string } }
type Verse = { verse_key: string; text_uthmani: string; translations?: { text: string }[] }

// Short surahs from Juz Amma, so verses are small enough for a word-ordering game.
const SHORT_SURAHS = [93, 94, 95, 97, 99, 102, 103, 105, 106, 107, 108, 109, 110, 112, 113, 114]
const stripHtml = (s: string) => s.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]*>/g, '')
const newRand = () => mulberry32(Math.floor(Math.random() * 2 ** 31))

function VerseBuilder() {
  const [verse, setVerse] = useState<Verse | null>(null)
  const [words, setWords] = useState<{ id: number; text: string }[]>([])
  const [chosen, setChosen] = useState<number[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'won'>('idle')
  const [error, setError] = useState('')
  const [wins, setWins] = useStored('deen:verseBuilderWins', 0)

  async function newRound() {
    setStatus('loading')
    setError('')
    setChosen([])
    try {
      const rand = newRand()
      const surah = pick(SHORT_SURAHS, rand)
      const d = await (await fetch(`/api/quran/surah/${surah}`)).json()
      const candidates: Verse[] = (d.verses || []).filter((v: Verse) => {
        const n = v.text_uthmani.split(' ').length
        return n >= 3 && n <= 9
      })
      if (!candidates.length) throw new Error('none')
      const v = pick(candidates, rand)
      const parts = v.text_uthmani.split(' ').map((text, id) => ({ id, text }))
      // Ensure the scramble differs from the original order when possible.
      let scrambled = shuffle(parts, rand)
      for (let i = 0; i < 5 && scrambled.every((w, k) => w.id === k); i++) scrambled = shuffle(parts, rand)
      setVerse(v)
      setWords(scrambled)
      setStatus('playing')
    } catch {
      setError('Could not load a verse. Check your connection and try again.')
      setStatus('idle')
    }
  }

  function tap(id: number) {
    if (status !== 'playing' || chosen.includes(id)) return
    const next = [...chosen, id]
    setChosen(next)
    if (next.length === words.length && next.every((w, k) => w === k)) {
      setStatus('won')
      setWins((n) => n + 1)
    }
  }

  const wrong = status === 'playing' && words.length > 0 && chosen.length === words.length

  return (
    <div>
      <p className="text-gray-600 text-sm mb-3">Tap the words in the correct order to rebuild the verse.</p>
      {status === 'idle' || status === 'loading' ? (
        <button onClick={newRound} disabled={status === 'loading'} className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-50">
          {status === 'loading' ? 'Loading…' : 'Start'}
        </button>
      ) : (
        <>
          {verse?.translations?.[0] && <p className="text-gray-700 mb-3 italic">“{stripHtml(verse.translations[0].text)}”</p>}
          <div className="min-h-16 bg-white border-2 border-dashed border-gray-300 rounded-xl p-3 mb-3 flex flex-wrap gap-2" dir="rtl" lang="ar">
            {chosen.map((id) => (
              <span key={id} className="text-2xl px-2 py-1 bg-[#0F766E]/10 rounded-lg">
                {words.find((w) => w.id === id)?.text}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-4" dir="rtl" lang="ar">
            {words.map((w) => (
              <button
                key={w.id}
                onClick={() => tap(w.id)}
                disabled={chosen.includes(w.id)}
                className="text-2xl px-3 py-2 bg-white border-2 border-gray-300 rounded-xl disabled:opacity-30"
              >
                {w.text}
              </button>
            ))}
          </div>
          {wrong && <p className="text-red-600 mb-2">Not quite — try again.</p>}
          {status === 'won' && <p className="text-[#0F766E] font-bold mb-2">MashaAllah! {verse?.verse_key} ✓</p>}
          <div className="flex gap-2">
            <button onClick={() => setChosen([])} className="px-4 py-2 rounded-lg border border-gray-300 bg-white">
              Reset
            </button>
            <button onClick={newRound} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">
              {status === 'won' ? 'Next verse' : 'Skip'}
            </button>
          </div>
        </>
      )}
      {error && <p className="text-red-600 mt-3">{error}</p>}
      {wins > 0 && <p className="text-xs text-gray-500 mt-4">Verses completed: {wins}</p>}
    </div>
  )
}

function SurahMatch() {
  const [pairs, setPairs] = useState<Surah[]>([])
  const [left, setLeft] = useState<Surah[]>([])
  const [right, setRight] = useState<Surah[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [miss, setMiss] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function newRound() {
    setLoading(true)
    setError('')
    try {
      const d = await (await fetch('/api/quran/surahs')).json()
      const all: Surah[] = d.surahs || []
      if (all.length < 5) throw new Error('none')
      const rand = newRand()
      const chosen = shuffle(all, rand).slice(0, 5)
      setPairs(chosen)
      setLeft(shuffle(chosen, rand))
      setRight(shuffle(chosen, rand))
      setSel(null)
      setMatched([])
      setMiss(0)
    } catch {
      setError('Could not load surahs. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function pickRight(id: number) {
    if (sel === null || matched.includes(id)) return
    if (sel === id) setMatched((m) => [...m, id])
    else setMiss((m) => m + 1)
    setSel(null)
  }

  const done = pairs.length > 0 && matched.length === pairs.length

  return (
    <div>
      <p className="text-gray-600 text-sm mb-3">Pick an Arabic name, then pick its meaning.</p>
      {pairs.length === 0 ? (
        <button onClick={newRound} disabled={loading} className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-50">
          {loading ? 'Loading…' : 'Start'}
        </button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {left.map((s) => (
                <button
                  key={s.id}
                  onClick={() => !matched.includes(s.id) && setSel(s.id)}
                  disabled={matched.includes(s.id)}
                  className={`w-full text-xl py-3 rounded-xl border-2 ${
                    matched.includes(s.id) ? 'bg-green-100 border-green-600' : sel === s.id ? 'border-[#0F766E] bg-[#0F766E]/10' : 'bg-white border-gray-300'
                  }`}
                  dir="rtl"
                  lang="ar"
                >
                  {s.name_arabic}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {right.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickRight(s.id)}
                  disabled={matched.includes(s.id) || sel === null}
                  className={`w-full py-3 px-2 text-sm rounded-xl border-2 ${
                    matched.includes(s.id) ? 'bg-green-100 border-green-600' : 'bg-white border-gray-300'
                  } disabled:opacity-70`}
                >
                  {s.translated_name.name}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">Misses: {miss}</p>
          {done && (
            <div className="mt-3">
              <p className="text-[#0F766E] font-bold">MashaAllah! All matched.</p>
              <button onClick={newRound} className="mt-2 px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">
                Play again
              </button>
            </div>
          )}
        </>
      )}
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </div>
  )
}

export default function GamesPage() {
  const [tab, setTab] = useState<'builder' | 'match' | 'who' | 'timeline'>('builder')
  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-4">Islamic Games</h1>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }} role="tablist" aria-label="Games">
        {(
          [
            ['builder', 'Verse Builder'],
            ['match', 'Surah Match'],
            ['who', 'Who am I?'],
            ['timeline', 'Timeline'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border ${
              tab === id ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'builder' ? <VerseBuilder /> : tab === 'match' ? <SurahMatch /> : tab === 'who' ? <WhoAmI /> : <Timeline />}
    </div>
  )
}
