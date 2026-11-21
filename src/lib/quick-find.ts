// "Find anything": one search box for the whole app. Type a page ("halal", "prayer times"), a surah ("baqarah", "36"), or a verse ("2:255")
// and go straight there. Pure functions, so every kind of search is tested.
import { PAGES } from './seo'
import { STATIC_SURAHS } from './surah-static'

export type Hit = { kind: 'page' | 'surah' | 'verse'; title: string; subtitle: string; href: string; score: number }

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ًͯ-ٰٟ]/g, '').replace(/[‘’ʻʿ']/g, '').toLowerCase().replace(/[^a-z0-9؀-ۿ:. ]+/g, ' ').replace(/\s+/g, ' ').trim()

// Everyday words people type for a page that does not contain that word in its title.
const ALIASES: Record<string, string> = {
  namaz: '/prayer', salah: '/prayer', salat: '/prayer', azan: '/prayer', adhan: '/prayer', fajr: '/prayer', maghrib: '/prayer', isha: '/prayer', dhuhr: '/prayer', asr: '/prayer', times: '/prayer',
  quran: '/quran', koran: '/quran', surah: '/quran', recitation: '/quran', juz: '/quran',
  tasbih: '/dhikr', zikr: '/dhikr', counter: '/dhikr',
  dua: '/duas', supplication: '/duas', adkhar: '/duas', azkar: '/duas',
  kaaba: '/qibla', compass: '/qibla', direction: '/qibla', mecca: '/qibla', makkah: '/qibla',
  hijri: '/converter', date: '/converter', calendar: '/calendar', eid: '/calendar',
  baby: '/baby-names', names: '/names', name: '/baby-names',
  zakah: '/zakat', sadaqah: '/donate', charity: '/zakat', fitr: '/giving', fidya: '/giving', kaffarah: '/giving',
  ai: '/companion', ask: '/companion', question: '/companion', chat: '/companion',
  kids: '/learn/kids-islam', children: '/learn/kids-islam', arabic: '/learn/arabic-1', alphabet: '/learn/letters', letters: '/learn/letters', course: '/learn', courses: '/learn',
  seerah: '/learn/seerah', sirah: '/learn/seerah', prophet: '/stories', story: '/stories', hajj: '/guides', umrah: '/guides',
  ramadhan: '/ramadan', iftar: '/ramadan', suhoor: '/ramadan', sehri: '/ramadan', fasting: '/ramadan', fast: '/ramadan',
  mosque: '/mosques', masjid: '/mosques', halal: '/halal', ingredients: '/halal',
  hifz: '/hifz', memorise: '/hifz', memorize: '/hifz', tajweed: '/learn/tajweed', translation: '/quran',
  setting: '/settings', theme: '/settings', dark: '/settings', font: '/settings', language: '/settings', offline: '/settings', install: '/settings',
  sermon: '/khutbah', friday: '/khutbah', jumuah: '/khutbah', istikhara: '/rituals', janazah: '/rituals', funeral: '/rituals',
  missed: '/qada', qada: '/qada', diary: '/journal', notes: '/journal',
}

export const SUGGESTED: string[] = ['/prayer', '/quran', '/qibla', '/duas', '/learn', '/hadith', '/companion', '/zakat']

const pageHit = (path: string, score: number): Hit | null => {
  const p = PAGES[path]
  if (p) return { kind: 'page', title: p.title, subtitle: p.description.split('. ')[0].replace(/\.$/, ''), href: path, score }
  return null
}
const COURSE_TITLES: Record<string, string> = {
  '/learn/kids-islam': 'My Islam (course for children)',
  '/learn/arabic-1': 'Arabic for Beginners (course)',
  '/learn/letters': 'Arabic letters (course)',
  '/learn/seerah': 'The Life of the Prophet ﷺ (course)',
  '/learn/tajweed': 'Tajweed basics (course)',
}

export function quickFind(query: string, limit = 8): Hit[] {
  const q = fold(query)
  if (!q) return SUGGESTED.map((p, i) => pageHit(p, 100 - i)).filter((h): h is Hit => !!h).slice(0, limit)
  const hits = new Map<string, Hit>()
  const add = (h: Hit | null) => {
    if (!h) return
    const cur = hits.get(h.href)
    if (!cur || h.score > cur.score) hits.set(h.href, h)
  }

  // A verse: 2:255, 2.255 or "2 255"
  const v = q.match(/^(\d{1,3})[:. ](\d{1,3})$/)
  if (v) {
    const s = STATIC_SURAHS[Number(v[1]) - 1]
    if (s && Number(v[2]) >= 1 && Number(v[2]) <= s.verses_count) add({ kind: 'verse', title: `Verse ${s.id}:${Number(v[2])}`, subtitle: `Surah ${s.name_simple}`, href: `/quran/${s.id}#v${Number(v[2])}`, score: 1000 })
  }
  // A surah by number
  if (/^\d{1,3}$/.test(q)) {
    const s = STATIC_SURAHS[Number(q) - 1]
    if (s) add({ kind: 'surah', title: `Surah ${s.name_simple}`, subtitle: `${s.id} · ${s.translated_name.name} · ${s.verses_count} verses`, href: `/quran/${s.id}`, score: 900 })
  }
  // A surah by name (Latin, meaning or Arabic)
  for (const s of STATIC_SURAHS) {
    const names = [fold(s.name_simple), fold(s.translated_name.name), s.name_arabic]
    let score = 0
    for (const n of names) {
      const bare = n.replace(/^(al|an|ar|as|ad|at|ash|az|adh|ath) ?-?/, '')
      if (n === q || bare === q) score = Math.max(score, 800)
      else if (n.startsWith(q) || bare.startsWith(q)) score = Math.max(score, 700)
      else if (q.length >= 3 && (n.includes(q) || bare.includes(q))) score = Math.max(score, 450)
    }
    if (score) add({ kind: 'surah', title: `Surah ${s.name_simple}`, subtitle: `${s.id} · ${s.translated_name.name} · ${s.verses_count} verses`, href: `/quran/${s.id}`, score })
  }
  // Pages
  const words = q.split(' ')
  for (const [path, p] of Object.entries(PAGES)) {
    const title = fold(p.title)
    const kw = fold((p.keywords ?? []).join(' '))
    const desc = fold(p.description)
    let score = 0
    if (title.startsWith(q)) score = 600
    else if (title.split(' ').some((w) => w.startsWith(q))) score = 560
    else if (words.every((w) => title.includes(w))) score = 520
    else if (words.every((w) => kw.includes(w))) score = 400
    else if (q.length >= 3 && words.every((w) => desc.includes(w))) score = 200
    if (score) add(pageHit(path, score))
  }
  // Everyday words and other names for a page
  for (const w of words) {
    const target = ALIASES[w]
    if (target) add(PAGES[target] ? pageHit(target, 650) : { kind: 'page', title: COURSE_TITLES[target] ?? target, subtitle: 'Free course', href: target, score: 650 })
  }
  return [...hits.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit)
}
