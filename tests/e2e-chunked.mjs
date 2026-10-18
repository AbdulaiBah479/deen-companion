// Runs tests/e2e.mjs as several independent chunks, each in a fresh headless-Edge process with an empty profile.
//
// Why: one long-lived browser session occasionally stalls (observed as a page that stops answering). Splitting the suite means a
// stall can only affect one chunk, which is retried once. If a page really does freeze, the browser debugger is used to print
// the JavaScript stack it is stuck in, so a genuine app bug (e.g. an infinite render loop) is reported, not hidden.
//
// Usage (needs a running app and fake AI, see run-integration.mjs):  node --import ./tests/register-ts.mjs
//        --experimental-strip-types --no-warnings tests/e2e-chunked.mjs
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'

const SRC = fs.readFileSync(new URL('./e2e.mjs', import.meta.url), 'utf8')
const BODY_START = SRC.search(/^\/\/ -{10} Dhikr/m)
const BODY_END = SRC.indexOf("console.log('\\nJS errors captured")
if (BODY_START < 0 || BODY_END < 0) throw new Error('Could not locate the test body in tests/e2e.mjs')

let header = SRC.slice(0, BODY_START)
const body = SRC.slice(BODY_START, BODY_END)

// Debugger hook: if a browser call times out, pause the page and print where its JavaScript is stuck.
const HOOK = `
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data)
  if (d.method === 'Debugger.paused') {
    console.log('\\n=== PAGE FROZE — its JavaScript is stuck here ===')
    for (const f of d.params.callFrames.slice(0, 14)) console.log('   ', f.functionName || '(anonymous)', f.url.replace(/^.*\\/_next\\//, '_next/').slice(0, 100), 'line', f.location.lineNumber)
    console.log('=================================================\\n')
    console.log('CHUNK FROZE')
    process.exit(3)
  }
})
globalThis.__onTimeout = () => {
  ws.send(JSON.stringify({ id: 900001, method: 'Debugger.enable' }))
  setTimeout(() => ws.send(JSON.stringify({ id: 900002, method: 'Debugger.pause' })), 300)
  setTimeout(() => { console.log('CHUNK FROZE (debugger could not attach)'); process.exit(3) }, 6000)
}
`
header = header.replace("await send('Runtime.enable'); await send('Page.enable')", HOOK + "\nawait send('Runtime.enable'); await send('Page.enable')")
header = header.replace("pending.delete(i); reject(new Error('Browser call timed out", "pending.delete(i); globalThis.__onTimeout?.(); setTimeout(() => reject(new Error('Browser call timed out")
header = header.replace("JSON.stringify(params).slice(0, 120))) }, 30000)", "JSON.stringify(params).slice(0, 120))), 8000) }, 30000)")

// Split the body into sections at the "// ------ name ------" / "// ===== name =====" marker comments.
const lines = body.split('\n')
const sections = []
let cur = []
for (const line of lines) {
  if (/^\/\/ (-{10}|={20})/.test(line) && cur.length) {
    sections.push(cur.join('\n'))
    cur = []
  }
  cur.push(line)
}
if (cur.length) sections.push(cur.join('\n'))

