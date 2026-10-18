// Qibla bearing computed locally (great-circle initial bearing to the Kaaba). No network needed.

const KAABA = { lat: 21.422487, lng: 39.826206 }
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export function qiblaBearing(lat: number, lng: number): number {
  const phi1 = rad(lat)
  const phi2 = rad(KAABA.lat)
  const dLng = rad(KAABA.lng - lng)
  const y = Math.sin(dLng) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

// Distance to the Kaaba in km (haversine).
export function distanceToKaaba(lat: number, lng: number): number {
  const R = 6371
  const dLat = rad(KAABA.lat - lat)
  const dLng = rad(KAABA.lng - lng)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
