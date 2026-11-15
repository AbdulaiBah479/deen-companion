'use client'

import { QURAN_TRANSLIT, recitationById } from '@/lib/recitations'
import { QURAN_PASSAGES } from '@/lib/recite-quran'

const QURAN_TITLE: Record<string, string> = {
  fatiha: 'Surat al-Fatihah',
  ikhlas: 'Surat al-Ikhlas',
  falaq: 'Surat al-Falaq',
  nas: 'Surat an-Nas',
  kafirun: 'Surat al-Kafirun',
  kursi: 'Ayat al-Kursi',
  'baqarah-end': 'The last two verses of Surat al-Baqarah',
  'travel-ayah': 'Quran 43:13–14',
  'rabbana-atina': 'Quran 2:201',
  'safa-marwa': 'Quran 2:158',
  kawthar: 'Surat al-Kawthar',
  asr: 'Surat al-‘Asr',
}

const box = 'rounded-xl border border-teal-200 bg-teal-50/60 p-3 space-y-1.5'

// One thing to say: the Arabic, how to pronounce it, what it means, and where it comes from.
// An id starting with "quran:" is a Quran passage read from the app's Quran data.
export default function RecitationCard({ id, label }: { id: string; label?: string }) {
  if (id.startsWith('quran:')) {
    const key = id.slice(6)
    const p = QURAN_PASSAGES[key]
    if (!p) return null
    const tl = QURAN_TRANSLIT[key]
    return (
      <div className={box} data-testid="recitation">
        <p className="text-xs font-bold text-teal-900">{label ?? QURAN_TITLE[key] ?? `Quran ${p.surah}:${p.from}`}</p>
        <div dir="rtl" lang="ar" className="font-arabic text-2xl leading-loose text-gray-900">
          {p.verses.map((v) => (
            <span key={v.n}>{v.ar} <span className="text-base text-teal-700">﴿{v.n}﴾</span> </span>
          ))}
        </div>
        {tl && <p className="text-sm italic text-teal-900">{tl.join(' · ')}</p>}
        <p className="text-sm text-gray-800">{p.verses.map((v) => v.en).join(' ')}</p>
        <p className="text-[11px] text-gray-500">Quran {p.surah}:{p.from}{p.to > p.from ? `–${p.to}` : ''}</p>
      </div>
    )
  }
  const r = recitationById(id)
  if (!r) return null
  return (
    <div className={box} data-testid="recitation">
      <p className="text-xs font-bold text-teal-900">{label ?? r.title}</p>
      <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-loose text-gray-900">{r.ar}</p>
      <p className="text-sm italic text-teal-900">{r.translit}</p>
      <p className="text-sm text-gray-800">{r.en}</p>
      {r.times && <p className="text-xs font-semibold text-gray-700">{r.times}</p>}
      {r.note && <p className="text-xs text-amber-900">{r.note}</p>}
      <p className="text-[11px] text-gray-500">{r.source}</p>
    </div>
  )
}
