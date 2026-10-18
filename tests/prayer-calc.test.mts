// Checks on-device prayer times against the AlAdhan web service (reference values fetched for 20 March 2026,
// kept in tests/fixtures-aladhan-2026-03-20.jsonl).  Run: npm run test:prayercalc
import { readFileSync } from 'node:fs'
import { canCalculate, computeTimes, methodForCountry, minutesNowIn, paramsFor } from '../src/lib/prayer-calc.ts'
import { loadPrayerTimes } from '../src/lib/prayer-source.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const gap = (a: string, b: string) => {
  const d = Math.abs(mins(a) - mins(b))
  return Math.min(d, 1440 - d)
}

type Ref = { name: string; lat: number; lng: number; method: number; tz: string; Fajr: string; Sunrise: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string }
const REFS: Ref[] = readFileSync(new URL('./fixtures-aladhan-2026-03-20.jsonl', import.meta.url), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))

const day = new Date(Date.UTC(2026, 2, 20, 9, 0)) // 09:00 UTC is 20 March in every time zone from UTC-9 to UTC+14
for (const r of REFS) {
  const t = computeTimes(r.lat, r.lng, r.method, day, r.tz)!
  const diffs = { Fajr: gap(t.fajr, r.Fajr), Sunrise: gap(t.sunrise, r.Sunrise), Dhuhr: gap(t.dhuhr, r.Dhuhr), Asr: gap(t.asr, r.Asr), Maghrib: gap(t.maghrib, r.Maghrib), Isha: gap(t.isha, r.Isha) }
  const worst = Math.max(...Object.values(diffs))
  ok(`${r.name} (method ${r.method}): all six times within 2 minutes of AlAdhan`, worst <= 2, `worst ${worst} min ${JSON.stringify(diffs)} mine=${t.fajr}/${t.dhuhr}/${t.asr}/${t.maghrib}/${t.isha}`)
}

// ───────── properties that must always hold ─────────
const sample = computeTimes(51.5074, -0.1278, 3, day, 'Europe/London')!
const order = [sample.fajr, sample.sunrise, sample.dhuhr, sample.asr, sample.maghrib, sample.isha].map(mins)
ok('times come in the right order through the day', order.every((m, i) => i === 0 || m > order[i - 1]), JSON.stringify(sample))
ok('formatting: HH:MM with leading zeros', /^\d\d:\d\d$/.test(sample.fajr) && /^\d\d:\d\d$/.test(sample.isha))
ok('date is readable', sample.date === '20 Mar 2026', sample.date)
ok('Hijri date for 20 Mar 2026 is 1 Shawwal 1447 (Eid al-Fitr)', sample.hijri === '01-10-1447', sample.hijri)
ok('methods the app offers are supported; unknown ones fall back to the web service', [1, 2, 3, 4, 5, 9, 10, 12, 13, 15, 17, 20].every(canCalculate) && !canCalculate(0) && !canCalculate(7) && !canCalculate(99) && paramsFor(99) === null)
ok('bad coordinates return null instead of crashing', computeTimes(91, 0, 2) === null && computeTimes(0, 181, 2) === null && computeTimes(NaN, 0, 2) === null)
ok('an unsupported method returns null (the caller then uses the web service)', computeTimes(51.5, -0.1, 7) === null)
const summer = computeTimes(64.14, -21.9, 3, new Date(Date.UTC(2026, 5, 21, 9)), 'Atlantic/Reykjavik')
ok('extreme latitude (Reykjavik at midsummer) still gives six well-formed times', !!summer && [summer.fajr, summer.sunrise, summer.dhuhr, summer.asr, summer.maghrib, summer.isha].every((v) => /^\d\d:\d\d$/.test(v)), JSON.stringify(summer))

// ───────── a place's own calendar day and clock ─────────
const lateUtc = new Date(Date.UTC(2026, 2, 20, 23, 30))
ok("'today' is the place's own day: 23:30 UTC on 20 March is already 21 March in Jakarta", computeTimes(-6.2088, 106.8456, 20, lateUtc, 'Asia/Jakarta')?.date === '21 Mar 2026')
ok('…but still 20 March in London', computeTimes(51.5074, -0.1278, 3, lateUtc, 'Europe/London')?.date === '20 Mar 2026')
ok('the Hijri date follows that day too (Eid al-Fitr 1447 starts 20 March; in Jakarta it is already the 2nd)', computeTimes(-6.2088, 106.8456, 20, lateUtc, 'Asia/Jakarta')?.hijri === '02-10-1447', computeTimes(-6.2088, 106.8456, 20, lateUtc, 'Asia/Jakarta')?.hijri)
const noonUtc = new Date(Date.UTC(2026, 2, 20, 12, 0))
ok('clock in another time zone: 12:00 UTC = 17:00 in Karachi, 14:00 in Cairo, 12:00 in London (before DST)', minutesNowIn('Asia/Karachi', noonUtc) === 17 * 60 && minutesNowIn('Africa/Cairo', noonUtc) === 14 * 60 && minutesNowIn('Europe/London', noonUtc) === 12 * 60, [minutesNowIn('Asia/Karachi', noonUtc), minutesNowIn('Africa/Cairo', noonUtc), minutesNowIn('Europe/London', noonUtc)].join())
ok('midnight reads as 0, not 24', minutesNowIn('UTC', new Date(Date.UTC(2026, 2, 20, 0, 5))) === 5)

// A saved city (position + time zone known) is calculated here — no web request at all.
const realFetch = globalThis.fetch
let calls = 0
globalThis.fetch = (async () => { calls++; throw new Error('network is off') }) as typeof fetch
const city = await loadPrayerTimes({ kind: 'city', city: 'Cairo', country: 'Egypt', geo: { lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo' } }, 5)
ok('a saved city is calculated on the device (no network)', !!city && calls === 0 && /^\d\d:\d\d$/.test(city.fajr), JSON.stringify(city))
let failed = false
try { await loadPrayerTimes({ kind: 'city', city: 'Cairo', country: 'Egypt' }, 5) } catch { failed = true }
ok('a city we have never looked up still needs the web service', failed && calls === 1)
const unsupported = await loadPrayerTimes({ kind: 'coords', lat: 51.5, lng: -0.1 }, 7).catch(() => 'fell back')
ok('a method not covered on-device falls back to the web service', unsupported === 'fell back' && calls === 2)
globalThis.fetch = realFetch

// ───────── the usual method for a country ─────────
ok('Saudi Arabia → Umm al-Qura, Egypt → Egyptian, Pakistan → Karachi, Turkey → Diyanet, Indonesia → Kemenag, Malaysia → JAKIM', methodForCountry('sa') === 4 && methodForCountry('EG') === 5 && methodForCountry('pk') === 1 && methodForCountry('tr') === 13 && methodForCountry('id') === 20 && methodForCountry('my') === 17)
ok('USA and Canada → ISNA, France → UOIF, Qatar and Kuwait have their own', methodForCountry('us') === 2 && methodForCountry('ca') === 2 && methodForCountry('fr') === 12 && methodForCountry('qa') === 10 && methodForCountry('kw') === 9)
ok('anywhere else (or nothing) → Muslim World League', methodForCountry('gb') === 3 && methodForCountry('ng') === 3 && methodForCountry(undefined) === 3 && methodForCountry('') === 3 && methodForCountry('zz') === 3)
ok('every method it can pick is one the device can calculate', ['sa', 'eg', 'pk', 'tr', 'id', 'my', 'us', 'fr', 'qa', 'kw', 'gb'].every((c) => canCalculate(methodForCountry(c))))

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
