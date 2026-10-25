// Attack probe: pokes a running copy of the app the way a hostile visitor would, and reports anything that gives too much away.
// Run:  BASE=https://your-site node tests/security-probe.mjs      (or  npm run test:probe  for http://localhost:3000)
// Needs nothing secret. It only sends GET/OPTIONS and a few deliberately broken POSTs; it never deletes or changes anything.

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
let fails = 0
const ok = (name, cond, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const get = (path, init = {}) => fetch(BASE + path, { redirect: 'manual', ...init })
const LEAK = /(\bat [\w$.<>]+ \(|node_modules|\.tsx?:\d+|\/home\/|C:\\\\|stack|ECONN|SUPABASE_SERVICE|CRON_SECRET|ADMIN_KEY|VAPID_PRIVATE)/i

// ───────── headers on pages and APIs ─────────
for (const path of ['/', '/dashboard', '/admin', '/hadith', '/api/health']) {
  const r = await get(path)
  const h = r.headers
  const csp = h.get('content-security-policy') || ''
  ok(`headers ${path}: CSP forbids framing, plugins and foreign base tags`, /frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp), csp.slice(0, 60))
  ok(`headers ${path}: HTTPS is enforced, content type sniffing is off, framing is denied`, (!BASE.startsWith('https') || /max-age=\d{7,}/.test(h.get('strict-transport-security') || '')) && h.get('x-content-type-options') === 'nosniff' && /deny/i.test(h.get('x-frame-options') || ''))
  ok(`headers ${path}: nothing reveals the server software`, !h.get('x-powered-by') && !/\d+\.\d+/.test(h.get('server') || ''))
  ok(`headers ${path}: referrer and sensor access are limited`, !!h.get('referrer-policy') && /geolocation=\(self\)/.test(h.get('permissions-policy') || ''))
}

// ───────── files that must never be served ─────────
const SECRET_PATHS = ['/.env', '/.env.local', '/.env.vercel', '/.git/config', '/.git/HEAD', '/package.json', '/package-lock.json', '/next.config.ts', '/tsconfig.json', '/src/lib/ai.ts', '/src/proxy.ts', '/supabase/schema.sql', '/scripts/setup-supabase.mjs', '/tests/e2e.mjs', '/data/quran/meta.json', '/.vercel/project.json', '/LICENSE.md.bak', '/.next/server/app/index.html', '/AGENTS.md']
const exposed = []
// Hosting firewalls (Vercel) treat a burst of requests for /.env and /.git as an attack and block the sender for a while, so on a live site
// this step can be skipped with PROBE_SKIP_FILES=1 (it always runs in the local integration test).
for (const p of process.env.PROBE_SKIP_FILES ? [] : SECRET_PATHS) {
  const r = await get(p)
  const body = r.status === 200 ? (await r.text()).slice(0, 400) : ''
  if (r.status === 200 && !/<html|<!DOCTYPE/i.test(body)) exposed.push(p)
}
ok('private files are not served (env files, source, git, schema, tests, data, config)', exposed.length === 0, exposed.join(' '))
const maps = await get('/_next/static/chunks/main.js.map')
ok('source maps are not public', maps.status !== 200)

// ───────── other sites must not be able to read the API ─────────
const evil = 'https://evil.example'
const cors = await get('/api/causes', { headers: { Origin: evil } })
ok('cross-site pages cannot read the API (no permissive CORS header)', !cors.headers.get('access-control-allow-origin') || cors.headers.get('access-control-allow-origin') !== '*' && cors.headers.get('access-control-allow-origin') !== evil)
const pre = await get('/api/ai', { method: 'OPTIONS', headers: { Origin: evil, 'Access-Control-Request-Method': 'POST' } })
ok('a cross-site pre-flight to the AI is not approved', !(pre.headers.get('access-control-allow-origin') === '*' || pre.headers.get('access-control-allow-origin') === evil))

// ───────── closed doors: the owner's tools and the scheduler ─────────
const closed = [
  ['GET', '/api/admin/overview'], ['GET', '/api/admin/users'], ['GET', '/api/admin/reports'], ['GET', '/api/admin/causes'],
  ['POST', '/api/admin/action'], ['POST', '/api/admin/alerts'], ['POST', '/api/admin/causes'], ['POST', '/api/admin/reports'],
  ['DELETE', '/api/admin/users?id=00000000-0000-0000-0000-000000000000'], ['DELETE', '/api/admin/reports?id=0123456789'], ['DELETE', '/api/admin/causes?id=gaza-relief'],
  ['POST', '/api/cron/watchdog'], ['POST', '/api/push/dispatch'],
]
const wrong = []
for (const [method, path] of closed) {
  const r = await get(path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined })
  if (r.status !== 401 && r.status !== 405) wrong.push(`${method} ${path} → ${r.status}`)
}
ok('every owner and scheduler endpoint refuses callers without credentials', wrong.length === 0, wrong.join(' | '))
const bad = await get('/api/admin/overview', { headers: { Cookie: 'deen_admin=9999999999.AAAA' } })
ok('a forged admin cookie is refused', bad.status === 401)
const wrongCron = await get('/api/cron/watchdog', { method: 'POST', headers: { Authorization: 'Bearer wrongwrongwrongwrong' } })
ok('a wrong scheduler secret is refused', wrongCron.status === 401)

