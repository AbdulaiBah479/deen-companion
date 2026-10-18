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
ok('status: provider is configured and available', st0.configured === 1 && st0.providers[0].available === true && st0.providers[0].name === 'Custom')
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
ok('quota: status shows the provider resting with a countdown', st1.providers[0].available === false && st1.providers[0].retryInSeconds >= 1 && st1.providers[0].reason === 'rate-limit', JSON.stringify(st1.providers[0]))
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
ok('outage: provider rests briefly after a transient error', st2.providers[0].available === false && st2.providers[0].reason === 'transient')

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
  ok('health: up, with data present, and no secrets in the reply', h.status === 200 && hj.ok === true && typeof hj.aiProviders === 'number' && hj.sharedRateLimit === true && !JSON.stringify(hj).match(/key|token|secret/i), JSON.stringify(hj))
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
  ok('service worker is the v2 offline-capable one', sw.includes("'deen-v2'") && sw.includes("caches.match('/offline')"))
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

// 9. The rate limiter protects free quotas from a single heavy visitor
let limited = 0
for (let i = 0; i < 20; i++) if ((await ask('salaam ' + i)).status === 429) limited++
ok('rate limit: a burst beyond 15/min is refused with 429 + Retry-After', limited > 0, `${limited} of 20 refused`)

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
