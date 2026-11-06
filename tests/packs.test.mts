// Tests the offline packs definitions and the page-asset finder.  Run: npm run test:packs
import { PACKS, assetsIn, packById } from '../src/lib/offline-packs.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
ok('packs: at least three, with unique ids and a name, a description and a size', PACKS.length >= 3 && new Set(PACKS.map((p) => p.id)).size === PACKS.length && PACKS.every((p) => p.name && p.blurb.length > 20 && /about/.test(p.approx)))
ok('packs: every page is a path inside the app, and every data address is an /api path', PACKS.every((p) => p.pages.length > 0 && p.pages.every((x) => /^\/[a-z0-9\-/]*$/.test(x)) && p.data.every((x) => x.startsWith('/api/'))))
ok('packs: nothing private or admin can ever be saved', !PACKS.flatMap((p) => [...p.pages, ...p.data]).some((x) => /admin|cron|push|report|\/api\/ai/.test(x)))
ok('packs: the worship pack covers duas, rituals, basics, prayer and the five dua categories', (() => { const w = packById('worship')!; return ['/duas', '/rituals', '/basics', '/prayer', '/guides'].every((x) => w.pages.includes(x)) && w.data.filter((d) => d.startsWith('/api/duas?category=')).length === 5 })())
const html = '<link rel="stylesheet" href="/_next/static/css/a1.css"/><script src="/_next/static/chunks/b2.js?v=3" async></script><script src="https://cdn.example.com/x.js"></script><link href="/icon.svg"/><script src="/_next/static/chunks/b2.js?v=3"></script>'
ok('assets: finds the app’s own script and style files once each, and ignores other sites and icons', JSON.stringify(assetsIn(html)) === JSON.stringify(['/_next/static/css/a1.css', '/_next/static/chunks/b2.js?v=3']), JSON.stringify(assetsIn(html)))
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
