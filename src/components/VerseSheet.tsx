'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import CardModal from '@/components/CardModal'
import TafsirPanel from '@/components/TafsirPanel'
import { useAudio } from '@/lib/audio'

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

  useEffect(() => {
    setTafsirOpen(false)
    setNote('')
    setShowCard(false)
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
          {note && <p className="text-sm text-[#0F766E] mt-3">{note}</p>}

          {tafsirOpen && <TafsirPanel verseKey={verse.key} />}
        </div>
      </div>
      {showCard && cardInput && <CardModal input={cardInput} onClose={() => setShowCard(false)} />}
    </>
  )
}
