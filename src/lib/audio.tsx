'use client'

// One audio engine for the whole app (Quran recitation, reels). It lives in the root layout so playback continues
// while you navigate, and exposes a "now playing" state to the reader (verse highlight) and the mini player.
//
// Practice tools (all in the player): repeat each verse N times, a pause after each verse ("your turn" lets you repeat after the
// reciter), and playing a range of verses on a loop. The rules live in playback.ts, where they are tested.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { afterVerse, gapMs, type Pause, type Plan, type Range } from './playback'
import { usePrefs } from './prefs'
import { getVerseAudioUrl, RECITERS } from './quran'
import { fadeFactor, msPerMinute, remainingMs } from './sleep-timer'
import { useStored } from './storage'
import { loadSurahData } from './surah-list'

export type Track = { url: string; title: string; subtitle?: string; surah?: number; ayah?: number }

type AudioApi = {
  track: Track | null
  playing: boolean
  loading: boolean
  error: string
  rate: number
  repeat: 'off' | 'one'
  repeatEach: number // times each verse is heard: 1 = once, 0 = until stopped
  pause: Pause
  gap: Pause | null // set while waiting between plays (so the player can say "your turn")
  range: Range | null // the range being practised, if any
  reciter: string
  nowPlaying: { surah: number; ayah: number } | null
  playVerse: (surah: number, ayah: number) => void
  playRange: (surah: number, from: number, to: number, loops?: number) => void
  clearRange: () => void // stop practising a range but keep listening normally
  playUrl: (track: Track, onEnd?: () => void) => void
  toggle: () => void
  progress: () => number // 0–1 through the current track (0 when unknown); cheap, safe to poll
  stop: () => void
  next: () => void
  prev: () => void
  setRate: (r: number) => void
  setRepeat: (r: 'off' | 'one') => void
  setRepeatEach: (n: number) => void
  setPause: (p: Pause) => void
  setReciter: (folder: string) => void
  sleepEndAt: number | null // when the sleep timer will stop playback (ms since 1970), or null
  setSleep: (minutes: number | null) => void
}

const Ctx = createContext<AudioApi | null>(null)

export function useAudio(): AudioApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAudio must be used inside <AudioProvider>')
  return v
}

const loadSurahInfo = () => loadSurahData().then((d) => d.surahs)

