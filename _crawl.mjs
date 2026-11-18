import { chromium } from 'playwright'
const BASE = 'https://deen-companion-six.vercel.app'
const xml = await (await fetch(BASE + '/sitemap.xml')).text()
const paths = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname))]
const extra = ['/login', '/signup', '/offline', '/quran/2', '/quran/page/1', '/learn/seerah', '/learn/seerah/se-before', '/learn/kids-arabic/ka-greet', '/tafsir/1', '/hadith', '/stories', '/heritage']
const all = [...new Set([...paths, ...extra])].filter((p) => !p.startsWith('/admin'))
const b = await chromium.launch({ channel: 'msedge' })
const ctx = await b.newContext({ viewport: { width: 375, height: 700 }, locale: 'en-US' })
const problems = []
const links = new Set()
for (const p of all) {
  const page = await ctx.newPage()
  const errs = []
  const bad = []
  page.on('pageerror', (e) => errs.push('JS: ' + e.message.slice(0, 120)))
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource.*(4\d\d)/.test(m.text()) && errs.push('console: ' + m.text().slice(0, 120)))
  page.on('response', (r) => { if (r.status() >= 400 && new URL(r.url()).origin === BASE) bad.push(r.status() + ' ' + new URL(r.url()).pathname.slice(0, 60)) })
  try {
    const res = await page.goto(BASE + p, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(1200)
    if (!res || res.status() >= 400) errs.push('HTTP ' + res?.status())
    const info = await page.evaluate(() => {
      const de = document.documentElement
      const overflow = de.scrollWidth - de.clientWidth
      const noAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length
      const unlabeled = [...document.querySelectorAll('button,input,select,textarea')].filter((e) => !(e.getAttribute('aria-label') || e.innerText?.trim() || e.getAttribute('title') || e.labels?.length || e.getAttribute('placeholder') || e.type === 'hidden')).length
      const small = [...document.querySelectorAll('a,button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24) && getComputedStyle(e).visibility !== 'hidden' }).length
      const hrefs = [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0].split('?')[0])
      return { overflow, noAlt, unlabeled, small, hrefs, title: document.title, h1: document.querySelectorAll('h1').length, text: document.body.innerText.length }
    })
    info.hrefs.forEach((h) => links.add(h))
    const flags = []
    if (info.overflow > 2) flags.push('horizontal overflow ' + info.overflow + 'px')
    if (info.noAlt) flags.push(info.noAlt + ' images without alt')
    if (info.unlabeled) flags.push(info.unlabeled + ' controls without a name')
    if (info.h1 !== 1) flags.push('h1 count ' + info.h1)
    if (!info.title || info.title === 'Deen Companion' && p !== '/') flags.push('generic title')
    if (info.text < 80) flags.push('almost empty page')
    if (errs.length || bad.length || flags.length) problems.push({ p, errs, bad, flags })
  } catch (e) {
    problems.push({ p, errs: ['load failed: ' + String(e).slice(0, 80)], bad: [], flags: [] })
  }
  await page.close()
}
console.log('pages crawled:', all.length)
for (const x of problems) console.log(x.p, JSON.stringify({ e: x.errs.slice(0, 3), b: x.bad.slice(0, 4), f: x.flags }))
// internal links that 404
const dead = []
for (const l of links) { if (!l || l === '/' ) continue; const r = await fetch(BASE + l, { redirect: 'manual' }).catch(() => null); if (!r || r.status >= 400) dead.push(l + ' -> ' + r?.status) }
console.log('internal links checked:', links.size, ' dead:', dead.join(', ') || 'none')
await b.close()
