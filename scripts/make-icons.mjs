// Renders public/icon.svg into the PNG icons that phones need to install the app (Android Chrome wants 192 + 512 px,
// iPhone wants a 180 px "apple-touch-icon"). Uses headless Edge, so there is nothing extra to install.   Run: npm run icons
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9666
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')

// [file, size, safe-zone scale]. Maskable icons get extra margin so round/squircle masks never cut the artwork.
const JOBS = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.7],
  ['apple-touch-icon.png', 180, 1],
]

const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + process.env.TEMP + '\\icons-profile-' + Date.now(), 'about:blank'], { stdio: 'ignore' })
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

await send('Page.enable')
for (const [file, size, scale] of JOBS) {
  await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false })
  const inner = Math.round(size * scale)
  const html = `<html><body style="margin:0;background:#0F766E;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;overflow:hidden"><img src="${dataUrl}" width="${inner}" height="${inner}"></body></html>`
  await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') })
  await sleep(700)
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } })
  writeFileSync(new URL('../public/' + file, import.meta.url), Buffer.from(shot.data, 'base64'))
  console.log('wrote public/' + file, size + 'px')
}
ws.close()
proc.kill()
process.exit(0)
