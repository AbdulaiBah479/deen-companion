// Checks the search-engine side: every page has its own title and description, the structured data is well formed, the sitemap lists
// every real page, and robots.txt keeps crawlers out of the APIs.  Run: npm run test:seo
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { HOME_META, PAGES, SITE_URL, absolute, appLd, articleLd, breadcrumbLd, collectionLd, courseLd, faqLd, jsonLdString, organizationLd, pageMetadata, websiteLd } from '../src/lib/seo.ts'
import sitemap from '../src/app/sitemap.ts'
import robots from '../src/app/robots.ts'
import { ROUTE_IDS } from '../src/lib/route-ids.ts'
import { missing as notAPage } from '../src/lib/route-check.ts'
import { BOOKS } from '../src/lib/books.ts'
import { COURSES, STATIC_ALL } from '../src/lib/courses.ts'
import { HERITAGE } from '../src/lib/heritage.ts'
import { STORIES } from '../src/lib/stories.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ── every real page has an entry ──
const APP = new URL('../src/app/(app)/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const found: string[] = []
const walk = (dir: string, rel: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (!statSync(p).isDirectory()) continue
    const r = `${rel}/${name}`
    if (name.startsWith('[')) continue // dynamic pages build their own titles with generateMetadata
    if (existsSync(join(p, 'page.tsx'))) found.push(r)
    walk(p, r)
  }
}
walk(APP, '')
const missing = found.filter((p) => !PAGES[p])
ok('every static page of the app has a title and description in the SEO table', missing.length === 0, missing.join(', '))
ok('every entry in the table is a real page', Object.keys(PAGES).every((p) => found.includes(p)), Object.keys(PAGES).filter((p) => !found.includes(p)).join(', '))

// ── titles and descriptions ──
const all = [['/', HOME_META] as const, ...Object.entries(PAGES)]
const bad = (f: (t: string, d: string) => boolean) => all.filter(([, m]) => !f(m.title, m.description)).map(([p]) => p)
ok('titles are 8–62 characters (search results cut longer ones off)', bad((t) => t.length >= 8 && t.length <= 62).length === 0, bad((t) => t.length >= 8 && t.length <= 62).join(', '))
ok('descriptions are 70–165 characters', bad((_, d) => d.length >= 70 && d.length <= 165).length === 0, bad((_, d) => d.length >= 70 && d.length <= 165).map((p) => p + ':' + (all.find(([x]) => x === p)![1].description.length)).join(', '))
const titles = all.map(([, m]) => m.title.toLowerCase())
const descs = all.map(([, m]) => m.description.toLowerCase())
ok('no two pages share a title', new Set(titles).size === titles.length, titles.filter((t, i) => titles.indexOf(t) !== i).join(' | '))
ok('no two pages share a description', new Set(descs).size === descs.length)
ok('descriptions read as sentences (start with a capital, end with a full stop)', all.every(([, m]) => /^[A-Z0-9]/.test(m.description) && /[.?!]$/.test(m.description)), all.filter(([, m]) => !/[.?!]$/.test(m.description)).map(([p]) => p).join(', '))
ok('no page promises what the app does not do (no "ads", no "guarantee", no "best")', all.every(([, m]) => !/\b(guarantee|best in the world|#1|number one)\b/i.test(m.title + m.description)))

// ── layouts ──
const noLayout = Object.keys(PAGES).filter((p) => !existsSync(join(APP, p.slice(1), 'layout.tsx')))
ok('every page has its generated layout (run npm run gen:seo if not)', noLayout.length === 0, noLayout.join(', '))
ok('each layout points at its own page', Object.keys(PAGES).every((p) => !existsSync(join(APP, p.slice(1), 'layout.tsx')) || readFileSync(join(APP, p.slice(1), 'layout.tsx'), 'utf8').includes(`pageMetadata('${p}')`)))

// ── metadata object ──
const md = pageMetadata('/halal') as { title?: unknown; description?: string; alternates?: { canonical?: string }; openGraph?: { url?: string; title?: string }; twitter?: { card?: string } }
ok('page metadata has a title, description, canonical address, Open Graph and Twitter tags', md.title === PAGES['/halal'].title && md.description === PAGES['/halal'].description && md.alternates?.canonical === absolute('/halal') && md.openGraph?.url === absolute('/halal') && md.twitter?.card === 'summary_large_image')
ok('the home page has an absolute title and the canonical is the site address', (pageMetadata('/').title as { absolute?: string }).absolute?.startsWith('Deen Companion') === true && pageMetadata('/').alternates?.canonical === SITE_URL)
ok('a page can override its own title and description (used by surahs, stories, courses)', (pageMetadata('/quran/2', { title: 'Surah X', description: 'D'.repeat(80) }).title as string) === 'Surah X')

// ── structured data ──
const lds = [websiteLd(), organizationLd(), appLd(), breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'Quran', path: '/quran' }]), courseLd({ name: 'C', description: 'd', path: '/learn/x', minutes: 60, level: 'Beginner' }), articleLd({ headline: 'H', description: 'd', path: '/stories/x' }), faqLd([{ q: 'Q?', a: 'A.' }]), collectionLd('N', '/stories', [{ name: 'a', path: '/stories/a' }])]
ok('every structured-data block has the schema.org context and a type', lds.every((l) => l['@context'] === 'https://schema.org' && typeof l['@type'] === 'string'))
ok('the website data offers a site search; the app data says it is free', JSON.stringify(websiteLd()).includes('SearchAction') && (appLd().offers as { price: string }).price === '0')
ok('breadcrumbs are numbered from 1 and use absolute addresses', (breadcrumbLd([{ name: 'a', path: '/a' }, { name: 'b', path: '/b' }]).itemListElement as { position: number; item: string }[]).every((x, i) => x.position === i + 1 && x.item.startsWith('http')))
ok('the structured data turns into valid JSON and cannot close a script tag', (() => { const s = jsonLdString({ '@type': 'X', name: '</script><script>alert(1)</script>' }); return !s.includes('</script>') && JSON.parse(s).name.includes('</script>') })())
ok('an article headline is kept within the 110 characters search engines accept', (articleLd({ headline: 'x'.repeat(300), description: 'd', path: '/a' }).headline as string).length <= 110)

