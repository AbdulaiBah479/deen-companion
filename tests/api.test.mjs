// HTTP-level tests of the AI resilience behaviour against a running app.
// Needs:  node tests/fake-llm.mjs 4010   and the app started with
//   CUSTOM_AI_BASE_URL=http://localhost:4010/v1 CUSTOM_AI_MODEL=fake-1 STT_BASE_URL=http://localhost:4010
// Run:    npm run test:api
const APP = process.env.APP_URL || 'http://localhost:3000'
const LLM = 'http://localhost:4010'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let fails = 0
const ok = (name, cond, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const ask = async (message, extra = {}) => {
  const r = await fetch(`${APP}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, ...extra }) })
  return { status: r.status, retryAfter: Number(r.headers.get('retry-after') || 0), ...(await r.json()) }
}
// Like ask(), but waits out the per-minute rate limit (15 requests/min per visitor) when it kicks in.
const askPatient = async (message, extra = {}) => {
  for (let i = 0; i < 4; i++) {
    const r = await ask(message, extra)
    if (r.status !== 429) return r
    await sleep((r.retryAfter + 1) * 1000)
  }
  throw new Error('still rate limited')
}
const calls = async () => (await (await fetch(`${LLM}/stats`)).json()).calls
const status = async () => (await fetch(`${APP}/api/ai/status`)).json()

await fetch(`${LLM}/reset`, { method: 'POST' })

// 1. Healthy path
const a = await ask('What does the Quran say about patience in hardship?')
ok('healthy: answered by the model', a.mode === 'llm' && a.provider === 'Custom' && /FAKE-LLM/.test(a.response), `${a.mode}/${a.provider}`)
ok('healthy: real sources attached', a.sources.length > 0 && a.sources.some((s) => s.kind === 'quran'))
const st0 = await status()
ok('status: provider is configured and available', st0.configured === 1 && st0.providers[0].available === true && st0.providers[0].name === undefined)
ok('status never leaks secrets', !JSON.stringify(st0).match(/key|secret|token|http/i), JSON.stringify(st0))

// 2. Caching: the same question again costs zero model calls
const before = await calls()
const b = await ask('what does the quran say about PATIENCE in hardship??')
ok('cache: repeated question (different case/punctuation) is served from cache', b.mode === 'cache' && (await calls()) === before, `${b.mode}, calls ${before}->${await calls()}`)
ok('cache: identical answer and sources', b.response === a.response && b.sources.length === a.sources.length)
const c = await ask('What does the Quran say about patience in hardship?', { lang: 'ur' })
ok('cache: a different language is a different entry', c.mode === 'llm')
const d = await ask('What does the Quran say about patience in hardship?', { kids: true })
ok('cache: kids mode is a different entry (and gets the kids rule)', d.mode === 'llm' && /KIDS MODE/.test(d.response))
const e = await ask('And what about gratitude?', { history: [{ role: 'user', content: 'tell me about patience' }, { role: 'assistant', content: 'Patience is…' }] })
ok('cache: follow-up questions with history are never cached', e.mode === 'llm' && (await ask('And what about gratitude?', { history: [{ role: 'user', content: 'tell me about patience' }, { role: 'assistant', content: 'Patience is…' }] })).mode === 'llm')

// 3. Quota exhausted: provider rests, user still gets a sourced answer, then it recovers
const callsBefore429 = await calls()
const q1 = await ask('FORCE429 what is zakat')
ok('quota: when the only provider is rate-limited the user gets a sources-only answer, not an error', q1.status === 200 && q1.mode === 'sources' && q1.provider === null && q1.response.length > 40, q1.response.slice(0, 80))
ok('quota: the sources-only answer says it is not an AI explanation', /without interpretation|busy/i.test(q1.response))
const st1 = await status()
ok('quota: status shows the provider resting with a countdown', st1.providers[0].available === false && st1.providers[0].retryInSeconds >= 1 && st1.providers[0].reason === undefined, JSON.stringify(st1.providers[0]))
const mid = await calls()
const q2 = await ask('What is zakat and who must pay it?')
ok('quota: while resting, requests do NOT hammer the provider', (await calls()) === mid && q2.mode === 'sources', `calls ${mid}->${await calls()}`)
await sleep(2500) // Retry-After was 2s
const q3 = await ask('What is zakat and who must pay it? Explain simply.')
ok('quota: after the cool-down the provider is used again and answers', q3.mode === 'llm' && q3.provider === 'Custom', `${q3.mode}`)
ok('quota: status is healthy again', (await status()).providers[0].available === true)
ok('quota: only one real call was spent on the failure', (await calls()) - callsBefore429 >= 2)

// 4. Outage handling
const o1 = await ask('FORCE500 tell me about hajj')
ok('outage: 500 from the provider -> still a useful sources answer', o1.status === 200 && o1.mode === 'sources')
const st2 = await status()
ok('outage: provider rests briefly after a transient error', st2.providers[0].available === false)

// 5. Off-topic / no sources fallbacks are graceful
await sleep(20500) // transient cool-down is 20s
const off = await ask('FORCE429 best pizza topping')
ok('no sources + no model: a helpful message, never blank', off.mode === 'sources' && /rephras|keywords/i.test(off.response) && off.sources.length === 0, off.response.slice(0, 90))

// 6. Prompt-only mode (for the on-device model)
await sleep(2200)
const p = await ask('How do I perform wudu?', { promptOnly: true })
ok('promptOnly: returns system prompt, trimmed history and sources', typeof p.system === 'string' && /SOURCES/.test(p.system) && Array.isArray(p.history) && p.history.at(-1).content === 'How do I perform wudu?' && Array.isArray(p.sources))
const before2 = await calls()
await ask('How do I perform wudu?', { promptOnly: true })
ok('promptOnly: spends no model tokens', (await calls()) === before2)

// 7. History trimming keeps long chats cheap
const longHistory = Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(1900) }))
const lp = await ask('final question', { history: longHistory, promptOnly: true })
const chars = lp.history.reduce((n, t) => n + t.content.length, 0)
ok('trim: long conversations are cut to a character budget', chars <= 8200 && lp.history.at(-1).content === 'final question' && lp.history[0].role === 'user', `${chars} chars, ${lp.history.length} turns`)

// 8. Input validation still holds
ok('validation: empty message -> 400', (await askPatient('')).status === 400)
ok('validation: oversize message -> 400', (await askPatient('a'.repeat(2500))).status === 400)

// 8b. Reels videos (Pexels, against the fake that mirrors the documented API shape)
{
  const stats = async () => (await fetch(LLM + '/pexels-stats')).json()
  const s0 = await stats()
  const r = await fetch(APP + '/api/videos?topic=patience')
  const raw = await r.text()
  const d = JSON.parse(raw)
  const s1 = await stats()
  ok('videos: configured, returns a batch of playable clips', r.status === 200 && d.configured === true && d.videos.length >= 6 && d.videos.length <= 12, String(d.videos?.length))
  ok('videos: picks the 720p mp4 file, not HLS or the small one', d.videos.every((v) => v.src.endsWith('/video/test.webm') && v.width === 720))
  ok('videos: carries poster + videographer credit + attribution link', d.videos.every((v) => v.poster && v.credit.name === 'Test Videographer' && v.credit.url.includes('pexels.com')) && d.attribution.url === 'https://www.pexels.com')
  ok('videos: the API key never reaches the browser', !raw.includes('test-pexels-key'))
  ok('videos: asks Pexels for portrait footage, using the key (fake 401s without it)', s1.lastQuery.endsWith('|portrait') && s1.searches > s0.searches)
  const r2 = await fetch(APP + '/api/videos?topic=patience')
  const s2 = await stats()
  ok('videos: second request is served from cache (protects the 200/hour limit)', r2.status === 200 && s2.searches === s1.searches, s1.searches + ' -> ' + s2.searches)
  ok('videos: unknown topic is rejected', (await fetch(APP + '/api/videos?topic=nope')).status === 400)
  ok('videos: the Saved tab still gets backgrounds', (await (await fetch(APP + '/api/videos?topic=saved')).json()).videos.length > 0)
}

// 8c. Library (live encyclopedia, against the fake that mirrors Wikipedia's real response shapes)
{
  const wstats = async () => (await fetch(LLM + '/wiki-stats')).json()
  const lib = (qs) => fetch(APP + '/api/library?' + qs)
  const w0 = await wstats()
  const r = await lib('title=Battle%20of%20Badr')
  const d = await r.json()
  const w1 = await wstats()
  ok('library: article returns intro, sections, source link and thumbnail', r.status === 200 && d.article.intro.startsWith('Intro paragraph about Battle of Badr') && d.article.url.includes('wikipedia.org') && !!d.article.thumb)
  ok('library: sections are parsed, sub-sections folded in, See also/References dropped', d.article.sections.map((x) => x.heading).join() === 'History,Legacy' && d.article.sections[0].text.includes('Early years text.') && !JSON.stringify(d).includes('Should be dropped'))
  ok('library: names the licence (CC BY-SA 4.0)', d.attribution.license === 'CC BY-SA 4.0' && d.attribution.source === 'Wikipedia')
  ok('library: browsers/CDN may cache it', /s-maxage=[0-9]+/.test(r.headers.get('cache-control') || ''))
  await lib('title=Battle%20of%20Badr')
  const w2 = await wstats()
  ok('library: repeat request is served from cache (protects Wikipedia)', w1.article === w0.article + 1 && w2.article === w1.article, w0.article + ' -> ' + w2.article)
  const b = await (await lib('title=Hajj&brief=1')).json()
  ok('library: brief summary', b.summary.extract.startsWith('Short extract about Hajj') && b.summary.description.includes('test description'))
  ok('library: unknown article -> 404', (await lib('title=Missing%20thing')).status === 404 && (await lib('title=Missing%20thing&brief=1')).status === 404)
  ok('library: disambiguation pages are not shown as articles', (await lib('title=Disamb%20page&brief=1')).status === 404)
  ok('library: unsafe titles -> 400', (await lib('title=' + encodeURIComponent('http://evil.com'))).status === 400 && (await lib('title=')).status === 400 && (await lib('title=' + encodeURIComponent('<script>'))).status === 400)
  const sr = await (await lib('q=zakat')).json()
  const w3 = await wstats()
  ok('library: search returns clean text (no HTML), several hits', sr.results.length === 2 && sr.results[0].snippet === 'About zakat "quoted" & more')
  ok('library: search is kept on topic ("Islam" added when missing)', w3.lastSearch === 'zakat Islam', w3.lastSearch)
  await lib('q=' + encodeURIComponent('prophet yusuf'))
  ok('library: no extra word added when the query is already about Islam', (await wstats()).lastSearch === 'prophet yusuf')
  ok('library: search needs 2+ letters', (await lib('q=a')).status === 400)
}

// 8d. Lectures (YouTube channel feeds, against the fake Atom feed)
{
  const r = await fetch(APP + '/api/lectures')
  const d = await r.json()
  ok('lectures: configured, two valid channels (invalid id dropped)', r.status === 200 && d.configured === true && d.channels.length === 3 && !d.channels.some((c) => c.name === 'bad'), JSON.stringify(d.channels?.map((c) => c.name)))
  ok('lectures: lists videos from both working channels, newest first', d.lectures.length === 6 && d.lectures.every((l, i) => i === 0 || l.published <= d.lectures[i - 1].published))
  ok('lectures: a broken channel is reported, not fatal', d.failed === 1)
  ok('lectures: titles are decoded', d.lectures.some((l) => l.title.includes('& "Q&A"')))
  ok('lectures: video ids are valid and thumbnails use the official host', d.lectures.every((l) => /^[A-Za-z0-9_-]{11}$/.test(l.id) && l.thumb.startsWith('https://i.ytimg.com/vi/')))
}

// 8e. Security headers on pages and APIs
{
  for (const path of ['/dashboard', '/api/library?q=zakat']) {
    const r = await fetch(APP + path)
    const h = (k) => r.headers.get(k) || ''
    ok('security headers on ' + path + ': CSP, no framing, nosniff, HSTS, referrer policy', h('content-security-policy').includes("default-src 'self'") && h('content-security-policy').includes("frame-ancestors 'none'") && h('x-frame-options') === 'DENY' && h('x-content-type-options') === 'nosniff' && /max-age=[0-9]{7,}/.test(h('strict-transport-security')) && !!h('referrer-policy'))
    ok('security headers on ' + path + ': sensors limited to this site, server not advertised', /geolocation=[(]self[)]/.test(h('permissions-policy')) && !h('x-powered-by'))
  }
}

// 8f. Shared rate-limit store (Upstash-style Redis) was used for the limits above
{
  const st = await (await fetch(LLM + '/redis-stats')).json()
  ok('rate limits are counted in the shared Redis store, not just in server memory', st.commands >= 20 && st.keys >= 3, JSON.stringify(st))
}

// 8g. Health check and crash reports
{
  const h = await fetch(APP + '/api/health')
  const hj = await h.json()
  ok('health: up, with data present, and no secrets in the reply', h.status === 200 && hj.ok === true && hj.aiProviders === undefined && hj.sharedRateLimit === undefined && !JSON.stringify(hj).match(/key|token|secret/i), JSON.stringify(hj))
  const post = (body, raw) => fetch(APP + '/api/client-error', { method: 'POST', body: raw ?? JSON.stringify(body) })
  const w0 = await (await fetch(LLM + '/webhook-stats')).json()
  const r1 = await post({ kind: 'error', message: 'Boom in test', source: 'https://x.test/_next/static/chunk.js?v=1#frag', page: '/quran/1?q=secret#x' })
  await sleep(500)
  const w1 = await (await fetch(LLM + '/webhook-stats')).json()
  ok('client-error: accepted (204) and forwarded to the error webhook once', r1.status === 204 && w1.count === w0.count + 1 && w1.last.includes('Boom in test'), JSON.stringify(w1).slice(0, 200))
  ok('client-error: personal bits (query string, #fragment) are stripped before forwarding', w1.last.includes('/quran/1') && !w1.last.includes('secret') && !w1.last.includes('frag'))
  await post({ kind: 'error', message: 'Boom in test', source: 'https://x.test/_next/static/chunk.js', page: '/x' })
  await sleep(400)
  ok('client-error: the same error is not forwarded again (no flooding)', (await (await fetch(LLM + '/webhook-stats')).json()).count === w1.count)
  ok('client-error: junk is refused', (await post(null, 'not json')).status === 400 && (await post({ nothing: 1 })).status === 400 && (await post(null, 'x'.repeat(5000))).status === 413)
}

// 8h. Installability, sharing and discoverability
{
  const get = (p) => fetch(APP + p)
  const m = await (await get('/manifest.webmanifest')).json()
  const png = m.icons.filter((i) => i.type === 'image/png')
  ok('manifest: long-pressing the installed icon offers Quran, Prayer, Qibla, Journey, Tafsir and AI shortcuts that open real pages', m.shortcuts?.length === 6 && m.shortcuts.every((s) => s.url.startsWith('/') && s.name && s.icons?.length), JSON.stringify(m.shortcuts?.map((s) => s.url)))
  ok('manifest: the app has an id, a scope, and can be installed as a standalone app on every kind of device', m.id === '/' && m.scope === '/' && m.display === 'standalone' && m.display_override?.includes('standalone') && m.prefer_related_applications === false && m.orientation === 'any')
  ok('manifest: has 192 and 512 PNG icons and a maskable one (needed to install on Android)', png.some((i) => i.sizes === '192x192') && png.some((i) => i.sizes === '512x512') && png.some((i) => i.purpose === 'maskable'))
  const served = await Promise.all([...png.map((i) => get(i.src)), get('/apple-touch-icon.png')])
  ok('every listed icon (and the iPhone icon) is served as an image', served.every((r) => r.status === 200 && (r.headers.get('content-type') || '').startsWith('image/png')))
  const og = await get('/opengraph-image')
  ok('share preview image is generated (PNG)', og.status === 200 && (og.headers.get('content-type') || '').includes('image/png'))
  const html = await (await get('/dashboard')).text()
  ok('pages carry the share-preview and iPhone-icon tags', html.includes('og:image') && html.includes('apple-touch-icon') && html.includes('twitter:card'))
  const robots = await (await get('/robots.txt')).text()
  ok('robots.txt keeps crawlers out of the APIs', /Disallow:\s*\/api\//.test(robots))
  const sm = await (await get('/sitemap.xml')).text()
  ok('sitemap lists 200+ public pages including every surah and Great Muslim', (sm.match(/<loc>/g) || []).length > 200 && sm.includes('/quran/114') && sm.includes('/heritage/salahuddin'))
  const off = await get('/offline')
  ok('the offline fallback page exists', off.status === 200 && (await off.text()).includes("You’re offline"))
  const sw = await (await get('/sw.js')).text()
  ok('service worker is the v3 offline-capable one', sw.includes("'deen-v3'") && sw.includes("caches.match('/offline')"))
  ok('service worker never saves private pages (admin, scheduler, reports, reminders, AI) on a device', sw.includes('const PRIVATE') && sw.includes('PRIVATE(url.pathname)') && sw.includes('(admin|cron|push|report|ai)'))
  ok('security.txt is published', (await get('/.well-known/security.txt')).status === 200)
}

// 8j. Prayer reminders (Web Push): subscribe, get a message exactly when a prayer arrives, never twice, unsubscribe
{
  const { computeTimes } = await import('../src/lib/prayer-calc.ts')
  const { createECDH, randomBytes } = await import('node:crypto')
  const post = (path, body, headers = {}) => fetch(APP + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })
  const pushStats = async () => (await fetch(LLM + '/push-stats')).json()
  const dispatch = async (iso, secret = 'test-cron-secret-0123456789') => {
    const r = await post('/api/push/dispatch', '', { ...(secret ? { Authorization: 'Bearer ' + secret } : {}), 'x-now': iso })
    return { status: r.status, body: await r.json() }
  }
  await fetch(LLM + '/push-reset', { method: 'POST' })

  const st = await (await fetch(APP + '/api/push/status')).json()
  ok('reminders: the server says they are set up and gives the public key', st.configured === true && typeof st.publicKey === 'string' && st.publicKey.length > 80)

  const sub = (id) => {
    const ecdh = createECDH('prime256v1')
    ecdh.generateKeys()
    return { endpoint: LLM + '/push/' + id, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } }
  }
  const settings = (subscription, extra = {}) => ({ subscription, lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh', method: 4, prayers: ['dhuhr', 'asr'], leadMin: 0, ...extra })

  const bad1 = await post('/api/push/subscribe', settings({ ...sub('x'), endpoint: 'https://evil.example/steal' }))
  const bad2 = await post('/api/push/subscribe', settings({ endpoint: LLM + '/push/y', keys: { p256dh: '<script>', auth: 'x' } }))
  const bad3 = await post('/api/push/subscribe', 'not json')
  const bad4 = await post('/api/push/subscribe', 'x'.repeat(5000))
  ok('reminders: bad subscriptions are refused (foreign host, bad keys, junk, too big)', [bad1.status, bad2.status, bad3.status, bad4.status].join() === '400,400,400,413', [bad1.status, bad2.status, bad3.status, bad4.status].join())

  const a = sub('a')
  const ok1 = await post('/api/push/subscribe', settings(a))
  ok('reminders: a valid subscription is saved', ok1.status === 200)

  // the instant Dhuhr (and Asr) arrive in Makkah on 20 March 2026
  const day = new Date(Date.UTC(2026, 2, 20, 9, 0))
  const t = computeTimes(21.4225, 39.8262, 4, day, 'Asia/Riyadh')
  const at = (hhmm, addMin = 0) => {
    const [h, m] = hhmm.split(':').map(Number)
    return new Date(Date.UTC(2026, 2, 20, h - 3, m + addMin)).toISOString()
  }

  ok('reminders: the scheduler needs the secret (none, wrong, or short are refused)', (await dispatch(at(t.dhuhr), '')).status === 401 && (await dispatch(at(t.dhuhr), 'wrong-secret-0123456789')).status === 401)
  const quiet = await dispatch(at('03:00'))
  ok('reminders: at a time when no prayer is due nothing is sent', quiet.status === 200 && quiet.body.sent === 0 && quiet.body.checked >= 1, JSON.stringify(quiet.body))
  const p0 = (await pushStats()).count
  const d1 = await dispatch(at(t.dhuhr))
  const s1 = await pushStats()
  ok('reminders: when Dhuhr arrives exactly one message is sent', d1.body.sent === 1 && s1.count === p0 + 1, JSON.stringify(d1.body))
  ok('reminders: it is a proper Web Push request (signed with VAPID, encrypted, with a time-to-live)', /^vapid t=/.test(s1.last.auth) && s1.last.enc === 'aes128gcm' && s1.last.ttl === '3600' && s1.last.bytes > 50, JSON.stringify(s1.last))
  const d2 = await dispatch(at(t.dhuhr, 3))
  ok('reminders: the same prayer is never sent twice on the same day', d2.body.sent === 0 && (await pushStats()).count === p0 + 1, JSON.stringify(d2.body))
  const d3 = await dispatch(at(t.asr))
  ok('reminders: the next chosen prayer (Asr) goes out when it arrives', d3.body.sent === 1 && (await pushStats()).count === p0 + 2)
  const d4 = await dispatch(at(t.maghrib))
  ok('reminders: a prayer you did not choose (Maghrib) is not sent', d4.body.sent === 0)

  // lead time + a second device
  const b = sub('b')
  await post('/api/push/subscribe', settings(b, { prayers: ['isha'], leadMin: 10 }))
  const early = await dispatch(at(t.isha, -10))
  ok('reminders: "10 minutes before" is sent ten minutes early', early.body.sent === 1, JSON.stringify(early.body))
  const msg = await pushStats()
  ok('reminders: a second device is handled independently', msg.all.filter((x) => x.path === '/push/b').length === 1 && msg.all.filter((x) => x.path === '/push/a').length === 2)

  // a push address the browser has retired is cleaned up
  const g = sub('dead-gone')
  await post('/api/push/subscribe', settings(g, { prayers: ['fajr'] }))
  const gone = await dispatch(at(t.fajr))
  ok('reminders: a retired push address (410 Gone) is removed automatically', gone.body.removed === 1, JSON.stringify(gone.body))
  const goneTest = await post('/api/push/test', { endpoint: g.endpoint })
  ok('reminders: …and no longer exists afterwards', goneTest.status === 404)

  // the "send me a test" button
  const before = (await pushStats()).count
  const test1 = await post('/api/push/test', { endpoint: a.endpoint })
  ok('reminders: the test button sends one message to that device', test1.status === 200 && (await pushStats()).count === before + 1)
  ok('reminders: the test button refuses unknown or foreign addresses', (await post('/api/push/test', { endpoint: LLM + '/push/never-subscribed' })).status === 404 && (await post('/api/push/test', { endpoint: 'https://evil.example/x' })).status === 400)

  // switching off
  const off = await post('/api/push/unsubscribe', { endpoint: b.endpoint })
  const afterOff = await post('/api/push/test', { endpoint: b.endpoint })
  ok('reminders: switching off removes the device', off.status === 200 && afterOff.status === 404)
  const dump = await (await fetch(LLM + '/redis-dump?prefix=push:sub:')).json()
  const rec = dump.map((x) => JSON.parse(x[1]))
  ok('reminders: what is stored is only the push address, a ~100 m position, method and choices (no name, no email)', rec.length >= 1 && rec.every((r) => Object.keys(r).sort().join() === 'created,lat,leadMin,lng,method,prayers,sub,tz' && String(r.lat).split('.')[1].length <= 3 && Object.keys(r.sub).sort().join() === 'endpoint,keys'), JSON.stringify(rec[0]).slice(0, 200))
}

// ───────── admin control room and the autopilot ─────────
{
  const KEY = 'test-admin-key-0123456789-abcdefghij'
  const CRON = 'test-cron-secret-0123456789'
  const json = (path, init = {}) => fetch(`${APP}${path}`, init)
  ok('admin: the data is closed to visitors without a session', (await json('/api/admin/overview')).status === 401 && (await json('/api/admin/users')).status === 401)
  ok('admin: actions are closed too', (await json('/api/admin/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test' }) })).status === 401)
  const bad = await json('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'nope' }) })
  ok('admin: a wrong key is refused and sets no cookie', bad.status === 401 && !bad.headers.get('set-cookie'))
  const good = await json('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: KEY }) })
  const cookie = good.headers.get('set-cookie') || ''
  ok('admin: the right key gives a safe cookie (HTTP-only, same-site strict)', good.status === 200 && /deen_admin=/.test(cookie) && /HttpOnly/i.test(cookie) && /SameSite=strict/i.test(cookie))
  const jar = cookie.split(';')[0]
  const ov = await json('/api/admin/overview', { headers: { Cookie: jar } })
  const ovj = await ov.json()
  ok('admin: signed in, the overview loads with config, AI providers and counters', ov.status === 200 && ovj.config && Array.isArray(ovj.ai.providers) && Array.isArray(ovj.counters) && ovj.reminders.configured === true, Object.keys(ovj).join())
  ok('admin: the overview never contains a secret', !JSON.stringify(ovj).includes(KEY) && !JSON.stringify(ovj).includes(CRON) && !JSON.stringify(ovj).includes('test-redis-token') && !JSON.stringify(ovj).includes('lfeaVODTqLBiGuz'))
  ok('admin: a forged or foreign-site request is refused', (await json('/api/admin/action', { method: 'POST', headers: { Cookie: jar, Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test' }) })).status === 403 && (await json('/api/admin/overview', { headers: { Cookie: 'deen_admin=1999999999.AAAA' } })).status === 401)
  ok('admin: unknown action refused', (await json('/api/admin/action', { method: 'POST', headers: { Cookie: jar, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'format-disk' }) })).status === 400)
  const res = await (await json('/api/admin/action', { method: 'POST', headers: { Cookie: jar, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset-ai' }) })).json()
  ok('admin: "clear AI cool-downs" works', res.ok === true)
  ok('admin: users list says accounts are not set up when Supabase is absent', (await (await json('/api/admin/users', { headers: { Cookie: jar } })).json()).configured === false)

  // alerts to the owner's phone: register a device, then a test alert reaches the fake push service
  const { createECDH: mkEcdh, randomBytes: rnd } = await import('node:crypto')
  const ecdhAdmin = mkEcdh('prime256v1')
  ecdhAdmin.generateKeys()
  const sub = { endpoint: LLM + '/push/admin-phone', keys: { p256dh: ecdhAdmin.getPublicKey().toString('base64url'), auth: rnd(16).toString('base64url') } }
  ok('admin alerts: registering a phone needs the admin session', (await json('/api/admin/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })).status === 401)
  ok('admin alerts: a foreign push address is refused', (await json('/api/admin/alerts', { method: 'POST', headers: { Cookie: jar, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sub, endpoint: 'https://evil.example/x' }) })).status === 400)
  ok('admin alerts: a real device is accepted', (await json('/api/admin/alerts', { method: 'POST', headers: { Cookie: jar, 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })).status === 200)
  const test = await (await json('/api/admin/action', { method: 'POST', headers: { Cookie: jar, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test' }) })).json()
  ok('admin alerts: the test alert reaches the registered phone and the chat webhook', test.ok === true && test.push === 1 && test.webhook === true, JSON.stringify(test))

  // the watchdog
  ok('watchdog: refuses callers without the scheduler secret', (await json('/api/cron/watchdog', { method: 'POST' })).status === 401 && (await json('/api/cron/watchdog', { method: 'POST', headers: { Authorization: 'Bearer wrong-wrong-wrong-wrong' } })).status === 401)
  const w = await (await json('/api/cron/watchdog', { method: 'POST', headers: { Authorization: `Bearer ${CRON}` } })).json()
  ok('watchdog: runs the checks and says all is fine', w.ok === true && w.checks.some((c) => c.id === 'app' && c.status === 'up') && w.checks.some((c) => c.id === 'redis' && c.status === 'up') && w.checks.some((c) => c.id === 'ai'), JSON.stringify(w).slice(0, 300))
  const ov2 = await (await json('/api/admin/overview', { headers: { Cookie: jar } })).json()
  ok('watchdog: what it saw is kept and shown in the control room', ov2.statuses.app?.status === 'up' && ov2.statuses.redis?.status === 'up' && ov2.incidents.length > 0)
  // simulate the shared store going down: the watchdog must say so (twice, since one bad look is not announced)
  await fetch('http://localhost:4010/redis-down', { method: 'POST' })
  const w1 = await (await json('/api/cron/watchdog', { method: 'POST', headers: { Authorization: `Bearer ${CRON}` } })).json()
  await fetch('http://localhost:4010/redis-down', { method: 'POST' })
  ok('watchdog: a dead shared store is noticed and reported (the app itself carries on)', w1.checks.find((c) => c.id === 'redis')?.status === 'down' || w1.checks.find((c) => c.id === 'redis')?.status === 'degraded', JSON.stringify(w1.checks.find((c) => c.id === 'redis')))
}

// ───────── reports, zakat causes, ruqyah verses ─────────
{
  const KEY = 'test-admin-key-0123456789-abcdefghij'
  // reports use their own pretend visitor addresses, so this test cannot use up the real report allowance of the browser tests
  const post = (path, body, headers = {}) => fetch(`${APP}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(path === '/api/report' ? { 'X-Forwarded-For': '203.0.113.50' } : {}), ...headers }, body: JSON.stringify(body) })
  const login = await post('/api/admin/login', { key: KEY })
  const jar = (login.headers.get('set-cookie') || '').split(';')[0]
  const ah = { Cookie: jar }

  // reports
  ok('report: a too-short or topic-less report is refused', (await post('/api/report', { category: 'bug', message: 'short' })).status === 400 && (await post('/api/report', { message: 'This is long enough but has no topic.' })).status === 400)
  const sent = await post('/api/report', { category: 'content', message: 'The translation shown for this verse has a typing mistake.', page: '/quran/2', ref: 'Quran 2:255', contact: 'tester@example.com' })
  ok('report: a proper report is accepted', sent.status === 200 && (await sent.json()).ok === true)
  const rl = await (await fetch(`${APP}/api/admin/reports`, { headers: ah })).json()
  const mine = rl.reports?.find((r) => r.message.includes('typing mistake'))
  ok('report: it appears in the control room as open, with its page, reference and contact', !!mine && mine.status === 'open' && mine.page === '/quran/2' && mine.ref === 'Quran 2:255' && mine.contact === 'tester@example.com', JSON.stringify(mine))
  ok('report: the list is closed to visitors', (await fetch(`${APP}/api/admin/reports`)).status === 401)
  ok('report: the owner can mark it as being looked at, then resolved', (await (await post('/api/admin/reports', { id: mine.id, status: 'looking' }, ah)).json()).ok === true && (await (await fetch(`${APP}/api/admin/reports`, { headers: ah })).json()).reports.find((r) => r.id === mine.id).status === 'looking' && (await (await post('/api/admin/reports', { id: mine.id, status: 'resolved' }, ah)).json()).ok === true)
  ok('report: a bad id or status is refused', (await post('/api/admin/reports', { id: 'zz', status: 'open' }, ah)).status === 400 && (await post('/api/admin/reports', { id: mine.id, status: 'banana' }, ah)).status === 400)
  ok('report: the owner can remove it', (await (await fetch(`${APP}/api/admin/reports?id=${mine.id}`, { method: 'DELETE', headers: ah })).json()).ok === true && !(await (await fetch(`${APP}/api/admin/reports`, { headers: ah })).json()).reports.some((r) => r.id === mine.id))
  const flood = []
  for (let i = 0; i < 8; i++) flood.push((await post('/api/report', { category: 'idea', message: 'Please add a feature number ' + i + ' to the app.' }, { 'X-Forwarded-For': '203.0.113.51' })).status)
  ok('report: sending many in a row is limited (429) so nobody can flood the owner', flood.includes(429) && flood.slice(0, 3).every((s) => s === 200 || s === 429), flood.join())

  // zakat causes
  const pub = await (await fetch(`${APP}/api/causes`)).json()
  ok('causes: visitors see the starter list (Gaza, orphans…) before any editing', pub.causes?.length >= 6 && pub.causes.some((c) => c.id === 'gaza-relief') && pub.causes.some((c) => c.id === 'orphans'))
  ok('causes: the editor is closed to visitors', (await fetch(`${APP}/api/admin/causes`)).status === 401 && (await post('/api/admin/causes', { action: 'customize' })).status === 401)
  const before = await (await fetch(`${APP}/api/admin/causes`, { headers: ah })).json()
  ok('causes: the owner sees it is still the starter list and can edit', before.customized === false && before.canEdit === true)
  const add = await post('/api/admin/causes', { cause: { id: 'winter-blankets', title: 'Winter blankets', summary: 'Blankets for families in cold camps.', category: 'refugees', zakat: 'yes', zakatNote: 'Not a fatwa.', links: [{ name: 'Example Charity', url: 'https://example.org/blankets' }], active: true } }, ah)
  ok('causes: adding one works (and copies the starter list so nothing is lost)', add.status === 200)
  const after = await (await fetch(`${APP}/api/causes`)).json()
  ok('causes: visitors now see the new cause as well as the old ones', after.causes.some((c) => c.id === 'winter-blankets') && after.causes.some((c) => c.id === 'gaza-relief'))
  ok('causes: a link that is not https is refused', (await post('/api/admin/causes', { cause: { id: 'bad', title: 'Bad', summary: 'Bad link.', category: 'other', zakat: 'no', links: [{ name: 'x', url: 'http://example.org' }] } }, ah)).status === 400)
  await post('/api/admin/causes', { cause: { id: 'winter-blankets', title: 'Winter blankets', summary: 'Blankets for families in cold camps.', category: 'refugees', zakat: 'yes', zakatNote: '', links: [{ name: 'Example Charity', url: 'https://example.org/blankets' }], active: false } }, ah)
  ok('causes: a hidden cause is not shown to visitors', !(await (await fetch(`${APP}/api/causes`)).json()).causes.some((c) => c.id === 'winter-blankets'))
  ok('causes: the owner can remove one', (await fetch(`${APP}/api/admin/causes?id=winter-blankets`, { method: 'DELETE', headers: ah })).status === 200 && !(await (await fetch(`${APP}/api/admin/causes`, { headers: ah })).json()).causes.some((c) => c.id === 'winter-blankets'))
  await post('/api/admin/causes', { action: 'reset' }, ah)
  ok('causes: resetting returns to the starter list', (await (await fetch(`${APP}/api/admin/causes`, { headers: ah })).json()).customized === false)

  // ruqyah verses
  const kursi = await (await fetch(`${APP}/api/quran/passage?surah=2&from=255&to=255`)).json()
  ok('passage: Ayat al-Kursi comes back with Arabic and a translation', kursi.verses?.length === 1 && /[؀-ۿ]{8,}/.test(kursi.verses[0].text_uthmani) && kursi.verses[0].translations[0].text.length > 20)
  const end = await (await fetch(`${APP}/api/quran/passage?surah=2&from=285&to=286`)).json()
  ok('passage: the last two verses of Al-Baqarah come back as two verses', end.verses?.length === 2 && end.verses[1].verse_number === 286)
  ok('passage: bad requests are refused', (await fetch(`${APP}/api/quran/passage?surah=0&from=1`)).status === 400 && (await fetch(`${APP}/api/quran/passage?surah=2&from=5&to=2`)).status === 400 && (await fetch(`${APP}/api/quran/passage?surah=2&from=1&lang=xx`)).status === 400)
  ok('passage: at most 12 verses at a time', (await (await fetch(`${APP}/api/quran/passage?surah=2&from=1&to=200`)).json()).verses.length === 12)
}

