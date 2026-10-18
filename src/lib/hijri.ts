// Islamic (Hijri) calendar using the browser's built-in Umm al-Qura calendar — works offline, no API.
// Note: Umm al-Qura is a calculated calendar. Local moon-sighting can differ by a day, so month starts and Eid dates
// may shift by one day in your country; confirm with your local authority.

export type Hijri = { day: number; month: number; year: number }

export const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-awwal", "Rabi' al-thani", 'Jumada al-awwal', 'Jumada al-thani',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
]

const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' })

// Dates are handled at local noon so daylight-saving changes can never push a day across a boundary.
export const atNoon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)

export function toHijri(date: Date): Hijri {
  const parts = fmt.formatToParts(atNoon(date))
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { day: get('day'), month: get('month'), year: get('year') }
}

export function addDays(date: Date, n: number): Date {
  const d = atNoon(date)
  d.setDate(d.getDate() + n)
  return d
}

export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export type IslamicEvent = { id: string; title: string; note?: string; kind: 'eid' | 'holy' | 'fast' | 'info' }

// Widely observed dates. Rulings on optional practices differ by school; these are well-established ones only.
export function eventsOn(h: Hijri): IslamicEvent[] {
  const out: IslamicEvent[] = []
  const { day, month } = h
  if (month === 1 && day === 1) out.push({ id: 'new-year', title: 'Islamic New Year', note: 'First day of Muharram', kind: 'holy' })
  if (month === 1 && day === 10) out.push({ id: 'ashura', title: 'Day of Ashura', note: 'Fasting is recommended (ideally with the 9th or 11th)', kind: 'fast' })
  if (month === 9 && day === 1) out.push({ id: 'ramadan', title: 'Ramadan begins', note: 'The month of fasting and the Quran', kind: 'holy' })
  if (month === 9 && day >= 21 && day <= 30) out.push({ id: 'last-ten', title: 'Last ten nights of Ramadan', note: 'Seek Laylat al-Qadr, especially on the odd nights', kind: 'holy' })
  if (month === 10 && day === 1) out.push({ id: 'eid-fitr', title: 'Eid al-Fitr', note: 'Fasting is not permitted today', kind: 'eid' })
  if (month === 10 && day >= 2 && day <= 7) out.push({ id: 'six-shawwal', title: 'Six days of Shawwal', note: 'Fasting six days of Shawwal is recommended', kind: 'fast' })
  if (month === 12 && day === 9) out.push({ id: 'arafah', title: 'Day of Arafah', note: 'Fasting is recommended for those not on Hajj', kind: 'fast' })
  if (month === 12 && day === 10) out.push({ id: 'eid-adha', title: 'Eid al-Adha', note: 'Fasting is not permitted today', kind: 'eid' })
  if (month === 12 && day >= 11 && day <= 13) out.push({ id: 'tashreeq', title: 'Days of Tashreeq', note: 'Days of eating and remembering Allah', kind: 'info' })
  // The "white days" (13–15) are a recommended fast each month, except where fasting is not permitted.
  // (13 Dhu al-Hijjah is a day of Tashreeq, when fasting is not permitted.)
  const whiteDay = day >= 13 && day <= 15 && !(month === 12 && day === 13)
  if (whiteDay) out.push({ id: 'white-days', title: 'White days', note: 'Fasting the 13th, 14th and 15th is recommended', kind: 'fast' })
  return out
}

export type DayCell = { date: Date; key: string; hijri: Hijri; events: IslamicEvent[]; isToday: boolean }

// Gregorian month grid starting on `weekStart` (0 = Sunday); leading/trailing cells are null padding.
export function monthGrid(year: number, month: number, today: Date, weekStart = 0): (DayCell | null)[] {
  const first = new Date(year, month, 1, 12)
  const lead = (first.getDay() - weekStart + 7) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (DayCell | null)[] = Array(lead).fill(null)
  const todayKey = dateKey(today)
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d, 12)
    const hijri = toHijri(date)
    cells.push({ date, key: dateKey(date), hijri, events: eventsOn(hijri), isToday: dateKey(date) === todayKey })
  }
  while (cells.length % 7) cells.push(null)
  return cells
}

// The Hijri month(s) covered by a Gregorian month, e.g. "Rabi' al-awwal – Rabi' al-thani 1448".
export function hijriRangeLabel(cells: (DayCell | null)[]): string {
  const real = cells.filter((c): c is DayCell => !!c)
  const a = real[0].hijri
  const b = real[real.length - 1].hijri
  const name = (h: Hijri) => HIJRI_MONTHS[h.month - 1]
  return a.month === b.month && a.year === b.year ? `${name(a)} ${a.year}` : a.year === b.year ? `${name(a)} – ${name(b)} ${a.year}` : `${name(a)} ${a.year} – ${name(b)} ${b.year}`
}

// The next "major" occasion on or after `from` (Eids, Ramadan, Ashura, Arafah, New Year).
const MAJOR = new Set(['new-year', 'ashura', 'ramadan', 'eid-fitr', 'arafah', 'eid-adha'])
export function nextMajorEvent(from: Date, horizonDays = 400): { event: IslamicEvent; date: Date; daysAway: number } | null {
  for (let i = 0; i <= horizonDays; i++) {
    const date = addDays(from, i)
    const ev = eventsOn(toHijri(date)).find((e) => MAJOR.has(e.id))
    if (ev) return { event: ev, date, daysAway: i }
  }
  return null
}

// Gregorian date of a Hijri date (searches near the approximate position; returns null if not found, e.g. day 30 of a 29-day month).
export function fromHijri(h: Hijri): Date | null {
  // 1 Muharram 1 AH ≈ 16 July 622 CE; a Hijri year averages ~354.37 days.
  const approx = new Date(Date.UTC(622, 6, 16) + ((h.year - 1) * 354.367 + (h.month - 1) * 29.53 + (h.day - 1)) * 86400000)
  const start = atNoon(new Date(approx.getUTCFullYear(), approx.getUTCMonth(), approx.getUTCDate()))
  for (let i = -45; i <= 45; i++) {
    const d = addDays(start, i)
    const x = toHijri(d)
    if (x.day === h.day && x.month === h.month && x.year === h.year) return d
  }
  return null
}
