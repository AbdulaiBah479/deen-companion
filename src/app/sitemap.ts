import type { MetadataRoute } from 'next'
import { HERITAGE } from '@/lib/heritage'
import { STORIES } from '@/lib/stories'

// Helps search engines find the public pages. Set NEXT_PUBLIC_SITE_URL to your real address (https://…).
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed = ['/dashboard', '/quran', '/prayer', '/reels', '/learn', '/companion', '/stories', '/heritage', '/library', '/lectures', '/quiz', '/games', '/hadith', '/duas', '/names', '/dhikr', '/qibla', '/zakat', '/ruqyah', '/rituals', '/tafsir', '/journey', '/listen', '/circle', '/khutbah', '/books', '/calendar', '/guides', '/ramadan', '/more', '/legal/privacy', '/legal/terms', '/legal/credits']
  const surahs = Array.from({ length: 114 }, (_, i) => `/quran/${i + 1}`)
  const people = HERITAGE.map((h) => `/heritage/${h.id}`)
  const stories = STORIES.map((s) => `/stories/${s.id}`)
  return [...fixed, ...surahs, ...people, ...stories].map((path) => ({ url: site + path, changeFrequency: 'weekly' as const }))
}
