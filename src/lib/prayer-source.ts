// One place that decides how prayer times are obtained:
//  • a saved position (from your device) → calculated right here, instantly and offline (lib/prayer-calc.ts);
//  • a typed city → the AlAdhan web service the first time (it knows the city's position and time zone), then calculated here;
//  • a method the on-device maths doesn't cover → the AlAdhan web service via /api/prayer.
import { computeTimes } from './prayer-calc'

export type Geo = { lat: number; lng: number; tz: string }
export type PlaceLike = { kind: 'coords'; lat: number; lng: number } | { kind: 'city'; city: string; country: string; geo?: Geo }
export type TimesLike = { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string; date: string; hijri: string; geo?: Geo }

export async function loadPrayerTimes(place: PlaceLike, method: number): Promise<TimesLike | null> {
  if (place.kind === 'coords') {
    const local = computeTimes(place.lat, place.lng, method)
    if (local) return local
  }
  // A city we already know the position and time zone of: calculate it here too (instant and offline).
  if (place.kind === 'city' && place.geo) {
    const local = computeTimes(place.geo.lat, place.geo.lng, method, new Date(), place.geo.tz)
    if (local) return { ...local, geo: place.geo }
  }
  const qs =
    place.kind === 'coords'
      ? `lat=${place.lat}&lng=${place.lng}&method=${method}`
      : `city=${encodeURIComponent(place.city)}&country=${encodeURIComponent(place.country)}&method=${method}`
  const res = await fetch(`/api/prayer?${qs}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed')
  return data.times ?? null
}
