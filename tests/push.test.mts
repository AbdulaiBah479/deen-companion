// Tests prayer-reminder logic: who may subscribe, what is due when, and what the message says.  Run: npm run test:push
import { computeTimes } from '../src/lib/prayer-calc.ts'
import { allowedEndpoint, dayIn, dueExtras, dueNow, extraMessage, messageFor, parseReminder, subId, validTimeZone } from '../src/lib/push.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
delete process.env.PUSH_ALLOW_HOSTS

// ───────── endpoints: only real browser push services ─────────
ok('Chrome/Edge/Firefox/Safari/Windows push services are accepted', ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc', 'https://web.push.apple.com/QW', 'https://wns2-par02p.notify.windows.com/w/?token=x'].every(allowedEndpoint))
ok('plain http, other hosts, look-alikes and embedded passwords are refused', ['http://fcm.googleapis.com/x', 'https://evil.example/fcm.googleapis.com', 'https://fcm.googleapis.com.evil.example/x', 'https://user:pw@fcm.googleapis.com/x', 'ftp://fcm.googleapis.com/x', 'not a url', '', 'https://localhost/x', 'https://169.254.169.254/latest'].every((e) => !allowedEndpoint(e)))
process.env.PUSH_ALLOW_HOSTS = 'localhost:4010'
ok('a test host can be allowed explicitly (and only that exact host:port)', allowedEndpoint('http://localhost:4010/push/a') && !allowedEndpoint('http://localhost:4011/push/a') && !allowedEndpoint('http://localhost/push/a'))
delete process.env.PUSH_ALLOW_HOSTS

// ───────── parsing what the browser sends ─────────
const good = { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' } }, lat: 21.42251, lng: 39.82619, tz: 'Asia/Riyadh', method: 4, prayers: ['fajr', 'dhuhr', 'dhuhr', 'bogus'], leadMin: 10 }
const r = parseReminder(good)!
ok('valid settings are accepted, trimmed and de-duplicated', !!r && r.prayers.join() === 'fajr,dhuhr' && r.leadMin === 10 && r.method === 4 && r.tz === 'Asia/Riyadh')
ok('position is cut to 3 decimals (~100 m)', r.lat === 21.423 && r.lng === 39.826, `${r.lat},${r.lng}`)
ok('an unknown lead time falls back to "at prayer time"', parseReminder({ ...good, leadMin: 7 })!.leadMin === 0)
const bad = (patch: object) => parseReminder({ ...good, ...patch }) === null
ok('refused: bad endpoint, keys, position, method, time zone, no prayers', bad({ subscription: { ...good.subscription, endpoint: 'https://evil.example/x' } }) && bad({ subscription: { endpoint: good.subscription.endpoint, keys: { p256dh: '<script>', auth: 'x' } } }) && bad({ lat: 200 }) && bad({ lng: NaN }) && bad({ method: 99 }) && bad({ method: 2.5 }) && bad({ tz: 'Mars/Phobos' }) && bad({ prayers: [] }) && bad({ prayers: ['bogus'] }))
ok('refused: not an object at all', [null, undefined, 'x', 5, []].every((b) => parseReminder(b) === null))
ok('time zone check', validTimeZone('Europe/London') && validTimeZone('UTC') && !validTimeZone('Nope/Zone') && !validTimeZone(5) && !validTimeZone('x'.repeat(100)))
ok('the subscription id is short, stable and not the endpoint itself', subId('a') === subId('a') && subId('a') !== subId('b') && subId('https://x/' + 'y'.repeat(200)).length === 22 && !subId('abc').includes('abc'))

// ───────── what is due when ─────────
const mk = (extra: object = {}) => ({ lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh', method: 4, prayers: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[], leadMin: 0, ...extra })
const noon = new Date(Date.UTC(2026, 2, 20, 9, 0))
const t = computeTimes(21.4225, 39.8262, 4, noon, 'Asia/Riyadh')!
const [dh, dm] = t.dhuhr.split(':').map(Number)
const dhuhrAt = Date.UTC(2026, 2, 20, dh - 3, dm) // Riyadh is UTC+3
const due = (ms: number, extra = {}) => dueNow(mk(extra), new Date(ms), 6).map((d) => d.prayer).join()
ok('at the minute a prayer arrives it is due', due(dhuhrAt) === 'dhuhr', due(dhuhrAt))
ok('still due for the rest of the 6-minute window (so a late scheduler run still catches it)', due(dhuhrAt + 5 * 60_000) === 'dhuhr')
ok('not due a minute early, nor after the window', due(dhuhrAt - 60_000) === '' && due(dhuhrAt + 6 * 60_000) === '')
ok('"10 minutes before" is due 10 minutes earlier, and not at the prayer time any more', due(dhuhrAt - 10 * 60_000, { leadMin: 10 }) === 'dhuhr' && due(dhuhrAt + 12 * 60_000, { leadMin: 10 }) === '')
ok('only the prayers you chose', due(dhuhrAt, { prayers: ['fajr'] }) === '')
const hit = new Set<string>()
for (let m = 0; m < 24 * 60; m++) for (const d of dueNow(mk(), new Date(Date.UTC(2026, 2, 20, 0, 0) + m * 60_000), 1)) hit.add(d.prayer)
ok('over a whole day every one of the five prayers comes up exactly in some minute', [...hit].sort().join() === 'asr,dhuhr,fajr,isha,maghrib', [...hit].join())
let total = 0
for (let m = 0; m < 24 * 60; m++) total += dueNow(mk(), new Date(Date.UTC(2026, 2, 20, 0, 0) + m * 60_000), 1).length
ok('with a 1-minute window each prayer is due exactly once a day (no double reminders)', total === 5, String(total))
const jak = (m: number) => dueNow({ ...mk({ lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta', method: 20 }) }, new Date(Date.UTC(2026, 2, 20, 0, 0) + m * 60_000), 1).length
let jtotal = 0
for (let m = 0; m < 24 * 60; m++) jtotal += jak(m)
ok('same for another time zone (Jakarta)', jtotal === 5, String(jtotal))
const wrap = (() => {
  let n = 0
  for (let m = 0; m < 24 * 60; m++) n += dueNow(mk({ leadMin: 30 }), new Date(Date.UTC(2026, 2, 20, 0, 0) + m * 60_000), 1).length
  return n
})()
ok('lead times work across midnight too', wrap === 5, String(wrap))
ok('an unsupported method never sends (rather than guessing)', dueNow(mk({ method: 7 }), new Date(dhuhrAt), 6).length === 0)

// ───────── message and day key ─────────
const m0 = messageFor('maghrib', '18:32', 0)
const m10 = messageFor('fajr', '04:10', 10)
ok('message: name, Arabic, time, where to open', m0.title === 'Maghrib — time to pray' && m0.body.includes('المغرب') && m0.body.includes('18:32') && m0.url === '/prayer' && m0.tag === 'prayer-maghrib')
ok('message: early reminder says how early', m10.title === 'Fajr in 10 minutes')
ok('the "day" is the place’s own day (once-a-day marker)', dayIn('Asia/Jakarta', new Date(Date.UTC(2026, 2, 20, 23, 30))) === '2026-03-21' && dayIn('Europe/London', new Date(Date.UTC(2026, 2, 20, 23, 30))) === '2026-03-20')

// ───────── the extra (sunnah) reminders ─────────
const xr = (extras: string[]) => ({ lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh', method: 4, extras: extras as never[] })
const hits = (extras: string[], day: number, month = 2) => {
  const names: string[] = []
  for (let m = 0; m < 24 * 60; m++) for (const d of dueExtras(xr(extras), new Date(Date.UTC(2026, month, day, 0, 0) - 3 * 3_600_000 + m * 60_000), 1)) names.push(d.extra)
  return names
}
ok('extras are parsed, de-duplicated, and unknown ones dropped', parseReminder({ ...good, extras: ['kahf', 'kahf', 'nope', 7] })!.extras?.join() === 'kahf' && parseReminder(good)!.extras === undefined)
ok('adhkar come once a day: morning after Fajr, evening after Asr', hits(['adhkar-morning'], 21).length === 1 && hits(['adhkar-evening'], 21).length === 1)
ok('Surat al-Kahf is Friday only (20 Mar 2026 is a Friday)', hits(['kahf'], 20).length === 1 && hits(['kahf'], 21).length === 0 && hits(['kahf'], 19).length === 0)
ok('Monday/Thursday fasting is announced the evening before (Sun 22, Wed 25 Mar)', hits(['fast-mon-thu'], 22).length === 1 && hits(['fast-mon-thu'], 25).length === 1 && hits(['fast-mon-thu'], 23).length === 0 && hits(['fast-mon-thu'], 21).length === 0)
ok('the tomorrow named in the fasting message is right', dueExtras(xr(['fast-mon-thu']), new Date(Date.UTC(2026, 2, 22, 16, 0)), 1440).map((d) => d.message.body).join().includes('Monday'))
let white = 0
for (let day = 25; day <= 41; day++) white += hits(['fast-white'], day, 2).length // 25 March–10 April 2026 holds one Hijri month's 12th–14th
ok('white-days reminder fires on exactly three evenings a Hijri month', white === 3, String(white))
ok('nothing extra is sent when none are chosen', dueExtras(xr([]), new Date(Date.UTC(2026, 2, 20, 12, 0)), 1440).length === 0)
ok('extra messages open the right page', extraMessage('kahf').url === '/quran/18' && extraMessage('adhkar-morning').url === '/duas')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
