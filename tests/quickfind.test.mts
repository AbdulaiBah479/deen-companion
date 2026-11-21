// Checks the "find anything" search: pages, surahs, verses, everyday words, and that every result goes to a real address.
// Run: npm run test:quickfind
import { PAGES } from '../src/lib/seo.ts'
import { SUGGESTED, quickFind } from '../src/lib/quick-find.ts'
import { STATIC_SURAHS } from '../src/lib/surah-static.ts'
import { missing } from '../src/lib/route-check.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const top = (q: string) => quickFind(q)[0]?.href
const has = (q: string, href: string) => quickFind(q).some((h) => h.href === href)

ok('an empty box suggests the most-used pages', quickFind('').length >= 6 && quickFind('').every((h) => SUGGESTED.includes(h.href)))
ok('a verse goes straight to that verse (2:255, 2.255, 2 255)', top('2:255') === '/quran/2#v255' && top('2.255') === '/quran/2#v255' && top('2 255') === '/quran/2#v255')
ok('a verse that does not exist is not offered', !has('2:999', '/quran/2#v999') && !quickFind('115:1').some((h) => h.kind === 'verse'))
ok('a number opens that surah', top('36') === '/quran/36' && top('114') === '/quran/114' && !has('115', '/quran/115'))
ok('a surah is found by its name with or without “al-”', top('baqarah') === '/quran/2' && top('al-baqarah') === '/quran/2' && top('kahf') === '/quran/18' && top('Ya Sin') !== undefined)
ok('a surah is found by its meaning and by its Arabic name', has('the cow', '/quran/2') && has('البقرة', '/quran/2') && has('opener', '/quran/1'))
ok('a page is found by its title, a word in it, or its keywords', top('halal') === '/halal' && has('prayer times', '/prayer') && has('qibla', '/qibla') && has('zakat calculator', '/zakat') && has('istikhara', '/rituals'))
ok('everyday words find the right page (namaz, azan, tasbih, kaaba, baby, hijri, kids)', has('namaz', '/prayer') && has('azan', '/prayer') && has('tasbih', '/dhikr') && has('kaaba', '/qibla') && has('baby', '/baby-names') && has('hijri', '/converter') && has('kids', '/learn/kids-islam') && has('seerah', '/learn/seerah'))
ok('capitals, accents and extra spaces do not matter', top('  QIBLA ') === top('qibla') && top('Hāfiz') !== 'x' && has('SALAT', '/prayer'))
ok('nonsense finds nothing, and does not crash', quickFind('zzqqxx').length === 0 && quickFind('<script>').length === 0 && quickFind('a'.repeat(500)).length >= 0)
ok('results are limited and never repeat an address', (() => { const r = quickFind('quran', 8); return r.length <= 8 && new Set(r.map((h) => h.href)).size === r.length })())
ok('the best match comes first', top('prayer') === '/prayer' && top('quran') === '/quran')
ok('every result has a title, a line of detail and a real address', [...SUGGESTED, ...Object.keys(PAGES)].every((p) => quickFind('').concat(quickFind(PAGES[p]?.title ?? p)).every((h) => h.title && h.subtitle && h.href.startsWith('/') && !missing(h.href.split('#')[0]))))
ok('all 114 surahs can be found by number and by name', STATIC_SURAHS.every((s) => has(String(s.id), `/quran/${s.id}`) && has(s.name_simple, `/quran/${s.id}`)), STATIC_SURAHS.filter((s) => !has(s.name_simple, `/quran/${s.id}`)).map((s) => s.name_simple).join(', '))
ok('every page of the app can be found by its own title', Object.entries(PAGES).every(([p, m]) => has(m.title, p)), Object.entries(PAGES).filter(([p, m]) => !has(m.title, p)).map(([p]) => p).join(', '))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
