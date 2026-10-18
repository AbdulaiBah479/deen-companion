'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CardModal from '@/components/CardModal'
import { useAudio } from '@/lib/audio'
import { wordIndexAt } from '@/lib/captions'
import { dayKey, milestoneMessage, prune, recordView, streakInfo, type ReelActivity } from '@/lib/reel-streak'
import type { ReelVideo } from '@/lib/pexels'
import { useLang } from '@/lib/languages'
import { getVerseAudioUrl } from '@/lib/quran'
import { cardColors, type CardInput } from '@/lib/share-card'
import { useStored } from '@/lib/storage'

type Item =
  | { id: string; type: 'ayah'; ref: string; surah: number; ayah: number; surahName: string; arabic: string; text: string; href: string }
  | { id: string; type: 'hadith'; ref: string; text: string; href: string }
  | { id: string; type: 'name'; arabic: string; transliteration: string; text: string; href: string }
  | { id: string; type: 'word'; arabic: string; transliteration: string; text: string; count: number; audio?: string; href: string }

const TOPICS = [
  ['foryou', 'For you'], ['patience', 'Patience'], ['gratitude', 'Gratitude'], ['mercy', 'Mercy'], ['hope', 'Hope'],
  ['forgiveness', 'Forgiveness'], ['family', 'Family'], ['knowledge', 'Knowledge'], ['charity', 'Charity'], ['prayer', 'Prayer'], ['death', 'Reminders'],
] as const

const HUES = [150, 165, 180, 200, 220, 260, 285, 340, 25]
const hueOf = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return HUES[h % HUES.length]
}
type Comment = { id: string; text: string; ts: number }
const MAX_COMMENT = 280
const VIEW_MS = 3000 // a reel counts as watched after this long on screen
const hashOf = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}
const arabicSize = (words: number) => (words <= 8 ? 44 : words <= 16 ? 34 : words <= 28 ? 28 : 23)

