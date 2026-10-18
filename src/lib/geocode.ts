// City name -> coordinates (server only), via OpenStreetMap Nominatim (free; light use, descriptive User-Agent).
const UA = 'DeenCompanion/0.1 (open-source Islamic app)'

export async function geocodeFirst(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const rows = (await res.json()) as { lat: string; lon: string }[]
    const lat = Number(rows[0]?.lat)
    const lng = Number(rows[0]?.lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: Number(lat.toFixed(3)), lng: Number(lng.toFixed(3)) } : null
  } catch {
    return null
  }
}
