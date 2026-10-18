'use client'

import { useEffect, useState } from 'react'
import { errorMessage, getPosition, permissionState } from '@/lib/location'
import { useStored } from '@/lib/storage'

type Mosque = {
  id: string
  name: string
  lat: number
  lng: number
  distanceKm: number
  address?: string
  website?: string
  phone?: string
  denomination?: string
}

export default function MosquesPage() {
  const [place, setPlace] = useState('')
  const [radius, setRadius] = useState(3000)
  const [mosques, setMosques] = useState<Mosque[] | null>(null)
  const [where, setWhere] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [, setSavedLoc] = useStored<{ lat: number; lng: number; name: string } | null>('deen:coords', null)

  async function search(lat: number, lng: number, name: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/mosques?lat=${lat}&lng=${lng}&radius=${radius}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMosques(data.mosques)
      setWhere(name)
      setSavedLoc({ lat, lng, name })
    } catch (e) {
      setMosques(null)
      setError(e instanceof Error && e.message ? e.message : 'Search failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function locateMe() {
    setError('')
    setLoading(true)
    getPosition({ highAccuracy: true })
      .then((c) => search(c.lat, c.lng, 'your location'))
      .catch((e) => {
        setLoading(false)
        setError(errorMessage(e))
      })
  }

  // Location already allowed: show mosques near you without another tap.
  useEffect(() => {
    permissionState().then((p) => {
      if (p.state === 'granted') locateMe()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function searchPlace(e: React.FormEvent) {
    e.preventDefault()
    if (!place.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(place.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const r = data.results[0]
      await search(r.lat, r.lng, r.name.split(',').slice(0, 2).join(','))
    } catch (err) {
      setLoading(false)
      setMosques(null)
      setError(err instanceof Error && err.message ? err.message : 'Could not find that place.')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-1">🕌 Find a Mosque</h1>
      <p className="text-gray-500 text-sm mb-4">Nearby mosques from OpenStreetMap. Coverage depends on community mapping in your area.</p>

      <div className="flex gap-2 mb-3">
        <button onClick={locateMe} disabled={loading} className="px-4 py-3 rounded-xl bg-[#0F766E] text-white font-semibold disabled:opacity-50">
          📍 Near me
        </button>
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          aria-label="Search radius"
          className="px-3 py-2 rounded-xl border border-gray-300 bg-white"
        >
          {[1000, 3000, 5000, 10000].map((r) => (
            <option key={r} value={r}>
              within {r / 1000} km
            </option>
          ))}
        </select>
      </div>
      <form onSubmit={searchPlace} className="flex gap-2 mb-5">
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Or search a city or address…"
          aria-label="City or address"
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-300 bg-white"
        />
        <button disabled={loading || !place.trim()} className="px-4 py-3 rounded-xl border border-[#0F766E] text-[#0F766E] font-semibold disabled:opacity-50">
          Search
        </button>
      </form>

      {loading && <p className="text-gray-500">Searching…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {mosques && (
        <>
          <p className="text-sm text-gray-600 mb-3">
            {mosques.length} mosque{mosques.length === 1 ? '' : 's'} near {where}
          </p>
          {mosques.length === 0 && <p className="text-gray-500 text-sm">None mapped within that distance. Try a larger radius.</p>}
          <ul className="space-y-3">
            {mosques.map((m) => (
              <li key={m.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex justify-between gap-2">
                  <h2 className="font-bold">{m.name}</h2>
                  <span className="text-sm font-semibold text-[#0F766E] whitespace-nowrap">{m.distanceKm.toFixed(1)} km</span>
                </div>
                {m.address && <p className="text-sm text-gray-600">{m.address}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm font-semibold">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lng}#map=18/${m.lat}/${m.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F766E]"
                  >
                    Map ↗
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/directions?to=${m.lat}%2C${m.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F766E]"
                  >
                    Directions ↗
                  </a>
                  {m.website && /^https?:\/\//.test(m.website) && (
                    <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-[#0F766E]">
                      Website ↗
                    </a>
                  )}
                  {m.phone && <a href={`tel:${m.phone.replace(/[^+\d]/g, '')}`} className="text-[#0F766E]">{m.phone}</a>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-gray-500 mt-6">Map data © OpenStreetMap contributors (ODbL). Always confirm prayer times with the mosque.</p>
    </div>
  )
}
