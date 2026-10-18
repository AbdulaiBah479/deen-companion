'use client'

import { useEffect, useState } from 'react'
import type { Lecture } from '@/lib/lectures'

type Payload = { configured: boolean; channels: { name: string; id: string }[]; lectures: Lecture[]; failed?: number }

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (!Number.isFinite(days) || days < 0) return ''
  if (days === 0) return 'today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function LecturesPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [channel, setChannel] = useState('all')
  const [playing, setPlaying] = useState<string | null>(null)

  useEffect(() => {
    let off = false
    fetch('/api/lectures')
      .then((r) => r.json())
      .then((d) => !off && setData(d))
      .catch(() => !off && setError('Could not load lectures. Check your connection.'))
    return () => {
      off = true
    }
  }, [])

  const list = data?.lectures.filter((l) => channel === 'all' || l.channelId === channel) ?? []

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Lectures</h1>
      <p className="text-gray-500 text-sm mb-4">The newest talks from the teachers and institutions chosen for this app, updated automatically.</p>

      {error && <p className="text-red-600">{error}</p>}
      {!data && !error && <p className="text-gray-500">Loading…</p>}

      {data && !data.configured && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5" data-testid="lectures-unconfigured">
          <p className="font-semibold mb-1">Lectures are turned off.</p>
          <p className="text-sm text-gray-600">
            Lectures are switched off for this app. The owner can turn them on by listing channels in <code>LECTURE_CHANNELS</code> (see <code>.env.example</code>).
          </p>
        </div>
      )}

      {data?.configured && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3" role="tablist" aria-label="Channels" style={{ scrollbarWidth: 'none' }}>
            {[{ id: 'all', name: 'All' }, ...data.channels].map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={channel === c.id}
                onClick={() => setChannel(c.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border ${channel === c.id ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {!!data.failed && <p className="text-xs text-amber-700 mb-2">Some channels could not be reached just now; showing the rest.</p>}
          <ul className="space-y-4" data-testid="lectures-list">
            {list.map((l) => (
              <li key={l.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {playing === l.id ? (
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube-nocookie.com/embed/${l.id}?autoplay=1&rel=0`}
                      title={l.title}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <button onClick={() => setPlaying(l.id)} aria-label={`Play ${l.title}`} className="absolute inset-0 w-full h-full group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-14 h-14 rounded-full bg-black/60 text-white text-2xl flex items-center justify-center group-hover:bg-[#0F766E]">▶</span>
                      </span>
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold leading-snug">{l.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {l.channel} · {ago(l.published)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {list.length === 0 && <p className="text-gray-500 text-center py-8">No lectures to show right now.</p>}
          <p className="text-xs text-gray-500 mt-4">Videos play from YouTube using its privacy-enhanced player, and only load when you tap play.</p>
        </>
      )}
    </div>
  )
}
