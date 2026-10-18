'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import LangSelect from '@/components/LangSelect'
import ReaderToolbar from '@/components/ReaderToolbar'
import ReadingBlock, { type ReadingVerse } from '@/components/ReadingBlock'
import TafsirPanel from '@/components/TafsirPanel'
import TajweedText from '@/components/TajweedText'
import VerseSheet, { type SheetVerse } from '@/components/VerseSheet'
import { useAudio } from '@/lib/audio'
import { isRtl, useLang } from '@/lib/languages'
import { usePrefs } from '@/lib/prefs'
import { useStored } from '@/lib/storage'
import { useSurahData } from '@/lib/surah-list'
import { useTajweed } from '@/lib/tajweed-client'

type Verse = {
  verse_number: number
  verse_key: string
  text_uthmani: string
  translations?: { text: string }[]
}
type Word = { ar: string; tr: string; en: string }

export default function SurahReader({ surahNum }: { surahNum: number }) {
  const { lang, ready: langReady } = useLang()
  const { prefs } = usePrefs()
  const audio = useAudio()
  const { surahs } = useSurahData()
  const meta = surahs.find((s) => s.id === surahNum)

  const [verses, setVerses] = useState<Verse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tajweed, setTajweed] = useStored('deen:tajweed', false)
  const [wbw, setWbw] = useStored('deen:wbw', false)
  const [words, setWords] = useState<Record<number, Word[]>>({})
  const [wordsError, setWordsError] = useState('')
  const [bookmarks, setBookmarks] = useStored<string[]>('deen:bookmarks', [])
  const [, setLastRead] = useStored<{ surah: number; verse: number } | null>('deen:lastRead', null)
  const [openTafsir, setOpenTafsir] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetVerse | null>(null)
  const scrolledToHash = useRef(false)

  const tj = useTajweed([surahNum], tajweed)
  const active = audio.nowPlaying?.surah === surahNum ? audio.nowPlaying.ayah : null

  // Verses (bundled data, translation in the chosen language). Waits for the saved language and ignores stale replies.
  useEffect(() => {
    if (!langReady) return
    if (!Number.isInteger(surahNum) || surahNum < 1 || surahNum > 114) {
      setError('Surah not found')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/quran/surah/${surahNum}?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (!d.verses?.length) setError('Could not load this surah. Please try again.')
        setVerses(d.verses || [])
        setLastRead({ surah: surahNum, verse: 1 })
      })
      .catch(() => !cancelled && setError('Could not load this surah. Please try again.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNum, lang, langReady])

  // Word-by-word is fetched only when switched on.
  useEffect(() => {
    setWords({})
  }, [surahNum])
  useEffect(() => {
    if (!wbw || Object.keys(words).length) return
    setWordsError('')
    fetch(`/api/quran/words/${surahNum}`)
      .then((r) => r.json())
      .then((d) => (d.words ? setWords(d.words) : setWordsError(d.error || 'Word-by-word unavailable')))
      .catch(() => setWordsError('Word-by-word is unavailable right now.'))
  }, [wbw, surahNum, words])

  // Jump to #v<verse> (from bookmarks, search results, the mini player).
  useEffect(() => {
    if (scrolledToHash.current || !verses.length) return
    const m = /^#v(\d+)$/.exec(window.location.hash)
    if (!m) return
    scrolledToHash.current = true
    requestAnimationFrame(() => document.getElementById(`v${m[1]}`)?.scrollIntoView({ block: 'center' }))
  }, [verses])

  // Follow the recitation.
  useEffect(() => {
    if (active && audio.playing) document.getElementById(`v${active}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [active, audio.playing])

  function toggleBookmark(key: string) {
    setBookmarks((b) => (b.includes(key) ? b.filter((k) => k !== key) : [...b, key]))
  }

  const toggleTafsir = (key: string) => setOpenTafsir((cur) => (cur === key ? null : key))

  const openSheet = (v: Verse) =>
    setSheet({
      key: v.verse_key,
      surah: surahNum,
      ayah: v.verse_number,
      surahName: meta?.name_simple,
      arabic: v.text_uthmani,
      translation: v.translations?.[0]?.text ?? '',
    })

  const readingVerses: ReadingVerse[] = useMemo(
    () => verses.map((v) => ({ key: v.verse_key, surah: surahNum, ayah: v.verse_number, arabic: v.text_uthmani, tajweed: tj.map[v.verse_key] })),
    [verses, surahNum, tj.map]
  )

  const showBismillah = surahNum !== 1 && surahNum !== 9 && verses.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Link href="/quran" className="text-[#0F766E] font-semibold text-sm">
          ← All surahs
        </Link>
        <div className="flex gap-2">
          {surahNum > 1 && (
            <Link href={`/quran/${surahNum - 1}`} className="text-sm px-3 py-1 border border-gray-300 rounded-lg bg-white">
              Prev
            </Link>
          )}
          {surahNum < 114 && (
            <Link href={`/quran/${surahNum + 1}`} className="text-sm px-3 py-1 border border-gray-300 rounded-lg bg-white">
              Next
            </Link>
          )}
        </div>
      </div>

      {/* Surah header */}
      <header className="rounded-2xl p-5 mb-4 text-white text-center hero-teal">
        <h1 className="text-sm font-semibold opacity-80">Surah {surahNum}</h1>
        <p className="text-4xl my-1" dir="rtl" lang="ar">
          {meta?.name_arabic}
        </p>
        <p className="font-bold">{meta?.name_simple ?? '…'}</p>
        {meta && (
          <p className="text-xs opacity-80 mt-1">
            {meta.translated_name.name} · {meta.revelation_place === 'makkah' ? 'Meccan' : 'Medinan'} · {meta.verses_count} verses
          </p>
        )}
        <div className="flex justify-center gap-2 mt-3">
          <button
            onClick={() => audio.playVerse(surahNum, 1)}
            disabled={!verses.length}
            className="px-4 py-2 rounded-full bg-[#D4AF37] text-[#1a0e00] text-sm font-bold disabled:opacity-50"
          >
            ▶ Play surah
          </button>
          {meta?.page && (
            <Link href={`/quran/page/${meta.page}`} className="px-4 py-2 rounded-full bg-white/15 text-sm font-semibold">
              Mushaf page {meta.page}
            </Link>
          )}
        </div>
      </header>

      <div className="flex items-center justify-between gap-2 mb-3">
        <LangSelect />
        {audio.error && <span className="text-xs text-red-600">{audio.error}</span>}
      </div>

      <ReaderToolbar
        tajweed={tajweed}
        onTajweed={setTajweed}
        wbw={wbw}
        onWbw={setWbw}
        tajweedError={tj.error}
        wbwError={wordsError}
      />

      {tajweed && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-xs bg-white border border-gray-200 rounded-xl p-3">
          {[
            ['ghunnah', 'Ghunnah'],
            ['ikhafa', 'Ikhfa'],
            ['idgham_ghunnah', 'Idgham (ghunnah)'],
            ['idgham_wo_ghunnah', 'Idgham (no ghunnah)'],
            ['iqlab', 'Iqlab'],
            ['qalaqah', 'Qalqalah'],
            ['madda_necessary', 'Madd 6'],
            ['madda_obligatory', 'Madd 4–5'],
            ['madda_permissible', 'Madd 2/4/6'],
            ['madda_normal', 'Madd 2'],
            ['ham_wasl', 'Silent'],
          ].map(([cls, label]) => (
            <span key={cls} className={`tj-${cls} font-semibold`}>
              ● {label}
            </span>
          ))}
        </div>
      )}

      {loading && <p className="text-gray-500">Loading verses…</p>}
      {error && !loading && <p className="text-red-600">{error}</p>}

      {showBismillah && (
        <p className="text-center mb-5" style={{ fontSize: 'calc(var(--ar-size) * 0.95)' }} dir="rtl" lang="ar">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </p>
      )}

      {prefs.mode === 'reading' && verses.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
            <ReadingBlock
              verses={readingVerses}
              activeKey={active ? `${surahNum}:${active}` : null}
              onVerse={(rv) => openSheet(verses.find((v) => v.verse_key === rv.key)!)}
            />
          </div>
          {prefs.showTranslationInReading && (
            <ol className="space-y-3 mb-6">
              {verses.map((v) => (
                <li key={v.verse_key} className="verse-tr text-gray-700" dir={isRtl(lang) ? 'rtl' : 'ltr'}>
                  <b className="text-[#0F766E]">{v.verse_number}.</b> {v.translations?.[0]?.text}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {prefs.mode === 'translation' && (
        <ol className="space-y-4">
          {verses.map((v) => {
            const marked = bookmarks.includes(v.verse_key)
            const vw = wbw ? words[v.verse_number] : undefined
            const isActive = active === v.verse_number
            return (
              <li
                id={`v${v.verse_number}`}
                key={v.verse_key}
                className={`bg-white border rounded-2xl p-5 transition-colors ${isActive ? 'border-[#D4AF37] verse-active' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-xs font-bold bg-[#0F766E]/10 text-[#0F766E] px-2 py-1 rounded-full">{v.verse_key}</span>
                  <div className="flex items-center gap-3 text-sm font-semibold">
                    <button
                      onClick={() => toggleBookmark(v.verse_key)}
                      aria-pressed={marked}
                      aria-label={marked ? 'Remove bookmark' : 'Bookmark verse'}
                      className={marked ? 'text-gold' : 'text-gray-500'}
                    >
                      {marked ? '★' : '☆'}
                    </button>
                    <Link href={`/companion?q=${encodeURIComponent(`Explain Quran ${v.verse_key}`)}&ctx=${encodeURIComponent(v.verse_key)}`} className="text-[#0F766E]">
                      Ask AI
                    </Link>
                    <button onClick={() => toggleTafsir(v.verse_key)} className="text-[#0F766E]">
                      Tafsir
                    </button>
                    <button
                      onClick={() => (isActive && audio.playing ? audio.toggle() : audio.playVerse(surahNum, v.verse_number))}
                      className="text-[#0F766E]"
                      aria-label={isActive && audio.playing ? 'Pause recitation' : `Play verse ${v.verse_number}`}
                    >
                      {isActive && audio.playing ? '⏸ Pause' : '▶ Play'}
                    </button>
                    <button onClick={() => openSheet(v)} aria-label={`More actions for verse ${v.verse_key}`} className="text-gray-500 text-lg leading-none">
                      ⋯
                    </button>
                  </div>
                </div>

                {vw ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-3 justify-start" dir="rtl" lang="ar">
                    {vw.map((w, i) => (
                      <span key={i} className="text-center">
                        <span className="block leading-[1.8]" style={{ fontSize: 'var(--ar-size)' }}>
                          {w.ar}
                        </span>
                        <span className="block text-[11px] text-[#0F766E]" dir="ltr">
                          {w.tr}
                        </span>
                        <span className="block text-xs text-gray-600" dir="ltr">
                          {w.en}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-right verse-ar" dir="rtl" lang="ar">
                    {tajweed && tj.map[v.verse_key] ? <TajweedText markup={tj.map[v.verse_key]} /> : v.text_uthmani}
                  </p>
                )}

                {v.translations?.[0] && (
                  <p className="text-gray-700 mt-3 verse-tr" dir={isRtl(lang) ? 'rtl' : 'ltr'}>
                    {v.translations[0].text}
                  </p>
                )}
                {openTafsir === v.verse_key && <TafsirPanel verseKey={v.verse_key} />}
              </li>
            )
          })}
        </ol>
      )}

      <VerseSheet
        verse={sheet}
        bookmarked={!!sheet && bookmarks.includes(sheet.key)}
        onBookmark={() => sheet && toggleBookmark(sheet.key)}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}
