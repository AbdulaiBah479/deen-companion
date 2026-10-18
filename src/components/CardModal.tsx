'use client'

import { useEffect, useState } from 'react'
import { renderCard, shareOrDownload, type CardInput } from '@/lib/share-card'

// Preview of the generated share image with Download / Share buttons.
export default function CardModal({ input, onClose }: { input: CardInput; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    renderCard(input)
      .then((b) => {
        if (cancelled) return
        const u = URL.createObjectURL(b)
        revoked = u
        setBlob(b)
        setUrl(u)
      })
      .catch(() => !cancelled && setError('Could not create the image on this device.'))
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [input])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const filename = `deen-companion-${input.ref.replace(/[^\w]+/g, '-')}.png`

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share image"
        className="bg-white rounded-2xl p-4 max-w-sm w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold">Share image</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-500 text-lg">
            ✕
          </button>
        </div>
        {!url && !error && <p className="text-gray-500 text-sm py-12 text-center">Creating image…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Share card for ${input.ref}`} className="w-full rounded-xl border border-gray-200" data-testid="share-card" />
        )}
        {blob && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => setNote((await shareOrDownload(blob, filename, `${input.ref} — Deen Companion`)) === 'shared' ? 'Shared ✓' : 'Saved to your downloads ✓')}
              className="flex-1 py-2 rounded-lg bg-[#0F766E] text-white font-semibold"
            >
              Share / Save
            </button>
          </div>
        )}
        {note && <p className="text-sm text-[#0F766E] mt-2">{note}</p>}
      </div>
    </div>
  )
}
