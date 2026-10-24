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

// Phone compasses jitter by a few degrees even when held still. This steadies them:
//  • readings are averaged as directions (so 359° and 1° average to 0°, not 180°),
//  • small wobbles are ignored (a dead-band), so the needle stays put when you stay put,
//  • a real turn is followed quickly, so it never feels laggy.
export class HeadingFilter {
  private x = 0
  private y = 0
  private has = false
  private shown: number | null = null
  private slow: number
  private fast: number
  private deadband: number
  constructor(slow = 0.12, fast = 0.5, deadband = 1.5) {
    this.slow = slow
    this.fast = fast
    this.deadband = deadband
  }

  // Feed a raw heading; returns the steadied heading to show (changes only when the move is worth showing).
  push(h: number): number {
    const r = rad(h)
    const cx = Math.cos(r)
    const cy = Math.sin(r)
    if (!this.has || this.shown === null) {
      this.x = cx
      this.y = cy
      this.has = true
      this.shown = (h + 360) % 360
      return this.shown
    }
    const away = Math.abs(turnBetween(this.shown, h))
    const k = away > 25 ? this.fast : away > 8 ? (this.slow + this.fast) / 2 : this.slow
    this.x += (cx - this.x) * k
    this.y += (cy - this.y) * k
    const smooth = (deg(Math.atan2(this.y, this.x)) + 360) % 360
    if (Math.abs(turnBetween(this.shown, smooth)) >= this.deadband) this.shown = smooth
    return this.shown
  }

  reset() {
    this.has = false
    this.shown = null
  }
}

// Keeps a dial angle continuous: going from 359° to 1° adds 2°, instead of spinning back 358°.
export function unwrap(previousAngle: number, nextHeading: number): number {
  const prevHeading = ((previousAngle % 360) + 360) % 360
  return previousAngle + turnBetween(prevHeading, nextHeading)
}
