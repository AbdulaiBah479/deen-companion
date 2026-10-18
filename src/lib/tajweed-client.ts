'use client'

import { useEffect, useState } from 'react'

// Tajweed markup per surah, fetched on demand from /api/quran/tajweed and cached for the session.
const cache = new Map<number, Promise<Record<number, string>>>()

export function loadTajweed(surah: number): Promise<Record<number, string>> {
  if (!cache.has(surah)) {
    cache.set(
      surah,
      fetch(`/api/quran/tajweed/${surah}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.tajweed) throw new Error(d.error || 'unavailable')
          return d.tajweed as Record<number, string>
        })
        .catch((e) => {
          cache.delete(surah) // allow retry
          throw e
        })
    )
  }
  return cache.get(surah)!
}

// Returns { "2:255": markup, ... } for the given surahs once enabled.
export function useTajweed(surahs: number[], enabled: boolean) {
  const [map, setMap] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const key = surahs.join(',')

  useEffect(() => {
    if (!enabled || !surahs.length) return
    let cancelled = false
    setError('')
    Promise.all(surahs.map(async (s) => [s, await loadTajweed(s)] as const))
      .then((all) => {
        if (cancelled) return
        const next: Record<string, string> = {}
        for (const [s, verses] of all) for (const [v, markup] of Object.entries(verses)) next[`${s}:${v}`] = markup
        setMap(next)
      })
      .catch(() => !cancelled && setError('Tajweed colours are unavailable right now.'))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  return { map: enabled ? map : {}, error: enabled ? error : '' }
}
