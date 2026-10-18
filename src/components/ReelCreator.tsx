'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/languages'
import { REEL_H, REEL_W, drawReelFrame, ensureFonts, pickVideoType, type ReelDesign } from '@/lib/reel-canvas'
import { shareOrDownload } from '@/lib/share-card'
import { useSurahData } from '@/lib/surah-list'

type Verse = { verse_number: number; verse_key: string; text_uthmani: string; translations?: { text: string }[] }

const MAX_SECONDS = 60
const HUES = [150, 165, 180, 200, 220, 260, 285, 340, 25]

function Creator() {
  const params = useSearchParams()
  const { lang, ready } = useLang()
  const { surahs } = useSurahData()
  const ref = params.get('ref') || '112:1'
  const [s0, a0] = ref.split(':').map(Number)
  const [surah, setSurah] = useState(Number.isInteger(s0) && s0 >= 1 && s0 <= 114 ? s0 : 112)
  const [ayah, setAyah] = useState(Number.isInteger(a0) && a0 >= 1 ? a0 : 1)
  const [verses, setVerses] = useState<Verse[]>([])
  const [hue, setHue] = useState(160)
  const [showTr, setShowTr] = useState(true)
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [video, setVideo] = useState<{ url: string; blob: Blob } | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startRef = useRef(0)
  const stateRef = useRef(state)
  const designRef = useRef<ReelDesign | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const info = surahs.find((s) => s.id === surah)
  const verse = verses.find((v) => v.verse_number === ayah)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    fetch(`/api/quran/surah/${surah}?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setVerses(d.verses ?? []))
      .catch(() => !cancelled && setError('Could not load that verse.'))
    return () => {
      cancelled = true
    }
  }, [surah, lang, ready])

  const design: ReelDesign | null = verse
    ? { arabic: verse.text_uthmani, translation: verse.translations?.[0]?.text, ref: `Quran ${verse.verse_key}`, title: info?.name_simple, hue, showTranslation: showTr, maxSeconds: MAX_SECONDS }
    : null
  useEffect(() => {
    designRef.current = design
  })

  // Paint loop: the idle preview, and the frames that get recorded. Reads the latest design/state from refs.
  useEffect(() => {
    if (!verse) return
    let cancelled = false
    let raf = 0
    const tick = () => {
      if (cancelled) return
      const canvas = canvasRef.current
      const d = designRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx && d) {
        const recording = stateRef.current === 'recording'
        const t = recording ? (performance.now() - startRef.current) / 1000 : 0
        drawReelFrame(ctx, d, t, recording)
        if (recording) setElapsed(t)
      }
      raf = requestAnimationFrame(tick)
    }
    ensureFonts(verse.text_uthmani).then(() => {
      if (!cancelled) raf = requestAnimationFrame(tick)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [verse])

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    []
  )

  async function startRecording() {
    setError('')
    setNote('')
    const canvas = canvasRef.current
    if (!canvas || !design) return
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      return setError('Recording is not supported in this browser. Try Chrome, Edge or Firefox.')
    }
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const stream = canvas.captureStream(30)
      mic.getAudioTracks().forEach((t) => stream.addTrack(t))
      streamRef.current = mic
      const type = pickVideoType()
      const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 2_500_000 } : undefined)
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = () => {
        mic.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: rec.mimeType || type || 'video/webm' })
        setVideo({ url: URL.createObjectURL(blob), blob })
        setState('done')
      }
      recRef.current = rec
      startRef.current = performance.now()
      setElapsed(0)
      setState('recording')
      rec.start(250)
      window.setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_SECONDS * 1000)
    } catch {
      setError('Could not use the microphone. Allow microphone access in your browser to record.')
    }
  }

  function stopRecording() {
    if (recRef.current?.state === 'recording') recRef.current.stop()
  }

  function redo() {
    if (video) URL.revokeObjectURL(video.url)
    setVideo(null)
    setState('idle')
    setElapsed(0)
  }

  const ext = video?.blob.type.includes('mp4') ? 'mp4' : 'webm'
  const fileName = `deen-companion-${ref.replace(/[^\w]+/g, '-')}.${ext}`

  return (
    <div>
      <Link href="/reels" className="text-[#0F766E] font-semibold text-sm">
        ← Reels
      </Link>
      <h1 className="text-2xl font-black mt-2 mb-1">🎬 Create a recitation reel</h1>
      <p className="text-gray-500 text-sm mb-4">Pick a verse, recite it, and get a video to save or share. It’s recorded on your device — nothing is uploaded.</p>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={surah}
          onChange={(e) => {
            setSurah(Number(e.target.value))
            setAyah(1)
          }}
          disabled={state === 'recording'}
          aria-label="Surah"
          className="flex-1 min-w-32 px-3 py-2 rounded-lg border border-gray-300 bg-white"
        >
          {surahs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}. {s.name_simple}
            </option>
          ))}
          {surahs.length === 0 && <option value={surah}>Surah {surah}</option>}
        </select>
        <input
          type="number"
          min={1}
          max={info?.verses_count ?? 286}
          value={ayah}
          onChange={(e) => setAyah(Math.max(1, Number(e.target.value) || 1))}
          disabled={state === 'recording'}
          aria-label="Verse number"
          className="w-24 px-3 py-2 rounded-lg border border-gray-300 bg-white"
        />
      </div>
      <div className="flex items-center gap-2 mb-3" role="group" aria-label="Background colour">
        {HUES.map((h) => (
          <button
            key={h}
            onClick={() => setHue(h)}
            aria-label={`Colour ${h}`}
            aria-pressed={hue === h}
            className={`w-7 h-7 rounded-full border-2 ${hue === h ? 'border-[#D4AF37]' : 'border-transparent'}`}
            style={{ background: `hsl(${h} 55% 28%)` }}
          />
        ))}
        <label className="flex items-center gap-1 text-sm ml-auto">
          <input type="checkbox" checked={showTr} onChange={(e) => setShowTr(e.target.checked)} />
          Translation
        </label>
      </div>

      {!verse && !error && <p className="text-gray-500">Loading verse…</p>}
      {error && <p className="text-red-600 mb-2">{error}</p>}

      <div className="mx-auto" style={{ maxWidth: 300 }}>
        <canvas ref={canvasRef} width={REEL_W} height={REEL_H} className="w-full rounded-2xl border border-gray-200" aria-label="Reel preview" data-testid="reel-canvas" />
      </div>

      <div className="mt-4 space-y-3 max-w-sm mx-auto">
        {state === 'idle' && (
          <button onClick={startRecording} disabled={!verse} className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg disabled:opacity-50">
            ⏺ Start recording
          </button>
        )}
        {state === 'recording' && (
          <button onClick={stopRecording} className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold text-lg">
            ⏹ Stop ({Math.floor(elapsed)}s / {MAX_SECONDS}s)
          </button>
        )}
        {state === 'done' && video && (
          <>
            <video src={video.url} controls playsInline className="w-full rounded-2xl bg-black" data-testid="reel-video" />
            <div className="flex gap-2">
              <button
                onClick={async () => setNote((await shareOrDownload(video.blob, fileName, `${ref} — Deen Companion`)) === 'shared' ? 'Shared ✓' : 'Saved to your downloads ✓')}
                className="flex-1 py-3 rounded-xl bg-[#0F766E] text-white font-semibold"
              >
                Share / Save
              </button>
              <button onClick={redo} className="px-4 py-3 rounded-xl border border-gray-300">
                Re-record
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {Math.round(video.blob.size / 1024)} KB · {video.blob.type || 'video'}
            </p>
          </>
        )}
        {note && <p className="text-sm text-[#0F766E]">{note}</p>}
      </div>
      <p className="text-xs text-gray-500 mt-4 text-center">Recitation reels should be recited with care and good intention. Recordings never leave your device unless you share them.</p>
    </div>
  )
}

export default function ReelCreator() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading…</p>}>
      <Creator />
    </Suspense>
  )
}
