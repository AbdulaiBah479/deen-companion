'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, getPosition, hasMoved, permissionState, placeInfo, readSaved } from '@/lib/location'
import { methodForCountry } from '@/lib/prayer-calc'
import { useStored } from '@/lib/storage'
import type { Place } from '@/lib/use-prayer-times'

// Uses the device's real location for prayer times, Qibla and nearby mosques — the way other Islamic apps do.
//  • First visit: a friendly prompt (the browser then asks for permission on the tap).
//  • Already allowed: quietly keeps your place up to date, re-detecting only if you have moved ~10 km.
//  • You picked a city yourself: that choice is respected and never overwritten.
export default function LocationPrompt() {
  const [place, setPlace, placeReady] = useStored<Place | null>('deen:place', null)
  const [auto, setAuto, autoReady] = useStored<boolean | null>('deen:place-auto', null) // true = from the device, false = chosen by you
  const [dismissed, setDismissed, dismissedReady] = useStored<boolean>('deen:loc-dismissed', false)
  const [, setMethod] = useStored<number>('deen:method', 2)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const started = useRef(false)
  const placeRef = useRef(place)
  const autoRef = useRef(auto)
  useEffect(() => {
    placeRef.current = place
    autoRef.current = auto
  }, [place, auto])

  // `explicit`: you tapped "Allow location". Automatic runs must give way if you pick a city while they are still working.
  const detect = useCallback(async (explicit = false) => {
    const c = await getPosition()
    if (!explicit && autoRef.current === false) return
    const cur = placeRef.current
    // Same area as before: keep what we have (no flicker, no needless lookups).
    if (cur?.kind === 'coords' && !hasMoved(cur, c)) return
    setPlace({ kind: 'coords', lat: c.lat, lng: c.lng, label: 'Your location' })
    setAuto(true)
    // Fill in the city name when the lookup returns — only if nothing else has replaced the place meanwhile.
    placeInfo(c).then(({ name: label, cc }) => {
      // Decide from what is saved right now (not from a possibly stale copy): a city you picked meanwhile must win.
      const cur = readSaved<Place>('deen:place')
      if (readSaved<boolean>('deen:place-auto') !== false && cur?.kind === 'coords' && cur.lat === c.lat && cur.lng === c.lng) {
        setPlace({ ...cur, label })
        if (cc && !readSaved<boolean>('deen:method-chosen')) setMethod(methodForCountry(cc))
      }
    })
  }, [setPlace, setAuto, setMethod])

  useEffect(() => {
    if (!placeReady || !autoReady || !dismissedReady || started.current) return
    started.current = true
    if (auto === false) return // you chose a city; leave it alone
    let off = () => {}
    let alive = true
    permissionState().then(({ state, onChange }) => {
      if (!alive) return
      off = onChange(() => {
        permissionState().then((p) => {
          if (p.state === 'granted') detect().catch(() => {})
        })
      })
      if (state === 'granted') detect().catch(() => {})
      else if (state !== 'denied' && !placeRef.current && !dismissed) setShow(true)
    })
    return () => {
      alive = false
      off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeReady, autoReady, dismissedReady])

  if (!show) return null

  return (
    <div role="dialog" aria-label="Use your location" data-testid="location-prompt" className="fixed inset-x-3 bottom-20 md:bottom-6 z-40 mx-auto max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-4">
      <p className="font-bold text-[#0F766E]">📍 Use your location?</p>
      <p className="text-sm text-gray-600 mt-1">For accurate prayer times, the Qibla direction and mosques near you. Your location stays on your device.</p>
      {msg && <p className="text-sm text-red-600 mt-2">{msg}</p>}
      <div className="flex gap-2 mt-3">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setMsg('')
            try {
              await detect(true)
              setShow(false)
            } catch (e) {
              setMsg(errorMessage(e))
            } finally {
              setBusy(false)
            }
          }}
          className="flex-1 py-2 rounded-lg bg-[#0F766E] text-white font-semibold disabled:opacity-50"
        >
          {busy ? 'Finding you…' : 'Allow location'}
        </button>
        <button
          onClick={() => {
            setDismissed(true)
            setShow(false)
          }}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
