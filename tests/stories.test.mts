// Checks every Quran story points at real verses, and that the opening verse of key stories names who/what the story is about.
// Run: npm run test:stories   (needs ./data from `npm run data`)
import { existsSync, readFileSync } from 'node:fs'
import { STORIES, STORY_GROUPS, groupOf } from '../src/lib/stories.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

ok('at least 40 stories', STORIES.length >= 40, String(STORIES.length))
ok('story ids are unique', new Set(STORIES.map((s) => s.id)).size === STORIES.length)
ok('every story has a title, icon, summary and chapters', STORIES.every((s) => s.title && s.icon && s.summary.length > 10 && s.chapters.length > 0))
ok('every story belongs to a known section', STORIES.every((s) => STORY_GROUPS.some((g) => g.id === groupOf(s))))
ok('all three sections have stories', STORY_GROUPS.every((g) => STORIES.some((s) => groupOf(s) === g.id)))
ok('chapters are in the right order (from ≤ to)', STORIES.every((s) => s.chapters.every((c) => c.from >= 1 && c.from <= c.to)))
ok('story ids are URL-safe', STORIES.every((s) => /^[a-z0-9-]+$/.test(s.id)))

const dataDir = new URL('../data/quran/', import.meta.url)
if (!existsSync(new URL('surahs.json', dataDir))) {
  console.log('SKIP verse checks: run `npm run data` first')
} else {
  const surahs = JSON.parse(readFileSync(new URL('surahs.json', dataDir), 'utf8')) as { id: number; verses_count: number }[]
  const len = new Map(surahs.map((s) => [s.id, s.verses_count]))
  const bad = STORIES.flatMap((s) => s.chapters.filter((c) => !len.has(c.surah) || c.to > len.get(c.surah)!).map((c) => `${s.id} ${c.surah}:${c.from}-${c.to}`))
  ok('every verse range exists in the Quran', bad.length === 0, bad.join(', '))

  const verses = new Map((JSON.parse(readFileSync(new URL('arabic.json', dataDir), 'utf8')) as [string, string, string][]).map(([k, , simple]) => [k, simple]))
  const opens = (id: string, ch: number, word: string) => {
    const c = STORIES.find((s) => s.id === id)!.chapters[ch]
    const txt = verses.get(`${c.surah}:${c.from}`) ?? ''
    // also accept the word anywhere in the first range, since a story may begin a verse or two before the name appears
    const range = Array.from({ length: Math.min(4, c.to - c.from + 1) }, (_, i) => verses.get(`${c.surah}:${c.from + i}`) ?? '').join(' ')
    ok(`${id}: opening verses mention "${word}"`, txt.includes(word) || range.includes(word), `${c.surah}:${c.from}`)
  }
  opens('hud', 0, 'هودا')
  opens('salih', 0, 'صالح')
  opens('lut', 0, 'لوط')
  opens('shuayb', 0, 'شعيب')
  opens('qarun', 0, 'قارون')
  opens('habil-qabil', 0, 'ادم')
  opens('luqman', 0, 'لقمان')
  opens('fil', 0, 'الفيل')
  opens('ukhdud', 0, 'الاخدود')
  opens('talut', 1, 'طالوت')
  opens('zakariya', 0, 'زكريا')
  opens('dawud', 0, 'داوود')
  opens('idris', 0, 'ادريس')
  opens('saba', 0, 'سبا')
  opens('cow', 0, 'بقرة')
  opens('badr', 1, 'ببدر')
  opens('first-revelation', 0, 'اقرا')
  opens('hijra', 0, 'الغار')
  opens('isa', 0, 'المسيح')
  opens('musa-exodus', 0, 'موسى')
  opens('musa-khidr', 0, 'موسى')
  opens('ishaq-yaqub', 0, 'رسلنا')
  opens('fath', 0, 'نصر')
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
