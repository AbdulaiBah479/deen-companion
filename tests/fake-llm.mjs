// A fake OpenAI-compatible LLM + speech-to-text server for testing. Run: node tests/fake-llm.mjs [port]
//
// Chat: echoes the system prompt and last user message so tests can verify exactly what the app sends.
//   Put FORCE429 in the user message  -> replies 429 with Retry-After: 2   (simulates an exhausted free quota)
//   Put FORCE500 in the user message  -> replies 500                        (simulates an outage)
// GET /stats returns { calls }; POST /reset zeroes it.
// Speech-to-text (/audio/transcriptions): returns FAKE_STT_TEXT (default "قل هو الله احد").
// Pexels (/v1/videos/search): same response shape as the real API (checked against its docs), 401 unless Authorization: test-pexels-key.
//   POST /video-upload stores a test clip; GET /video/test.webm serves it; GET /pexels-stats returns { searches, lastQuery }.
import http from 'node:http'

const port = Number(process.argv[2] || 4010)
let calls = 0
const hooks = []
const redis = { map: new Map(), kv: new Map(), sets: new Map(), hashes: new Map(), lists: new Map(), commands: 0, down: false }
const pushes = []
const wiki = { summary: 0, article: 0, search: 0, lastSearch: '' }
let pexelsSearches = 0
let lastQuery = ""
let clip = null
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }

