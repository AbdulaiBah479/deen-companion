'use client'

import { STATIC_JUZ, STATIC_SURAHS } from './surah-static'

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

// The list of surahs (and juz) is part of the app itself, so it is there at once: no download, no waiting, works offline.
// (It is generated from the Quran data by `npm run gen:surahs`; a test checks that it matches.)
const DATA: SurahData = { surahs: STATIC_SURAHS, juz: STATIC_JUZ }
export function loadSurahData(): Promise<SurahData> {
  return Promise.resolve(DATA)
}

export function useSurahData() {
  return { ...DATA, loading: false }
}
