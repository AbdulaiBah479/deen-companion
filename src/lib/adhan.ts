// Prayer alarms: which sound, which prayers, how early, and when each alarm should fire. The timing rules are pure functions so they
// can be tested without a browser (tests/adhan.test.mts).
import { PRAYERS, type PrayerKey } from './push-shared'

export type AdhanVoice = { id: string; name: string; file: string; credit: string; licence: string; source: string }

// Recordings from Wikimedia Commons that are free to reuse. Their licences are shown on the credits page and under the picker.
// Nothing here has been judged by a scholar for recitation quality; please listen with "Test" and choose the one you prefer.
export const ADHANS: AdhanVoice[] = [
  { id: 'aaqib', name: 'Call to prayer — Aaqib Azeez', file: '/adhan/aaqib-azeez.mp3', credit: 'Aaqib Azeez (Atcovi)', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3' },
  { id: 'beautiful', name: 'Beautiful adhan', file: '/adhan/beautiful-adhan.ogg', credit: 'Adam-synagda', licence: 'CC0 (public domain dedication)', source: 'https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg' },
  { id: 'azan', name: 'Azan', file: '/adhan/azan.ogg', credit: 'Andrewler', licence: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Azan.ogg' },
]
export const adhanById = (id: string) => ADHANS.find((a) => a.id === id) ?? ADHANS[0]

export type Mode = 'adhan' | 'notify' | 'off'
export type AlarmSettings = {
  on: boolean // the master switch for alarms played or shown by this page while the app is open
  modes: Record<PrayerKey, Mode>
  adhan: string
  volume: number // 0.2 – 1
  lead: number // minutes before the prayer for a gentle "coming up" notification (0 = none)
  sunrise: boolean // a notification at sunrise (the end of Fajr time)
}
export const DEFAULT_ALARMS: AlarmSettings = {
  on: false,
  modes: { fajr: 'adhan', dhuhr: 'adhan', asr: 'adhan', maghrib: 'adhan', isha: 'adhan' },
  adhan: 'aaqib',
  volume: 0.8,
  lead: 0,
  sunrise: false,
}
export const LEAD_CHOICES = [0, 5, 10, 15, 30]

// A saved value from an older version or a damaged browser store is repaired rather than trusted.
export function cleanAlarms(raw: unknown): AlarmSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AlarmSettings>
  const modes = { ...DEFAULT_ALARMS.modes }
  for (const p of PRAYERS) {
    const m = (r.modes as Record<string, unknown> | undefined)?.[p]
    if (m === 'adhan' || m === 'notify' || m === 'off') modes[p] = m
  }
  return {
    on: r.on === true,
    modes,
    adhan: ADHANS.some((a) => a.id === r.adhan) ? (r.adhan as string) : DEFAULT_ALARMS.adhan,
    volume: typeof r.volume === 'number' && r.volume >= 0.2 && r.volume <= 1 ? r.volume : DEFAULT_ALARMS.volume,
    lead: LEAD_CHOICES.includes(r.lead as number) ? (r.lead as number) : 0,
    sunrise: r.sunrise === true,
  }
}

// Seconds since midnight now, in a place's own time zone (the device's if none).
export function secondsNowIn(timeZone?: string, now: Date = new Date()): number {
  if (!timeZone) return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return (get('hour') % 24) * 3600 + get('minute') * 60 + get('second')
}

const toSeconds = (t: string) => {
  const [h, m] = t.split(' ')[0].split(':').map(Number)
  return h * 3600 + m * 60
}

export type DayTimes = { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string }
export const ORDER = PRAYERS

// The next prayer, and how many seconds away it is. After Isha it is tomorrow's Fajr (today's Fajr time is used for it; the real
// time moves by about a minute a day, so the countdown is approximate until the day changes and the page loads the new times).
export function nextPrayerIn(times: DayTimes, nowSeconds: number): { prayer: PrayerKey; inSeconds: number; tomorrow: boolean } {
  for (const p of ORDER) {
    const at = toSeconds(times[p])
    if (at > nowSeconds) return { prayer: p, inSeconds: at - nowSeconds, tomorrow: false }
  }
  return { prayer: 'fajr', inSeconds: 86400 - nowSeconds + toSeconds(times.fajr), tomorrow: true }
}

export function countdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

export type Alarm = { key: string; prayer: PrayerKey | 'sunrise'; kind: 'prayer' | 'lead' | 'sunrise'; mode: Mode; delayMs: number; leadMin?: number }

// Every alarm that should still fire in the next 24 hours, soonest first. Alarms already in the past are skipped.
export function upcomingAlarms(times: DayTimes, nowSeconds: number, s: AlarmSettings): Alarm[] {
  if (!s.on) return []
  const out: Alarm[] = []
  const add = (prayer: Alarm['prayer'], kind: Alarm['kind'], mode: Mode, atSeconds: number, leadMin?: number) => {
    for (const dayShift of [0, 86400]) {
      const delay = atSeconds + dayShift - nowSeconds
      if (delay > 0 && delay <= 86400) {
        out.push({ key: `${prayer}-${kind}-${dayShift ? 'next' : 'today'}`, prayer, kind, mode, delayMs: delay * 1000, leadMin })
        return // only the nearest occurrence in the next 24 hours
      }
    }
  }
  for (const p of ORDER) {
    const mode = s.modes[p]
    if (mode === 'off') continue
    const at = toSeconds(times[p])
    add(p, 'prayer', mode, at)
    if (s.lead > 0) add(p, 'lead', 'notify', at - s.lead * 60, s.lead)
  }
  if (s.sunrise) add('sunrise', 'sunrise', 'notify', toSeconds(times.sunrise))
  return out.sort((a, b) => a.delayMs - b.delayMs)
}
