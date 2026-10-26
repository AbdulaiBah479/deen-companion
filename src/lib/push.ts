// Prayer reminders that arrive even when the app is closed (Web Push — free, built into every modern browser).
//
// How it fits together:
//   1. In the Prayer page you switch reminders on; the browser gives us a private "push address" (a subscription).
//   2. We store it (in the free Upstash Redis) with your rounded position, time zone, calculation method and the prayers you want.
//   3. A scheduler calls /api/push/dispatch every few minutes (a GitHub Action, or cron-job.org). For each subscription we work out,
//      on the server and with the same on-device maths, whether a prayer's time has just arrived, and send a small push message.
//   4. The service worker (public/sw.js) shows it, even if no page is open.
// Nothing here knows who you are: no name, no email, no account — only the push address and a ~100 m position.
import { createHash } from 'node:crypto'
import webpush from 'web-push'
import { computeTimes, localDay, minutesNowIn } from './prayer-calc'
import { toHijri, addDays } from './hijri'
import { suggestTopic, topicById } from './khutbah'
import { redis, redisConfigured } from './redis'

import { EXTRA_IDS, LEADS, PRAYERS, type ExtraKey, type PrayerKey } from './push-shared'
export { LEADS, PRAYERS, type ExtraKey, type PrayerKey }
const NAMES: Record<PrayerKey, { en: string; ar: string }> = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },
}

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } }
export type Reminder = { sub: PushSub; lat: number; lng: number; tz: string; method: number; prayers: PrayerKey[]; leadMin: number; created: number; extras?: ExtraKey[] }

export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && redisConfigured())

// ───────── validation ─────────
// Browsers hand out push addresses on a handful of well-known services. Only those are accepted, so nobody can make our server
// send requests to an address of their choosing. (Tests add their own fake server with PUSH_ALLOW_HOSTS.)
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^updates-autopush\.(stage\.)?mozaws\.net$/, /\.notify\.windows\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/]

export function allowedEndpoint(endpoint: string): boolean {
  let u: URL
  try {
    u = new URL(endpoint)
  } catch {
    return false
  }
  const extra = (process.env.PUSH_ALLOW_HOSTS || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (extra.includes(u.host)) return u.protocol === 'http:' || u.protocol === 'https:'
  return u.protocol === 'https:' && !u.username && !u.password && PUSH_HOSTS.some((r) => r.test(u.hostname))
}

const b64url = /^[A-Za-z0-9_-]+={0,2}$/
export function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function parseReminder(body: unknown): Reminder | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const s = b.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined
  if (!s || typeof s.endpoint !== 'string' || s.endpoint.length > 600 || !allowedEndpoint(s.endpoint)) return null
  const p256dh = s.keys?.p256dh
  const auth = s.keys?.auth
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !b64url.test(p256dh) || !b64url.test(auth) || p256dh.length > 120 || auth.length > 40) return null
  const lat = Number(b.lat)
  const lng = Number(b.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const method = Number(b.method)
  if (!Number.isInteger(method) || method < 0 || method > 23) return null
  if (!validTimeZone(b.tz)) return null
  const prayers = (Array.isArray(b.prayers) ? b.prayers : []).filter((p): p is PrayerKey => (PRAYERS as readonly string[]).includes(p as string))
  if (!prayers.length) return null
  const leadMin = LEADS.includes(Number(b.leadMin)) ? Number(b.leadMin) : 0
  const extras = [...new Set((Array.isArray(b.extras) ? b.extras : []).filter((x): x is ExtraKey => EXTRA_IDS.includes(x as string)))]
  return {
    sub: { endpoint: s.endpoint, keys: { p256dh, auth } },
    lat: Number(lat.toFixed(3)), // ~100 m is plenty for prayer times, and is all we keep
    lng: Number(lng.toFixed(3)),
    tz: b.tz,
    method,
    prayers: [...new Set(prayers)],
    leadMin,
    created: Date.now(),
    ...(extras.length ? { extras } : {}),
  }
}

export const subId = (endpoint: string) => createHash('sha256').update(endpoint).digest('base64url').slice(0, 22)

// ───────── which reminders are due now? (pure, tested) ─────────
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