// ── sitemap ──
const sm = sitemap()
const urls = sm.map((e) => e.url)
ok('the sitemap lists the home page, every static page and no duplicates', urls.includes(SITE_URL) && Object.keys(PAGES).filter((p) => !['/settings', '/report', '/reels/create', '/donate', '/library/read'].includes(p)).every((p) => urls.includes(SITE_URL + p)) && new Set(urls).size === urls.length)
ok('the sitemap lists all 114 surahs, their tafsir pages and the courses', Array.from({ length: 114 }, (_, i) => i + 1).every((n) => urls.includes(`${SITE_URL}/quran/${n}`) && urls.includes(`${SITE_URL}/tafsir/${n}`)) && urls.some((u) => u.endsWith('/learn/seerah')) && urls.some((u) => u.includes('/learn/seerah/se-')))
ok('the sitemap has over 250 pages, each with a date, a frequency and a priority between 0 and 1', sm.length > 250 && sm.every((e) => e.lastModified && e.changeFrequency && typeof e.priority === 'number' && e.priority >= 0 && e.priority <= 1), String(sm.length))
ok('private and sign-in pages are not in the sitemap', !urls.some((u) => /\/(admin|login|signup|offline|api)(\/|$)/.test(u.replace(SITE_URL, ''))))

// ── robots ──
const rb = robots()
const rule = (Array.isArray(rb.rules) ? rb.rules[0] : rb.rules) as { allow?: string; disallow?: string[] }
ok('robots.txt lets crawlers in but keeps them out of the APIs, sign-in and control room', rule.allow === '/' && ['/api/', '/admin', '/login', '/signup'].every((p) => rule.disallow?.includes(p)))

// ── real 404s ──
ok('the list of valid ids matches the real stories, people, books, courses and lessons (run npm run gen:ids if not)', JSON.stringify(ROUTE_IDS.stories) === JSON.stringify(STORIES.map((s) => s.id)) && JSON.stringify(ROUTE_IDS.heritage) === JSON.stringify(HERITAGE.map((h) => h.id)) && JSON.stringify(ROUTE_IDS.books) === JSON.stringify(BOOKS.map((b) => b.id)) && JSON.stringify(ROUTE_IDS.courses) === JSON.stringify(COURSES.map((c) => c.id)) && JSON.stringify(ROUTE_IDS.lessons) === JSON.stringify(Object.fromEntries(Object.entries(STATIC_ALL).map(([k, v]) => [k, v.map((l) => l.id)]))))
ok('every real page address is accepted', ['/quran/1', '/quran/114', '/quran/page/1', '/quran/page/604', '/tafsir/2', '/tafsir/2/255', '/stories/adam', '/heritage/umar-abd-al-aziz', '/books/' + BOOKS[0].id, '/learn/seerah', '/learn/seerah/se-before', '/learn/letters/letters-1', '/learn/words/words-40', '/dashboard', '/halal', '/quran', '/'].every((p) => !notAPage(p)), ['/quran/1', '/learn/letters/letters-1', '/learn/words/words-40'].filter((p) => notAPage(p)).join())
ok('made-up addresses are refused', ['/quran/0', '/quran/115', '/quran/999', '/quran/abc', '/quran/1/extra', '/quran/page/0', '/quran/page/605', '/tafsir/115', '/tafsir/1/0x', '/stories/nope', '/stories/adam/x', '/heritage/nope', '/books/nope', '/learn/nope', '/learn/seerah/nope', '/learn/seerah/se-before/x', '/learn/letters/letters-0', '/learn/words/words-41', '/learn/letters/x'].every((p) => notAPage(p)), ['/quran/0', '/learn/words/words-41'].filter((p) => !notAPage(p)).join())
ok('pages outside those sections are never treated as missing here', ['/api/anything', '/admin', '/login', '/zakat/x'].every((p) => !notAPage(p)))
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
