'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/languages'
import { PACKS, downloadPack, packPagesSaved, packsSupported, removePack, savedPacks, type Pack } from '@/lib/offline-packs'

// Settings → Offline packs: choose which parts of the app to keep on this device. Each pack shows what it holds and whether it is saved.
export default function OfflinePacks() {
  const { lang } = useLang()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [saved, setSaved] = useState<Record<string, { at: number; pages: number }>>({})
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [note, setNote] = useState('')
  const abort = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    const marks = savedPacks()
    const out: Record<string, { at: number; pages: number }> = {}
    for (const p of PACKS) if (marks[p.id]) out[p.id] = { at: marks[p.id], pages: await packPagesSaved(p) }
    setSaved(out)
  }, [])
  useEffect(() => {
    const ok = packsSupported()
    setSupported(ok)
    if (ok) void refresh()
  }, [refresh])

  async function save(p: Pack) {
    setBusy(p.id)
    setNote('')
    abort.current = new AbortController()
    const { failed } = await downloadPack(p, lang, setProgress, abort.current.signal)
    setBusy('')
    await refresh()
    setNote(abort.current.signal.aborted ? 'Stopped. What was saved stays available.' : failed ? `Saved, but ${failed} item(s) could not be downloaded. Try again with a better connection.` : `“${p.name}” is saved. It opens without internet now.`)
  }
  async function drop(p: Pack) {
    await removePack(p)
    await refresh()
    setNote(`“${p.name}” was removed from this device.`)
  }

  if (supported === null) return null
  if (!supported) return <p className="text-sm text-gray-600">This browser can’t save content for offline use.</p>

  return (
    <div className="text-sm text-gray-700 space-y-3" data-testid="offline-packs">
      <p>Choose what to keep on this device. Saved parts open with no internet. The Quran text is saved separately, above. Prayer times and the Qibla are calculated on the device, so they always work offline once the page has been opened.</p>
      <ul className="space-y-2">
        {PACKS.map((p) => {
          const s = saved[p.id]
          return (
            <li key={p.id} className="rounded-xl border border-gray-200 bg-white p-3" data-testid={`pack-${p.id}`}>
              <p className="font-semibold">{p.name} <span className="text-xs font-normal text-gray-500">· {p.approx}</span></p>
              <p className="text-xs text-gray-600 mt-0.5">{p.blurb}</p>
              <p className="text-xs mt-1" data-testid={`pack-status-${p.id}`}>
                {s ? `✓ Saved on ${new Date(s.at).toLocaleDateString()} (${s.pages} of ${p.pages.length} pages ready)` : 'Not saved yet.'}
              </p>
              {busy === p.id ? (
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Download progress">
                    <div className="h-full bg-[#0F766E]" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                  </div>
                  <button onClick={() => abort.current?.abort()} className="mt-1 text-xs underline text-gray-600">Stop</button>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => void save(p)} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white text-sm font-semibold disabled:opacity-50">{s ? 'Update' : 'Save for offline'}</button>
                  {s && <button onClick={() => void drop(p)} disabled={!!busy} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm">Remove</button>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {note && <p className="text-[#0F766E]" role="status">{note}</p>}
    </div>
  )
}
