'use client'

import TajweedText from '@/components/TajweedText'

export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

export type ReadingVerse = { key: string; surah: number; ayah: number; arabic: string; tajweed?: string }

// Continuous Mushaf-style Arabic text. Each verse is tappable; the verse being recited is highlighted.
export default function ReadingBlock({
  verses,
  activeKey,
  onVerse,
}: {
  verses: ReadingVerse[]
  activeKey?: string | null
  onVerse: (v: ReadingVerse) => void
}) {
  return (
    <p className="mushaf" dir="rtl" lang="ar">
      {verses.map((v) => (
        <span
          key={v.key}
          id={`v${v.ayah}`}
          role="button"
          tabIndex={0}
          aria-label={`Verse ${v.key}`}
          onClick={() => onVerse(v)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onVerse(v))}
          className={`verse-hit ${activeKey === v.key ? 'verse-active' : ''}`}
          data-verse={v.key}
        >
          {v.tajweed ? <TajweedText markup={v.tajweed} /> : <>{v.arabic}<span className="ayah-end">﴿{toArabicDigits(v.ayah)}﴾</span></>}{' '}
        </span>
      ))}
    </p>
  )
}
