'use client'

// One audio engine for the whole app (Quran recitation, reels). It lives in the root layout so playback continues
// while you navigate, and exposes a "now playing" state to the reader (verse highlight) and the mini player.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
  reciter: string
  nowPlaying: { surah: number; ayah: number } | null
  playVerse: (surah: number, ayah: number) => void
  playUrl: (track: Track, onEnd?: () => void) => void
  toggle: () => void
  progress: () => number // 0–1 through the current track (0 when unknown); cheap, safe to poll
  stop: () => void
  next: () => void
  prev: () => void
  setRate: (r: number) => void
  setRepeat: (r: 'off' | 'one') => void
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

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndRef = useRef<(() => void) | null>(null)
  const modeRef = useRef<'quran' | 'url'>('url')
  const posRef = useRef<{ surah: number; ayah: number } | null>(null)
  const reciterRef = useRef(reciter)
  const prefsRef = useRef(prefs)
  const loadTrackRef = useRef<(t: Track, autoplay?: boolean) => void>(() => {})

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

  const goVerse = useCallback(
    async (surah: number, ayah: number) => {
      modeRef.current = 'quran'
      onEndRef.current = null
      posRef.current = { surah, ayah }
      loadTrackRef.current(await verseTrack(surah, ayah), true)
    },
    [verseTrack]
  )

  const advance = useCallback(
    async (direction: 1 | -1) => {
      const pos = posRef.current
      if (modeRef.current !== 'quran' || !pos) return false
      const info = await loadSurahInfo()
      const count = info.find((s) => s.id === pos.surah)?.verses_count ?? 0
      let { surah, ayah } = pos
      if (direction === 1) {
        if (ayah < count) ayah++
        else if (prefsRef.current.continuous && surah < 114) {
          surah++
          ayah = 1
        } else return false
      } else {
        if (ayah > 1) ayah--
        else if (surah > 1) {
          surah--
          ayah = info.find((s) => s.id === surah)?.verses_count ?? 1
        } else return false
      }
      await goVerse(surah, ayah)
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
          if (prefsRef.current.repeat === 'one') {
            a.currentTime = 0
            a.play().catch(() => {})
            return
          }
          const moved = await advance(1)
          if (!moved) setPlaying(false)
        } else {
          setPlaying(false)
          onEndRef.current?.()
        }
      }
      audioRef.current = a
    }
    return audioRef.current
  }, [advance])

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
    setTrack(null)
    setPlaying(false)
    setLoading(false)
    setSleepEndAt(null)
    posRef.current = null
  }, [])

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
      reciter,
      nowPlaying: track?.surah && track.ayah ? { surah: track.surah, ayah: track.ayah } : null,
      playVerse: (surah, ayah) => {
        void goVerse(surah, ayah)
      },
      playUrl: (t, onEnd) => {
        modeRef.current = 'url'
        posRef.current = null
        onEndRef.current = onEnd ?? null
        loadTrack(t, true)
      },
      toggle: () => {
        const a = audioRef.current
        if (!a || !track) return
        if (a.paused) a.play().catch(() => {})
        else a.pause()
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
      setReciter: (folder) => {
        setReciterState(folder)
        reciterRef.current = folder
        // Switching reciter mid-verse: restart the current verse with the new voice.
        if (modeRef.current === 'quran' && posRef.current) void goVerse(posRef.current.surah, posRef.current.ayah)
      },
    }),
    [track, playing, loading, error, prefs.rate, prefs.repeat, reciter, goVerse, loadTrack, advance, setPref, setReciterState, stopAll, sleepEndAt]
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
