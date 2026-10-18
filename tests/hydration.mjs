// Loads every page in a real browser at phone width and lists JavaScript errors and sideways-overflowing layouts (hydration mismatches show up as React error #418/#423/#425).
// Run against a production build:  npx next start -p 3100  then  MSYS_NO_PATHCONV=1 APP_URL=http://localhost:3100 npm run hydration
import { spawn } from 'node:child_process'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.APP_URL || 'http://localhost:3100'
const PORT = 9777
const ROUTES = (process.env.ROUTES || '/dashboard,/quran,/quran/1,/quran/page/1,/prayer,/qibla,/mosques,/reels,/learn,/recite,/goals,/habits,/calendar,/guides,/ramadan,/companion,/settings,/more,/identify,/search,/hadith,/duas,/names,/dhikr,/zakat,/flashcards,/quiz,/games,/hifz,/stories,/stories/yusuf,/heritage,/heritage/salahuddin,/library,/library/read?title=Hajj,/lectures,/legal/privacy,/legal/terms,/legal/credits,/offline,/donate').split(',')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + process.env.TEMP + '\hyd-profile-' + Date.now(), 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
let errors = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id) }
  else if (d.method === 'Runtime.exceptionThrown') errors.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split('\n')[0].slice(0, 110))
  else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console: ' + d.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 110))
}
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
if (process.env.BYPASS_SW) await send('Network.setBypassServiceWorker', { bypass: true })
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Browser.grantPermissions', { origin: BASE, permissions: ['geolocation'] })
await send('Emulation.setGeolocationOverride', { latitude: 51.5074, longitude: -0.1278, accuracy: 50 })
let bad = 0
for (const mode of ['first visit', 'returning visitor']) {
  for (const route of ROUTES) {
    if (mode === 'first visit') { await send('Page.navigate', { url: BASE + '/offline' }); await sleep(300); await send('Runtime.evaluate', { expression: 'localStorage.clear()' }) }
    else await send('Runtime.evaluate', { expression: `localStorage.setItem('deen:place', JSON.stringify({kind:'coords',lat:51.507,lng:-0.128,label:'London'}));localStorage.setItem('deen:place-auto','true');localStorage.setItem('deen:loc-dismissed','true')` })
    errors = []
    await send('Page.navigate', { url: BASE + route })
    for (let i = 0; i < 60; i++) { const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }); if (r.result?.value === 'complete') break; await sleep(250) }
    await sleep(2200)
    // A page that is wider than the phone forces sideways scrolling and shrinks everything: report it too.
    const wide = await send('Runtime.evaluate', { expression: '(()=>{const w=document.documentElement.scrollWidth-innerWidth;return w>1?w:0})()', returnByValue: true })
    if (wide.result?.value) errors.push('layout: page is ' + wide.result.value + 'px wider than the screen (sideways scrolling)')
    const uniq = [...new Set(errors)]
    if (uniq.length) { bad++; console.log(`[${mode}] ${route}\n   ${uniq.join('\n   ')}`) }
  }
}
ws.close(); proc.kill()
console.log(bad ? `\n${bad} page view(s) with errors.` : `\nNo JavaScript errors on ${ROUTES.length} pages × 2 visitor types.`)
process.exit(bad ? 1 : 0)
