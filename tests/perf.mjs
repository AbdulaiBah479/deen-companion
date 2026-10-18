// Measures real page-load speed in headless Edge, throttled like a mid-range phone on 4G (4× slower CPU, 1.6 Mbps, 150 ms latency).
// Run against a production build:  npm run build && npx next start -p 3100   then   APP_URL=http://localhost:3100 npm run perf
// Reports per route: first paint, largest paint, time until the page is loaded, JavaScript and total bytes, and console errors.
import { spawn } from 'node:child_process'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = process.env.APP_URL || 'http://localhost:3100'
const PORT = 9444
const ROUTES = (process.env.ROUTES || '/dashboard,/quran,/quran/1,/prayer,/reels,/library,/stories,/more,/companion,/learn').split(',')
const THROTTLE = process.env.THROTTLE !== 'off'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + process.env.TEMP + '\\perf-profile-' + Date.now(), 'about:blank'], { stdio: 'ignore' })
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
const resources = new Map()
const errors = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id) }
  else if (d.method === 'Network.responseReceived') resources.set(d.params.requestId, { type: d.params.type, url: d.params.response.url, status: d.params.response.status })
  else if (d.method === 'Network.loadingFinished') { const r = resources.get(d.params.requestId); if (r) r.bytes = d.params.encodedDataLength }
  else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 140))
  else if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split('\n')[0].slice(0, 140))
}
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value

await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
// The app's service worker would serve repeat loads from its own cache and hide the network cost, so measure the raw network.
await send('Network.setBypassServiceWorker', { bypass: true })
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
if (THROTTLE) {
  await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
  await send('Emulation.setCPUThrottlingRate', { rate: 4 })
}

const pad = (s, n) => String(s).padEnd(n)
console.log(`${THROTTLE ? 'Mobile (4G, 4× CPU)' : 'Unthrottled'} — ${BASE}\n`)
console.log(pad('route', 14) + pad('FCP', 8) + pad('LCP', 8) + pad('loaded', 9) + pad('JS kB', 8) + pad('total kB', 10) + 'errors')
const rows = []
for (const route of ROUTES) {
  for (const pass of (process.env.WARM ? ['cold', 'warm'] : ['cold'])) {
    resources.clear()
    errors.length = 0
    if (pass === 'cold') await send('Network.clearBrowserCache')
    await send('Page.navigate', { url: 'about:blank' }); await sleep(300)
    await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__lcp=0;new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime}).observe({type:"largest-contentful-paint",buffered:true})' })
    const t0 = Date.now()
    await send('Page.navigate', { url: BASE + route })
    for (let i = 0; i < 120; i++) { if ((await ev('document.readyState')) === 'complete') break; await sleep(250) }
    await sleep(1200) // let late paints and client fetches settle
    const m = await ev(`(()=>{const n=performance.getEntriesByType('navigation')[0];const fcp=performance.getEntriesByName('first-contentful-paint')[0];return {fcp:fcp?fcp.startTime:0,lcp:window.__lcp,load:n.loadEventEnd}})()`)
    const all = [...resources.values()]
    const js = all.filter((r) => r.type === 'Script').reduce((a, r) => a + (r.bytes || 0), 0)
    const total = all.reduce((a, r) => a + (r.bytes || 0), 0)
    const row = { route, pass, fcp: Math.round(m.fcp), lcp: Math.round(m.lcp), load: Math.round(m.load), js: Math.round(js / 1024), total: Math.round(total / 1024), errors: errors.length, wall: Date.now() - t0 }
    rows.push(row)
    if (pass === 'cold') console.log(pad(route, 14) + pad(row.fcp + ' ms', 8) + pad(row.lcp + ' ms', 8) + pad(row.load + ' ms', 9) + pad(row.js, 8) + pad(row.total, 10) + (row.errors ? row.errors + ' ' + errors[0] : '0'))
    else console.log(pad('  (repeat)', 14) + pad(row.fcp + ' ms', 8) + pad(row.lcp + ' ms', 8) + pad(row.load + ' ms', 9) + pad(row.js, 8) + pad(row.total, 10))
  }
}
ws.close(); proc.kill()
const worst = rows.filter((r) => r.pass === 'cold').sort((a, b) => b.lcp - a.lcp)[0]
console.log(`\nSlowest first view: ${worst.route} (largest paint ${worst.lcp} ms)`)
process.exit(0)