export function dueNow(r: Pick<Reminder, 'lat' | 'lng' | 'tz' | 'method' | 'prayers' | 'leadMin'>, now: Date, windowMin: number): { prayer: PrayerKey; time: string }[] {
  const times = computeTimes(r.lat, r.lng, r.method, now, r.tz)
  if (!times) return []
  const here = minutesNowIn(r.tz, now)
  const out: { prayer: PrayerKey; time: string }[] = []
  for (const p of r.prayers) {
    const target = (((minutesOf(times[p]) - r.leadMin) % 1440) + 1440) % 1440
    const sinceTarget = (here - target + 1440) % 1440
    if (sinceTarget < windowMin) out.push({ prayer: p, time: times[p] })
  }
  return out
}

// ───────── the extra (sunnah) reminders ─────────
// Times are relative to the day's prayer times at the user's place; the calendar day, weekday and Hijri day are that place's own.
// Hijri days come from the Umm al-Qura calendar (a calculation; the moon-sighting day can differ by one).
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function dueExtras(r: Pick<Reminder, 'lat' | 'lng' | 'tz' | 'method'> & { extras?: ExtraKey[] }, now: Date, windowMin: number): { extra: ExtraKey; message: ReturnType<typeof extraMessage> }[] {
  if (!r.extras?.length) return []
  const times = computeTimes(r.lat, r.lng, r.method, now, r.tz)
  if (!times) return []
  const here = minutesNowIn(r.tz, now)
  const day = localDay(now, r.tz)
  const weekday = day.getDay()
  const hijriDay = toHijri(day).day
  const at = (hhmm: string, plus: number) => (minutesOf(hhmm) + plus) % 1440
  const hit = (target: number) => (here - target + 1440) % 1440 < windowMin
  const out: { extra: ExtraKey; message: ReturnType<typeof extraMessage> }[] = []
  for (const e of r.extras) {
    let ok = false
    let detail = ''
    if (e === 'adhkar-morning') ok = hit(at(times.fajr, 30))
    else if (e === 'adhkar-evening') ok = hit(at(times.asr, 30))
    else if (e === 'kahf') ok = weekday === 5 && hit(at(times.sunrise, 30))
    else if (e === 'khutbah-topic') {
      ok = weekday === 4 && hit(at(times.maghrib, 30))
      const fri = addDays(day, 1)
      detail = suggestTopic(toHijri(fri), Math.floor(fri.getTime() / (7 * 86400_000)))
    } else if (e === 'fast-mon-thu') {
      ok = (weekday === 0 || weekday === 3) && hit(at(times.maghrib, 30))
      detail = WEEKDAY[(weekday + 1) % 7]
    } else if (e === 'fast-white') {
      ok = hijriDay >= 12 && hijriDay <= 14 && hit(at(times.maghrib, 30))
      detail = String(hijriDay + 1)
    }
    if (ok) out.push({ extra: e, message: extraMessage(e, detail) })
  }
  return out
}

export function extraMessage(e: ExtraKey, detail = '') {
  switch (e) {
    case 'adhkar-morning':
      return { title: 'Morning adhkar 🌅', body: 'Begin the day remembering Allah.', url: '/duas', tag: 'sunnah-adhkar-morning' }
    case 'adhkar-evening':
      return { title: 'Evening adhkar 🌇', body: 'A few minutes of remembrance before the night.', url: '/duas', tag: 'sunnah-adhkar-evening' }
    case 'kahf':
      return { title: 'Jumu‘ah mubarak 🕌', body: 'A Friday sunnah: read Surat al-Kahf today.', url: '/quran/18', tag: 'sunnah-kahf' }
    case 'khutbah-topic':
      return { title: 'Tomorrow is Jumu‘ah 🎙️', body: `A suggested sermon topic: ${topicById(detail)?.title ?? 'Taqwa'}.`, url: `/khutbah?topic=${encodeURIComponent(detail)}`, tag: 'sunnah-khutbah' }
    case 'fast-mon-thu':
      return { title: 'Fasting tomorrow?', body: `Tomorrow is ${detail} — a day the Prophet ﷺ often fasted.`, url: '/prayer', tag: 'sunnah-fast' }
    case 'fast-white':
      return { title: 'The white days', body: `Tomorrow is the ${detail}th of the Hijri month: fasting the 13th, 14th and 15th is a recommended sunnah.`, url: '/calendar', tag: 'sunnah-white' }
  }
}

export function messageFor(prayer: PrayerKey, time: string, leadMin: number) {
  const n = NAMES[prayer]
  return {
    title: leadMin > 0 ? `${n.en} in ${leadMin} minutes` : `${n.en} — time to pray`,
    body: `${n.ar} · ${time}`,
    url: '/prayer',
    tag: `prayer-${prayer}`,
  }
}

