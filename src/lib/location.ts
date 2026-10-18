// Device location helpers shared by the prayer, Qibla and mosque pages and the first-run location prompt.
// Position stays on the device: only a ~1 km rounded copy is ever sent (to look up a city name or prayer times).

export type Coords = { lat: number; lng: number }

export function distanceKm(a: Coords, b: Coords): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Re-detect only when you have really moved (a few km of GPS noise or Wi-Fi guessing shouldn't change your prayer times).
export const MOVED_KM = 10
export const hasMoved = (from: Coords, to: Coords) => distanceKm(from, to) >= MOVED_KM

export type LocationError = 'unsupported' | 'denied' | 'unavailable' | 'timeout'

export function getPosition(opts: { highAccuracy?: boolean; maxAgeMs?: number } = {}): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return reject('unsupported' satisfies LocationError)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Number(p.coords.latitude.toFixed(3)), lng: Number(p.coords.longitude.toFixed(3)) }),
      (e) => reject((e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable') as LocationError),
      { enableHighAccuracy: !!opts.highAccuracy, timeout: 15000, maximumAge: opts.maxAgeMs ?? 10 * 60_000 }
    )
  })
}

export const errorMessage = (e: unknown): string =>
  e === 'denied'
    ? 'Location is blocked for this site. Allow it in your browser settings, or choose a city.'
    : e === 'unsupported'
      ? 'This device cannot share its location. Choose a city instead.'
      : e === 'timeout'
        ? 'Finding your location took too long. Try again, or choose a city.'
        : 'Could not find your location. Try again, or choose a city.'

// Reads a saved value straight from storage, so a delayed callback never acts on a stale copy held by one component.
export function readSaved<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

// "Cairo, Egypt" (and the country code) for a position; a generic label if the lookup fails.
export async function placeInfo(c: Coords): Promise<{ name: string; cc?: string }> {
  try {
    const r = await fetch(`/api/geocode?lat=${c.lat}&lng=${c.lng}`, { signal: AbortSignal.timeout(8000) })
    const d = await r.json()
    if (r.ok && typeof d.name === 'string' && d.name) return { name: d.name, cc: typeof d.cc === 'string' ? d.cc : undefined }
  } catch {}
  return { name: 'Your location' }
}
export const placeName = async (c: Coords) => (await placeInfo(c)).name

// 'granted' | 'prompt' | 'denied' | 'unknown' (browsers without the Permissions API, e.g. older Safari).
export async function permissionState(): Promise<{ state: 'granted' | 'prompt' | 'denied' | 'unknown'; onChange: (fn: () => void) => () => void }> {
  try {
    const s = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return {
      state: s.state,
      onChange: (fn) => {
        s.addEventListener('change', fn)
        return () => s.removeEventListener('change', fn)
      },
    }
  } catch {
    return { state: 'unknown', onChange: () => () => {} }
  }
}
