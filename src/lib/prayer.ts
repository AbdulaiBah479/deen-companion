// Prayer times, Qibla and Hijri date from api.aladhan.com (free, no key).

import { geocodeFirst } from './geocode'
import { canCalculate, computeTimes } from './prayer-calc'

const ALADHAN_API = 'https://api.aladhan.com/v1'

// AlAdhan answers in under a second almost always, but occasionally takes 15–30 s. A "hedged" request handles both: send one
// request; if there is no answer after HEDGE_MS, send a second in parallel and use whichever succeeds first. Fast answers cost
// nothing extra (the second request is never sent). Everything gives up after TOTAL_MS.
export const HEDGE_MS = 4000
const TOTAL_MS = 30000

export async function aladhan(path: string, revalidate = 3600, hedgeMs = HEDGE_MS) {
  const attempt = async () => {
    const res = await fetch(`${ALADHAN_API}${path}`, { signal: AbortSignal.timeout(TOTAL_MS), next: { revalidate } })
    return res.json()
  }
  const first = attempt()
  let started = false
  const second = new Promise<unknown>((resolve, reject) => {
    const start = () => {
      if (started) return
      started = true
      attempt().then(resolve, reject)
    }
    const timer = setTimeout(start, hedgeMs)
    first.then(
      () => clearTimeout(timer), // answered in time: the backup is never sent
      () => {
        clearTimeout(timer)
        start() // failed outright: try again straight away instead of waiting
      }
    )
  })
  second.catch(() => {}) // if the backup is never used, a late failure must not surface
  return Promise.any([first, second]) as Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any
}

type Timings = { Fajr: string; Sunrise: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string }

function shape(data: { timings: Timings; date: { readable: string; hijri: { date: string } } }) {
  return {
    fajr: data.timings.Fajr,
    sunrise: data.timings.Sunrise,
    dhuhr: data.timings.Dhuhr,
    asr: data.timings.Asr,
    maghrib: data.timings.Maghrib,
    isha: data.timings.Isha,
    date: data.date.readable,
    hijri: data.date.hijri.date,
  }
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

// So the app can calculate this city's times itself from now on (instant, offline — see prayer-calc.ts) we send back where the city is
// and its time zone. AlAdhan's own coordinates for a city are placeholders, so the position comes from OpenStreetMap — and is only
// handed out if our own calculation for it agrees with AlAdhan's times to within 3 minutes (a wrong "Cairo" would not).
async function geoFor(shaped: ReturnType<typeof shape>, tz: string | undefined, city: string, country: string, method: number) {
  if (!tz || !canCalculate(method)) return undefined
  const where = await geocodeFirst(`${city}, ${country}`)
  if (!where) return undefined
  const mine = computeTimes(where.lat, where.lng, method, new Date(), tz)
  if (!mine) return undefined
  const same = (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).every((k) => {
    const d = Math.abs(mins(mine[k]) - mins(shaped[k]))
    return Math.min(d, 1440 - d) <= 3
  })
  return same ? { lat: where.lat, lng: where.lng, tz } : undefined
}

// method: 2 = ISNA, 3 = MWL, 4 = Umm al-Qura (Makkah), etc.
export async function getPrayerTimes(city: string, country: string, method: number = 2) {
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const data = await aladhan(
      `/timingsByCity/${timestamp}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`
    )
    if (data.code !== 200) return null
    const shaped = shape(data.data)
    return { ...shaped, geo: await geoFor(shaped, data.data.meta?.timezone, city, country, method) }
  } catch (error) {
    console.error('Failed to fetch prayer times:', error)
    return null
  }
}

export type PrayerTimes = NonNullable<Awaited<ReturnType<typeof getPrayerTimes>>>

// Same as getPrayerTimes, but from GPS coordinates (more accurate than a city name).
export async function getPrayerTimesByCoords(latitude: number, longitude: number, method: number = 2) {
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const data = await aladhan(`/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=${method}`)
    return data.code === 200 ? shape(data.data) : null
  } catch (error) {
    console.error('Failed to fetch prayer times by coordinates:', error)
    return null
  }
}

// Returns degrees from North towards Makkah.
export async function getQiblaDirection(latitude: number, longitude: number) {
  try {
    const data = await aladhan(`/qibla/${latitude}/${longitude}`, 86400)
    return data.data?.direction ?? null
  } catch (error) {
    console.error('Failed to fetch Qibla:', error)
    return null
  }
}

export async function getHijriDate() {
  try {
    const today = new Date()
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`
    const data = await aladhan(`/gToH?date=${dateStr}`, 3600)
    return data.data?.hijri || null
  } catch (error) {
    console.error('Failed to get Hijri date:', error)
    return null
  }
}

export const PRAYER_NAMES = {
  fajr: { en: 'Fajr', ar: 'الفجر', ur: 'فجر', icon: '🌅' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر', ur: 'ظہر', icon: '☀️' },
  asr: { en: 'Asr', ar: 'العصر', ur: 'عصر', icon: '🌤' },
  maghrib: { en: 'Maghrib', ar: 'المغرب', ur: 'مغرب', icon: '🌇' },
  isha: { en: 'Isha', ar: 'العشاء', ur: 'عشاء', icon: '🌙' },
}
