'use client'

import { useEffect, useState } from 'react'

export type SurahInfo = {
  id: number
  name_simple: string
  name_arabic: string
  verses_count: number
  revelation_place: string
  translated_name: { name: string }
  page?: number
}
export type JuzInfo = { juz: number; surah: number; verse: number; surahName: string; surahArabic: string; page: number }
type SurahData = { surahs: SurahInfo[]; juz: JuzInfo[] }

// One fetch per page load, shared by every component that needs surah names/counts.
let promise: Promise<SurahData> | null = null
export function loadSurahData(): Promise<SurahData> {
  if (!promise) {
    promise = fetch('/api/quran/surahs')
      .then((r) => r.json())
      .then((d) => ({ surahs: d.surahs ?? [], juz: d.juz ?? [] }))
      .catch(() => {
        promise = null
        return { surahs: [], juz: [] }
      })
  }
  return promise
}

export function useSurahData() {
  const [data, setData] = useState<SurahData>({ surahs: [], juz: [] })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    loadSurahData().then((d) => {
      if (!cancelled) {
        setData(d)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])
  return { ...data, loading }
}
