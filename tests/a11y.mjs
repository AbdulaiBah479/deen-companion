// Accessibility audit with axe-core (the engine behind Lighthouse's accessibility score), in headless Edge at phone size,
// in light and dark themes. Run against a production build:
//   npx next start -p 3100   then   MSYS_NO_PATHCONV=1 APP_URL=http://localhost:3100 npm run a11y
// Exit code is non-zero if any serious or critical problem is found (WCAG 2.1 A/AA rules).
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.APP_URL || 'http://localhost:3100'
const PORT = 9555
const ROUTES = (process.env.ROUTES || '/dashboard,/quran,/quran/1,/prayer,/library,/library/read?title=Hajj,/stories,/stories/yusuf,/heritage,/heritage/salahuddin,/quiz,/games,/more,/companion,/learn,/settings,/lectures,/legal/privacy,/hadith,/duas,/names,/zakat,/qibla,/calendar').split(',')
const THEMES = (process.env.THEMES || 'light,dark').split(',')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const AXE = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8')

const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + process.env.TEMP + '\\a11y-profile-' + Date.now(), 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 40; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
    if (targets.some((t) => t.type === 'page')) break
  } catch {}
  await sleep(500)
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id) }
}
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })) })
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r({ timedOut: true }), ms))])
const ev = async (expression) => (await withTimeout(send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }), 30000)).result?.value

await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Network.enable'); await send('Network.setBypassServiceWorker', { bypass: true })

const problems = new Map() // rule -> { impact, help, nodes:Set, where:Set }
let pages = 0
let skipped = 0
for (const theme of THEMES) {
  for (const route of ROUTES) {
    await send('Page.navigate', { url: BASE + '/dashboard' })
    for (let i = 0; i < 60 && (await ev('document.readyState')) !== 'complete'; i++) await sleep(250)
    await ev(`localStorage.setItem('deen:prefs', JSON.stringify({theme:'${theme}'}));localStorage.setItem('deen:loc-dismissed','true')`)
    await send('Page.navigate', { url: BASE + route })
    for (let i = 0; i < 80 && (await ev('document.readyState')) !== 'complete'; i++) await sleep(250)
    await sleep(2500) // let client-side content render
    await ev(AXE)
    const res = await ev(`axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.length,target:v.nodes[0]?.target?.join(' '),html:(v.nodes[0]?.html||'').slice(0,110),pairs:v.id==='color-contrast'?v.nodes.map(n=>{const d=(n.any[0]||{}).data||{};return {fg:d.fgColor,bg:d.bgColor,ratio:d.contrastRatio,need:d.expectedContrastRatio,cls:(n.html.match(/class="([^"]*)"/)||[])[1]||'',text:(n.html.replace(/<[^>]*>/g,'')).slice(0,30)}}):undefined})))`)
    if (!Array.isArray(res)) {
      console.log(`${theme.padEnd(5)} ${route.padEnd(34)} NO RESULT (the page stalled) — not counted`)
      skipped++
      continue
    }
    pages++
    for (const v of res ?? []) {
      const p = problems.get(v.id) ?? { impact: v.impact, help: v.help, nodes: 0, where: new Set(), sample: v }
      p.nodes += v.nodes
      if (v.pairs) for (const q of v.pairs) { const k = `${q.fg} on ${q.bg} (${q.ratio} < ${q.need}) [${theme}] ${q.cls.split(' ').filter((c) => /text-|bg-/.test(c)).join(' ')}`; (p.pairs ??= new Map()).set(k, (p.pairs.get(k) ?? 0) + 1) }
      p.where.add(`${route} (${theme})`)
      problems.set(v.id, p)
    }
    console.log(`${theme.padEnd(5)} ${route.padEnd(34)} ${(res ?? []).length ? (res ?? []).map((v) => `${v.id}×${v.nodes}`).join(' ') : 'clean'}`)
  }
}
ws.close(); proc.kill()

console.log(`\n${pages} page views checked${skipped ? `, ${skipped} skipped because the page stalled` : ""}.`)
const serious = [...problems.entries()].filter(([, p]) => p.impact === 'serious' || p.impact === 'critical')
for (const [rule, p] of problems) {
  console.log(`\n[${p.impact}] ${rule}: ${p.help} — ${p.nodes} elements on ${p.where.size} page views`)
  console.log(`   e.g. ${p.sample.target}  ${p.sample.html}`)
  console.log(`   ${[...p.where].slice(0, 6).join(', ')}${p.where.size > 6 ? ' …' : ''}`)
  if (p.pairs) for (const [k, n] of [...p.pairs].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`   ${String(n).padStart(4)} × ${k}`)
}
console.log(serious.length ? `\n${serious.length} serious/critical rule(s) failing.` : '\nNo serious or critical accessibility problems found.')
process.exit(serious.length ? 1 : 0)
