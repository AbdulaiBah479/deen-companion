// A rough position from the request headers the host adds (Vercel: x-vercel-ip-*). City-level only, rounded to 0.1° (about 11 km),
// used as a last resort so Qibla works even when the device will not share its location. Nothing is stored.
export type RoughPlace = { lat: number; lng: number; name: string; approx: true }

export function roughPlace(h: { get(name: string): string | null }): RoughPlace | null {
  const lat = Number(h.get('x-vercel-ip-latitude'))
  const lng = Number(h.get('x-vercel-ip-longitude'))
  if (!h.get('x-vercel-ip-latitude') || !h.get('x-vercel-ip-longitude') || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  let city = ''
  try {
    city = decodeURIComponent(h.get('x-vercel-ip-city') || '')
  } catch {}
  const country = (h.get('x-vercel-ip-country') || '').slice(0, 2).toUpperCase()
  const name = [city.replace(/[\u0000-\u001F<>]/g, '').slice(0, 60), country].filter(Boolean).join(', ') || 'Your area'
  return { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10, name, approx: true }
}
