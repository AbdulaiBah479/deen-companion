// Prayer times calculated on the device with the open-source "adhan" library (astronomical formulas, no network).
//
// Why: instant (no waiting for a web service), works offline, and never fails when a free API is slow — the AlAdhan service
// sometimes took 3–25 s. It is used when you share your location. A city you type in still uses the AlAdhan service, because it
// knows that city's time zone. The numbers are checked against AlAdhan for nine cities (tests/prayer-calc.test.mts, ±2 minutes).
import { CalculationMethod, CalculationParameters, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from 'adhan'
import { toHijri } from './hijri'

export type CalcTimes = { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string; date: string; hijri: string }

// AlAdhan method numbers (as used in the Prayer page menu) → adhan parameters. null = not supported here (fall back to the web service).
export function paramsFor(method: number): CalculationParameters | null {
  switch (method) {
    case 1: return CalculationMethod.Karachi()
    case 2: return CalculationMethod.NorthAmerica()
    case 3: return CalculationMethod.MuslimWorldLeague()
    case 4: return CalculationMethod.UmmAlQura()
    case 5: return CalculationMethod.Egyptian()
    case 9: return CalculationMethod.Kuwait()
    case 10: return CalculationMethod.Qatar()
    case 13: return CalculationMethod.Turkey()
    case 15: return CalculationMethod.MoonsightingCommittee()
    case 12: return new CalculationParameters('Other', 12, 12) // UOIF (France): 12° / 12°
    case 17: return new CalculationParameters('Other', 20, 18) // JAKIM (Malaysia): 20° / 18°
    case 20: return new CalculationParameters('Other', 20, 18) // Kemenag (Indonesia): 20° / 18°
    default: return null
  }
}

export const canCalculate = (method: number) => paramsFor(method) !== null

// The method most mosques in a country follow (AlAdhan method numbers), by ISO country code. Anywhere not listed uses the Muslim World
// League method, the common default for Europe, Africa and most of Asia. You can always change it on the Prayer page.
const BY_COUNTRY: Record<string, number> = {
  us: 2, ca: 2, // ISNA (North America)
  sa: 4, ae: 4, om: 4, ye: 4, bh: 4, // Umm al-Qura (Arabian peninsula)
  qa: 10, kw: 9,
  eg: 5, sy: 5, lb: 5, iq: 5, ps: 5, jo: 5, sd: 5, ly: 5, // Egyptian General Authority
  pk: 1, in: 1, bd: 1, af: 1, lk: 1, np: 1, // University of Islamic Sciences, Karachi
  tr: 13, // Diyanet
  id: 20, // Kemenag
  my: 17, sg: 17, bn: 17, // JAKIM
  fr: 12, // UOIF
}
export const methodForCountry = (code?: string): number => (code && BY_COUNTRY[code.toLowerCase()]) || 3

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The hour and minute right now in a place's own time zone (the device's, if none is given).
export function minutesNowIn(timeZone?: string, now: Date = new Date()): number {
  if (!timeZone) return now.getHours() * 60 + now.getMinutes()
  const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return (get('hour') % 24) * 60 + get('minute')
}

// The calendar day at a place, as a Date at local noon (so its year/month/day/weekday are that place's).
export function localDay(date: Date, timeZone?: string): Date {
  if (!timeZone) return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  const p = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date)
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value)
  return new Date(n('year'), n('month') - 1, n('day'), 12)
}

// `date` is an instant. With a `timeZone`, "today" means today in that place (a city on the other side of the world can already be
// on tomorrow's date); without one, the device's own day is used — right for a position that came from the device.
export function computeTimes(lat: number, lng: number, method: number, date: Date = new Date(), timeZone?: string): CalcTimes | null {
  if (timeZone) {
    // Re-express the instant as the calendar day in that place; adhan reads the year, month and day of the Date it is given.
    const p = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date)
    const n = (t: string) => Number(p.find((x) => x.type === t)?.value)
    date = new Date(n('year'), n('month') - 1, n('day'), 12)
  }
  const params = paramsFor(method)
  if (!params || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const coords = new Coordinates(lat, lng)
  params.madhab = Madhab.Shafi // standard (earlier) Asr, the same default as the web service
  // Use the plain twilight angles wherever the sun really reaches them (this matches the AlAdhan service and mosque timetables).
  // Only far north/south in summer, when it never gets dark enough, fall back to the recommended high-latitude rule.
  let t = new PrayerTimes(coords, date, params)
  const bad = (x: PrayerTimes) => [x.fajr, x.sunrise, x.dhuhr, x.asr, x.maghrib, x.isha].some((d) => Number.isNaN(d.getTime()))
  if (bad(t)) {
    params.highLatitudeRule = HighLatitudeRule.recommended(coords)
    t = new PrayerTimes(coords, date, params)
    if (bad(t)) return null
  }
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone })
  const hm = (d: Date) => fmt.format(d).replace(/^24:/, '00:')
  const h = toHijri(date)
  return {
    fajr: hm(t.fajr),
    sunrise: hm(t.sunrise),
    dhuhr: hm(t.dhuhr),
    asr: hm(t.asr),
    maghrib: hm(t.maghrib),
    isha: hm(t.isha),
    date: `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    hijri: `${String(h.day).padStart(2, '0')}-${String(h.month).padStart(2, '0')}-${h.year}`,
  }
}
