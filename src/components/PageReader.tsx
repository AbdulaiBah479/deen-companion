'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import LangSelect from '@/components/LangSelect'
import ReaderToolbar from '@/components/ReaderToolbar'
import ReadingBlock, { type ReadingVerse } from '@/components/ReadingBlock'
import VerseSheet, { type SheetVerse } from '@/components/VerseSheet'
import { useAudio } from '@/lib/audio'
import { isRtl, useLang } from '@/lib/languages'
import { addPages, type ReadLog } from '@/lib/khatam'
import { usePrefs } from '@/lib/prefs'
import { localDateKey, useStored } from '@/lib/storage'
import { useTajweed } from '@/lib/tajweed-client'

type PageVerse = {
  verse_number: number
  verse_key: string
  text_uthmani: string
  translations: { text: string }[]
  surah: number
  surahName: string
  surahArabic: string
  startsSurah: boolean
}
type PageData = { page: number; juz: number; verses: PageVerse[] }

// One page of the 604-page Madani mushaf. Swipe or use the arrow keys (right-to-left, like a printed Quran).
export default function PageReader({ page }: { page: number }) {
  const router = useRouter()
  const { lang, ready: langReady } = useLang()
  const { prefs } = usePrefs()
  const audio = useAudio()
  const [data, setData] = useState<PageData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tajweed, setTajweed] = useStored('deen:tajweed', false)
  const [bookmarks, setBookmarks] = useStored<string[]>('deen:bookmarks', [])
  const [, setLastRead] = useStored<{ surah: number; verse: number } | null>('deen:lastRead', null)
  const [, setReadLog] = useStored<ReadLog>('deen:readlog', {})
  const [sheet, setSheet] = useState<SheetVerse | null>(null)
  const [jump, setJump] = useState('')
  const touch = useRef<{ x: number; y: number } | null>(null)

  const surahsOnPage = useMemo(() => [...new Set(data?.verses.map((v) => v.surah) ?? [])], [data])
  const tj = useTajweed(surahsOnPage, tajweed)

  useEffect(() => {
    if (!langReady) return
    if (!Number.isInteger(page) || page < 1 || page > 604) {
      setError('Page not found (1–604)')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/quran/page/${page}?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (!d.verses) throw new Error(d.error)
        setData(d)
        setLastRead({ surah: d.verses[0].surah, verse: d.verses[0].verse_number })
      })
      .catch(() => !cancelled && setError('Could not load this page. Please try again.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lang, langReady])

  // Count a page as read once you've stayed on it for a few seconds (feeds the Khatam planner and Daily Deeds).
  useEffect(() => {
    if (!data || !Number.isInteger(page)) return
    const t = setTimeout(() => setReadLog((l) => addPages(l, localDateKey(), [page])), 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page])

  // Right-to-left paging: the next page is to the LEFT.
  const go = (p: number) => p >= 1 && p <= 604 && router.push(`/quran/page/${p}`)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'SELECT') return
      if (e.key === 'ArrowLeft') go(page + 1)
      if (e.key === 'ArrowRight') go(page - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function toggleBookmark(key: string) {
    setBookmarks((b) => (b.includes(key) ? b.filter((k) => k !== key) : [...b, key]))
  }

  const openSheet = (v: PageVerse) =>
    setSheet({ key: v.verse_key, surah: v.surah, ayah: v.verse_number, surahName: v.surahName, arabic: v.text_uthmani, translation: v.translations[0]?.text ?? '' })

  // Group consecutive verses by surah so each surah gets its own header on the page where it begins.
  const groups = useMemo(() => {
    const out: { surah: number; name: string; arabic: string; start: boolean; verses: PageVerse[] }[] = []
    for (const v of data?.verses ?? []) {
      const last = out[out.length - 1]
      if (last && last.surah === v.surah) last.verses.push(v)
      else out.push({ surah: v.surah, name: v.surahName, arabic: v.surahArabic, start: v.startsSurah, verses: [v] })
    }
    return out
  }, [data])

  const active = audio.nowPlaying ? `${audio.nowPlaying.surah}:${audio.nowPlaying.ayah}` : null

  return (
    <div
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const t = touch.current
        touch.current = null
        if (!t) return
        const dx = e.changedTouches[0].clientX - t.x
        const dy = e.changedTouches[0].clientY - t.y
        // Only clear horizontal swipes turn the page; swipe right = next page (RTL book).
        if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) go(dx > 0 ? page + 1 : page - 1)
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <Link href="/quran" className="text-[#0F766E] font-semibold text-sm">
          ← Quran
        </Link>
        <LangSelect />
      </div>

      <div className="flex items-center justify-between mb-3 gap-2">
        <button onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page" className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm disabled:opacity-40">
          ← Prev
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number(jump)
            if (Number.isInteger(n)) go(n)
            setJump('')
          }}
          className="flex items-center gap-1"
        >
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            inputMode="numeric"
            placeholder={`${page}`}
            aria-label="Go to page"
            className="w-16 px-2 py-1 rounded-lg border border-gray-300 text-center text-sm"
          />
          <span className="text-xs text-gray-500">/ 604{data ? ` · Juz ${data.juz}` : ''}</span>
        </form>
        <button onClick={() => go(page + 1)} disabled={page >= 604} aria-label="Next page" className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm disabled:opacity-40">
          Next →
        </button>
      </div>

      <ReaderToolbar tajweed={tajweed} onTajweed={setTajweed} tajweedError={tj.error} />

      {loading && <p className="text-gray-500">Loading page…</p>}
      {error && !loading && <p className="text-red-600">{error}</p>}

      {data && (
        <article className="bg-white border-2 border-[#D4AF37]/50 rounded-2xl p-4 md:p-6" aria-label={`Mushaf page ${page}`}>
          {groups.map((g, gi) => {
            const rv: ReadingVerse[] = g.verses.map((v) => ({ key: v.verse_key, surah: v.surah, ayah: v.verse_number, arabic: v.text_uthmani, tajweed: tj.map[v.verse_key] }))
            return (
              <section key={`${g.surah}-${gi}`} className="mb-3">
                {g.start && (
                  <div className="text-center border-y-2 border-[#D4AF37]/60 py-2 mb-2 bg-[#0F766E]/5 rounded">
                    <span className="text-2xl" dir="rtl" lang="ar">
                      سورة {g.arabic}
                    </span>
                    <span className="block text-xs text-gray-500">{g.name}</span>
                  </div>
                )}
                {g.start && g.surah !== 1 && g.surah !== 9 && (
                  <p className="text-center mb-1" style={{ fontSize: 'calc(var(--ar-size) * 0.95)' }} dir="rtl" lang="ar">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </p>
                )}
                <ReadingBlock verses={rv} activeKey={active} onVerse={(x) => openSheet(g.verses.find((v) => v.verse_key === x.key)!)} />
                {prefs.showTranslationInReading && (
                  <ol className="mt-2 space-y-2" dir={isRtl(lang) ? 'rtl' : 'ltr'}>
                    {g.verses.map((v) => (
                      <li key={v.verse_key} className="verse-tr text-gray-700">
                        <b className="text-[#0F766E]">{v.verse_key}</b> {v.translations[0]?.text}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )
          })}
          <p className="text-center text-sm text-gray-500 mt-3">— {page} —</p>
        </article>
      )}

      <p className="text-xs text-gray-500 text-center mt-3">Tap a verse for actions · swipe or use ← → keys to turn pages</p>

      <VerseSheet
        verse={sheet}
        bookmarked={!!sheet && bookmarks.includes(sheet.key)}
        onBookmark={() => sheet && toggleBookmark(sheet.key)}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}
