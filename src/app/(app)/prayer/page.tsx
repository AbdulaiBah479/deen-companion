'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, getPosition, placeInfo, readSaved } from '@/lib/location'
import { methodForCountry } from '@/lib/prayer-calc'
import { PRAYER_NAMES } from '@/lib/prayer'
import { countdown, nextPrayerIn, secondsNowIn } from '@/lib/adhan'
import { loadPrayerTimes } from '@/lib/prayer-source'
import PrayerAlarms from '@/components/PrayerAlarms'
import PushReminders from '@/components/PushReminders'
import type { Place } from '@/lib/use-prayer-times'
import { localDateKey, useStored } from '@/lib/storage'

type Times = {
  fajr: string
  sunrise: string
  dhuhr: string
  asr: string
  maghrib: string
  isha: string
  date: string
  hijri: string
}

const ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const METHODS: [number, string][] = [
  [2, 'ISNA (North America)'],
  [3, 'Muslim World League'],
  [4, 'Umm al-Qura (Makkah)'],
  [5, 'Egyptian General Authority'],
  [1, 'University of Islamic Sciences, Karachi'],
  [15, 'Moonsighting Committee'],
  [13, 'Diyanet (Turkey)'],
  [17, 'JAKIM (Malaysia)'],
  [20, 'Kemenag (Indonesia)'],
  [12, 'UOIF (France)'],
  [10, 'Qatar'],
  [9, 'Kuwait'],
]

const clean = (t: string) => t.split(' ')[0]

