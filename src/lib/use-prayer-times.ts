'use client'

import { useEffect, useState } from 'react'
import { loadPrayerTimes } from './prayer-source'
import { useStored } from './storage'

export type Times = { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string; date: string; hijri: string; geo?: { lat: number; lng: number; tz: string } }
export type Place = { kind: 'city'; city: string; country: string; geo?: { lat: number; lng: number; tz: string } } | { kind: 'coords'; lat: number; lng: number; label: string }

// Prayer times for the place and method saved on the Prayer page.
export function usePrayerTimes() {
  const [place, , placeReady] = useStored<Place>('deen:place', { kind: 'city', city: 'London', country: 'UK' })
  const [method] = useStored<number>('deen:method', 2)
  const [times, setTimes] = useState<Times | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!placeReady) return
    let cancelled = false
    loadPrayerTimes(place, method)
      .then((t) => {
        if (cancelled) return
        if (t) setTimes(t)
        else setError('Prayer times unavailable')
      })
      .catch(() => !cancelled && setError('Prayer times unavailable'))
    return () => {
      cancelled = true
    }
  }, [place, placeReady, method])

  return { times, error, place }
}

export const clock = (t: string) => t.split(' ')[0]
export const minutesOfDay = (t: string) => {
  const [h, m] = clock(t).split(':').map(Number)
  return h * 60 + m
}
