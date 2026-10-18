// Tests picking app-file names out of a page's HTML for offline saving.  Run: npm run test:offline
import { assetsIn, surahUrls } from '../src/lib/offline.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const html = `<link rel="stylesheet" href="/_next/static/css/abc123.css"/><script src="/_next/static/chunks/main-9f.js" async></script>
<script>self.__next_f.push([1,"static/chunks/app/(app)/quran/%5Bsurah%5D/page-77aa.js"]);self.__next_f.push([1,"/_next/static/chunks/app/layout-1.js"])</script>
<link rel="preload" href="/_next/static/media/font.woff2" as="font"/><img src="/icon.svg"/><a href="/_next/image?url=x">x</a>`
const found = assetsIn(html)
ok('finds scripts, styles and fonts in tags and in the page data', found.includes('/_next/static/css/abc123.css') && found.includes('/_next/static/chunks/main-9f.js') && found.includes('/_next/static/media/font.woff2'), found.join())
ok('file names with encoded brackets (dynamic routes) are found', found.includes('/_next/static/chunks/app/(app)/quran/%5Bsurah%5D/page-77aa.js') && found.some((f) => f.includes('%5Bsurah%5D')), found.join())
ok('every entry starts with /_next/static/ and there are no duplicates', found.every((f) => f.startsWith('/_next/static/')) && new Set(found).size === found.length)
ok('ordinary links and images are ignored', !found.some((f) => f.includes('icon.svg') || f.includes('_next/image')))
ok('nothing in, nothing out', assetsIn('').length === 0 && assetsIn('<p>hello</p>').length === 0)
ok('surah URLs: the page and its translated text', surahUrls(2, 'fr').join() === '/quran/2,/api/quran/surah/2?lang=fr')
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