export default function PrayerPage() {
  const [place, setPlace, placeReady] = useStored<Place>('deen:place', { kind: 'city', city: 'London', country: 'UK' })
  const [, setAuto] = useStored<boolean | null>('deen:place-auto', null)
  const [method, setMethod] = useStored<number>('deen:method', 2)
  const [, setMethodChosen] = useStored<boolean>('deen:method-chosen', false)
  const [city, setCity] = useState('London')
  const [country, setCountry] = useState('UK')
  const [times, setTimes] = useState<Times | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useStored<Record<string, Record<string, boolean>>>('deen:prayers', {})
  const [today, setToday] = useState('')
  const [nowSec, setNowSec] = useState<number | null>(null)

  const load = useCallback(async (p: Place, m: number) => {
    setLoading(true)
    setError('')
    try {
      const t = await loadPrayerTimes(p, m)
      if (!t) throw new Error('No times')
      setTimes(t)
      // First time for this city: keep its position and time zone so the next visit is instant and works offline.
      if (p.kind === 'city' && !p.geo && t.geo) {
        const cur = readSaved<Place>('deen:place')
        if (cur?.kind === 'city' && cur.city === p.city && cur.country === p.country) setPlace({ ...cur, geo: t.geo })
      }
    } catch {
      setTimes(null)
      setError('Could not find prayer times for that place.')
    } finally {
      setLoading(false)
    }
  }, [setPlace])

  // Initial load once saved settings are read.
  useEffect(() => {
    if (!placeReady) return
    const now = new Date()
    const day = localDateKey(now)
    setToday(day)
    if (place.kind === 'city') {
      setCity(place.city)
      setCountry(place.country)
    } else {
      setCity('')
      setCountry('')
    }
    load(place, method)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeReady])

  function submitCity(e: React.FormEvent) {
    e.preventDefault()
    const p: Place = { kind: 'city', city: city.trim(), country: country.trim() }
    setPlace(p)
    setAuto(false) // your own choice: never overwritten by automatic location
    load(p, method)
  }

  async function locateMe() {
    setLoading(true)
    setError('')
    try {
      const c = await getPosition()
      const p: Place = { kind: 'coords', lat: c.lat, lng: c.lng, label: 'Your location' }
      setPlace(p)
      setAuto(true)
      load(p, method)
      // The city name is a nicety: it fills in when the lookup returns and never delays the prayer times.
      placeInfo(c).then(({ name: label, cc }) => {
        const cur = readSaved<Place>('deen:place')
        if (cur?.kind === 'coords' && cur.lat === c.lat && cur.lng === c.lng) {
          setPlace({ ...cur, label })
          // The usual method for that country, unless you chose one yourself.
          if (cc && !readSaved<boolean>('deen:method-chosen')) {
            const m = methodForCountry(cc)
            setMethod(m)
            load({ ...cur, label }, m)
          }
        }
      })
    } catch (e) {
      setLoading(false)
      setError(errorMessage(e))
    }
  }

  function changeMethod(m: number) {
    setMethod(m)
    setMethodChosen(true) // from now on the app never overrides your choice
    load(place, m)
  }

  const done = log[today] ?? {}
  function toggle(p: string) {
    if (!today) return
    setLog((l) => ({ ...l, [today]: { ...(l[today] ?? {}), [p]: !(l[today] ?? {})[p] } }))
  }

  // A clock that ticks every second (for the countdown), and a new day loads the new day's times.
  const tz = place.kind === 'city' ? place.geo?.tz : undefined
  const dayKey = useCallback(() => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()), [tz])
  const shownDay = useRef('')
  useEffect(() => {
    if (!placeReady) return
    shownDay.current = dayKey()
    const id = window.setInterval(() => {
      setNowSec(secondsNowIn(tz))
      const k = dayKey()
      if (shownDay.current && k !== shownDay.current) {
        shownDay.current = k
        setToday(localDateKey(new Date()))
        load(place, method)
      }
    }, 1000)
    setNowSec(secondsNowIn(tz))
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeReady, tz, place, method])

  const next = times && nowSec !== null ? nextPrayerIn(times, nowSec) : null
  const upcoming = next?.prayer ?? null
  const count = ORDER.filter((p) => done[p]).length

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">Prayer Times</h1>
      {times && (
        <p className="text-gray-500 text-sm mb-4">
          {times.date} · {times.hijri} AH
          {place.kind === 'coords' ? ` · 📍 ${place.label || 'your location'}` : ` · ${place.city}`}
        </p>
      )}

      <form onSubmit={submitCity} className="flex gap-2 mb-2">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          aria-label="City"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 bg-white"
        />
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          aria-label="Country"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 bg-white"
        />
        <button
          type="submit"
          disabled={loading || !city.trim() || !country.trim()}
          className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50"
        >
          {loading ? '…' : 'Go'}
        </button>
      </form>
      <div className="flex gap-2 mb-5">
        <button onClick={locateMe} disabled={loading} className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold disabled:opacity-50">
          📍 Use my location
        </button>
        <select
          value={method}
          onChange={(e) => changeMethod(Number(e.target.value))}
          aria-label="Calculation method"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
        >
          {METHODS.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      {times && (
        <>
          <div className="bg-gradient-to-br from-[#0F766E] to-[#15803D] text-white rounded-2xl p-5 mb-4">
            <div className="text-sm opacity-80">Next prayer</div>
            <div className="text-3xl font-black">
              {upcoming && PRAYER_NAMES[upcoming].en} <span className="text-[#E6C86A]">{upcoming && clean(times[upcoming])}</span>
            </div>
            {next && (
              <div className="text-lg font-bold mt-1 tabular-nums" data-testid="prayer-countdown" aria-label="Time until the next prayer">
                in {countdown(next.inSeconds)}{next.tomorrow ? ' (tomorrow, approximately)' : ''}
              </div>
            )}
            <div className="text-sm opacity-80 mt-1">Sunrise {clean(times.sunrise)}</div>
          </div>

          <PrayerAlarms times={times} timeZone={tz} />

          <PushReminders place={place} method={method} />

          <p className="text-sm text-gray-600 mb-2">
            Today: {count}/5 prayers marked ({today})
          </p>
          <ul className="space-y-2">
            {ORDER.map((p) => (
              <li
                key={p}
                className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 ${
                  p === upcoming ? 'border-[#0F766E]' : 'border-gray-200'
                }`}
              >
                <span className="text-2xl">{PRAYER_NAMES[p].icon}</span>
                <span className="flex-1">
                  <span className="font-bold">{PRAYER_NAMES[p].en}</span>{' '}
                  <span className="text-gray-500" dir="rtl" lang="ar">
                    {PRAYER_NAMES[p].ar}
                  </span>
                </span>
                <span className="font-mono font-bold">{clean(times[p])}</span>
                <button
                  onClick={() => toggle(p)}
                  aria-pressed={!!done[p]}
                  className={`w-9 h-9 rounded-full border-2 font-bold ${
                    done[p] ? 'bg-[#0F766E] border-[#0F766E] text-white' : 'border-gray-300 text-transparent'
                  }`}
                  aria-label={`Mark ${PRAYER_NAMES[p].en} as prayed`}
                >
                  ✓
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
