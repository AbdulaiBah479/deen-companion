// Google Lighthouse (mobile) on key pages.  Run: BASE=https://your-site npm run lighthouse
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
process.env.CHROME_PATH ||= 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PAGES = (process.env.PAGES || '/,/quran/1,/prayer,/companion').split(',')
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
let low = 0
for (const p of PAGES) {
  const r = await lighthouse(BASE + p, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] })
  const c = r.lhr.categories, a = r.lhr.audits
  const s = Object.fromEntries(Object.entries(c).map(([k, v]) => [k.replace('best-practices', 'practices').slice(0, 8), Math.round(v.score * 100)]))
  const bad = Object.values(s).some((v) => v < 90)
  if (bad) low++
  console.log(`${bad ? 'LOW ' : 'OK  '}${p}  perf ${s.performa}  a11y ${s.accessib}  practices ${s.practice}  seo ${s.seo}  | FCP ${a['first-contentful-paint'].displayValue}  LCP ${a['largest-contentful-paint'].displayValue}  TBT ${a['total-blocking-time'].displayValue}  CLS ${a['cumulative-layout-shift'].displayValue}`)
  if (bad) for (const [id, au] of Object.entries(a)) if (au.score !== null && au.score < 0.9 && au.scoreDisplayMode !== 'informative' && au.details?.type !== 'opportunity') console.log('     -', id, '(' + Math.round(au.score * 100) + ')')
}
await chrome.kill()
process.exit(low ? 1 : 0)
