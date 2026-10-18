// Takes phone-size screenshots of the main screens so you can look at them. Run (app must be running on APP_URL):
//   MSYS_NO_PATHCONV=1 SHOTS_DIR=some/folder node tests/shots.mjs     (optional ROUTES=/dashboard,/quran … and THEME=dark)
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.APP_URL || 'http://localhost:3000'
const DIR = process.env.SHOTS_DIR || 'shots'
const THEME = process.env.THEME || 'light'
const PORT = 9999
const ROUTES = (process.env.ROUTES || '/dashboard,/quran,/quran/1,/prayer,/reels,/library,/library/read?title=Hajj,/stories,/stories/yusuf,/heritage,/heritage/salahuddin,/quiz,/games,/lectures,/learn,/hadith,/settings,/more').split(',')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(DIR, { recursive: true })

const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + process.env.TEMP + '\\shots-' + Date.now(), 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id) } }
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })) })
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Browser.grantPermissions', { origin: BASE, permissions: ['geolocation'] })
await send('Emulation.setGeolocationOverride', { latitude: 21.4225, longitude: 39.8262, accuracy: 50 })

await send('Page.navigate', { url: BASE + '/offline' }); await sleep(800)
await send('Runtime.evaluate', { expression: `localStorage.clear();localStorage.setItem('deen:prefs', JSON.stringify({theme:'${THEME}'}));localStorage.setItem('deen:loc-dismissed','true')` })
for (const route of ROUTES) {
  await send('Page.navigate', { url: BASE + route })
  for (let i = 0; i < 60; i++) { const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }); if (r.result?.value === 'complete') break; await sleep(250) }
  await sleep(3500)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const name = route.replace(/^\//, '').replace(/[^\w]+/g, '-') || 'home'
  writeFileSync(`${DIR}/${name}.png`, Buffer.from(shot.data, 'base64'))
  console.log('saved', name)
}
ws.close(); proc.kill(); process.exit(0)
