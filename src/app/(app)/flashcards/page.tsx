'use client'

import { useState } from 'react'
import { dedupeWords, wordId, type WordRow } from '@/lib/learn-content'
import { isDue, newStoredCard, previewIntervals, review, type ReviewGrade, type StoredCard } from '@/lib/srs'
import { localDateKey, useStored } from '@/lib/storage'

type Card = { id: string; front: string; frontSub?: string; back: string; backSub?: string }
type DeckId = 'names' | 'duas' | 'words'
type Progress = { cards: Record<string, StoredCard>; newToday: { date: string; count: number } }

const NEW_PER_DAY = 10

const DECKS: { id: DeckId; title: string; desc: string }[] = [
  { id: 'names', title: '99 Names of Allah', desc: 'Arabic → transliteration & meaning' },
  { id: 'duas', title: 'Daily Duas', desc: 'Dua title → Arabic & translation' },
  { id: 'words', title: 'Quran Words', desc: 'The most frequent words — learn them in Learn → Quran Words' },
]

async function loadDeck(id: DeckId): Promise<Card[]> {
  if (id === 'words') {
    const d = await (await fetch('/api/learn/words')).json()
    return dedupeWords((d.rows || []) as WordRow[]).map((w) => ({
      id: wordId(w),
      front: w.ar,
      back: w.tr,
      backSub: `${w.en}\n(appears ${w.n.toLocaleString()}× in the Quran)`,
    }))
  }
  if (id === 'names') {
    const d = await (await fetch('/api/names')).json()
    return (d.names || []).map((n: { number: number; arabic: string; transliteration: string; meaning: string }) => ({
      id: `n${n.number}`,
      front: n.arabic,
      back: n.transliteration,
      backSub: n.meaning,
    }))
  }
  const d = await (await fetch('/api/duas?category=daily-dua')).json()
  return (d.items || []).map((x: { title: string; arabic: string; translation?: string; latin?: string }, i: number) => ({
    id: `d${i}-${x.title}`,
    front: x.title,
    back: x.arabic,
    backSub: [x.latin, x.translation].filter(Boolean).join('\n'),
  }))
}

export default function FlashcardsPage() {
  const [deckId, setDeckId] = useState<DeckId | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [queue, setQueue] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [namesProg, setNamesProg, namesReady] = useStored<Progress>('deen:fc:names', { cards: {}, newToday: { date: '', count: 0 } })
  const [duasProg, setDuasProg, duasReady] = useStored<Progress>('deen:fc:duas', { cards: {}, newToday: { date: '', count: 0 } })

  const [wordsProg, setWordsProg, wordsReady] = useStored<Progress>('deen:fc:words', { cards: {}, newToday: { date: '', count: 0 } })
  const progs = { names: namesProg, duas: duasProg, words: wordsProg }
  const readys = { names: namesReady, duas: duasReady, words: wordsReady }
  const setters = { names: setNamesProg, duas: setDuasProg, words: setWordsProg }
  const prog = deckId ? progs[deckId] : duasProg
  const setProg = deckId ? setters[deckId] : setDuasProg

  async function open(id: DeckId) {
    setLoading(true)
    setError('')
    try {
      const loaded = await loadDeck(id)
      if (!loaded.length) throw new Error('empty')
      const p = progs[id]
      const today = localDateKey()
      const usedNew = p.newToday.date === today ? p.newToday.count : 0
      const now = new Date()
      const due = loaded.filter((c) => p.cards[c.id] && isDue(p.cards[c.id], now)).map((c) => c.id)
      const fresh = loaded
        .filter((c) => !p.cards[c.id])
        .slice(0, Math.max(0, NEW_PER_DAY - usedNew))
        .map((c) => c.id)
      setCards(loaded)
      setQueue([...due, ...fresh])
      setDeckId(id)
      setRevealed(false)
    } catch {
      setError('Could not load this deck. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const current = cards.find((c) => c.id === queue[0])
  const stored = current ? prog.cards[current.id] ?? newStoredCard() : null

  function grade(g: ReviewGrade) {
    if (!current || !stored) return
    const isNew = !prog.cards[current.id]
    const updated = review(stored, g)
    const today = localDateKey()
    setProg((p) => ({
      cards: { ...p.cards, [current.id]: updated },
      newToday: isNew
        ? { date: today, count: (p.newToday.date === today ? p.newToday.count : 0) + 1 }
        : p.newToday,
    }))
    setQueue((q) => {
      const [first, ...rest] = q
      // "Again" cards come back in this session.
      return g === 'again' ? [...rest, first] : rest
    })
    setRevealed(false)
  }

  if (!deckId) {
    return (
      <div>
        <h1 className="text-2xl font-black text-[#0F766E] mb-1">Flashcards</h1>
        <p className="text-gray-500 text-sm mb-4">
          Spaced repetition (FSRS): cards you find hard come back sooner, easy ones later.
        </p>
        <div className="space-y-3">
          {DECKS.map((d) => {
            const p = progs[d.id]
            const ready = readys[d.id]
            const dueCount = ready ? Object.values(p.cards).filter((c) => isDue(c)).length : 0
            return (
              <button
                key={d.id}
                onClick={() => open(d.id)}
                disabled={loading}
                className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#0F766E] disabled:opacity-50"
              >
                <div className="font-bold">{d.title}</div>
                <div className="text-sm text-gray-500">{d.desc}</div>
                <div className="text-xs text-[#0F766E] mt-2 font-semibold">
                  {Object.keys(p.cards).length} learned · {dueCount} due
                </div>
              </button>
            )
          })}
        </div>
        {loading && <p className="text-gray-500 mt-3">Loading deck…</p>}
        {error && <p className="text-red-600 mt-3">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => setDeckId(null)} className="text-[#0F766E] font-semibold text-sm mb-3">
        ← Decks
      </button>
      {!current || !stored ? (
        <div className="text-center bg-white border border-gray-200 rounded-2xl p-8">
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-xl font-bold">All done for now</h2>
          <p className="text-gray-500 mt-1">Come back later for more reviews, in sha Allah.</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-2">{queue.length} left in this session</p>
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center min-h-56 flex flex-col justify-center">
            <div className="text-3xl" dir={/[؀-ۿ]/.test(current.front) ? 'rtl' : 'ltr'} lang={/[؀-ۿ]/.test(current.front) ? 'ar' : 'en'}>
              {current.front}
            </div>
            {revealed && (
              <div className="mt-5 pt-5 border-t border-gray-200">
                <div className="text-2xl font-bold text-[#0F766E]" dir={/[؀-ۿ]/.test(current.back) ? 'rtl' : 'ltr'}>
                  {current.back}
                </div>
                {current.backSub && <div className="text-gray-600 mt-2 whitespace-pre-line">{current.backSub}</div>}
              </div>
            )}
          </div>
          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="mt-4 w-full py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
              Show answer
            </button>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {(['again', 'hard', 'good', 'easy'] as ReviewGrade[]).map((g) => (
                <button key={g} onClick={() => grade(g)} className="py-3 rounded-xl border-2 border-gray-300 bg-white capitalize text-sm font-semibold hover:border-[#0F766E]">
                  {g}
                  <span className="block text-[10px] text-gray-500 font-normal">{previewIntervals(stored)[g]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