// ───────── broken input must not reveal how the server works ─────────
const probes = [
  ['POST', '/api/ai', '{bad json'], ['POST', '/api/ai', JSON.stringify({ message: 'x'.repeat(50_000) })], ['POST', '/api/report', '[]'], ['POST', '/api/report', '{"category":"bug"}'],
  ['POST', '/api/push/subscribe', '{"subscription":{"endpoint":"http://169.254.169.254/latest/meta-data"}}'], ['POST', '/api/push/test', '{"endpoint":"https://evil.example/x"}'],
  ['POST', '/api/client-error', 'not json'], ['POST', '/api/account/delete', ''], ['GET', '/api/quran/passage?surah=abc'], ['GET', '/api/hadith/section?book=../../etc/passwd&n=1'],
  ['GET', '/api/hadith?book=bukhari&number=-1'], ['GET', '/api/mosques?lat=abc&lng=1'], ['GET', '/api/prayer?city=%00&country=%00'], ['GET', '/api/search?q=' + 'a'.repeat(5000)],
]
const leaky = []
const serverErrors = []
for (const [method, path, body] of probes) {
  const r = await get(path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? body : undefined })
  const text = (await r.text()).slice(0, 3000)
  if (r.status >= 500 && r.status !== 503 && r.status !== 502) serverErrors.push(`${method} ${path.slice(0, 40)} → ${r.status}`)
  if (LEAK.test(text)) leaky.push(`${method} ${path.slice(0, 40)}`)
}
ok('broken or hostile input never causes a crash (5xx)', serverErrors.length === 0, serverErrors.join(' | '))
ok('error messages never leak file paths, stack traces or secret names', leaky.length === 0, leaky.join(' | '))
const ssrf = await get('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: { endpoint: 'http://169.254.169.254/x', keys: { p256dh: 'a', auth: 'b' } }, lat: 1, lng: 1, tz: 'UTC', method: 2, prayers: ['fajr'], leadMin: 0 }) })
ok('the server cannot be tricked into calling internal addresses (SSRF via push address)', ssrf.status === 400 || ssrf.status === 429 || ssrf.status === 503)

// ───────── pages that handle personal or private material ─────────
const adminApi = await get('/api/admin/overview')
ok('private API replies are never cacheable', /no-store/.test(adminApi.headers.get('cache-control') || '') || adminApi.status === 401)
const sw = await (await get('/sw.js')).text()
ok('the offline cache never keeps private pages (admin, scheduler, reports, reminders, AI)', sw.includes('PRIVATE(url.pathname)') && sw.includes('(admin|cron|push|report|ai)'))
const robots = await (await get('/robots.txt')).text()
ok('search engines are told to stay out of /api and /admin', /Disallow: \/api\//.test(robots) && /Disallow: \/admin/.test(robots))
const admin = await (await get('/admin')).text()
ok('the control-room page itself contains no data or secrets (it is just a sign-in box)', !LEAK.test(admin) && !/@[a-z0-9-]+\.[a-z]{2,}/i.test(admin.replace(/<script[\s\S]*?<\/script>/g, '').replace(/mailto:[^"]*/g, '')))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
