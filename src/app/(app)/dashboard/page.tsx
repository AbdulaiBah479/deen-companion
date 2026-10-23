'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import CardModal from '@/components/CardModal'
import { useAudio } from '@/lib/audio'
import { EMPTY_LEARN, levelOf, liveStreak, type LearnState } from '@/lib/learn'
import { isRtl, useLang } from '@/lib/languages'
import { PRAYER_NAMES } from '@/lib/prayer'
import { minutesNowIn } from '@/lib/prayer-calc'
import { loadPrayerTimes } from '@/lib/prayer-source'
import type { Place } from '@/lib/use-prayer-times'
import { localDateKey, useStored } from '@/lib/storage'
import type { CardInput } from '@/lib/share-card'

type Times = { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string; date: string; hijri: string }
type Ayah = { verse_key: string; verse_number: number; surah: number; surahName: string; text_uthmani: string; translations: { text: string }[] }

const ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const clean = (t: string) => t.split(' ')[0]
const minutes = (t: string) => {
  const [h, m] = clean(t).split(':').map(Number)
  return h * 60 + m
}

const TILES = [
  { href: '/reels', icon: '▶️', title: 'Reels', desc: 'Swipe verses & reminders' },
  { href: '/learn', icon: '🎓', title: 'Learn', desc: 'Letters, words, tajweed' },
  { href: '/companion', icon: '🤖', title: 'AI Companion', desc: 'Ask with sources' },
  { href: '/identify', icon: '🎙', title: 'Identify a verse', desc: 'Like Shazam' },
  { href: '/recite', icon: '🎤', title: 'Recite', desc: 'Get live feedback' },
  { href: '/goals', icon: '📅', title: 'Khatam planner', desc: 'Finish the Quran' },
  { href: '/prayer', icon: '🕌', title: 'Prayer times', desc: 'Tracker & reminders' },
  { href: '/hadith', icon: '📚', title: 'Hadith', desc: 'Nine collections' },
  { href: '/calendar', icon: '🗓', title: 'Calendar', desc: 'Hijri & occasions' },
  { href: '/more', icon: '✨', title: 'More', desc: 'Hifz, duas, quiz…' },
]