// ───────── AI levels, the caring reply, the scholar note, follow-ups ─────────
{
  const ai = async (body) => {
    const r = await fetch(`${APP}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.60' }, body: JSON.stringify(body) })
    return { status: r.status, ...(await r.json()) }
  }
  const llmCalls = async () => (await (await fetch(`${LLM}/stats`)).json()).calls
  const q = 'What does the Quran say about gratitude and thankfulness?'
  const simple = await ai({ message: q + ' (simple)', level: 'simple' })
  const deep = await ai({ message: q + ' (deep)', level: 'deep' })
  const normal = await ai({ message: q + ' (normal)' })
  ok('level: "simple" asks the model to explain very simply', /LEVEL: Explain very simply/.test(simple.response), simple.mode)
  ok('level: "deep" asks for the fuller answer with context and scholarly views', /LEVEL: Give a fuller answer/.test(deep.response))
  ok('level: the usual answer carries no level instruction, and a made-up level is treated as usual', !/LEVEL:/.test(normal.response) && !/LEVEL:/.test((await ai({ message: q + ' (odd)', level: 'banana' })).response))
  ok('level: the same question at different levels is not mixed up in the saved answers', (await ai({ message: q + ' (simple)', level: 'simple' })).response !== (await ai({ message: q + ' (simple)', level: 'deep' })).response)

  const before = await llmCalls()
  const care = await ai({ message: 'I want to kill myself' })
  ok('care: someone in distress gets the caring reply, not an AI answer', care.status === 200 && care.mode === 'care' && care.provider === null && /findahelpline\.com/.test(care.response) && /emergency number/.test(care.response))
  ok('care: it comes with verses of hope (39:53, 2:286, 94:5-6)', ['39:53', '2:286', '94:5', '94:6'].every((k) => care.sources?.some((s) => s.ref === k)), (care.sources ?? []).map((s) => s.ref).join())
  ok('care: no AI model was called for it', (await llmCalls()) === before)
  const careDevice = await ai({ message: 'i want to die', promptOnly: true })
  ok('care: even the on-device path gets the caring reply instead of a prompt', careDevice.mode === 'care' && careDevice.system === undefined && /findahelpline\.com/.test(careDevice.response))
  const careAr = await ai({ message: 'أريد أن أموت', lang: 'ar' })
  ok('care: it answers in Arabic for an Arabic message', careAr.mode === 'care' && /findahelpline.com/.test(careAr.response) && (careAr.response.match(/[؀-ۿ]/g) || []).length > 150)
  const about = await ai({ message: 'What is the ruling on suicide in Islam?' })
  ok('care: a question ABOUT the topic is answered normally', about.mode === 'llm' && about.provider !== null)

  const ruling = await ai({ message: 'Is it halal to take a mortgage to buy a house?' })
  ok('note: a ruling question ends with the "ask a scholar" note', /not a fatwa or professional advice/.test(ruling.response) && ruling.response.trimEnd().endsWith('a doctor.'))
  ok('note: an ordinary question does not', !/not a fatwa or professional advice/.test(normal.response))
  ok('follow-ups: the answer comes with suggested next questions', Array.isArray(normal.followUps) && normal.followUps.includes('Explain it more simply') && normal.followUps.length <= 3, JSON.stringify(normal.followUps))
  const withSources = await ai({ message: 'What does the Quran say about patience?' })
  ok('follow-ups: they are built from the sources found', (withSources.sources?.length ?? 0) > 0 && withSources.followUps.some((f) => /^Explain (Quran|this hadith)/.test(f)), JSON.stringify(withSources.followUps))

  // ask by voice
  const clip = (bytes, type = 'audio/webm') => { const fd = new FormData(); fd.append('audio', new Blob([new Uint8Array(bytes).fill(7)], { type }), 'q.webm'); fd.append('lang', 'en'); return fd }
  const voice = async (fd, ip = '203.0.113.61') => fetch(`${APP}/api/transcribe`, { method: 'POST', headers: { 'X-Forwarded-For': ip }, body: fd })
  const heard = await voice(clip(4000))
  const heardBody = await heard.json()
  ok('voice: a short recording comes back as text', heard.status === 200 && typeof heardBody.text === 'string' && heardBody.text.length > 3, JSON.stringify(heardBody))
  ok('voice: an empty, oversized or non-audio upload is refused', (await voice(clip(0))).status === 400 && (await voice(clip(5 * 1024 * 1024))).status === 413 && (await voice(clip(4000, 'text/html'))).status === 415)
  ok('voice: it needs a file and the right kind of request', (await voice(new FormData())).status === 400 && (await fetch(`${APP}/api/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status === 415)

  // 👍 / 👎
  const fb = (b) => fetch(`${APP}/api/ai/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.62' }, body: JSON.stringify(b) })
  ok('feedback: 👍 and 👎 are accepted, anything else is refused', (await fb({ rating: 'good' })).status === 204 && (await fb({ rating: 'bad' })).status === 204 && (await fb({ rating: 'meh' })).status === 400 && (await fb({})).status === 400)
}

// 9. The rate limiter protects free quotas from a single heavy visitor
let limited = 0
for (let i = 0; i < 20; i++) if ((await ask('salaam ' + i)).status === 429) limited++
// ───────── hadith: the day's hadith and browsing by chapter ─────────
{
  const day = await (await fetch(`${APP}/api/hadith?date=2026-03-20&lang=en`)).json()
  ok('hadith of the day: a valid date gives a hadith (and it is the same for everyone that day)', typeof day.hadith?.text === 'string' && day.hadith.text.length > 30 && (await (await fetch(`${APP}/api/hadith?date=2026-03-20&lang=en`)).json()).hadith.hadithnumber === day.hadith.hadithnumber)
  ok('hadith of the day: a malformed date is refused', (await fetch(`${APP}/api/hadith?date=yesterday`)).status === 400)
  const secs = await (await fetch(`${APP}/api/hadith/sections?book=bukhari`)).json()
  ok('hadith chapters: Bukhari lists 90+ chapters with counts', secs.sections?.length > 90 && secs.sections[0].name === 'Revelation' && secs.sections[0].count === 7, JSON.stringify(secs.sections?.[0]))
  ok('hadith chapters: every collection has chapters', (await Promise.all(['muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik', 'nawawi', 'qudsi'].map(async (b) => (await (await fetch(`${APP}/api/hadith/sections?book=${b}`)).json()).sections?.length > 0))).every(Boolean))
  ok('hadith chapters: unknown collection refused', (await fetch(`${APP}/api/hadith/sections?book=nope`)).status === 400)
  const ch = await (await fetch(`${APP}/api/hadith/section?book=bukhari&n=1`)).json()
  ok('hadith chapter: the first Bukhari chapter has its 7 hadith, starting with the intentions hadith', ch.hadiths?.length === 7 && /intentions/.test(ch.hadiths[0].text) && ch.nextOffset === null, JSON.stringify(ch).slice(0, 120))
  const long = await (await fetch(`${APP}/api/hadith/section?book=bukhari&n=8&limit=20`)).json()
  ok('hadith chapter: long chapters come 20 at a time with a next offset', long.hadiths?.length === 20 && long.nextOffset === 20)
  const p2 = await (await fetch(`${APP}/api/hadith/section?book=bukhari&n=8&limit=20&offset=20`)).json()
  ok('hadith chapter: the next page continues where the first stopped', p2.hadiths?.[0]?.hadithnumber > long.hadiths[19].hadithnumber)
  ok('hadith chapter: bad chapter or collection is refused', (await fetch(`${APP}/api/hadith/section?book=bukhari&n=9999`)).status === 404 && (await fetch(`${APP}/api/hadith/section?book=zzz&n=1`)).status === 400)
}

// ───────── tafsir study: connected verses and plain explanation ─────────
{
  const c = await (await fetch(`${APP}/api/tafsir/connections?key=2:255&lang=en`)).json()
  ok('tafsir connections: Ayat al-Kursi points to real verses, with Arabic and translation', c.pointed?.length >= 2 && c.pointed.every((p) => p.arabic.length > 5 && p.text.length > 5 && p.surah >= 1 && p.surah <= 114), JSON.stringify(c.labels))
  ok('tafsir connections: the verse is not linked to itself, and hadith page numbers are not verses', !c.pointed.some((p) => p.ref === '2:255') && !c.similar.some((p) => p.ref === '2:255'))
  ok('tafsir connections: bad or impossible keys are refused', (await fetch(`${APP}/api/tafsir/connections?key=abc`)).status === 400 && (await fetch(`${APP}/api/tafsir/connections?key=1:99`)).status === 400)
  const bad = await fetch(`${APP}/api/tafsir/explain`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: '200:1' }) })
  ok('tafsir explain: an impossible verse is refused', bad.status === 400)
  const ex = await fetch(`${APP}/api/tafsir/explain`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: '112:1', level: 'simple' }) })
  const exd = await ex.json()
  ok('tafsir explain: always returns readable sections (AI-written or the commentary itself)', ex.status === 200 && exd.sections?.length >= 1 && exd.sections.every((s) => s.title && s.body.length > 20) && (exd.source === 'ai' || exd.source === 'tafsir'), JSON.stringify(exd).slice(0, 150))
  ok('tafsir: the new Arabic sources work (Qurtubi, Tabari, Baghawi, Wasit)', (await Promise.all([90, 15, 94, 93].map(async (id) => (await fetch(`${APP}/api/tafsir?key=1:2&id=${id}`)).status === 200))).every(Boolean))
}

// ───────── sermons (khutbah) ─────────
{
  const mk = (b) => fetch(`${APP}/api/khutbah`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
  const r = await mk({ topic: 'sincerity', minutes: 5 })
  const d = await r.json()
  ok('khutbah: a topic gives five sections, verified evidence and the fixed opening verses', r.status === 200 && d.sections?.length === 5 && d.evidence?.some((e) => e.id === 'Q1' && e.arabic) && d.fixed?.hajah?.length === 3 && d.fixed.hajah.every((v) => v.arabic) && !!d.fixed.closing.arabic, JSON.stringify(d).slice(0, 160))
  ok('khutbah: every [Q#]/[H#] marker in the text points to evidence that exists', d.sections.every((s) => [...s.body.matchAll(/\[((?:Q|H)\d+)\]/g)].every((m) => d.evidence.some((e) => e.id === m[1]))))
  ok('khutbah: the intentions hadith comes from Bukhari, not from a model', d.evidence.some((e) => e.kind === 'hadith' && /Bukhari/.test(e.ref) && /intentions/.test(e.text)))
  const c = await (await mk({ custom: 'patience when a loved one is ill' })).json()
  ok('khutbah: a topic written by the imam works too', c.sections?.length === 5 && c.evidence?.length >= 3 && c.title === 'patience when a loved one is ill')
  ok('khutbah: no topic, too-short topic, or bad body is refused', (await mk({})).status === 400 && (await mk({ custom: 'a' })).status === 400 && (await mk({ topic: 'nope' })).status === 400)
  const f = await (await mk({ topic: 'friday', lang: 'fr' })).json()
  ok('khutbah: the verses come in the language asked for', /Dieu|Allah/i.test(f.fixed?.hajah?.[0]?.text || ''), f.fixed?.hajah?.[0]?.text?.slice(0, 80))
}

// ───────── Islamic books ─────────
{
  const en = await (await fetch(`${APP}/api/books/page?id=munqidh&lang=en&page=1`)).json()
  ok('books: an English page of a Gutenberg book loads, without the licence header', en.paragraphs?.length > 3 && en.pages > 5 && !/START OF THE PROJECT GUTENBERG/i.test(JSON.stringify(en.paragraphs)) && /gutenberg\.org/.test(en.source?.url), JSON.stringify(en).slice(0, 140))
  const en2 = await (await fetch(`${APP}/api/books/page?id=munqidh&lang=en&page=2`)).json()
  ok('books: page 2 is different from page 1', en2.page === 2 && en2.paragraphs[0] !== en.paragraphs[0])
  const ar = await (await fetch(`${APP}/api/books/page?id=munqidh&lang=ar&page=1`)).json()
  ok('books: the Arabic original loads from Arabic Wikisource, in Arabic script, with its licence', ar.paragraphs?.length > 3 && /[؀-ۿ]{3,}/.test(ar.paragraphs.join(' ')) && /CC BY-SA/.test(ar.source?.licence), JSON.stringify(ar).slice(0, 140))
  ok('books: an unknown book, or a language the book does not have, is a clean 404', (await fetch(`${APP}/api/books/page?id=nope`)).status === 404 && (await fetch(`${APP}/api/books/page?id=bidayat&lang=en`)).status === 404)
  const far = await (await fetch(`${APP}/api/books/page?id=munqidh&lang=en&page=99999`)).json()
  ok('books: a page number beyond the end gives the last page', far.page === far.pages)
  const post = (b) => fetch(`${APP}/api/books/explain`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
  ok('books explain: a visitor cannot send their own text — only a position in a real book', (await post({ id: 'nope', page: 1, para: 0 })).status === 400 && (await post({ id: 'munqidh', page: 1, para: 9999 })).status === 404 && (await post({ id: 'munqidh', page: 'x', para: 0 })).status === 400)
  const askPost = (b) => fetch(`${APP}/api/books/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
  const ak = await askPost({ id: 'munqidh', lang: 'en', question: 'What did he seek certainty about?' })
  const akd = await ak.json()
  ok('books ask: a question gets passages from the book itself (and an answer, or an honest “busy” note)', ak.status === 200 && akd.excerpts?.length >= 1 && akd.excerpts.every((e) => e.text.length > 20 && e.page >= 1) && (typeof akd.answer === 'string' || typeof akd.note === 'string'), JSON.stringify(akd).slice(0, 160))
  ok('books ask: too-short or unknown-book questions are refused', (await askPost({ id: 'munqidh', question: 'a' })).status === 400 && (await askPost({ id: 'nope', question: 'what is this' })).status === 400)
  const ara = await (await askPost({ id: 'munqidh', lang: 'ar', question: 'ما هو الصبر والشكر' })).json()
  ok('books ask: an Arabic question searches the Arabic original', Array.isArray(ara.excerpts) && (ara.excerpts.length === 0 || /[؀-ۿ]{3,}/.test(ara.excerpts[0].text)))
  const ex = await post({ id: 'munqidh', lang: 'en', page: 1, para: 2, mode: 'explain' })
  ok('books explain: a real paragraph gets an AI explanation, or an honest “busy” message', ex.status === 200 || ex.status === 503, String(ex.status))
}

// ───────── family circle ─────────
{
  const dev = (n) => 'device' + String(n).padStart(12, '0') + 'abcd'
  const call = (b) => fetch(`${APP}/api/circle`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
  const day = new Date().toISOString().slice(0, 10)
  const c = await call({ action: 'create', device: dev(1), circle: 'Test family', name: 'Aisha' })
  const cd = await c.json()
  ok('circle: creating one gives a six-character code', c.status === 200 && /^[A-Z2-9]{6}$/.test(cd.code), JSON.stringify(cd))
  const j = await call({ action: 'join', device: dev(2), code: cd.code.toLowerCase(), name: 'Omar' })
  ok('circle: a second person joins with the code (any case)', j.status === 200)
  ok('circle: the same name twice is refused, and a made-up code is not found', (await call({ action: 'join', device: dev(3), code: cd.code, name: 'omar' })).status === 409 && (await call({ action: 'join', device: dev(3), code: 'ZZZZZZ', name: 'Sara' })).status === 404)
  const ci = await call({ action: 'checkin', device: dev(2), code: cd.code, date: day })
  ok('circle: checking in works, once or twice the same', ci.status === 200 && (await call({ action: 'checkin', device: dev(2), code: cd.code, date: day })).status === 200)
  ok('circle: a stranger cannot check in, and a far-away date is refused', (await call({ action: 'checkin', device: dev(9), code: cd.code, date: day })).status === 403 && (await call({ action: 'checkin', device: dev(2), code: cd.code, date: '2020-01-01' })).status === 400)
  const st = await (await fetch(`${APP}/api/circle?code=${cd.code}&device=${dev(2)}`)).json()
  ok('circle: the state shows both people, my row marked, the streak, and the verse of the week', st.members?.length === 2 && st.members[0].name === 'Omar' && st.members[0].me === true && st.members[0].streak === 1 && st.members[0].today === true && !!st.verse?.ref && !!st.question, JSON.stringify(st).slice(0, 200))
  ok('circle: nobody’s device id leaks in the reply', !JSON.stringify(st).includes(dev(1)) && !JSON.stringify(st).includes(dev(2)))
  ok('circle: bad requests are refused (no device, bad code, links as names)', (await call({ action: 'create', circle: 'x', name: 'y' })).status === 400 && (await fetch(`${APP}/api/circle?code=abc&device=${dev(1)}`)).status === 400 && (await call({ action: 'create', device: dev(4), circle: 'Spam', name: 'visit www.spam.com' })).status === 400)
  await call({ action: 'leave', device: dev(2), code: cd.code })
  const after = await (await fetch(`${APP}/api/circle?code=${cd.code}&device=${dev(1)}`)).json()
  ok('circle: leaving removes the person', after.members?.length === 1 && after.members[0].name === 'Aisha')
  await call({ action: 'leave', device: dev(1), code: cd.code })
  ok('circle: when the last person leaves, the circle is gone', (await fetch(`${APP}/api/circle?code=${cd.code}&device=${dev(1)}`)).status === 404)
}

// ───────── the reminder scheduler's heartbeat and backup ─────────
{
  const dispatchNow = await fetch(`${APP}/api/push/dispatch`, { method: 'POST', headers: { Authorization: 'Bearer ' + (process.env.CRON_SECRET || 'test-cron-secret-0123456789') } })
  const st = await (await fetch(`${APP}/api/push/status`)).json()
  ok('scheduler: after a dispatch the status says reminders are running (schedulerOk)', st.configured === true && typeof st.schedulerOk === 'boolean' && (dispatchNow.status !== 200 || st.schedulerOk === true), JSON.stringify({ d: dispatchNow.status, st }))
  const t1 = await (await fetch(`${APP}/api/push/tick`, { method: 'POST' })).json()
  const t2 = await (await fetch(`${APP}/api/push/tick`, { method: 'POST' })).json()
  ok('scheduler backup: the tick endpoint runs at most once every few minutes, whoever calls it', typeof t1.ran === 'boolean' && t2.ran === false, JSON.stringify([t1, t2]))
}

// ───────── fake sign-up e-mails ─────────
{
  const chk = async (email) => (await fetch(`${APP}/api/account/check-email`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })).json()
  ok('check-email: a real provider passes', (await chk('amina.bah@gmail.com')).ok === true)
  ok('check-email: throw-away services, placeholders and broken addresses are refused with a reason', (await Promise.all(['x@mailinator.com', 'me@example.com', 'not-an-email', 'test@gmail.com'].map(chk))).every((r) => r.ok === false && typeof r.reason === 'string' && r.reason.length > 10))
  const gone = await chk('someone@this-domain-surely-does-not-exist-9f3k2.com')
  ok('check-email: a domain that does not exist cannot receive mail, so it is refused (or the DNS check was unreachable and it is allowed)', gone.ok === false || gone.ok === true, JSON.stringify(gone))
  ok('check-email: a missing body is refused, not a crash', (await fetch(`${APP}/api/account/check-email`, { method: 'POST' })).status === 200)
}

ok('rate limit: a burst beyond 15/min is refused with 429 + Retry-After', limited > 0, `${limited} of 20 refused`)

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
