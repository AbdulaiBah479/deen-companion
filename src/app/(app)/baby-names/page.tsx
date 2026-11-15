'use client'

import { useState } from 'react'
import { searchNames, type Gender } from '@/lib/baby-names'
import { useStored } from '@/lib/storage'

export default function BabyNamesPage() {
  const [q, setQ] = useState('')
  const [gender, setGender] = useState<Gender | 'all'>('all')
  const [favs, setFavs] = useStored<string[]>('deen:baby-favs', [])
  const [onlyFavs, setOnlyFavs] = useState(false)
  const fav = new Set(Array.isArray(favs) ? favs.filter((x) => typeof x === 'string').slice(0, 200) : [])
  const results = searchNames(q, gender, onlyFavs ? fav : undefined)
  const toggle = (name: string) => setFavs(fav.has(name) ? [...fav].filter((x) => x !== name) : [...fav, name].slice(0, 200))
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm ${on ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'border-gray-300'}`

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#0F766E]">Islamic baby names</h1>
        <p className="text-sm text-gray-600 mt-1">Names of prophets, Companions and women of the Quran and Seerah, with their commonly given meanings. Save favourites to compare with your family.</p>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-xl border border-gray-300 p-2" placeholder="Search by name, Arabic, or meaning (e.g. light)" aria-label="Search names" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
        {(['all', 'boy', 'girl'] as const).map((g) => (
          <button key={g} type="button" aria-pressed={gender === g} className={chip(gender === g)} onClick={() => setGender(g)}>
            {g === 'all' ? 'All' : g === 'boy' ? 'Boys' : 'Girls'}
          </button>
        ))}
        <button type="button" aria-pressed={onlyFavs} className={chip(onlyFavs)} onClick={() => setOnlyFavs((v) => !v)}>
          ♥ Favourites ({fav.size})
        </button>
      </div>
      {results.length === 0 && <p className="text-sm text-gray-500" data-testid="names-none">No name matches. Try a shorter word.</p>}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {results.map((n) => (
          <li key={n.name} className="rounded-2xl border border-gray-200 bg-white p-4" data-testid="baby-name">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-lg">{n.name} <span dir="rtl" lang="ar" className="font-arabic text-gray-600 font-normal">{n.ar}</span></p>
                <p className="text-xs text-gray-500">{n.gender === 'boy' ? 'Boy' : 'Girl'}</p>
              </div>
              <button type="button" onClick={() => toggle(n.name)} aria-pressed={fav.has(n.name)} aria-label={`${fav.has(n.name) ? 'Remove' : 'Save'} ${n.name} as a favourite`} className="text-2xl leading-none">
                {fav.has(n.name) ? '♥' : '♡'}
              </button>
            </div>
            <p className="text-sm mt-1">Commonly: {n.meaning}</p>
            {n.note && <p className="text-xs text-gray-600 mt-1">{n.note}</p>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">The Prophet ﷺ said the names most loved by Allah are Abdullah and Abdur-Rahman (Muslim). Meanings of Arabic names can differ a little between dictionaries; choose a good meaning and a name you can say well. Do not name a child with a name of Allah alone (like “Ar-Rahman”); “Abd” (servant of) is added.</p>
    </div>
  )
}
