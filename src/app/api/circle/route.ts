import { NextRequest, NextResponse, connection } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { dataAvailable } from '@/lib/data'
import { MAX_MEMBERS, TTL_SECONDS, addDay, cleanName, codeFrom, dateAllowed, isCode, isDevice, normalizeCode, viewOf, weekIndex, weeklyQuestion, weeklyVerse, type Member } from '@/lib/circle'
import { resolveVerse } from '@/lib/khutbah-build'
import { readJsonLimited } from '@/lib/http'
import { track } from '@/lib/ops'
import { clientIp, rateLimit } from '@/lib/ratelimit'
import { redis, redisConfigured } from '@/lib/redis'

// Family Circle. No accounts: a circle is a short code, a person is a name plus a random id that stays on their device.
//   GET  /api/circle?code=ABC234&device=…&lang=en        -> the circle (members, streaks, verse of the week)
//   POST /api/circle { action: 'create' | 'join' | 'checkin' | 'leave', code?, device, name?, circle?, date? }
// Stored in Redis: circle:CODE (the name) and circle:CODE:m (one entry per member). Device ids are stored only as a hash.
const meta = (code: string) => `circle:${code}`
const mem = (code: string) => `circle:${code}:m`
const hashOf = (device: string) => createHash('sha256').update('deen-circle:' + device).digest('hex').slice(0, 24)
const serverToday = () => new Date().toISOString().slice(0, 10)
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

async function load(code: string): Promise<{ name: string; members: Record<string, Member> } | null> {
  const [m, all] = (await redis([['GET', meta(code)], ['HGETALL', mem(code)]])) as [string | null, string[]]
  if (!m) return null
  const members: Record<string, Member> = {}
  for (let i = 0; i + 1 < all.length; i += 2) {
    try {
      const v = JSON.parse(all[i + 1]) as Member
      if (v && typeof v.name === 'string' && Array.isArray(v.days)) members[all[i]] = v
    } catch {}
  }
  return { name: (JSON.parse(m) as { name: string }).name, members }
}

async function viewFor(code: string, device: string, lang: string, clientDay?: string | null) {
  const c = await load(code)
  if (!c) return null
  // The viewer's own calendar day (from their phone) when it is within a day of the server's, otherwise the server's.
  const today = clientDay && dateAllowed(clientDay, serverToday()) ? clientDay : serverToday()
  const ref = weeklyVerse(today)
  const verse = resolveVerse(ref, lang)
  return {
    code,
    name: c.name,
    members: viewOf(c.members, hashOf(device), today),
    joined: hashOf(device) in c.members,
    week: weekIndex(today),
    verse: verse ? { ref, arabic: verse.arabic, text: verse.text, href: verse.href } : { ref },
    question: weeklyQuestion(today),
    today,
  }
}

export async function GET(request: NextRequest) {
  await connection()
  if (!redisConfigured() || !dataAvailable()) return bad('Family circles are not available right now.', 503)
  const sp = request.nextUrl.searchParams
  const code = normalizeCode(sp.get('code'))
  const device = sp.get('device')
  if (!isCode(code) || !isDevice(device)) return bad('That code does not look right.')
  const limit = await rateLimit(`circle-get:${clientIp(request.headers)}`, 90, 600_000)
  if (!limit.ok) return bad('Too many requests, please slow down.', 429)
  const lang = sp.get('lang') || 'en'
  const v = await viewFor(code, device, /^[a-z]{2}$/.test(lang) ? lang : 'en', sp.get('date'))
  if (!v) return bad('No circle with that code.', 404)
  return NextResponse.json(v, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  if (!redisConfigured()) return bad('Family circles are not available right now.', 503)
  const b = (await readJsonLimited(request, 1000)) as Record<string, unknown> | null
  if (!b || !isDevice(b.device)) return bad('Bad request')
  const device = b.device
  const me = hashOf(device)
  const action = b.action
  const ip = clientIp(request.headers)

  if (action === 'create') {
    const limit = await rateLimit(`circle-create:${ip}`, 5, 3600_000)
    if (!limit.ok) return bad('You have made several circles recently. Please try again later.', 429)
    const name = cleanName(b.circle, 30)
    const mine = cleanName(b.name)
    if (!name || !mine) return bad('Please give the circle a name and write your own name.')
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = codeFrom([...randomBytes(6)])
      const [set] = (await redis([['SET', meta(code), JSON.stringify({ name, created: serverToday() }), 'EX', TTL_SECONDS, 'NX']])) as [string | null]
      if (set !== 'OK') continue
      const first: Member = { name: mine, joined: serverToday(), days: [] }
      await redis([['HSET', mem(code), me, JSON.stringify(first)], ['EXPIRE', mem(code), TTL_SECONDS]])
      track('circle.create')
      return NextResponse.json({ code }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return bad('Could not make a circle, please try again.', 503)
  }

  const code = normalizeCode(b.code)
  if (!isCode(code)) return bad('That code does not look right.')

  if (action === 'join') {
    const limit = await rateLimit(`circle-join:${ip}`, 20, 600_000)
    if (!limit.ok) return bad('Too many tries. Please wait a few minutes.', 429)
    const mine = cleanName(b.name)
    if (!mine) return bad('Please write your name.')
    const c = await load(code)
    if (!c) return bad('No circle with that code.', 404)
    if (!(me in c.members)) {
      if (Object.keys(c.members).length >= MAX_MEMBERS) return bad(`This circle is full (${MAX_MEMBERS} people).`, 409)
      if (Object.values(c.members).some((m) => m.name.toLowerCase() === mine.toLowerCase())) return bad('Someone in the circle already uses that name. Please add a letter or an initial.', 409)
      const m: Member = { name: mine, joined: serverToday(), days: [] }
      await redis([['HSET', mem(code), me, JSON.stringify(m)], ['EXPIRE', mem(code), TTL_SECONDS], ['EXPIRE', meta(code), TTL_SECONDS]])
      track('circle.join')
    }
    return NextResponse.json({ code }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (action === 'checkin') {
    const limit = await rateLimit(`circle-checkin:${ip}`, 60, 600_000)
    if (!limit.ok) return bad('Too many requests, please slow down.', 429)
    const date = b.date
    if (typeof date !== 'string' || !dateAllowed(date, serverToday())) return bad('That date is not allowed.')
    const [raw] = (await redis([['HGET', mem(code), me]])) as [string | null]
    if (!raw) return bad('You are not in this circle.', 403)
    const m = JSON.parse(raw) as Member
    m.days = addDay(m.days, date)
    await redis([['HSET', mem(code), me, JSON.stringify(m)], ['EXPIRE', mem(code), TTL_SECONDS], ['EXPIRE', meta(code), TTL_SECONDS]])
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (action === 'leave') {
    await redis([['HDEL', mem(code), me]])
    const [left] = (await redis([['HLEN', mem(code)]])) as [number]
    if (!left) await redis([['DEL', mem(code)], ['DEL', meta(code)]])
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return bad('Unknown action')
}
