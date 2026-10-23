// Opens key pages in WebKit (Safari's engine), Firefox and Chromium with phone-sized screens and reports JS errors,
// failed requests and sideways overflow.  Run: BASE=https://your-site npm run test:browsers
import { chromium, firefox, webkit, devices } from 'playwright'
const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const PAGES = ['/', '/dashboard', '/quran', '/quran/1', '/quran/18', '/prayer', '/companion', '/search?q=patience', '/hadith', '/duas', '/learn', '/quiz', '/games', '/heritage', '/library', '/lectures', '/settings', '/identify', '/qibla', '/offline', '/legal/privacy']
const engines = [['webkit (Safari engine, iPhone 14)', webkit, devices['iPhone 14']], ['firefox (Android-sized)', firefox, { viewport: { width: 390, height: 844 }, isMobile: false }], ['chromium (Pixel 7)', { launch: (o) => chromium.launch({ channel: 'msedge', ...o }) }, devices['Pixel 7']]]
let bad = 0
for (const [label, engine, device] of engines) {
  let browser
  try { browser = await engine.launch() } catch (e) { console.log('SKIP', label, String(e.message).split('\n')[0]); continue }
  const ctx = await browser.newContext({ ...device, serviceWorkers: 'block' })
  await ctx.addInitScript(() => { try { localStorage.setItem('deen:loc-dismissed', 'true') } catch {} })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => { if (!/_rsc|access control checks/.test(e.message)) errs.push('js: ' + e.message.slice(0, 120)) })
  page.on('requestfailed', (r) => { const why = r.failure()?.errorText || ''; if (/cancel|ABORTED|abort/i.test(why) || r.url().includes('_rsc=')) return; if (!/analytics|vitals|everyayah|pexels|ytimg|youtube/.test(r.url())) errs.push('net: ' + r.url().slice(0, 90) + ' ' + (r.failure()?.errorText || '')) })
  console.log('\n' + label)
  for (const p of PAGES) {
    errs.length = 0
    let status = 0, over = 0
    try {
      const res = await page.goto(BASE + p, { waitUntil: 'load', timeout: 45000 })
      status = res?.status() ?? 0
      await page.waitForTimeout(1200)
      over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    } catch (e) { errs.push('nav: ' + String(e.message).split('\n')[0]) }
    const problems = [...errs]
    if (status >= 400 || status === 0) problems.push('status ' + status)
    if (over > 2) problems.push('sideways overflow ' + over + 'px')
    if (problems.length) bad++
    console.log((problems.length ? 'FAIL ' : 'PASS ') + p + (problems.length ? '  ' + problems.slice(0, 3).join(' | ') : ''))
  }
  await browser.close()
}
// The opening page's top bar must never let the logo and the buttons touch each other, on any phone width.
console.log('\nopening header at narrow widths')
for (const [label, engine] of [['webkit', webkit], ['chromium', { launch: (o) => chromium.launch({ channel: 'msedge', ...o }) }]]) {
  const browser = await engine.launch()
  for (const width of [320, 360, 375, 390, 412]) {
    const page = await (await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 2 })).newPage()
    await page.goto(BASE + '/', { waitUntil: 'load' })
    await page.waitForTimeout(600)
    const r = await page.evaluate(() => {
      const nav = document.querySelector('nav')
      const logo = nav.firstElementChild.getBoundingClientRect()
      const links = [...nav.querySelectorAll('a')].filter((e) => e.getClientRects().length).map((e) => e.getBoundingClientRect())
      const touching = links.some((l) => l.left < logo.right + 4 && l.right > logo.left)
      const W = document.documentElement.clientWidth
      const outside = [logo, ...links].some((b) => b.right > W + 0.5 || b.left < -0.5)
      return { touching, outside, logoRight: Math.round(logo.right), firstLinkLeft: links[0] ? Math.round(links[0].left) : null, links: links.length }
    })
    const okHeader = !r.touching && !r.outside && r.links >= 1
    if (!okHeader) bad++
    console.log((okHeader ? 'PASS ' : 'FAIL ') + label + ' ' + width + 'px  ' + JSON.stringify(r))
    await page.close()
  }
  await browser.close()
}

console.log(bad ? `\n${bad} problem(s)` : '\nall clean')
process.exit(bad ? 1 : 0)