export default function ReelsFeed() {
  const { lang, ready: langReady } = useLang()
  const audio = useAudio()
  const [topic, setTopic] = useState<string>('foryou')
  const [items, setItems] = useState<Item[]>([])
  const [next, setNext] = useState<number | null>(0)
  const [seed, setSeed] = useState(0)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const [sound, setSound] = useStored<boolean>('deen:reel-sound', true)
  const [autoNext, setAutoNext] = useStored<boolean>('deen:reel-auto', true)
  const [likes, setLikes] = useStored<string[]>('deen:likes', [])
  const [saved, setSaved] = useStored<Item[]>('deen:reel-saves', [])
  const [, setBookmarks] = useStored<string[]>('deen:bookmarks', [])
  const [card, setCard] = useState<CardInput | null>(null)
  const [popId, setPopId] = useState<string | null>(null)
  const [videos, setVideos] = useState<ReelVideo[]>([])
  const [badVideos, setBadVideos] = useState<number[]>([])
  const [wordIdx, setWordIdx] = useState(-1)
  const [comments, setComments] = useStored<Record<string, Comment[]>>('deen:comments', {})
  const [commentsFor, setCommentsFor] = useState<Item | null>(null)
  const [draft, setDraft] = useState('')
  const [log, setLog, logReady] = useStored<ReelActivity>('deen:reel-log', {})
  const [today, setToday] = useState('')
  const [toast, setToast] = useState('')
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const prevMet = useRef<boolean | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const loadingRef = useRef(false)
  const gen = useRef(0) // invalidates in-flight loads when the topic changes

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 900_000) + 1)
  }, [])

  useEffect(() => {
    setToday(dayKey(new Date()))
  }, [])

  // Background footage for this topic (server route; empty when no Pexels key is configured).
  useEffect(() => {
    let off = false
    setVideos([])
    fetch(`/api/videos?topic=${topic}`)
      .then((r) => r.json())
      .then((d) => !off && setVideos(Array.isArray(d.videos) ? d.videos : []))
      .catch(() => {})
    return () => {
      off = true
    }
  }, [topic])

  const videoFor = useCallback(
    (id: string) => {
      const ok = videos.filter((v) => !badVideos.includes(v.id))
      return ok.length ? ok[hashOf(id) % ok.length] : null
    },
    [videos, badVideos]
  )

  const load = useCallback(
    async (cursor: number, replace: boolean) => {
      if (!langReady || !seed || loadingRef.current) return
      const mine = gen.current
      loadingRef.current = true
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/reels?topic=${topic}&cursor=${cursor}&seed=${seed}&limit=8&lang=${lang}`)
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'failed')
        if (mine !== gen.current) return
        setItems((prev) => {
          const base = replace ? [] : prev
          const have = new Set(base.map((i) => i.id))
          return [...base, ...(d.items as Item[]).filter((i) => !have.has(i.id))]
        })
        setNext(d.next)
      } catch {
        if (mine === gen.current) setError('Could not load more. Check your connection and try again.')
      } finally {
        if (mine === gen.current) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    },
    [langReady, lang, seed, topic]
  )

  // (Re)start the feed when topic, language or seed changes. "saved" is local.
  useEffect(() => {
    gen.current++
    loadingRef.current = false
    audio.stop()
    setActive(0)
    scroller.current?.scrollTo({ top: 0 })
    if (topic === 'saved') {
      setItems(saved)
      setNext(null)
      return
    }
    setItems([])
    setNext(0)
    void load(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, lang, seed, langReady])

  // Which card is on screen?
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number((e.target as HTMLElement).dataset.index))
        }
      },
      { root: scroller.current, threshold: [0.6] }
    )
    sectionRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [items])

  // Load the next batch when nearing the end.
  useEffect(() => {
    if (next !== null && items.length && active >= items.length - 3) void load(next, false)
  }, [active, items.length, next, load])

  const goTo = useCallback((i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Play the recitation of the card on screen.
  const cur = items[active]
  useEffect(() => {
    if (!started || !sound || !cur) return
    if (cur.type === 'ayah') {
      audio.playUrl(
        {
          url: getVerseAudioUrl(cur.surah, cur.ayah, audio.reciter),
          title: cur.surahName ? `${cur.surahName} ${cur.ref}` : `Quran ${cur.ref}`,
          subtitle: 'Islamic Reels',
        },
        () => autoNext && goTo(active + 1)
      )
    } else if (cur.type === 'word' && cur.audio) {
      audio.playUrl({ url: cur.audio, title: cur.transliteration, subtitle: 'Quran word' }, () => autoNext && goTo(active + 1))
    } else {
      audio.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, started, sound])

  // Karaoke captions: estimate which word is being recited from the audio position.
  useEffect(() => {
    setWordIdx(-1)
    if (!started || !sound || !cur || cur.type !== 'ayah') return
    const words = cur.arabic.split(' ')
    const t = setInterval(() => setWordIdx(wordIndexAt(audio.progress(), words)), 120)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, started, sound])

  // Only the reel on screen plays its video; the rest stay paused.
  useEffect(() => {
    for (const [id, el] of Object.entries(videoRefs.current)) {
      if (!el) continue
      if (id === cur?.id) el.play().catch(() => {})
      else el.pause()
    }
  }, [cur?.id, videos])

  // Streak: a reel counts once it has stayed on screen for a few seconds.
  useEffect(() => {
    if (!cur || !today || !logReady) return
    const id = cur.id
    const t = setTimeout(() => setLog((l) => prune(recordView(l, today, id), today)), VIEW_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, today, logReady])

  const info = useMemo(() => streakInfo(log, today || '0000-00-00'), [log, today])
  const { goalMet, current: streakNow } = info
  useEffect(() => {
    if (!today || !logReady) return // wait for the saved log, or an already-met day would look like a new achievement
    if (prevMet.current === false && goalMet) {
      setToast(milestoneMessage(streakNow) ?? `Daily goal reached — ${streakNow}-day streak`)
      const t = setTimeout(() => setToast(''), 4500)
      prevMet.current = true
      return () => clearTimeout(t)
    }
    prevMet.current = goalMet
  }, [goalMet, streakNow, today, logReady])

  const addComment = useCallback(
    (itemId: string) => {
      const text = draft.trim().slice(0, MAX_COMMENT)
      if (!text) return
      setComments((c) => ({ ...c, [itemId]: [...(c[itemId] ?? []), { id: `c${Date.now()}`, text, ts: Date.now() }] }))
      setDraft('')
    },
    [draft, setComments]
  )
  const removeComment = useCallback(
    (itemId: string, cid: string) => setComments((c) => ({ ...c, [itemId]: (c[itemId] ?? []).filter((x) => x.id !== cid) })),
    [setComments]
  )

  // Leaving the page stops the reel audio.
  useEffect(() => {
    return () => audio.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLike = useCallback(
    (id: string) => {
      setLikes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
      setPopId(id)
      setTimeout(() => setPopId(null), 400)
    },
    [setLikes]
  )

  const toggleSave = useCallback(
    (it: Item) => {
      setSaved((s) => (s.some((x) => x.id === it.id) ? s.filter((x) => x.id !== it.id) : [...s, it]))
      if (it.type === 'ayah') setBookmarks((b) => (b.includes(it.ref) ? b : [...b, it.ref]))
    },
    [setSaved, setBookmarks]
  )

  // Keyboard: ↓/j next, ↑/k previous, space play/pause, l like
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || card || commentsFor) return
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        goTo(active + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        goTo(active - 1)
      } else if (e.key === ' ') {
        e.preventDefault()
        if (started) audio.toggle()
        else setStarted(true)
      } else if ((e.key === 'l' || e.key === 'L') && cur) toggleLike(cur.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, cur, started, card, commentsFor, audio, goTo, toggleLike])

  const cardFor = (it: Item): CardInput => {
    const hue = hueOf(it.id)
    if (it.type === 'ayah') return { arabic: it.arabic, text: it.text, ref: `Quran ${it.ref}`, title: it.surahName, hue }
    if (it.type === 'hadith') return { text: it.text, ref: it.ref, title: 'Hadith', hue }
    if (it.type === 'name') return { arabic: it.arabic, text: `${it.transliteration} — ${it.text}`, ref: 'The Names of Allah', title: 'Asma ul-Husna', hue }
    return { arabic: it.arabic, text: `${it.transliteration} — ${it.text}`, ref: `Appears ${it.count} times in the Quran`, title: 'Quran word', hue }
  }

  const aiLink = (it: Item) => {
    if (it.type === 'ayah') return `/companion?q=${encodeURIComponent(`Explain Quran ${it.ref}`)}&ctx=${it.ref}`
    if (it.type === 'hadith') return `/companion?q=${encodeURIComponent(`Explain this hadith: ${it.text.slice(0, 300)}`)}`
    return `/companion?q=${encodeURIComponent(`Tell me about ${it.type === 'name' ? it.transliteration : it.text}`)}`
  }

  const colors = useMemo(() => items.map((it) => cardColors(hueOf(it.id))), [items])

  return (
    <div className="fixed inset-0 z-[45] bg-black text-white" data-testid="reels">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/70 to-transparent pt-2 pb-6 px-3">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard" aria-label="Exit reels" className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            ✕
          </Link>
          <span className="font-bold flex-1">Reels</span>
          <span
            data-testid="reel-streak"
            aria-label={`Reels streak: ${info.current} days. Today ${Math.min(info.todayCount, info.goal)} of ${info.goal} reels`}
            title={`Watch ${info.goal} reels a day to keep your streak. Best: ${info.best}`}
            className={`px-2.5 h-9 rounded-full text-xs font-bold flex items-center gap-1 ${info.goalMet ? 'bg-[#D4AF37] text-black' : 'bg-white/15'}`}
          >
            🔥 {info.current}
            <span className="font-normal opacity-80">
              {Math.min(info.todayCount, info.goal)}/{info.goal}
            </span>
          </span>
          <Link href="/reels/create" aria-label="Create a reel" className="px-3 h-9 rounded-full bg-white/15 text-xs font-semibold flex items-center">
            ＋ Create
          </Link>
          <button
            onClick={() => setAutoNext(!autoNext)}
            aria-pressed={autoNext}
            aria-label="Auto-advance when the recitation ends"
            className={`px-3 h-9 rounded-full text-xs font-semibold ${autoNext ? 'bg-[#D4AF37] text-black' : 'bg-white/15'}`}
          >
            Auto ⏭
          </button>
          <button
            onClick={() => {
              setSound(!sound)
              if (sound) audio.stop()
            }}
            aria-pressed={sound}
            aria-label={sound ? 'Sound on' : 'Sound off'}
            className="w-9 h-9 rounded-full bg-white/15"
          >
            {sound ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Topics" style={{ scrollbarWidth: 'none' }}>
          {[...TOPICS, ['saved', `Saved (${saved.length})`] as const].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={topic === id}
              onClick={() => setTopic(id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${topic === id ? 'bg-white text-black' : 'bg-white/15'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div ref={scroller} className="reels-scroll h-full w-full" aria-label="Islamic reels feed">
        {items.map((it, i) => {
          const liked = likes.includes(it.id)
          const isSaved = saved.some((x) => x.id === it.id)
          const arWords = 'arabic' in it ? it.arabic.split(' ').length : 0
          return (
            <section
              key={it.id}
              ref={(el) => {
                sectionRefs.current[i] = el
              }}
              data-index={i}
              data-reel-type={it.type}
              aria-label={`Reel ${i + 1}`}
              className="reel relative h-[100dvh] w-full flex items-center justify-center pl-7 pr-[4.75rem] py-28 overflow-hidden"
              style={{ background: `linear-gradient(160deg, ${colors[i]?.from}, ${colors[i]?.to})` }}
              onDoubleClick={() => toggleLike(it.id)}
              onClick={() => (started ? (i === active ? audio.toggle() : null) : (setStarted(true), setActive(i)))}
            >
              {(() => {
                const v = Math.abs(i - active) <= 1 ? videoFor(it.id) : null
                return v ? (
                  <>
                    <video
                      key={v.id}
                      ref={(el) => {
                        videoRefs.current[it.id] = el
                      }}
                      data-reel-video
                      src={v.src}
                      poster={v.poster}
                      muted
                      loop
                      playsInline
                      preload={i === active ? 'auto' : 'metadata'}
                      autoPlay={i === active}
                      onError={() => setBadVideos((b) => (b.includes(v.id) ? b : [...b, v.id]))}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-black/45 pointer-events-none" aria-hidden="true" />
                  </>
                ) : (
                  <div className="reel-pattern absolute inset-0 pointer-events-none" aria-hidden="true" />
                )
              })()}
              <div className="relative max-w-xl w-full text-center">
                <p className="text-xs tracking-widest uppercase opacity-80 mb-4" style={{ color: '#E6C86A' }}>
                  {it.type === 'ayah' ? `${it.surahName ? it.surahName + ' · ' : ''}Quran ${it.ref}` : it.type === 'hadith' ? it.ref : it.type === 'name' ? 'Names of Allah' : 'Quran word'}
                </p>

                {'arabic' in it && (
                  <p
                    dir="rtl"
                    lang="ar"
                    className="mb-5"
                    style={{ fontSize: it.type === 'name' || it.type === 'word' ? 64 : arabicSize(arWords), lineHeight: 2.0 }}
                  >
                    {it.type === 'ayah' && i === active && wordIdx >= 0
                      ? it.arabic.split(' ').map((w, wi) => (
                          <span
                            key={wi}
                            data-word-active={wi === wordIdx ? '' : undefined}
                            style={{ color: wi === wordIdx ? '#FFD966' : wi < wordIdx ? '#fff' : 'rgba(255,255,255,.65)', textShadow: '0 2px 8px rgba(0,0,0,.6)' }}
                          >
                            {wi ? ' ' : ''}
                            {w}
                          </span>
                        ))
                      : it.arabic}
                  </p>
                )}

                {(it.type === 'name' || it.type === 'word') && <p className="text-xl font-semibold mb-1" style={{ color: '#E6C86A' }}>{it.transliteration}</p>}
                <p className={it.type === 'hadith' ? 'text-xl leading-relaxed' : 'text-lg leading-relaxed opacity-95'} style={{ textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>
                  {it.text}
                </p>
                {it.type === 'word' && <p className="text-sm opacity-70 mt-3">Appears {it.count.toLocaleString()} times in the Quran</p>}
                {popId === it.id && <div className="reel-pop absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl pointer-events-none">❤️</div>}
              </div>

              {/* Action rail */}
              <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-10" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => toggleLike(it.id)} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} className="flex flex-col items-center text-xs">
                  <span className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center text-2xl">{liked ? '❤️' : '🤍'}</span>
                </button>
                <button onClick={() => toggleSave(it)} aria-pressed={isSaved} aria-label={isSaved ? 'Remove from saved' : 'Save'} className="flex flex-col items-center text-xs">
                  <span className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center text-2xl">{isSaved ? '★' : '☆'}</span>
                </button>
                <button onClick={() => setCommentsFor(it)} aria-label={`Comments (${comments[it.id]?.length ?? 0})`} className="flex flex-col items-center text-xs gap-0.5">
                  <span className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center text-xl">💬</span>
                  <span>{comments[it.id]?.length ?? 0}</span>
                </button>
                <button onClick={() => setCard(cardFor(it))} aria-label="Share as image" className="flex flex-col items-center text-xs">
                  <span className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center text-xl">🖼</span>
                </button>
                <Link href={aiLink(it)} aria-label="Ask AI about this" className="flex flex-col items-center text-xs">
                  <span className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center text-xl">🤖</span>
                </Link>
                <Link href={it.href} aria-label="Open source" className="flex flex-col items-center text-xs">
                  <span className="w-11 h-11 rounded-full bg-black/35 flex items-center justify-center text-xl">↗</span>
                </Link>
              </div>

              {(() => {
                const v = i === active ? videoFor(it.id) : null
                return v ? (
                  <div className="absolute bottom-3 left-3 right-16 text-[11px] text-white/80 z-10" onClick={(e) => e.stopPropagation()} data-testid="video-credit">
                    Video by{' '}
                    <a href={v.credit.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {v.credit.name}
                    </a>{' '}
                    on{' '}
                    <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                      Pexels
                    </a>
                  </div>
                ) : null
              })()}
              {i === 0 && !started && sound && (
                <div className="absolute bottom-10 inset-x-0 text-center text-sm animate-pulse pointer-events-none">
                  👆 Tap to start with sound · swipe up for the next
                </div>
              )}
              {i === active && audio.error && <div className="absolute bottom-10 inset-x-0 text-center text-xs text-red-200">{audio.error}</div>}
            </section>
          )
        })}

        {loading && items.length === 0 && <div className="h-full flex items-center justify-center text-white/70">Loading…</div>}
        {!loading && !error && items.length === 0 && topic === 'saved' && (
          <div className="h-full flex items-center justify-center text-white/70 text-center px-8">Nothing saved yet. Tap ☆ on any reel to keep it here.</div>
        )}
        {!loading && !error && items.length === 0 && topic !== 'saved' && (
          <div className="h-full flex items-center justify-center text-white/70 text-center px-8">No reels found for this topic.</div>
        )}
        {error && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-white/80 text-center px-8">
            {error}
            <button onClick={() => load(next ?? 0, items.length === 0)} className="px-4 py-2 rounded-full bg-white text-black font-semibold">
              Retry
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div role="status" data-testid="streak-toast" className="absolute top-28 inset-x-4 z-30 mx-auto max-w-sm rounded-2xl bg-[#D4AF37] text-black text-center text-sm font-semibold px-4 py-3 shadow-lg">
          🔥 {toast}
        </div>
      )}

      {commentsFor && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/50" onClick={() => setCommentsFor(null)} data-testid="comments-panel">
          <div role="dialog" aria-label="Comments" className="bg-white text-gray-900 rounded-t-3xl max-h-[70dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center px-4 py-3 border-b">
              <span className="font-bold flex-1">Comments ({comments[commentsFor.id]?.length ?? 0})</span>
              <button onClick={() => setCommentsFor(null)} aria-label="Close comments" className="w-8 h-8 rounded-full bg-gray-100">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
              {(comments[commentsFor.id] ?? []).length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">No comments yet. Write a reflection or a dua — it stays on this device.</p>
              )}
              {(comments[commentsFor.id] ?? []).map((c) => (
                <div key={c.id} className="flex items-start gap-2" data-comment>
                  <p className="flex-1 text-sm break-words">{c.text}</p>
                  <button onClick={() => removeComment(commentsFor.id, c.id)} aria-label="Delete comment" className="text-xs text-gray-500">
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 p-3 border-t"
              onSubmit={(e) => {
                e.preventDefault()
                addComment(commentsFor.id)
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT))}
                placeholder="Add a comment…"
                aria-label="Add a comment"
                maxLength={MAX_COMMENT}
                className="flex-1 rounded-full border px-4 py-2 text-sm"
              />
              <button type="submit" disabled={!draft.trim()} className="px-4 rounded-full bg-[#0B5D4B] text-white text-sm font-semibold disabled:opacity-40">
                Post
              </button>
            </form>
            <p className="px-4 pb-3 text-[11px] text-gray-500">Comments are saved only on this device.</p>
          </div>
        </div>
      )}

      {card && <CardModal input={card} onClose={() => setCard(null)} />}
    </div>
  )
}
