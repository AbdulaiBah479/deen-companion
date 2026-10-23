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

// The direction the top of the phone points, in degrees clockwise from true North, from the browser's orientation
// angles (W3C DeviceOrientation: alpha = compass rotation, beta = front/back tilt, gamma = left/right tilt).
// Unlike "360 - alpha", this stays right when the phone is held upright, which is how people hold it.
export function compassHeading(alpha: number, beta: number, gamma: number): number {
  const a = rad(alpha)
  const b = rad(beta)
  const g = rad(gamma)
  // Where the top edge of the phone points (best when it lies flat)…
  const tx = -Math.sin(a) * Math.cos(b)
  const ty = Math.cos(a) * Math.cos(b)
  // …and where its back points (best when it is held upright).
  const bx = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g)
  const by = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g)
  const [x, y] = Math.hypot(tx, ty) >= Math.hypot(bx, by) ? [tx, ty] : [bx, by]
  return (deg(Math.atan2(x, y)) + 360) % 360
}

// Smallest signed turn (−180…180) from one heading to another; positive means turn clockwise.
export function turnBetween(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180
}
