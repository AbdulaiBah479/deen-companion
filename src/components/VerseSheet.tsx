'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import CardModal from '@/components/CardModal'
import TafsirPanel from '@/components/TafsirPanel'
import { useAudio } from '@/lib/audio'
import { EACH_CHOICES, LOOP_CHOICES } from '@/lib/listen-plan'
import { useSurahData } from '@/lib/surah-list'

export type SheetVerse = { key: string; surah: number; ayah: number; surahName?: string; arabic: string; translation: string }

// Bottom sheet with everything you can do with a verse (tap a verse in Reading mode, or press ⋯ in Translation mode).
export default function VerseSheet({
  verse,
  bookmarked,
  onBookmark,
  onClose,
}: {
  verse: SheetVerse | null
  bookmarked: boolean
  onBookmark: () => void
  onClose: () => void
}) {
  const audio = useAudio()
  const [tafsirOpen, setTafsirOpen] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [note, setNote] = useState('')
  const [repeatOpen, setRepeatOpen] = useState(false)
  const [toAyah, setToAyah] = useState(0)
  const [each, setEach] = useState<number>(1)
  const [rounds, setRounds] = useState<number>(1)
  const { surahs } = useSurahData()

  useEffect(() => {
    setTafsirOpen(false)
    setNote('')
    setShowCard(false)
    setRepeatOpen(false)
    setToAyah(0)
  }, [verse?.key])

  // Stable object so the share image isn't regenerated on every re-render (e.g. audio progress).
  const cardInput = useMemo(
    () =>
      verse
        ? { arabic: verse.arabic, text: verse.translation, ref: `Quran ${verse.key}`, title: verse.surahName, hue: 150 + (verse.surah % 7) * 22 }
        : null,
    [verse]
  )

  useEffect(() => {
    if (!verse) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !showCard && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [verse, onClose, showCard])

  if (!verse) return null

  const shareText = `${verse.arabic}\n\n${verse.translation}\n\n— Quran ${verse.key}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setNote('Copied ✓')
    } catch {
      setNote('Could not copy on this device')
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, title: `Quran ${verse!.key}` })
        return
      } catch {
        return // cancelled
      }
    }
    await copy()
  }

  const btn = 'flex flex-col items-center gap-1 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold hover:border-[#0F766E]'

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} role="presentation">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Actions for verse ${verse.key}`}
          className="absolute bottom-0 inset-x-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:w-full bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold bg-[#0F766E]/10 text-[#0F766E] px-2 py-1 rounded-full">
              {verse.surahName ? `${verse.surahName} ` : ''}
              {verse.key}
            </span>
            <button onClick={onClose} aria-label="Close" className="text-gray-500 text-lg">
              ✕
            </button>
          </div>
          <p className="text-right verse-ar" dir="rtl" lang="ar" style={{ lineHeight: 2.1 }}>
            {verse.arabic}
          </p>
          <p className="text-gray-700 mt-2 verse-tr">{verse.translation}</p>

          <div className="grid grid-cols-4 gap-2 mt-4">
            <button className={btn} onClick={() => audio.playVerse(verse.surah, verse.ayah)}>
              <span className="text-xl">▶</span>Play on
            </button>
            <button className={btn} onClick={onBookmark} aria-pressed={bookmarked}>
              <span className="text-xl">{bookmarked ? '★' : '☆'}</span>
              {bookmarked ? 'Saved' : 'Save'}
            </button>
            <button className={btn} onClick={copy}>
              <span className="text-xl">📋</span>Copy
            </button>
            <button className={btn} onClick={share}>
              <span className="text-xl">📤</span>Share
            </button>
            <button className={btn} onClick={() => setShowCard(true)}>
              <span className="text-xl">🖼</span>Image
            </button>
            <button className={btn} onClick={() => setRepeatOpen((o) => !o)} aria-pressed={repeatOpen} data-testid="sheet-repeat">
              <span className="text-xl">🔁</span>Repeat
            </button>
            <button className={btn} onClick={() => setTafsirOpen((o) => !o)} aria-pressed={tafsirOpen}>
              <span className="text-xl">📖</span>Tafsir
            </button>
            <Link
              className={btn}
              href={`/companion?q=${encodeURIComponent(`Explain Quran ${verse.key}`)}&ctx=${verse.key}`}
            >
              <span className="text-xl">🤖</span>Ask AI
            </Link>
            <Link className={btn} href={`/reels/create?ref=${verse.key}`}>
              <span className="text-xl">🎬</span>Reel
            </Link>
            <Link className={btn} href={`/recite?s=${verse.surah}&from=${verse.ayah}&to=${verse.ayah}`}>
              <span className="text-xl">🎤</span>Recite
            </Link>
            <Link className={btn} href={`/quran/${verse.surah}#v${verse.ayah}`} onClick={onClose}>
              <span className="text-xl">📄</span>Surah
            </Link>
          </div>
          {repeatOpen && (() => {
            const count = surahs.find((x) => x.id === verse.surah)?.verses_count ?? verse.ayah
            const to = Math.min(count, Math.max(verse.ayah, toAyah || verse.ayah))
            const chip = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'border-gray-300'}`
            const times = (n: number) => (n === 0 ? '∞' : `${n}×`)
            return (
              <div className="mt-3 rounded-xl border border-gray-200 p-3 space-y-2" data-testid="sheet-repeat-panel">
                <label className="block text-sm font-semibold">Play from {verse.key} to verse
                  <select value={to} onChange={(e) => setToAyah(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm" aria-label="To verse">
                    {Array.from({ length: count - verse.ayah + 1 }, (_, i) => verse.ayah + i).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <div>
                  <p className="text-sm font-semibold">Each verse</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Times each verse is heard">
                    {EACH_CHOICES.map((n) => <button key={n} type="button" aria-pressed={each === n} className={chip(each === n)} onClick={() => setEach(n)}>{times(n)}</button>)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">The whole part</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Times the whole part is repeated">
                    {LOOP_CHOICES.map((n) => <button key={n} type="button" aria-pressed={rounds === n} className={chip(rounds === n)} onClick={() => setRounds(n)}>{times(n)}</button>)}
                  </div>
                </div>
                <button type="button" data-testid="sheet-repeat-play" className="w-full rounded-xl bg-[#0F766E] text-white py-2 font-semibold" onClick={() => { audio.playPlan({ surah: verse.surah, from: verse.ayah, to, each, loops: rounds, pause: 'none' }); setNote(`Playing ${verse.surah}:${verse.ayah}${to > verse.ayah ? '–' + to : ''}, each verse ${times(each)}, whole part ${times(rounds)}.`); setRepeatOpen(false) }}>▶ Play</button>
              </div>
            )
          })()}
          {note && <p className="text-sm text-[#0F766E] mt-3">{note}</p>}

          {tafsirOpen && <TafsirPanel verseKey={verse.key} />}
        </div>
      </div>
      {showCard && cardInput && <CardModal input={cardInput} onClose={() => setShowCard(false)} />}
    </>
  )
}
