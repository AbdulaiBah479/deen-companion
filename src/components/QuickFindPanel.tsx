'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { quickFind } from '@/lib/quick-find'

const ICON = { page: '📄', surah: '📖', verse: '🔖' } as const

// The search box that opens from the magnifier in the header: type a page, a surah or a verse number and go straight there.
export default function QuickFindPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const hits = useMemo(() => quickFind(q), [q])

  useEffect(() => {
    input.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const go = (href: string) => {
    onClose()
    router.push(href)
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center px-3 pt-[8vh]" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Search the app" className="w-full max-w-xl rounded-2xl bg-white text-gray-900 shadow-2xl overflow-hidden" data-testid="quickfind">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4">
          <span aria-hidden="true">🔍</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value.slice(0, 60))
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(hits.length - 1, a + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(0, a - 1))
              } else if (e.key === 'Enter' && hits[active]) go(hits[active].href)
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined}
            aria-label="Search pages, surahs and verses"
            placeholder="Search: halal, prayer times, baqarah, 2:255…"
            className="flex-1 py-4 text-base outline-none bg-transparent"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button type="button" onClick={onClose} className="text-sm text-gray-500 px-2 py-2 min-h-[44px]">
            Close
          </button>
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className="max-h-[60vh] overflow-y-auto py-1">
          {!q && <li role="presentation" className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500">Popular</li>}
          {hits.map((h, i) => (
            <li key={h.href} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h.href)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 min-h-[48px] ${i === active ? 'bg-teal-50' : ''}`}
                data-testid="quickfind-hit"
              >
                <span aria-hidden="true" className="text-xl w-7 text-center">{ICON[h.kind]}</span>
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{h.title}</span>
                  <span className="block text-xs text-gray-500 truncate">{h.subtitle}</span>
                </span>
              </button>
            </li>
          ))}
          {q && hits.length === 0 && (
            <li role="presentation" className="px-4 py-6 text-sm text-gray-600" data-testid="quickfind-none">
              Nothing matches “{q}”. Try a surah name, a verse like 2:255, or a word like prayer, dua or zakat.
            </li>
          )}
        </ul>
        <p className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-500">↑ ↓ to choose · Enter to open · Esc to close</p>
      </div>
    </div>
  )
}
