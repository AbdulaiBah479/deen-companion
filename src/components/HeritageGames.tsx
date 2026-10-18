'use client'

import Link from 'next/link'
import { useState } from 'react'
import { HERITAGE, heritageIn, type Heritage } from '@/lib/heritage'
import { mulberry32, pick, shuffle } from '@/lib/random'
import { useStored } from '@/lib/storage'

const newRand = () => mulberry32(Math.floor(Math.random() * 2 ** 31))

// ───────────────────────── Who am I? ─────────────────────────
// Clues appear one at a time; the fewer you need, the more points you earn.
type WhoRound = { h: Heritage; options: Heritage[]; shown: number; wrong: string[]; done: null | 'won' | 'lost' }

function newWho(): WhoRound {
  const rand = newRand()
  const h = pick(HERITAGE, rand)
  const pool = heritageIn(h.cat).length >= 4 ? heritageIn(h.cat) : HERITAGE
  const options = shuffle([h, ...shuffle(pool.filter((x) => x.id !== h.id), rand).slice(0, 3)], rand)
  return { h, options, shown: 1, wrong: [], done: null }
}

export function WhoAmI() {
  const [round, setRound] = useState<WhoRound | null>(null)
  const [best, setBest] = useStored<number>('deen:whoami-best', 0)
  const [total, setTotal] = useState(0)

  if (!round) {
    return (
      <div>
        <p className="text-gray-600 text-sm mb-3">I am a great figure from Muslim history. Guess who from the clues — fewer clues means more points.</p>
        <button onClick={() => setRound(newWho())} className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
          Start
        </button>
        {best > 0 && <p className="text-sm text-gray-500 mt-3">Best round: {best} points</p>}
      </div>
    )
  }

  const { h, options, shown, wrong, done } = round
  const clues = [...h.clues, `I lived ${h.years}, in ${h.region}.`]
  const points = Math.max(1, 4 - (shown - 1) - wrong.length)

  function guess(o: Heritage) {
    if (done) return
    if (o.id === h.id) {
      setTotal((t) => t + points)
      setBest((b) => Math.max(b, points))
      setRound({ ...round!, done: 'won' })
    } else if (wrong.length + 1 >= 3) {
      setRound({ ...round!, wrong: [...wrong, o.id], done: 'lost' })
    } else {
      // a wrong guess costs a point but reveals another clue
      setRound({ ...round!, wrong: [...wrong, o.id], shown: Math.min(clues.length, shown + 1) })
    }
  }

  return (
    <div>
      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span>Clue {shown} / {clues.length}</span>
        <span>Total: {total} pts</span>
      </div>
      <ol className="space-y-2 mb-4" data-testid="whoami-clues">
        {clues.slice(0, shown).map((c, i) => (
          <li key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            {i < h.clues.length ? <>I <span className="font-medium">{c}</span>.</> : c}
          </li>
        ))}
      </ol>
      <ul className="grid grid-cols-1 gap-2">
        {options.map((o) => {
          const isWrong = wrong.includes(o.id)
          const reveal = !!done
          const cls = reveal ? (o.id === h.id ? 'bg-green-100 border-green-600' : 'bg-white border-gray-200 opacity-60') : isWrong ? 'bg-red-50 border-red-300 opacity-60' : 'bg-white border-gray-300 hover:border-[#0F766E]'
          return (
            <li key={o.id}>
              <button onClick={() => guess(o)} disabled={isWrong || reveal} className={`w-full text-left px-4 py-3 rounded-xl border-2 ${cls}`}>
                {o.name}
              </button>
            </li>
          )
        })}
      </ul>
      {done && (
        <div className="mt-4" data-testid="whoami-result">
          <p className={`font-bold ${done === 'won' ? 'text-green-700' : 'text-red-600'}`}>{done === 'won' ? `Correct! +${points} points` : `It was ${h.name}.`}</p>
          <p className="text-sm text-gray-600 mt-1">{h.lesson}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setRound(newWho())} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">
              Next figure
            </button>
            <Link href={`/heritage/${h.id}`} className="px-4 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] font-semibold">
              Read their story
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── Timeline ─────────────────────────
// Put four figures in order, earliest first.
type TimeRound = { items: Heritage[]; order: string[]; miss: number }

function newTimeline(): TimeRound {
  const rand = newRand()
  for (let attempt = 0; attempt < 200; attempt++) {
    const items = shuffle(HERITAGE, rand).slice(0, 4)
    const years = items.map((i) => i.start).sort((a, b) => a - b)
    // dates are approximate, so only use sets that are clearly separated
    if (years.every((y, i) => i === 0 || y - years[i - 1] >= 60)) return { items, order: [], miss: 0 }
  }
  return { items: shuffle(HERITAGE, rand).slice(0, 4), order: [], miss: 0 }
}

export function Timeline() {
  const [round, setRound] = useState<TimeRound | null>(null)
  const [wins, setWins] = useStored<number>('deen:timeline-wins', 0)

  if (!round) {
    return (
      <div>
        <p className="text-gray-600 text-sm mb-3">Tap four figures from history in the order they were born — earliest first.</p>
        <button onClick={() => setRound(newTimeline())} className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
          Start
        </button>
        {wins > 0 && <p className="text-sm text-gray-500 mt-3">Timelines completed: {wins}</p>}
      </div>
    )
  }

  const sorted = [...round.items].sort((a, b) => a.start - b.start)
  const done = round.order.length === sorted.length

  function tap(h: Heritage) {
    if (done || round!.order.includes(h.id)) return
    const expected = sorted[round!.order.length]
    if (h.id === expected.id) {
      const order = [...round!.order, h.id]
      if (order.length === sorted.length) setWins((w) => w + 1)
      setRound({ ...round!, order })
    } else {
      setRound({ ...round!, miss: round!.miss + 1 })
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">
        Who was born first? Tap in order. Misses: <span data-testid="timeline-miss">{round.miss}</span>
      </p>
      <ul className="grid grid-cols-1 gap-2" data-testid="timeline-items">
        {round.items.map((h) => {
          const place = round.order.indexOf(h.id)
          return (
            <li key={h.id}>
              <button
                onClick={() => tap(h)}
                disabled={place >= 0}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border-2 ${place >= 0 ? 'bg-green-100 border-green-600' : 'bg-white border-gray-300 hover:border-[#0F766E]'}`}
              >
                <span className="w-7 h-7 rounded-full bg-[#0F766E] text-white text-sm flex items-center justify-center shrink-0">{place >= 0 ? place + 1 : '?'}</span>
                <span className="flex-1">
                  <span className="block font-medium">{h.name}</span>
                  {place >= 0 && <span className="block text-xs text-gray-500">{h.years}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {done && (
        <div className="mt-4" data-testid="timeline-done">
          <p className="text-green-700 font-bold">MashaAllah! {round.miss === 0 ? 'Perfect order.' : `Done with ${round.miss} miss${round.miss === 1 ? '' : 'es'}.`}</p>
          <button onClick={() => setRound(newTimeline())} className="mt-2 px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">
            Another timeline
          </button>
        </div>
      )}
    </div>
  )
}