export default function AudioProvider({ children }: { children: React.ReactNode }) {
  const { prefs, set: setPref } = usePrefs()
  const [reciter, setReciterState] = useStored<string>('deen:reciter', RECITERS[0].folder)
  const [track, setTrack] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sleepEndAt, setSleepEndAt] = useState<number | null>(null)
  const [gap, setGap] = useState<Pause | null>(null)
  const [range, setRangeState] = useState<Range | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndRef = useRef<(() => void) | null>(null)
  const modeRef = useRef<'quran' | 'url'>('url')
  const posRef = useRef<{ surah: number; ayah: number } | null>(null)
  const reciterRef = useRef(reciter)
  const prefsRef = useRef(prefs)
  const loadTrackRef = useRef<(t: Track, autoplay?: boolean) => void>(() => {})
  // practice state
  const playsRef = useRef(1) // how many times the current verse has been heard (including the one playing)
  const loopsRef = useRef(0) // how many times the range has been completed
  const rangeRef = useRef<Range | null>(null)
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumeRef = useRef<(() => void) | null>(null) // what to do when the user resumes during a pause

  const setRange = useCallback((r: Range | null) => {
    rangeRef.current = r
    setRangeState(r)
  }, [])
  const clearGap = useCallback(() => {
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current)
    gapTimerRef.current = null
    resumeRef.current = null
    setGap(null)
  }, [])

  useEffect(() => {
    reciterRef.current = reciter
  }, [reciter])
  useEffect(() => {
    prefsRef.current = prefs
    if (audioRef.current) audioRef.current.playbackRate = prefs.rate
  }, [prefs])

  const verseTrack = useCallback(async (surah: number, ayah: number): Promise<Track> => {
    const info = await loadSurahInfo()
    const name = info.find((s) => s.id === surah)?.name_simple ?? `Surah ${surah}`
    return {
      url: getVerseAudioUrl(surah, ayah, reciterRef.current),
      title: name,
      subtitle: `Verse ${surah}:${ayah} · ${RECITERS.find((r) => r.folder === reciterRef.current)?.name ?? ''}`,
      surah,
      ayah,
    }
  }, [])

  // Starts a verse. By default this is a fresh start by the user (counters reset, any range is dropped);
  // the practice logic passes keep* flags to carry on inside the same exercise.
  const goVerse = useCallback(
    async (surah: number, ayah: number, keep: { range?: boolean; loops?: boolean } = {}) => {
      modeRef.current = 'quran'
      onEndRef.current = null
      clearGap()
      posRef.current = { surah, ayah }
      playsRef.current = 1
      if (!keep.loops) loopsRef.current = 0
      if (!keep.range) setRange(null)
      loadTrackRef.current(await verseTrack(surah, ayah), true)
    },
    [verseTrack, clearGap, setRange]
  )

  const advance = useCallback(
    async (direction: 1 | -1) => {
      const pos = posRef.current
      if (modeRef.current !== 'quran' || !pos) return false
      const info = await loadSurahInfo()
      const count = info.find((s) => s.id === pos.surah)?.verses_count ?? 0
      const r = rangeRef.current
      let { surah, ayah } = pos
      if (direction === 1) {
        if (r && ayah >= r.to) return false
        if (ayah < count) ayah++
        else if (prefsRef.current.continuous && surah < 114) {
          surah++
          ayah = 1
        } else return false
      } else {
        if (r && ayah <= r.from) return false
        if (ayah > 1) ayah--
        else if (surah > 1) {
          surah--
          ayah = info.find((s) => s.id === surah)?.verses_count ?? 1
        } else return false
      }
      await goVerse(surah, ayah, { range: !!r, loops: true })
      return true
    },
    [goVerse]
  )

  // Create the single <audio> element lazily on the client.
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio()
      a.preload = 'auto'
      a.onplaying = () => {
        setPlaying(true)
        setLoading(false)
        setError('')
      }
      a.onpause = () => setPlaying(false)
      a.onwaiting = () => setLoading(true)
      a.oncanplay = () => setLoading(false)
      a.onerror = () => {
        setPlaying(false)
        setLoading(false)
        setError('Could not load this recitation. Check your connection.')
      }
      a.onended = async () => {
        if (modeRef.current === 'quran') {
          const pos = posRef.current
          if (!pos) return setPlaying(false)
          const p = prefsRef.current
          const plan: Plan = { repeatEach: p.repeat === 'one' ? 0 : p.repeatEach, pause: p.pause, continuous: p.continuous, range: rangeRef.current }
          const info = await loadSurahInfo()
          const count = info.find((s) => s.id === pos.surah)?.verses_count ?? 0
          const step = afterVerse(plan, { surah: pos.surah, ayah: pos.ayah, plays: playsRef.current, loopsDone: loopsRef.current }, count)
          if (step.kind === 'stop') {
            clearGap()
            setPlaying(false)
            return
          }
          const go = () => {
            clearGap()
            if (step.kind === 'replay') {
              playsRef.current++
              a.currentTime = 0
              a.play().catch(() => setPlaying(false))
            } else {
              if (step.kind === 'restart') loopsRef.current++
              void goVerse(step.surah, step.ayah, { range: !!rangeRef.current, loops: true })
            }
          }
          const wait = gapMs(plan.pause, a.duration / (a.playbackRate || 1))
          if (wait > 0) {
            setGap(plan.pause)
            setPlaying(true) // the player still counts as playing while it waits for you
            resumeRef.current = go
            gapTimerRef.current = setTimeout(go, wait)
          } else go()
        } else {
          setPlaying(false)
          onEndRef.current?.()
        }
      }
      audioRef.current = a
    }
    return audioRef.current
  }, [clearGap, goVerse])

  const loadTrack = useCallback(
    (t: Track, autoplay = true) => {
      const a = getAudio()
      a.src = t.url
      a.playbackRate = prefsRef.current.rate
      setTrack(t)
      setError('')
      setLoading(true)
      if (autoplay) a.play().catch(() => setPlaying(false))
    },
    [getAudio]
  )
  useEffect(() => {
    loadTrackRef.current = loadTrack
  }, [loadTrack])

  const stopAll = useCallback(() => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.removeAttribute('src')
      a.load()
      a.volume = 1
    }
    clearGap()
    setRange(null)
    setTrack(null)
    setPlaying(false)
    setLoading(false)
    setSleepEndAt(null)
    posRef.current = null
  }, [clearGap, setRange])

  // Sleep timer: ease the volume down over the last few seconds, then stop.
  useEffect(() => {
    if (sleepEndAt === null) return
    const tick = () => {
      const left = remainingMs(sleepEndAt, Date.now())
      if (audioRef.current) audioRef.current.volume = fadeFactor(left)
      if (left <= 0) stopAll()
    }
    tick()
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [sleepEndAt, stopAll])

  const api: AudioApi = useMemo(
    () => ({
      track,
      playing,
      loading,
      error,
      rate: prefs.rate,
      repeat: prefs.repeat,
      repeatEach: prefs.repeatEach,
      pause: prefs.pause,
      gap,
      range,
      reciter,
      nowPlaying: track?.surah && track.ayah ? { surah: track.surah, ayah: track.ayah } : null,
      playVerse: (surah, ayah) => {
        void goVerse(surah, ayah)
      },
      playRange: (surah, from, to, loops = 1) => {
        setRange({ surah, from, to: Math.max(from, to), loops })
        loopsRef.current = 0
        void goVerse(surah, from, { range: true, loops: true })
      },
      clearRange: () => setRange(null),
      playUrl: (t, onEnd) => {
        modeRef.current = 'url'
        posRef.current = null
        clearGap()
        setRange(null)
        onEndRef.current = onEnd ?? null
        loadTrack(t, true)
      },
      toggle: () => {
        const a = audioRef.current
        if (!a || !track) return
        if (gapTimerRef.current) {
          // paused while waiting between plays: hold here until the user resumes
          clearTimeout(gapTimerRef.current)
          gapTimerRef.current = null
          setGap(null)
          setPlaying(false)
          return
        }
        if (a.paused) {
          if (resumeRef.current) {
            const go = resumeRef.current
            resumeRef.current = null
            go()
          } else a.play().catch(() => {})
        } else a.pause()
      },
      progress: () => {
        const a = audioRef.current
        return a && a.duration > 0 && Number.isFinite(a.duration) ? Math.min(1, a.currentTime / a.duration) : 0
      },
      stop: stopAll,
      sleepEndAt,
      setSleep: (minutes) => {
        if (audioRef.current) audioRef.current.volume = 1
        setSleepEndAt(minutes ? Date.now() + minutes * msPerMinute() : null)
      },
      next: () => {
        void advance(1)
      },
      prev: () => {
        const a = audioRef.current
        if (a && a.currentTime > 3) a.currentTime = 0
        else void advance(-1)
      },
      setRate: (r) => setPref('rate', r),
      setRepeat: (r) => setPref('repeat', r),
      setRepeatEach: (n) => setPref('repeatEach', n),
      setPause: (p) => setPref('pause', p),
      setReciter: (folder) => {
        setReciterState(folder)
        reciterRef.current = folder
        // Switching reciter mid-verse: restart the current verse with the new voice.
        if (modeRef.current === 'quran' && posRef.current) void goVerse(posRef.current.surah, posRef.current.ayah, { range: !!rangeRef.current, loops: true })
      },
    }),
    [track, playing, loading, error, gap, range, prefs.rate, prefs.repeat, prefs.repeatEach, prefs.pause, reciter, goVerse, loadTrack, advance, setPref, setReciterState, stopAll, sleepEndAt, clearGap, setRange]
  )

  // Lock-screen / headset controls and "now playing" info.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!track) {
      navigator.mediaSession.metadata = null
      return
    }
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.subtitle ?? 'Deen Companion' })
    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play())
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause())
    navigator.mediaSession.setActionHandler('nexttrack', modeRef.current === 'quran' ? () => void advance(1) : null)
    navigator.mediaSession.setActionHandler('previoustrack', modeRef.current === 'quran' ? () => void advance(-1) : null)
  }, [track, advance])

  useEffect(() => {
    const a = audioRef.current
    return () => a?.pause()
  }, [])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
