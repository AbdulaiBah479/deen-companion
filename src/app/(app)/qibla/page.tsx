'use client'

import { useEffect, useRef, useState } from 'react'
import { errorMessage, getPosition, permissionState } from '@/lib/location'
import { HeadingFilter, compassHeading, distanceToKaaba, qiblaBearing, turnBetween, unwrap } from '@/lib/qibla'
import { useStored } from '@/lib/storage'

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number }

export default function QiblaPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  const [heading, setHeading] = useState<number | null>(null)
  const [compassOn, setCompassOn] = useState(false)
  const [declination, setDeclination] = useState(0) // magnetic north → true north, in degrees, for where you are
  const [offset, setOffset] = useStored<number>('deen:qibla-offset', 0) // your own nudge if your phone's compass reads off
  const handlerRef = useRef<((e: Event) => void) | null>(null)

  const [place, , placeReady] = useStored<{ kind: string; lat?: number; lng?: number } | null>('deen:place', null)

  async function locate() {
    setError('')
    try {
      setCoords(await getPosition({ highAccuracy: true }))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  // Show the saved location straight away, then refine it if location access is already allowed.
  useEffect(() => {
    if (!placeReady) return
    if (place?.kind === 'coords' && typeof place.lat === 'number' && typeof place.lng === 'number') setCoords({ lat: place.lat, lng: place.lng })
    permissionState().then((p) => {
      if (p.state === 'granted') locate()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeReady])

  // Android and desktop browsers need no permission, so the compass starts by itself. iPhone must be asked (a tap).
  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
    if (DOE && typeof DOE.requestPermission !== 'function') void enableCompass()
  }, [])

  async function enableCompass() {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    if (typeof DOE?.requestPermission === 'function') {
      const result = await DOE.requestPermission()
      if (result !== 'granted') {
        setError('Compass permission was denied.')
        return
      }
    }
    // iPhone gives a true-north heading directly. Android gives it in "deviceorientationabsolute"; the plain
    // "deviceorientation" event there is relative to wherever the phone happened to point at start, so it must be ignored.
    // Raw readings jitter, so they go through a steadying filter before they reach the screen.
    const filter = new HeadingFilter()
    const push = (h: number) => setHeading(filter.push(h))
    const handler = (e: Event) => {
      const ev = e as OrientationEventWithCompass
      if (typeof ev.webkitCompassHeading === 'number') push(ev.webkitCompassHeading)
      else if (ev.alpha !== null && ev.beta !== null && ev.gamma !== null && (e.type === 'deviceorientationabsolute' || ev.absolute === true)) push(compassHeading(ev.alpha, ev.beta, ev.gamma))
    }
    handlerRef.current = handler
    window.addEventListener('deviceorientationabsolute', handler)
    window.addEventListener('deviceorientation', handler)
    setCompassOn(true)
  }

  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        window.removeEventListener('deviceorientationabsolute', handlerRef.current)
        window.removeEventListener('deviceorientation', handlerRef.current)
      }
    }
  }, [])

  // Phones point to MAGNETIC north; the Qibla bearing is measured from TRUE north. The gap (up to ~12° in parts of
  // North America) comes from the World Magnetic Model, loaded only on this page.
  useEffect(() => {
    if (!coords) return
    let off = false
    import('geomagnetism')
      .then((g) => {
        const d = g.default.model(new Date()).point([coords.lat, coords.lng]).decl
        if (!off && Number.isFinite(d)) setDeclination(d)
      })
      .catch(() => {})
    return () => {
      off = true
    }
  }, [coords])

  const bearing = coords ? qiblaBearing(coords.lat, coords.lng) : null
  // The dial turns with the phone (North moves), so the Kaaba reaches the top mark when you face it.
  const trueHeading = heading !== null ? (heading + declination + offset + 720) % 360 : null
  // Keep the dial angle continuous so crossing north never spins it the long way round.
  const [unwrapped, setUnwrapped] = useState(0)
  useEffect(() => {
    if (trueHeading !== null) setUnwrapped((prev) => unwrap(prev, trueHeading))
  }, [trueHeading])
  const dialTurn = -unwrapped
  const off = bearing !== null && trueHeading !== null ? turnBetween(trueHeading, bearing) : null
  const facing = off !== null && Math.abs(off) <= 5

  return (
    <div className="text-center">
      <h1 className="text-2xl font-black text-[#0F766E] mb-4 text-left">Qibla Finder</h1>

      {!coords && (
        <button onClick={locate} className="px-5 py-3 rounded-xl bg-[#0F766E] text-white font-semibold">
          Use my location
        </button>
      )}
      {error && <p className="text-red-600 mt-3">{error}</p>}

      {coords && bearing !== null && (
        <>
          <div className={`relative w-64 h-64 mx-auto my-6 rounded-full border-4 bg-white ${facing ? 'border-[#16A34A]' : 'border-[#0F766E]'}`}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[#0F766E] text-lg leading-none" aria-hidden="true">▼</span>
            <div className="absolute inset-0 transition-transform duration-200 ease-out" style={{ transform: `rotate(${dialTurn}deg)` }} aria-hidden="true">
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-500">N</span>
              <div className="absolute inset-0" style={{ transform: `rotate(${bearing}deg)` }}>
                <div className="absolute left-1/2 top-4 -translate-x-1/2 text-4xl">🕋</div>
                <div className="absolute left-1/2 top-14 bottom-1/2 w-1 -translate-x-1/2 bg-[#D4AF37] rounded" />
              </div>
            </div>
          </div>
          <p className="text-3xl font-black text-[#0F766E]">{Math.round(bearing)}°</p>
          <p className="text-gray-500 text-sm mb-1">from true North (clockwise)</p>
          <p className="text-gray-500 text-sm mb-5">{Math.round(distanceToKaaba(coords.lat, coords.lng)).toLocaleString()} km to the Kaaba</p>

          {!compassOn ? (
            <button onClick={enableCompass} className="px-5 py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold">
              Turn on live compass
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              {heading === null
                ? 'Waiting for compass… (not available on most laptops)'
                : facing
                  ? '✅ You are facing the Qibla.'
                  : `Turn ${Math.abs(Math.round(off ?? 0))}° to your ${(off ?? 0) > 0 ? 'right' : 'left'} until the Kaaba reaches the top mark.`}
            </p>
          )}
          {compassOn && heading !== null && (
            <div className="mt-3 text-xs text-gray-500 flex items-center justify-center gap-2">
              <span>Compass reads off?</span>
              <button onClick={() => setOffset(Math.max(-45, offset - 2))} aria-label="Turn the compass 2 degrees left" className="w-8 h-8 rounded-full border border-gray-300">
                −
              </button>
              <span className="w-12 tabular-nums">{offset > 0 ? '+' : ''}{offset}°</span>
              <button onClick={() => setOffset(Math.min(45, offset + 2))} aria-label="Turn the compass 2 degrees right" className="w-8 h-8 rounded-full border border-gray-300">
                +
              </button>
              {offset !== 0 && (
                <button onClick={() => setOffset(0)} className="underline">
                  reset
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-6">
            Move your phone in a figure-8 to calibrate it, and keep it away from metal and magnets. The compass is corrected for magnetic declination where you are ({declination >= 0 ? '+' : ''}{declination.toFixed(1)}°). Compare with a trusted local source.
          </p>
        </>
      )}
    </div>
  )
}
