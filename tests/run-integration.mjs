// Starts a FRESH production server + fake AI/speech server, runs the HTTP and browser suites, then cleans up.
//   npm run build && npm run test:full
// Uses ports 3100 (app) and 4010 (fake AI) so it never disturbs a dev server on 3000.
import { spawn } from 'node:child_process'

const APP_PORT = 3100
const APP_URL = `http://localhost:${APP_PORT}`
const procs = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function start(cmd, args, env = {}) {
  const p = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: 'ignore', shell: false })
  procs.push(p)
  return p
}
function run(label, args, env = {}) {
  return new Promise((resolve) => {
    console.log(`\n━━━ ${label} ━━━`)
    const p = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: 'inherit' })
    p.on('exit', (code) => resolve(code ?? 1))
  })
}
async function waitFor(url, ms = 60000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).status < 500) return true
    } catch {}
    await sleep(500)
  }
  return false
}
function cleanup() {
  for (const p of procs) {
    try {
      p.kill()
    } catch {}
  }
}
process.on('SIGINT', () => (cleanup(), process.exit(130)))

start(process.execPath, ['tests/fake-llm.mjs', '4010'])
start(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(APP_PORT)], {
  CUSTOM_AI_BASE_URL: 'http://localhost:4010/v1',
  CUSTOM_AI_MODEL: 'fake-1',
  STT_BASE_URL: 'http://localhost:4010',
  ERROR_WEBHOOK_URL: 'http://localhost:4010/webhook',
  // Prayer reminders: throwaway test keys (never use these anywhere real) and the fake push service
  VAPID_PUBLIC_KEY: 'BKeQ2eSWKXBTB2kmjBJuWHaTiFl6FiDJKJhwfXSH4xwiik_SVhlGq_Qd-0ICWJM2YD8d1ZPPbEiB0qIQ4FvGfEg',
  VAPID_PRIVATE_KEY: 'lfeaVODTqLBiGuz-5_4sWYPyZselu-5n0fa2fSAc7Zk',
  VAPID_SUBJECT: 'mailto:test@example.com',
  CRON_SECRET: 'test-cron-secret-0123456789',
  ADMIN_KEY: 'test-admin-key-0123456789-abcdefghij',
  WATCHDOG_SKIP_EXTERNAL: '1',
  PUSH_ALLOW_HOSTS: 'localhost:4010',
  PUSH_ALLOW_TEST_NOW: '1',
  UPSTASH_REDIS_REST_URL: 'http://localhost:4010',
  UPSTASH_REDIS_REST_TOKEN: 'test-redis-token',
  WIKI_BASE_URL: 'http://localhost:4010',
  LECTURES_BASE_URL: 'http://localhost:4010',
  LECTURE_CHANNELS: 'Alpha Institute|UCaaaaaaaaaaaaaaaaaaaaaA, Beta Talks|UCbbbbbbbbbbbbbbbbbbbbbB, Broken Channel|UCxxxxxxxxxxxxxxxxxxxxxx, bad|notanid',
  CSP_EXTRA_HOSTS: 'http://localhost:4010',
  PEXELS_API_KEY: 'test-pexels-key',
  PEXELS_BASE_URL: 'http://localhost:4010',
})
if (!(await waitFor(APP_URL))) {
  console.error('The app did not start. Did you run `npm run build` first?')
  cleanup()
  process.exit(2)
}

const flags = ['--import', './tests/register-ts.mjs', '--experimental-strip-types', '--no-warnings']
const results = {}
results['API / AI resilience'] = await run('API & AI resilience', [...flags, 'tests/api.test.mjs'], { APP_URL })
// The API suite deliberately ends with a burst that trips the 15-requests-per-minute AI limiter. Let the window clear so the
// browser suite (same address) isn't rate-limited.
console.log('\n(waiting 62s for the AI rate-limit window to clear before the browser suite…)')
await sleep(62_000)
results['Browser (headless Edge)'] = await run('Browser end-to-end', [...flags, 'tests/e2e-chunked.mjs'], { APP_URL })

cleanup()
console.log('\n━━━ Summary ━━━')
for (const [k, v] of Object.entries(results)) console.log(`${v === 0 ? 'PASS' : 'FAIL'}  ${k}`)
process.exit(Object.values(results).some((c) => c !== 0) ? 1 : 0)
