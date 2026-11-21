import { ROUTE_IDS } from './route-ids'

// Is this address one that does not exist? (A surah 999, /stories/nope, /learn/seerah/nope…) The server answers such addresses with a real 404.
const has = (list: readonly string[], id: string) => list.includes(id)
const inRange = (s: string, max: number) => /^\d{1,4}$/.test(s) && Number(s) >= 1 && Number(s) <= max

export function missing(pathname: string): boolean {
  const seg = pathname.split('/').filter(Boolean)
  if (seg.length < 2) return false
  const [a, b, c] = seg
  if (a === 'quran') return b === 'page' ? seg.length === 3 && !inRange(c, 604) : seg.length !== 2 || !inRange(b, 114)
  if (a === 'tafsir') return !inRange(b, 114) || (seg.length === 3 && !inRange(c, 286)) || seg.length > 3
  if (a === 'stories') return seg.length > 2 || !has(ROUTE_IDS.stories, b)
  if (a === 'heritage') return seg.length > 2 || !has(ROUTE_IDS.heritage, b)
  if (a === 'books') return seg.length > 2 || !has(ROUTE_IDS.books, b)
  if (a === 'learn') {
    if (!has(ROUTE_IDS.courses, b)) return true
    if (seg.length === 2) return false
    if (seg.length > 3) return true
    const fixed = (ROUTE_IDS.fixedLessonCounts as Record<string, number>)[b]
    if (fixed) return !new RegExp(`^${b}-(\\d{1,3})$`).test(c) || Number(c.slice(b.length + 1)) > fixed || Number(c.slice(b.length + 1)) < 1
    return !has((ROUTE_IDS.lessons as Record<string, readonly string[]>)[b] ?? [], c)
  }
  return false
}
