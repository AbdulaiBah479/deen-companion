'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/languages'
import { downloadQuran, offlineCount, offlineSupported, removeOfflineQuran } from '@/lib/offline'

// Settings → Offline: save the whole Quran (text + your translation) for reading without internet.
export default function OfflineManager() {
  const { lang, ready } = useLang()
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<[number, number]>([0, 0])
  const [note, setNote] = useState('')
  const abort = useRef<AbortController | null>(null)
  // Decided after the page loads: the server cannot know whether this browser can save files, and guessing during rendering
  // would make the server's and the browser's first render differ.
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    setSupported(offlineSupported())
  }, [])

  const refresh = useCallback(async () => setCount(await offlineCount(lang)), [lang])
  useEffect(() => {
    if (ready && supported) void refresh()
  }, [ready, supported, refresh])

  if (supported === null) return <p className="text-sm text-gray-500">Checking…</p>
  if (!supported) return <p className="text-sm text-gray-600">This browser can’t save content for offline use.</p>

  async function start() {
    setBusy(true)
    setNote('')
    abort.current = new AbortController()
    const { failed } = await downloadQuran(lang, (d, t) => setProgress([d, t]), abort.current.signal)
    setBusy(false)
    await refresh()
    setNote(abort.current.signal.aborted ? 'Stopped. What was saved stays available.' : failed ? `Saved, but ${failed} item(s) could not be downloaded. Try again later.` : 'Done — the whole Quran now works without internet.')
  }

  const all = count === 114
  return (
    <div className="text-sm text-gray-700 space-y-2" data-testid="offline-manager">
      <p>
        Save all 114 surahs with your current translation on this device (about 5 MB). They open instantly and work without internet. Prayer times for your
        shared location are calculated on the device, so they work offline too.
      </p>
      <p data-testid="offline-status">
        {count === null ? 'Checking…' : all ? '✓ The whole Quran is saved for offline reading.' : count === 0 ? 'Nothing saved yet.' : `${count} of 114 surahs saved.`}
      </p>
      {busy && (
        <div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={progress[1]} aria-valuenow={progress[0]} aria-label="Download progress">
            <div className="h-full bg-[#0F766E]" style={{ width: `${progress[1] ? (progress[0] / progress[1]) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {progress[0]} / {progress[1]}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!busy ? (
          <button onClick={start} className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold">
            {all ? 'Update offline copy' : 'Download the Quran for offline'}
          </button>
        ) : (
          <button onClick={() => abort.current?.abort()} className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold">
            Stop
          </button>
        )}
        {count ? (
          <button
            onClick={async () => {
              await removeOfflineQuran(lang)
              await refresh()
              setNote('Offline copy removed.')
            }}
            disabled={busy}
            className="px-3 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
      </div>
      {note && <p className="text-[#0F766E]" role="status">{note}</p>}
    </div>
  )
}
