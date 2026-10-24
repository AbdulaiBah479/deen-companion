'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAudio } from '@/lib/audio'
import { PAUSE_CHOICES, REPEAT_CHOICES, rangeLabel, repeatLabel } from '@/lib/playback'
import { RECITERS } from '@/lib/quran'
import { SLEEP_OPTIONS, formatRemaining, remainingMs } from '@/lib/sleep-timer'

const RATES = [0.75, 1, 1.25, 1.5]

// Persistent "now playing" bar. Sits above the bottom navigation on phones.
export default function MiniPlayer() {
  const a = useAudio()
  const pathname = usePathname()
  const [menu, setMenu] = useState<'sleep' | 'practice' | null>(null)
  const [left, setLeft] = useState(0)
  const endAt = a.sleepEndAt
  useEffect(() => {
    if (endAt === null) return
    const tick = () => setLeft(remainingMs(endAt, Date.now()))
    tick()
    const t = setInterval(tick, 500)
    return () => clearInterval(t)
  }, [endAt])
  // Reels has its own full-screen controls.
  if (!a.track || pathname.startsWith('/reels')) return null
  const isQuran = !!a.nowPlaying
  const practising = isQuran && (a.repeatEach !== 1 || a.pause !== 'none' || !!a.range)
  const toggleMenu = (m: 'sleep' | 'practice') => setMenu((cur) => (cur === m ? null : m))

  return (
    <div
      role="region"
      aria-label="Audio player"
      className="fixed inset-x-2 bottom-[4.25rem] md:bottom-3 md:left-auto md:right-4 md:w-[26rem] z-50 rounded-2xl bg-[#0B3D36] text-white shadow-xl border border-white/10 px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <Link href={a.nowPlaying ? `/quran/${a.nowPlaying.surah}#v${a.nowPlaying.ayah}` : '/reels'} className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{a.track.title}</span>
          <span className="block text-[11px] opacity-70 truncate" aria-live="polite">
            {a.error || (a.gap === 'echo' ? '🗣 Your turn — say it after the reciter' : a.gap === 'short' ? '…' : a.track.subtitle)}
          </span>
        </Link>
        <button onClick={a.stop} aria-label="Close player" className="w-8 h-8 rounded-full text-sm opacity-80 shrink-0">
          ✕
        </button>
      </div>

      <div className="flex items-center gap-1.5 mt-1">
        <button onClick={a.prev} disabled={!isQuran} aria-label="Previous verse" className="w-9 h-9 rounded-full text-lg disabled:opacity-30">
          ⏮
        </button>
        <button
          onClick={a.toggle}
          aria-label={a.playing ? 'Pause' : 'Play'}
          className="w-11 h-11 rounded-full bg-[#D4AF37] text-[#1a0e00] text-lg font-bold flex items-center justify-center"
        >
          {a.loading && !a.playing ? '…' : a.playing ? '⏸' : '▶'}
        </button>
        <button onClick={a.next} disabled={!isQuran} aria-label="Next verse" className="w-9 h-9 rounded-full text-lg disabled:opacity-30">
          ⏭
        </button>

        <div className="ml-auto flex items-center gap-1">
          {isQuran && (
            <button
              onClick={() => a.setRepeat(a.repeat === 'one' ? 'off' : 'one')}
              aria-label={a.repeat === 'one' ? 'Repeat verse: on' : 'Repeat verse: off'}
              aria-pressed={a.repeat === 'one'}
              className={`w-8 h-8 rounded-full text-base ${a.repeat === 'one' ? 'bg-white/25' : 'opacity-70'}`}
            >
              🔂
            </button>
          )}
          <button
            onClick={() => a.setRate(RATES[(RATES.indexOf(a.rate) + 1) % RATES.length])}
            aria-label={`Speed ${a.rate}x`}
            className="px-2 h-8 rounded-full bg-white/15 text-xs font-bold"
          >
            {a.rate}×
          </button>

          <div className="relative">
            <button
              onClick={() => toggleMenu('sleep')}
              aria-label={endAt ? `Sleep timer: ${formatRemaining(left)} left` : 'Sleep timer'}
              aria-expanded={menu === 'sleep'}
              aria-haspopup="menu"
              className={`px-2 h-8 rounded-full text-xs font-bold ${endAt ? 'bg-white/25' : 'opacity-80'}`}
            >
              🌙{endAt ? ` ${formatRemaining(left)}` : ''}
            </button>
            {menu === 'sleep' && (
              <div role="menu" aria-label="Sleep timer" className="absolute bottom-full right-0 mb-2 w-40 rounded-xl bg-white text-gray-900 shadow-lg p-1 z-10">
                <p className="px-3 py-1 text-[11px] text-gray-500">Stop playing after…</p>
                {SLEEP_OPTIONS.map((m) => (
                  <button
                    key={m}
                    role="menuitem"
                    onClick={() => {
                      a.setSleep(m)
                      setMenu(null)
                    }}
                    className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100"
                  >
                    {m} minutes
                  </button>
                ))}
                {endAt && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      a.setSleep(null)
                      setMenu(null)
                    }}
                    className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 text-red-600"
                  >
                    Turn off timer
                  </button>
                )}
              </div>
            )}
          </div>

          {isQuran && (
            <div className="relative">
              <button
                onClick={() => toggleMenu('practice')}
                aria-label="Practice options"
                aria-expanded={menu === 'practice'}
                aria-haspopup="dialog"
                className={`px-2 h-8 rounded-full text-xs font-bold ${practising ? 'bg-[#D4AF37] text-[#1a0e00]' : 'bg-white/15'}`}
              >
                🎯{practising && a.repeatEach !== 1 ? ` ${repeatLabel(a.repeatEach)}` : ''}
              </button>
              {menu === 'practice' && (
                <div role="dialog" aria-label="Practice options" className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-white text-gray-900 shadow-lg p-3 z-10 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Hear each verse</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REPEAT_CHOICES.map((n) => (
                        <button
                          key={n}
                          onClick={() => a.setRepeatEach(n)}
                          aria-pressed={a.repeatEach === n}
                          aria-label={n === 0 ? 'Repeat each verse until stopped' : `Repeat each verse ${n} time${n === 1 ? '' : 's'}`}
                          className={`px-2.5 py-1 rounded-full text-sm border ${a.repeatEach === n ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'border-gray-300'}`}
                        >
                          {repeatLabel(n)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Pause after each verse</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PAUSE_CHOICES.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => a.setPause(p.id)}
                          aria-pressed={a.pause === p.id}
                          className={`px-2.5 py-1 rounded-full text-sm border ${a.pause === p.id ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'border-gray-300'}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">“Your turn” waits as long as the verse, so you can repeat after the reciter.</p>
                  </div>
                  {a.range && (
                    <div className="flex items-center justify-between text-sm rounded-lg bg-gray-100 px-2 py-1.5">
                      <span>Practising {rangeLabel(a.range)}</span>
                      <button onClick={a.clearRange} className="text-[#0F766E] font-semibold">
                        Stop
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isQuran && (
        <div className="mt-1">
          <select
            aria-label="Reciter"
            value={a.reciter}
            onChange={(e) => a.setReciter(e.target.value)}
            className="w-full bg-transparent text-[11px] opacity-95 outline-none"
            style={{ backgroundColor: 'transparent', color: 'inherit', borderColor: 'transparent' }}
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.folder} className="text-black">
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
