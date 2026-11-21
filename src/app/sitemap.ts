import type { MetadataRoute } from 'next'
import { BOOKS } from '@/lib/books'
import { COURSES, STATIC_ALL } from '@/lib/courses'
import { HERITAGE } from '@/lib/heritage'
import { PAGES, SITE_URL } from '@/lib/seo'
import { STORIES } from '@/lib/stories'
import { STATIC_SURAHS } from '@/lib/surah-static'

// Tells search engines every public page, how often it changes and how important it is. Built from the same lists the pages use, so a
// new surah page, story, course or lesson appears here by itself. (tests/seo.test.mts checks that every real page is in it.)
const BUILT = new Date()
type Entry = MetadataRoute.Sitemap[number]
const entry = (path: string, priority: number, changeFrequency: Entry['changeFrequency']): Entry => ({ url: SITE_URL + (path === '/' ? '' : path), lastModified: BUILT, changeFrequency, priority })

const HIGH = new Set(['/quran', '/prayer', '/learn', '/hadith', '/duas', '/qibla', '/rituals', '/basics'])
const LEGAL = new Set(['/legal/privacy', '/legal/terms', '/legal/credits'])
const NOT_LISTED = new Set(['/settings', '/report', '/reels/create', '/donate', '/library/read'])

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = Object.keys(PAGES)
    .filter((p) => !NOT_LISTED.has(p))
    .map((p) => entry(p, HIGH.has(p) ? 0.9 : LEGAL.has(p) ? 0.3 : 0.6, LEGAL.has(p) ? 'yearly' : 'weekly'))
  return [
    entry('/', 1, 'weekly'),
    ...pages,
    ...STATIC_SURAHS.map((s) => entry(`/quran/${s.id}`, 0.8, 'monthly')),
    ...STATIC_SURAHS.map((s) => entry(`/tafsir/${s.id}`, 0.5, 'monthly')),
    ...COURSES.map((c) => entry(`/learn/${c.id}`, 0.7, 'monthly')),
    ...Object.entries(STATIC_ALL).flatMap(([course, ls]) => ls.map((l) => entry(`/learn/${course}/${l.id}`, 0.5, 'monthly'))),
    ...STORIES.map((s) => entry(`/stories/${s.id}`, 0.7, 'monthly')),
    ...HERITAGE.map((h) => entry(`/heritage/${h.id}`, 0.6, 'monthly')),
    ...BOOKS.map((b) => entry(`/books/${b.id}`, 0.5, 'monthly')),
  ]
}
