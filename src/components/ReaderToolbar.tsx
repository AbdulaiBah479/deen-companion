'use client'

import { AR_SIZE, usePrefs } from '@/lib/prefs'

// Reading controls shared by the surah reader and the Mushaf page view.
export default function ReaderToolbar({
  tajweed,
  onTajweed,
  wbw,
  onWbw,
  tajweedError,
  wbwError,
}: {
  tajweed: boolean
  onTajweed: (v: boolean) => void
  wbw?: boolean
  onWbw?: (v: boolean) => void
  tajweedError?: string
  wbwError?: string
}) {
  const { prefs, set } = usePrefs()
  const seg = (active: boolean) =>
    `px-3 py-1.5 text-sm font-semibold rounded-full ${active ? 'bg-[#0F766E] text-white' : 'text-gray-600'}`

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex bg-gray-100 rounded-full p-1" role="group" aria-label="Reading mode">
          <button className={seg(prefs.mode === 'translation')} aria-pressed={prefs.mode === 'translation'} onClick={() => set('mode', 'translation')}>
            Translation
          </button>
          <button className={seg(prefs.mode === 'reading')} aria-pressed={prefs.mode === 'reading'} onClick={() => set('mode', 'reading')}>
            Reading
          </button>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Text size">
          <button
            onClick={() => set('arSize', Math.max(AR_SIZE.min, prefs.arSize - AR_SIZE.step))}
            aria-label="A− Decrease text size"
            className="w-9 h-9 rounded-full border border-gray-300 text-sm font-bold"
          >
            A−
          </button>
          <span className="text-xs text-gray-500 w-8 text-center" aria-live="polite">
            {prefs.arSize}
          </span>
          <button
            onClick={() => set('arSize', Math.min(AR_SIZE.max, prefs.arSize + AR_SIZE.step))}
            aria-label="A+ Increase text size"
            className="w-9 h-9 rounded-full border border-gray-300 text-base font-bold"
          >
            A+
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={tajweed} onChange={(e) => onTajweed(e.target.checked)} />
          Tajweed colours
        </label>
        {onWbw && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!wbw} onChange={(e) => onWbw(e.target.checked)} />
            Word-by-word
          </label>
        )}
        {prefs.mode === 'reading' && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.showTranslationInReading} onChange={(e) => set('showTranslationInReading', e.target.checked)} />
            Show translation
          </label>
        )}
      </div>
      {tajweedError && tajweed && <p className="text-xs text-red-600">{tajweedError}</p>}
      {wbwError && wbw && <p className="text-xs text-red-600">{wbwError}</p>}
    </div>
  )
}