http
  .createServer((req, res) => {
    const json = (status, body, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
      res.end(JSON.stringify(body))
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors)
      return res.end()
    }
    if (req.method === 'POST' && req.url === '/video-upload') {
      const chunks = []
      req.on('data', (d) => chunks.push(d))
      req.on('end', () => {
        clip = Buffer.concat(chunks)
        res.writeHead(200, { 'Content-Type': 'application/json', ...cors })
        res.end(JSON.stringify({ bytes: clip.length }))
      })
      return
    }
    if (req.method === 'GET' && req.url === '/video/test.webm') {
      if (!clip) {
        res.writeHead(404)
        return res.end()
      }
      res.writeHead(200, { 'Content-Type': 'video/webm', 'Content-Length': clip.length, ...cors })
      return res.end(clip)
    }
    if (req.method === 'GET' && req.url === '/poster.svg') {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' })
      return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="9" height="16"><rect width="9" height="16" fill="#134"/></svg>')
    }
    if (req.method === 'GET' && req.url === '/pexels-stats') return json(200, { searches: pexelsSearches, lastQuery })
    if (req.method === 'GET' && req.url.startsWith('/v1/videos/search')) {
      if (req.headers.authorization !== 'test-pexels-key') return json(401, { error: 'Unauthorized' })
      pexelsSearches++
      const u = new URL(req.url, 'http://x')
      lastQuery = u.searchParams.get('query') + '|' + u.searchParams.get('orientation')
      const base = 'http://localhost:' + port
      const n = Math.min(Number(u.searchParams.get('per_page') || 15), 80)
      const q = u.searchParams.get('query') || ''
      const videos = Array.from({ length: n }, (_, i) => {
        const id = 1000 * (1 + (q.length % 7)) + i
        return {
          id, width: 1080, height: 1920, duration: 10, url: 'https://www.pexels.com/video/test-' + id + '/', image: base + '/poster.svg',
          user: { id: 7, name: 'Test Videographer', url: 'https://www.pexels.com/@test-videographer' },
          video_files: [
            { id: id * 10, quality: 'hls', file_type: 'application/x-mpegURL', width: null, height: null, link: base + '/video/test.m3u8' },
            { id: id * 10 + 1, quality: 'sd', file_type: 'video/mp4', width: 540, height: 960, link: base + '/video/small.mp4' },
            { id: id * 10 + 2, quality: 'hd', file_type: 'video/mp4', width: 720, height: 1280, link: base + '/video/test.webm' },
          ],
          video_pictures: [],
        }
      })
      return json(200, { page: 1, per_page: n, total_results: 500, url: 'https://www.pexels.com/search/videos/' + q + '/', videos })
    }
    // Wikipedia (REST summary + action API), same response shapes as the real service (checked against live responses).
    if (req.method === 'GET' && req.url === '/wiki-stats') return json(200, wiki)
    if (req.method === 'GET' && req.url.startsWith('/api/rest_v1/page/summary/')) {
      wiki.summary++
      const t = decodeURIComponent(req.url.split('?')[0].slice('/api/rest_v1/page/summary/'.length)).replace(/_/g, ' ')
      if (t.startsWith('Missing')) return json(404, { type: 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found', title: 'Not found.' })
      if (t.startsWith('Disamb')) return json(200, { type: 'disambiguation', title: t, extract: 'X may refer to:' })
      return json(200, {
        type: 'standard', title: t, description: 'test description of ' + t, extract: 'Short extract about ' + t + '. It is a test article with enough words to read.',
        thumbnail: { source: 'http://localhost:' + port + '/poster.svg', width: 9, height: 16 },
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/' + t.replace(/ /g, '_') } },
      })
    }
    if (req.method === 'GET' && req.url.startsWith('/w/api.php')) {
      const u = new URL(req.url, 'http://x')
      if (u.searchParams.get('list') === 'search') {
        wiki.search++
        wiki.lastSearch = u.searchParams.get('srsearch')
        const q = u.searchParams.get('srsearch') || ''
        return json(200, {
          batchcomplete: true,
          query: { search: [{ ns: 0, title: 'Result One', pageid: 1, snippet: 'About <span class="searchmatch">' + q.split(' ')[0] + '</span> &quot;quoted&quot; &amp; more' }, { ns: 0, title: 'Result Two', pageid: 2, snippet: 'Second hit' }] },
        })
      }
      wiki.article++
      const t = u.searchParams.get('titles') || ''
      if (t.startsWith('Missing')) return json(200, { batchcomplete: true, query: { pages: [{ title: t, missing: true }] } })
      const extract = ['Intro paragraph about ' + t + '.', 'Second intro line.', '', '', '== History ==', 'History text of ' + t + '.', '', '=== Early years ===', 'Early years text.', '', '== Legacy ==', 'Legacy text.', '', '== See also ==', 'Should be dropped.', '', '== References ==', 'Should be dropped too.'].join('\n')
      return json(200, {
        batchcomplete: true,
        query: { pages: [{ pageid: 5, ns: 0, title: t, extract, description: 'test description of ' + t, fullurl: 'https://en.wikipedia.org/wiki/' + t.replace(/ /g, '_'), thumbnail: { source: 'http://localhost:' + port + '/poster.svg', width: 9, height: 16 } }] },
      })
    }
    // Test recitation: a 6 s, 8 kHz mono WAV tone for any /audio/<reciter>/<NNNNNN>.mp3
    if (req.method === 'GET' && req.url.startsWith('/audio/')) {
      const rate = 8000
      const secs = 6
      const n = rate * secs
      const buf = Buffer.alloc(44 + n * 2)
      buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
      buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24)
      buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
      for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 3000), 44 + i * 2)
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': buf.length, 'Access-Control-Allow-Origin': '*' })
      return res.end(buf)
    }
    // Error-report webhook (Discord/Slack style)
    if (req.method === 'POST' && req.url === '/webhook') {
      let b = ''
      req.on('data', (d) => (b += d))
      req.on('end', () => {
        hooks.push(b)
        json(200, { ok: true })
      })
      return
    }
    if (req.method === 'GET' && req.url === '/webhook-stats') return json(200, { count: hooks.length, last: hooks.at(-1) ?? '' })
    // A fake browser push service (what a subscription's endpoint points to). Records every message it is sent.
    if (req.method === 'POST' && req.url.startsWith('/push/')) {
      let bytes = 0
      req.on('data', (d) => (bytes += d.length))
      req.on('end', () => {
        pushes.push({ path: req.url, auth: String(req.headers.authorization || ''), ttl: String(req.headers.ttl || ''), enc: String(req.headers['content-encoding'] || ''), bytes })
        if (req.url.endsWith('-gone')) { res.writeHead(410); return res.end('gone') }
        res.writeHead(201); res.end()
      })
      return
    }
    if (req.method === 'GET' && req.url.startsWith('/redis-dump')) {
      const prefix = new URL(req.url, 'http://x').searchParams.get('prefix') || ''
      return json(200, [...redis.kv].filter(([k]) => k.startsWith(prefix)).map(([k, e]) => [k, e.v]))
    }
    if (req.method === 'GET' && req.url === '/push-stats') return json(200, { count: pushes.length, last: pushes.at(-1) ?? null, all: pushes })
    if (req.method === 'POST' && req.url === '/push-reset') { pushes.length = 0; return json(200, { ok: true }) }
    // Upstash-style Redis REST: POST /pipeline [["INCR",k],["PEXPIRE",k,ms,"NX"]] with Bearer token; GET /redis-stats
    if (req.method === 'GET' && req.url === '/redis-stats') return json(200, { commands: redis.commands, keys: redis.map.size })
    if (req.method === 'POST' && req.url === '/redis-down') {
      redis.down = !redis.down
      return json(200, { down: redis.down })
    }
    if (req.method === 'POST' && req.url === '/pipeline') {
      let b = ''
      req.on('data', (d) => (b += d))
      req.on('end', () => {
        if (req.headers.authorization !== 'Bearer test-redis-token') return json(401, { error: 'WRONGPASS' })
        if (redis.down) return json(503, { error: 'down' })
        const now = Date.now()
        const out = JSON.parse(b).map((parts) => {
          const [cmd, key, ms, flag] = parts
          const args = parts.slice(2)
          redis.commands++
          const cur = redis.map.get(key)
          if (cur && cur.exp && cur.exp <= now) redis.map.delete(key)
          if (cmd === 'INCR') {
            const e = redis.map.get(key) ?? { n: 0, exp: 0 }
            e.n++
            redis.map.set(key, e)
            return { result: e.n }
          }
          if (cmd === 'PEXPIRE') {
            const e = redis.map.get(key)
            if (!e) return { result: 0 }
            if (flag === 'NX' && e.exp) return { result: 0 }
            e.exp = now + Number(ms)
            return { result: 1 }
          }
          // plain strings and sets, as used by the prayer-reminder store
          if (cmd === 'SET') {
            const nx = args.includes('NX')
            const exIdx = args.indexOf('EX')
            const existing = redis.kv.get(key)
            if (existing && (!existing.exp || existing.exp > now) && nx) return { result: null }
            redis.kv.set(key, { v: String(ms), exp: exIdx >= 0 ? now + Number(args[exIdx + 1]) * 1000 : 0 })
            return { result: 'OK' }
          }
          if (cmd === 'GET') {
            const e = redis.kv.get(key)
            return { result: e && (!e.exp || e.exp > now) ? e.v : null }
          }
          if (cmd === 'DEL') return { result: [redis.kv.delete(key), redis.lists.delete(key), redis.hashes.delete(key), redis.sets.delete(key)].some(Boolean) ? 1 : 0 }
          if (cmd === 'SADD') { const set = redis.sets.get(key) ?? new Set(); for (const m of args) set.add(String(m)); redis.sets.set(key, set); return { result: 1 } }
          if (cmd === 'SREM') { for (const m of args) redis.sets.get(key)?.delete(String(m)); return { result: 1 } }
          if (cmd === 'SMEMBERS') return { result: [...(redis.sets.get(key) ?? [])] }
          // hashes, lists and a few more, as used by the admin/autopilot bookkeeping
          if (cmd === 'PING') return { result: 'PONG' }
          if (cmd === 'EXPIRE') return { result: 1 }
          if (cmd === 'EXISTS') return { result: redis.kv.has(key) ? 1 : 0 }
          if (cmd === 'SCARD') return { result: (redis.sets.get(key) ?? new Set()).size }
          if (cmd === 'HINCRBY') { const h = redis.hashes.get(key) ?? new Map(); h.set(String(args[0]), String(Number(h.get(String(args[0])) ?? 0) + Number(args[1]))); redis.hashes.set(key, h); return { result: Number(h.get(String(args[0]))) } }
          if (cmd === 'HSET') { const h = redis.hashes.get(key) ?? new Map(); for (let i = 0; i + 1 < args.length; i += 2) h.set(String(args[i]), String(args[i + 1])); redis.hashes.set(key, h); return { result: 1 } }
          if (cmd === 'HGET') return { result: redis.hashes.get(key)?.get(String(args[0])) ?? null }
          if (cmd === 'HGETALL') return { result: [...(redis.hashes.get(key) ?? new Map())].flat() }
          if (cmd === 'RPUSH') { const l = redis.lists.get(key) ?? []; for (const m of args) l.push(String(m)); redis.lists.set(key, l); return { result: l.length } }
          if (cmd === 'LPUSH') { const l = redis.lists.get(key) ?? []; l.unshift(String(args[0])); redis.lists.set(key, l); return { result: l.length } }
          if (cmd === 'LTRIM') { const l = redis.lists.get(key) ?? []; redis.lists.set(key, l.slice(Number(args[0]), Number(args[1]) + 1)); return { result: 'OK' } }
          if (cmd === 'LRANGE') return { result: (redis.lists.get(key) ?? []).slice(Number(args[0]), Number(args[1]) + 1) }
          return { error: 'ERR unknown command' }
        })
        json(200, out)
      })
      return
    }
    // YouTube channel feed (Atom), same structure as https://www.youtube.com/feeds/videos.xml?channel_id=…
    if (req.method === 'GET' && req.url.startsWith('/feeds/videos.xml')) {
      const id = new URL(req.url, 'http://x').searchParams.get('channel_id') || ''
      if (id === 'UC' + 'x'.repeat(22)) { res.writeHead(500); return res.end() }
      const label = id.endsWith('A') ? 'Alpha' : 'Beta'
      const entries = [1, 2, 3].map((n) => `<entry><id>yt:video:${label.toLowerCase()}vid${n}00</id><yt:videoId>${(label.toLowerCase() + 'vid' + n + '00000000000').slice(0, 11)}</yt:videoId><yt:channelId>${id}</yt:channelId><title>${label} lecture ${n} &amp; ${'&quot;'}Q&amp;A&quot;</title><published>2026-10-${label === 'Alpha' ? 10 + n : 1 + n}T10:00:00+00:00</published><media:group><media:title>t</media:title></media:group></entry>`).join('')
      res.writeHead(200, { 'Content-Type': 'application/atom+xml' })
      return res.end('<?xml version="1.0" encoding="UTF-8"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom"><title>' + label + '</title>' + entries + '</feed>')
    }
    if (req.method === 'GET' && req.url === '/stats') return json(200, { calls })
    if (req.method === 'POST' && req.url === '/reset') {
      calls = 0
      return json(200, { ok: true })
    }

    if (req.method === 'POST' && req.url.endsWith('/audio/transcriptions')) {
      let bytes = 0
      req.on('data', (d) => (bytes += d.length))
      req.on('end', () => json(200, { text: process.env.FAKE_STT_TEXT || 'قل هو الله احد', bytes }))
      return
    }

    if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) {
      res.writeHead(404)
      return res.end()
    }
    let body = ''
    req.on('data', (d) => (body += d))
    req.on('end', () => {
      calls++
      const { messages, model } = JSON.parse(body)
      const system = messages.find((m) => m.role === 'system')?.content ?? ''
      const turns = messages.filter((m) => m.role !== 'system')
      const last = turns.at(-1)?.content ?? ''
      if (last.includes('FORCE429')) return json(429, { error: { message: 'Rate limit exceeded: quota exhausted' } }, { 'Retry-After': '2' })
      if (last.includes('FORCE500')) return json(500, { error: { message: 'upstream exploded' } })
      const content = `FAKE-LLM model=${model} turns=${turns.length} last="${last}"\n---SYSTEM---\n${system}`
      json(200, { choices: [{ message: { role: 'assistant', content } }] })
    })
  })
  .listen(port, () => console.log('fake llm on', port))
