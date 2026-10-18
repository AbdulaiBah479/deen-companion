'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudio } from '@/lib/audio'
import { audioSupported, estimateBytes, formatMB, removeSurahAudio, saveSurahAudio, savedAudio, storageUsage, type SavedSurah } from '@/lib/offline-audio'
import { RECITERS } from '@/lib/quran'

type S = { id: number; name_simple: string; verses_count: number }

// Settings → Offline → Recitation: pick a surah, save its audio for the reciter you listen to.
export default function OfflineAudioManager() {
  const { reciter } = useAudio()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [surahs, setSurahs] = useState<S[]>([])
  const [pick, setPick] = useState(108)
  const [saved, setSaved] = useState<SavedSurah[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<[number, number]>([0, 0])
  const [note, setNote] = useState('')
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const abort = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    setSaved(await savedAudio())
    setUsage(await storageUsage())
  }, [])

  useEffect(() => {
    const ok = audioSupported()
    setSupported(ok)
    if (!ok) return
    void refresh()
    fetch('/api/quran/surahs')
      .then((r) => r.json())
      .then((d) => setSurahs(d.surahs ?? []))
      .catch(() => {})
  }, [refresh])

  if (supported === null) return null
  if (!supported) return <p className="text-sm text-gray-600">This browser can’t save audio for offline use.</p>

  const s = surahs.find((x) => x.id === pick)
  const reciterName = RECITERS.find((r) => r.folder === reciter)?.name ?? reciter
  const size = s ? estimateBytes(s.verses_count, reciter) : 0
  const nameOf = (n: number) => surahs.find((x) => x.id === n)?.name_simple ?? `Surah ${n}`
  const countOf = (n: number) => surahs.find((x) => x.id === n)?.verses_count ?? 0

  async function save() {
    if (!s) return
    if (size > 40_000_000 && !window.confirm(`This recitation is about ${formatMB(size)}. Save it on this device?`)) return
    setBusy(true)
    setNote('')
    abort.current = new AbortController()
    const r = await saveSurahAudio(s.id, s.verses_count, reciter, (d, t) => setProgress([d, t]), abort.current.signal)
    setBusy(false)
    await refresh()
    setNote(
      abort.current.signal.aborted
        ? 'Stopped. What was saved stays available.'
        : r.full
          ? 'Your device is out of space for more audio. Remove something and try again.'
          : r.failed
            ? `Saved ${r.saved} of ${s.verses_count} verses; ${r.failed} could not be downloaded. Try again later.`
            : `Done — ${s.name_simple} (${reciterName}) now plays without internet.`
    )
  }

  return (
    <div className="text-sm text-gray-700 space-y-2 mt-4" data-testid="offline-audio">
      <h3 className="font-semibold">Recitation without internet</h3>
      <p>
        Save a surah’s audio for <b>{reciterName}</b> (change the reciter in the audio player). It plays and skips around just like online.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={pick} onChange={(e) => setPick(Number(e.target.value))} disabled={busy} aria-label="Surah to save" className="px-3 py-2 rounded-lg border border-gray-300 bg-white">
          {(surahs.length ? surahs : [{ id: 108, name_simple: 'Al-Kawthar', verses_count: 3 }]).map((x) => (
            <option key={x.id} value={x.id}>
              {x.id}. {x.name_simple} ({x.verses_count} verses)
            </option>
          ))}
        </select>
        {!busy ? (
          <button onClick={save} disabled={!s} className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] font-semibold disabled:opacity-50">
            Save recitation (≈ {formatMB(size)})
          </button>
        ) : (
          <button onClick={() => abort.current?.abort()} className="px-3 py-2 rounded-lg border border-gray-300 font-semibold">
            Stop
          </button>
        )}
      </div>
      {busy && (
        <div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={progress[1]} aria-valuenow={progress[0]} aria-label="Audio download progress">
            <div className="h-full bg-[#0F766E]" style={{ width: `${progress[1] ? (progress[0] / progress[1]) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {progress[0]} / {progress[1]} verses
          </p>
        </div>
      )}
      {note && (
        <p className="text-[#0F766E]" role="status">
          {note}
        </p>
      )}
      {saved.length > 0 && (
        <ul className="space-y-1" data-testid="offline-audio-list">
          {saved.map((x) => {
            const total = countOf(x.surah)
            const who = RECITERS.find((r) => r.folder === x.folder)?.name ?? x.folder
            return (
              <li key={x.folder + x.surah} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <span className="flex-1">
                  {x.surah}. {nameOf(x.surah)} · {who} · {x.verses}
                  {total ? ` / ${total}` : ''} verses
                </span>
                <button
                  onClick={async () => {
                    await removeSurahAudio(x.surah, x.folder)
                    await refresh()
                  }}
                  disabled={busy}
                  aria-label={`Remove ${nameOf(x.surah)} audio`}
                  className="text-red-600 font-semibold disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {usage && (
        <p className="text-xs text-gray-500">
          This site is using {formatMB(usage.usage)} of the {formatMB(usage.quota)} your browser allows.
        </p>
      )}
    </div>
  )
}
