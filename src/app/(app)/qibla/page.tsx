'use client'

import { useEffect, useRef, useState } from 'react'
import { errorMessage, getPosition, permissionState } from '@/lib/location'
import { distanceToKaaba, qiblaBearing } from '@/lib/qibla'
import { useStored } from '@/lib/storage'

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number }

export default function QiblaPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  const [heading, setHeading] = useState<number | null>(null)
  const [compassOn, setCompassOn] = useState(false)
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

  async function enableCompass() {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    if (typeof DOE?.requestPermission === 'function') {
      const result = await DOE.requestPermission()
      if (result !== 'granted') {
        setError('Compass permission was denied.')
        return
      }
    }
    const handler = (e: Event) => {
      const ev = e as OrientationEventWithCompass
      if (typeof ev.webkitCompassHeading === 'number') setHeading(ev.webkitCompassHeading)
      else if (ev.alpha !== null) setHeading((360 - ev.alpha) % 360)
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

  const bearing = coords ? qiblaBearing(coords.lat, coords.lng) : null
  const rotation = bearing !== null ? (heading !== null ? bearing - heading : bearing) : 0

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
          <div className="relative w-64 h-64 mx-auto my-6 rounded-full border-4 border-[#0F766E] bg-white">
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-500">N</span>
            <div
              className="absolute inset-0 transition-transform duration-300"
              style={{ transform: `rotate(${rotation}deg)` }}
              aria-hidden="true"
            >
              <div className="absolute left-1/2 top-4 -translate-x-1/2 text-4xl">🕋</div>
              <div className="absolute left-1/2 top-14 bottom-1/2 w-1 -translate-x-1/2 bg-[#D4AF37] rounded" />
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
                : 'Live compass on — turn until the Kaaba points up.'}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-6">
            Calibrate your phone’s compass and keep it away from metal. Compare with a trusted local source.
          </p>
        </>
      )}
    </div>
  )
}