export default function DashboardPage() {
  const router = useRouter()
  const audio = useAudio()
  const { lang, ready: langReady } = useLang()
  const [hadith, setHadith] = useState<string | null>(null)
  const [ayah, setAyah] = useState<Ayah | null>(null)
  const [card, setCard] = useState<CardInput | null>(null)
  const [q, setQ] = useState('')
  const [times, setTimes] = useState<Times | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [today, setToday] = useState('')
  const [lastRead] = useStored<{ surah: number; verse: number } | null>('deen:lastRead', null)
  const [prayers, , prayersReady] = useStored<Record<string, Record<string, boolean>>>('deen:prayers', {})
  const [kids] = useStored<boolean>('deen:kids', false)
  const [learn] = useStored<LearnState>('deen:learn', EMPTY_LEARN)
  const [place, , placeReady] = useStored<Place>('deen:place', { kind: 'city', city: 'London', country: 'UK' })
  const [method] = useStored<number>('deen:method', 2)

  useEffect(() => {
    setToday(localDateKey())
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Hadith + ayah of the day (follow the chosen language)
  useEffect(() => {
    if (!langReady || !today) return
    let cancelled = false
    fetch(`/api/hadith?date=${today}&lang=${lang}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setHadith(d.hadith?.text ?? null))
      .catch(() => !cancelled && setHadith(null))
    fetch(`/api/ayah-of-day?date=${today}&lang=${lang}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setAyah(d.verse ?? null))
      .catch(() => !cancelled && setAyah(null))
    return () => {
      cancelled = true
    }
  }, [lang, langReady, today])

  // Prayer times for the saved place
  useEffect(() => {
    if (!placeReady) return
    let cancelled = false
    loadPrayerTimes(place, method)
      .then((t) => !cancelled && setTimes(t))
      .catch(() => !cancelled && setTimes(null))
    return () => {
      cancelled = true
    }
  }, [place, placeReady, method])

  const upcoming = useMemo(() => {
    if (!times || now === null) return null
    // "now" on the clock of the place the times are for (a saved city can be in another time zone)
    const mins = minutesNowIn(place.kind === 'city' ? place.geo?.tz : undefined, new Date(now))
    const found = ORDER.find((p) => minutes(times[p]) > mins)
    const prayer = found ?? 'fajr'
    const target = minutes(times[prayer]) + (found ? 0 : 24 * 60)
    const diff = target - mins
    return { prayer, time: clean(times[prayer]), inH: Math.floor(diff / 60), inM: diff % 60 }
  }, [times, now, place])

  const doneToday = prayersReady && today ? Object.values(prayers[today] ?? {}).filter(Boolean).length : 0
  const streak = today ? liveStreak(learn, today) : 0
  const lv = levelOf(learn.xp)

  return (
    <div>
      {/* Hero: greeting + next prayer */}
      <section className="rounded-3xl p-5 mb-4 text-white bg-gradient-to-br from-[#0F766E] via-[#0D6B5E] to-[#15803D] relative overflow-hidden">
        <div className="reel-pattern absolute inset-0 pointer-events-none" aria-hidden="true" />
        <div className="relative">
          <p className="text-lg opacity-90" dir="rtl" lang="ar">
            السلام عليكم ورحمة الله
          </p>
          <h1 className="text-2xl font-black mb-1">{kids ? 'Assalamu alaikum, friend! 🌟' : 'Assalamu alaikum'}</h1>
          {times && <p className="text-xs opacity-80 mb-3">{times.date} · {times.hijri} AH</p>}
          {upcoming ? (
            <Link href="/prayer" className="block bg-black/20 rounded-2xl px-4 py-3">
              <span className="block text-xs opacity-80">Next prayer</span>
              <span className="flex items-baseline justify-between">
                <span className="text-xl font-black">
                  {PRAYER_NAMES[upcoming.prayer].icon} {PRAYER_NAMES[upcoming.prayer].en} <span className="text-[#E6C86A]">{upcoming.time}</span>
                </span>
                <span className="text-sm font-semibold">
                  in {upcoming.inH > 0 ? `${upcoming.inH}h ` : ''}
                  {upcoming.inM}m
                </span>
              </span>
            </Link>
          ) : (
            <Link href="/prayer" className="block bg-black/20 rounded-2xl px-4 py-3 text-sm">
              🕌 Set your location for prayer times →
            </Link>
          )}
        </div>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(q.trim())}`)
        }}
        className="flex gap-2 mb-4"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Quran & hadith by meaning…"
          aria-label="Search"
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-300 bg-white"
        />
        <button className="px-4 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">Go</button>
      </form>

      {/* Progress row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {lastRead ? (
          <Link href={`/quran/${lastRead.surah}`} className="bg-[#0F766E] text-white rounded-2xl p-3">
            <div className="text-[11px] opacity-95">Continue reading</div>
            <div className="font-bold">Surah {lastRead.surah}</div>
          </Link>
        ) : (
          <Link href="/quran" className="bg-[#0F766E] text-white rounded-2xl p-3">
            <div className="text-[11px] opacity-95">Start reading</div>
            <div className="font-bold">The Quran</div>
          </Link>
        )}
        <Link href="/prayer" className="bg-white border border-gray-200 rounded-2xl p-3">
          <div className="text-[11px] text-gray-500">Prayers today</div>
          <div className="font-bold text-[#0F766E]">{doneToday} / 5</div>
        </Link>
        <Link href="/learn" className="bg-white border border-gray-200 rounded-2xl p-3">
          <div className="text-[11px] text-gray-500">🔥 Streak · Lv {lv.level}</div>
          <div className="font-bold text-gold">{streak} day{streak === 1 ? '' : 's'}</div>
        </Link>
      </div>

      {/* Ayah of the day */}
      {ayah && (
        <section className="bg-white border border-gray-200 rounded-2xl p-5 mb-4" aria-label="Ayah of the day">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-gold uppercase tracking-wide">Ayah of the day</div>
            <Link href={`/quran/${ayah.surah}#v${ayah.verse_number}`} className="text-xs font-bold text-[#0F766E]">
              {ayah.surahName} {ayah.verse_key}
            </Link>
          </div>
          <p className="text-right verse-ar" dir="rtl" lang="ar" style={{ fontSize: 'calc(var(--ar-size) * 0.9)' }}>
            {ayah.text_uthmani}
          </p>
          <p className="text-gray-700 mt-2 verse-tr line-clamp-4" dir={isRtl(lang) ? 'rtl' : 'ltr'}>
            {ayah.translations[0]?.text}
          </p>
          <div className="flex gap-3 mt-3 text-sm font-semibold">
            <button onClick={() => audio.playVerse(ayah.surah, ayah.verse_number)} className="text-[#0F766E]">
              ▶ Listen
            </button>
            <button
              onClick={() =>
                setCard({ arabic: ayah.text_uthmani, text: ayah.translations[0]?.text ?? '', ref: `Quran ${ayah.verse_key}`, title: 'Ayah of the day', hue: 160 })
              }
              className="text-[#0F766E]"
            >
              🖼 Share
            </button>
            <Link href={`/companion?q=${encodeURIComponent(`Explain Quran ${ayah.verse_key}`)}&ctx=${ayah.verse_key}`} className="text-[#0F766E]">
              🤖 Explain
            </Link>
          </div>
        </section>
      )}

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 hover:border-[#0F766E] transition-colors">
            <div className="text-2xl shrink-0">{t.icon}</div>
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight">{t.title}</div>
              <div className="text-[11px] text-gray-500 leading-tight line-clamp-2">{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {hadith && (
        <section className="bg-white border border-gray-200 rounded-2xl p-5 mb-2">
          <div className="text-xs font-bold text-gold uppercase tracking-wide mb-2">Hadith of the day</div>
          <p className="text-gray-800 leading-relaxed line-clamp-6">{hadith}</p>
          <Link href="/hadith" className="text-sm font-semibold text-[#0F766E] mt-2 inline-block">
            Read more →
          </Link>
        </section>
      )}

      {card && <CardModal input={card} onClose={() => setCard(null)} />}
    </div>
  )
}