// Group consecutive sections into chunks of roughly 28 checks each.
const countChecks = (text) => (text.match(/^t\(|\bt\('/gm) || []).length
const chunks = []
let group = []
let n = 0
for (const sec of sections) {
  group.push(sec)
  n += countChecks(sec)
  if (n >= 28) {
    chunks.push(group)
    group = []
    n = 0
  }
}
if (group.length) chunks.push(group)

const footer = `
console.log('CHUNK RESULT ' + pass + ' ' + fail + ' ' + errors.length)
if (errors.length) [...new Set(errors)].slice(0, 8).forEach((e) => console.log('  JS ERROR: ' + e))
ws.close(); proc.kill(); process.exit(fail ? 1 : 0)
`

function killEdge() {
  try {
    execSync('taskkill /F /IM msedge.exe', { stdio: 'ignore' })
  } catch {}
}

function runChunk(index, text) {
  const file = new URL(`./_chunk-${index}.mjs`, import.meta.url)
  // Each chunk starts on a real page so localStorage is available, with an empty profile.
  fs.writeFileSync(file, header + "await goto('/dashboard')\n" + text + footer)
  return new Promise((resolve) => {
    const out = []
    const p = spawn(process.execPath, ['--import', './tests/register-ts.mjs', '--experimental-strip-types', '--no-warnings', file.pathname.replace(/^\/([A-Za-z]:)/, '$1')], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const onData = (d) => {
      const s = d.toString().replace(/\r/g, '')
      process.stdout.write(s)
      out.push(s)
    }
    p.stdout.on('data', onData)
    p.stderr.on('data', onData)
    const killer = setTimeout(() => p.kill(), 12 * 60_000)
    p.on('exit', (code) => {
      clearTimeout(killer)
      const all = out.join('')
      const m = /CHUNK RESULT (\d+) (\d+) (\d+)/.exec(all)
      resolve({ finished: !!m, pass: m ? Number(m[1]) : 0, fail: m ? Number(m[2]) : 0, jsErrors: m ? Number(m[3]) : 0, froze: /CHUNK FROZE/.test(all), code, output: all })
    })
  })
}

let totalPass = 0
let totalFail = 0
let totalErrors = 0
const problems = []
console.log(`Running ${chunks.length} chunks (${sections.length} sections)`)

// E2E_CHUNKS=3,6 re-runs only those chunks (1-based) — handy for re-checking a failure.
const only = process.env.E2E_CHUNKS ? new Set(process.env.E2E_CHUNKS.split(',').map(Number)) : null

for (let i = 0; i < chunks.length; i++) {
  if (only && !only.has(i + 1)) continue
  const text = chunks[i].join('\n')
  const first = chunks[i][0].split('\n')[0].replace(/^\/\/\s*[-=]+\s*|\s*[-=]+\s*$/g, '')
  console.log(`\n━━━ chunk ${i + 1}/${chunks.length}: ${first} … (${countChecks(text)} checks) ━━━`)
  killEdge()
  let r = await runChunk(i, text)
  if (!r.finished) {
    console.log(`\n⚠ chunk ${i + 1} did not finish${r.froze ? ' (a page froze)' : ''} — retrying once with a fresh browser…`)
    killEdge()
    const stack = r.output.includes('PAGE FROZE') ? r.output.slice(r.output.indexOf('=== PAGE FROZE'), r.output.indexOf('=================================================') + 52) : ''
    r = await runChunk(i, text)
    if (!r.finished) problems.push(`chunk ${i + 1} (${first}) did not finish twice${r.froze ? ' — page froze' : ''}`)
    else if (stack) problems.push(`chunk ${i + 1} (${first}) froze once, passed on retry:\n${stack}`)
    else problems.push(`chunk ${i + 1} (${first}) stalled once, passed on retry`)
  }
  totalPass += r.pass
  totalFail += r.fail
  totalErrors += r.jsErrors
  if (r.finished && r.fail) problems.push(`chunk ${i + 1} had ${r.fail} failing check(s)`)
}
killEdge()
for (let i = 0; i < chunks.length; i++) {
  try {
    fs.unlinkSync(new URL(`./_chunk-${i}.mjs`, import.meta.url))
  } catch {}
}

console.log(`\nJS errors captured: ${totalErrors}`)
console.log(`\n${totalPass} passed, ${totalFail} failed`)
if (problems.length) {
  console.log('\nNotes:')
  problems.forEach((p) => console.log('  - ' + p))
}
const unfinished = problems.some((p) => /did not finish twice/.test(p))
if (totalErrors) console.log('\nFAILED: the browser reported ' + totalErrors + ' JavaScript error(s) (for example a hydration mismatch) — these must be zero.')
process.exit(totalFail || unfinished || totalErrors ? 1 : 0)
