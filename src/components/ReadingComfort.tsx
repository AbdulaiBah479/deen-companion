'use client'

import { DEFAULT_A11Y, SCALES, apply, cleanA11y, type A11y } from '@/lib/a11y'
import { useStored } from '@/lib/storage'

// Settings → Reading comfort: text size, high contrast, a plainer font, and calmer motion. Saved on this device.
export default function ReadingComfort() {
  const [raw, setRaw] = useStored<A11y>('deen:a11y', DEFAULT_A11Y)
  const a = cleanA11y(raw)
  const set = (patch: Partial<A11y>) => {
    const next = cleanA11y({ ...a, ...patch })
    setRaw(next)
    apply(next)
  }
  const box = 'flex items-center gap-2 text-sm'
  return (
    <div className="space-y-3" data-testid="reading-comfort">
      <div>
        <p className="text-sm font-semibold mb-1">Text size</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Text size">
          {SCALES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set({ scale: s })}
              aria-pressed={a.scale === s}
              className={`rounded-full border px-3 py-1.5 text-sm ${a.scale === s ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'border-gray-300'}`}
            >
              {s === 100 ? 'Normal' : `${s}%`}
            </button>
          ))}
        </div>
      </div>
      <label className={box}>
        <input type="checkbox" checked={a.contrast} onChange={(e) => set({ contrast: e.target.checked })} />
        High contrast (darker text and clearer borders)
      </label>
      <label className={box}>
        <input type="checkbox" checked={a.plainFont} onChange={(e) => set({ plainFont: e.target.checked })} />
        Easier-to-read font (more spacing; helpful for dyslexia)
      </label>
      <label className={box}>
        <input type="checkbox" checked={a.calm} onChange={(e) => set({ calm: e.target.checked })} />
        Calm motion (turn off animations)
      </label>
    </div>
  )
}
