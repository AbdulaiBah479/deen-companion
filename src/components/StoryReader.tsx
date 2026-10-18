'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import LangSelect from '@/components/LangSelect'
import { isRtl, useLang } from '@/lib/languages'
import { getVerseAudioUrl, RECITERS } from '@/lib/quran'
import { getStory } from '@/lib/stories'
import { useStored } from '@/lib/storage'

type Verse = { verse_number: number; verse_key: string; text_uthmani: string; translations?: { text: string }[] }

const stripHtml = (s: string) => s.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]*>/g, '')

export default function StoryReader({ id }: { id: string }) {
  const story = getStory(id)
  const { lang, ready: langReady } = useLang()
  const [chapter, setChapter] = useState(0)
  const [verses, setVerses] = useState<Verse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progress, setProgress] = useStored<Record<string, number>>('deen:stories', {})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const ch = story?.chapters[chapter]

  useEffect(() => {
    if (!ch || !langReady) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/quran/surah/${ch.surah}?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const all: Verse[] = d.verses || []
        const slice = all.filter((v) => v.verse_number >= ch.from && v.verse_number <= ch.to)
        if (!slice.length) throw new Error('empty')
        setVerses(slice)
      })
      .catch(() => !cancelled && setError('Could not load these verses. Please try again.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
      audioRef.current?.pause()
    }
  }, [ch, lang, langReady])

  if (!story || !ch) {
    return (
      <div>
        <p className="mb-3">Story not found.</p>
        <Link href="/stories" className="text-[#0F766E] font-semibold">
          ← All stories
        </Link>
      </div>
    )
  }

  function play(v: number) {
    audioRef.current?.pause()
    const a = new Audio(getVerseAudioUrl(ch!.surah, v, RECITERS[0].folder))
    audioRef.current = a
    a.play().catch(() => {})
  }

  function goto(i: number) {
    // Mark the chapter we're leaving as read.
    setProgress((p) => ({ ...p, [id]: Math.max(p[id] || 0, chapter + 1) }))
    setChapter(i)
    window.scrollTo({ top: 0 })
  }

  const last = chapter === story.chapters.length - 1

  return (
    <div>
      <Link href="/stories" className="text-[#0F766E] font-semibold text-sm">
        ← All stories
      </Link>
      <div className="flex items-center justify-between gap-2 mt-2">
        <h1 className="text-2xl font-black">
          {story.icon} {story.title}
        </h1>
        <LangSelect />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Chapter {chapter + 1} of {story.chapters.length}: <b>{ch.title}</b> — Surah {ch.surah}, verses {ch.from}–{ch.to}
      </p>

      <Link
        href={`/companion?q=${encodeURIComponent(`Explain this passage from the story of ${story.title}: ${ch.title}`)}&ctx=${ch.surah}:${ch.from}-${ch.to}`}
        className="inline-block mb-4 text-sm font-semibold text-[#0F766E] border border-[#0F766E] rounded-lg px-3 py-1"
      >
        🤖 Explain this passage (AI)
      </Link>

      {loading && <p className="text-gray-500">Loading verses…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <ol className="space-y-4">
        {verses.map((v) => (
          <li key={v.verse_key} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold bg-[#0F766E]/10 text-[#0F766E] px-2 py-1 rounded-full">{v.verse_key}</span>
              <button onClick={() => play(v.verse_number)} className="text-sm font-semibold text-[#0F766E]">
                ▶ Play
              </button>
            </div>
            <p className="text-right text-2xl leading-[2.3]" dir="rtl" lang="ar">
              {v.text_uthmani}
            </p>
            {v.translations?.[0] && (
              <p className="mt-3 text-gray-700" dir={isRtl(lang) ? 'rtl' : 'ltr'}>
                {stripHtml(v.translations[0].text)}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => goto(chapter - 1)}
          disabled={chapter === 0}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white disabled:opacity-40"
        >
          ← Previous
        </button>
        {last ? (
          <button
            onClick={() => setProgress((p) => ({ ...p, [id]: story.chapters.length }))}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1a0e00] font-semibold"
          >
            Mark story finished ✓
          </button>
        ) : (
          <button onClick={() => goto(chapter + 1)} className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold">
            Next chapter →
          </button>
        )}
      </div>
      {progress[id] === story.chapters.length && last && (
        <p className="text-center text-[#0F766E] font-semibold mt-4">MashaAllah — story completed.</p>
      )}
    </div>
  )
}
