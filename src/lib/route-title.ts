// The title shown in the browser tab, the history list and read out by screen readers, for every page of the app.
// (Pages are client pages, so the title is set by <RouteTitle/> as you move around.)
import { STATIC_SURAHS } from './surah-static'

const SITE = 'Deen Companion'

const TITLES: Record<string, string> = {
  '/': 'Free Islamic app: Quran, prayer times, hadith, learning',
  '/dashboard': 'Home',
  '/quran': 'The Noble Quran',
  '/prayer': 'Prayer times and reminders',
  '/reels': 'Islamic reels',
  '/learn': 'Learn: Arabic and Islamic courses',
  '/companion': 'AI companion',
  '/stories': 'Stories of the Quran',
  '/heritage': 'Great Muslims',
  '/library': 'Library',
  '/lectures': 'Lectures',
  '/quiz': 'Daily quiz',
  '/games': 'Games',
  '/hadith': 'Hadith',
  '/duas': 'Duas and adhkar',
  '/names': '99 Names of Allah',
  '/dhikr': 'Dhikr counter',
  '/qibla': 'Qibla finder',
  '/zakat': 'Zakat calculator',
  '/ruqyah': 'Ruqyah',
  '/support': 'Support the app',
  '/sponsor': 'Sponsors',
  '/rituals': 'Rituals and special prayers',
  '/basics': 'Islam basics',
  '/tafsir': 'Tafsir study',
  '/journey': 'Verse Journey',
  '/listen': 'Listen mode',
  '/circle': 'Family circle',
  '/khutbah': 'Sermons (khutbah)',
  '/books': 'Islamic books',
  '/calendar': 'Islamic calendar',
  '/guides': 'Hajj, Umrah and Seerah guides',
  '/ramadan': 'Ramadan tracker',
  '/more': 'Everything else',
  '/qada': 'Make-up prayers and fasts',
  '/giving': 'Zakat al-Fitr, fidya and kaffarah',
  '/journal': 'Reflection journal',
  '/baby-names': 'Islamic baby names',
  '/halal': 'Halal ingredient guide',
  '/converter': 'Hijri date converter',
  '/recite': 'Recite',
  '/hifz': 'Hifz coach',
  '/flashcards': 'Flashcards',
  '/habits': 'Daily deeds',
  '/goals': 'Khatam planner',
  '/identify': 'Quran identifier',
  '/search': 'Search',
  '/mosques': 'Find a mosque',
  '/donate': 'Sadaqah journal',
  '/report': 'Report a problem',
  '/settings': 'Settings',
  '/login': 'Sign in',
  '/signup': 'Create an account',
  '/offline': 'You are offline',
  '/admin': 'Control room',
  '/reels/create': 'Create a reel',
  '/legal/privacy': 'Privacy',
  '/legal/terms': 'Terms',
  '/legal/credits': 'Sources and credits',
}

const COURSE: Record<string, string> = {
  letters: 'Arabic letters',
  words: 'Quran words',
  tajweed: 'Tajweed basics',
  basics: 'Foundations',
  'kids-arabic': 'My First Arabic Words',
  'kids-islam': 'My Islam',
  'arabic-1': 'Arabic for Beginners',
  seerah: 'The Life of the Prophet ﷺ',
  'quran-101': 'Understanding the Quran',
}

const words = (slug: string) => {
  const t = decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

// The page's own title (without the site name), or '' if there is nothing better than the site name.
export function pageTitle(pathname: string): string {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  if (TITLES[path]) return TITLES[path]
  const seg = path.split('/').filter(Boolean)
  const n = Number(seg[1])
  if (seg[0] === 'quran' && seg[1] === 'page' && Number(seg[2]) >= 1) return `Mushaf page ${Number(seg[2])}`
  if (seg[0] === 'quran' && Number.isInteger(n) && n >= 1 && n <= 114) return `Surah ${STATIC_SURAHS[n - 1].name_simple}`
  if (seg[0] === 'tafsir' && Number.isInteger(n) && n >= 1 && n <= 114) return seg[2] ? `Tafsir ${n}:${Number(seg[2])}` : `Tafsir of Surah ${STATIC_SURAHS[n - 1].name_simple}`
  if (seg[0] === 'learn' && seg[1]) return seg[2] ? `${words(seg[2])} · ${COURSE[seg[1]] ?? words(seg[1])}` : COURSE[seg[1]] ?? words(seg[1])
  if (['stories', 'heritage', 'library', 'books'].includes(seg[0]) && seg[1]) return `${words(seg[seg.length - 1])} · ${TITLES['/' + seg[0]]}`
  if (TITLES['/' + seg[0]]) return TITLES['/' + seg[0]]
  return ''
}

export const fullTitle = (pathname: string) => {
  const t = pageTitle(pathname)
  return t ? `${t} · ${SITE}` : SITE
}