// The calendar day in the user's time zone, used to send each prayer's reminder once a day.
export const dayIn = (tz: string, now: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

// ───────── storage (Redis) ─────────
// The scheduler visits every device every few minutes within one minute of run time, which comfortably handles about this many.
// Past it, new sign-ups are paused (devices already signed up keep working) rather than letting reminders slip late for everyone.
export const MAX_DEVICES = 10_000
export async function roomForDevice(endpoint: string): Promise<boolean> {
  const [n, has] = (await redis([['SCARD', 'push:ids'], ['EXISTS', `push:sub:${subId(endpoint)}`]])) as [number, number]
  return Number(has) === 1 || Number(n) < MAX_DEVICES
}

export async function saveReminder(r: Reminder) {
  const id = subId(r.sub.endpoint)
  await redis([
    ['SET', `push:sub:${id}`, JSON.stringify(r), 'EX', 60 * 60 * 24 * 120], // forgotten after ~4 months of not being refreshed
    ['SADD', 'push:ids', id],
  ])
  return id
}
export async function deleteReminder(endpoint: string) {
  const id = subId(endpoint)
  await redis([['DEL', `push:sub:${id}`], ['SREM', 'push:ids', id]])
}
export async function getReminder(endpoint: string): Promise<Reminder | null> {
  const [raw] = await redis([['GET', `push:sub:${subId(endpoint)}`]])
  return typeof raw === 'string' ? (JSON.parse(raw) as Reminder) : null
}

// The library builds the encrypted message and the signed headers; we send it ourselves with fetch (so it works the same
// everywhere, including a plain-http test server — the library's own sender only speaks https).
export async function sendTo(r: Reminder, message: ReturnType<typeof messageFor>): Promise<'sent' | 'gone' | 'failed'> {
  try {
    const details = webpush.generateRequestDetails(r.sub, JSON.stringify(message), {
      TTL: 3600,
      urgency: 'high',
      vapidDetails: { subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
    })
    const res = await fetch(details.endpoint, { method: details.method, headers: details.headers as Record<string, string>, body: details.body ? new Uint8Array(details.body) : undefined, signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (res.status === 404 || res.status === 410) return 'gone'
    return res.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}

// Called by the scheduler. Looks at every subscription, sends what is due, never twice for the same prayer on the same day.
export async function dispatch(now: Date, windowMin: number): Promise<{ checked: number; sent: number; removed: number; failed: number }> {
  const [ids] = (await redis([['SMEMBERS', 'push:ids']])) as [string[]]
  const out = { checked: 0, sent: 0, removed: 0, failed: 0 }
  for (let i = 0; i < ids.length; i += 25) {
    const batch = ids.slice(i, i + 25)
    const rows = (await redis(batch.map((id) => ['GET', `push:sub:${id}`]))) as (string | null)[]
    await Promise.all(
      rows.map(async (raw, k) => {
        if (!raw) {
          await redis([['SREM', 'push:ids', batch[k]]]).catch(() => {}) // expired
          return
        }
        out.checked++
        const r = JSON.parse(raw) as Reminder
        for (const d of dueNow(r, now, windowMin)) {
          const [claimed] = await redis([['SET', `push:sent:${batch[k]}:${dayIn(r.tz, now)}:${d.prayer}`, '1', 'NX', 'EX', 90_000]])
          if (claimed !== 'OK') continue // already sent today
          const result = await sendTo(r, messageFor(d.prayer, d.time, r.leadMin))
          if (result === 'sent') out.sent++
          else if (result === 'gone') {
            out.removed++
            await deleteReminder(r.sub.endpoint).catch(() => {})
            break
          } else out.failed++
        }
        for (const d of dueExtras(r, now, windowMin)) {
          const [claimed] = await redis([['SET', `push:sent:${batch[k]}:${dayIn(r.tz, now)}:${d.extra}`, '1', 'NX', 'EX', 90_000]])
          if (claimed !== 'OK') continue
          const result = await sendTo(r, d.message)
          if (result === 'sent') out.sent++
          else if (result === 'gone') {
            out.removed++
            await deleteReminder(r.sub.endpoint).catch(() => {})
            break
          } else out.failed++
        }
      })
    )
  }
  return out
}
