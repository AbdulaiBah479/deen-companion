'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

// The panel (and the list of pages it searches) is only downloaded the first time someone opens the search.
const Panel = dynamic(() => import('@/components/QuickFindPanel'), { ssr: false })

// The magnifier in the header. Also opens with "/" or Ctrl/⌘+K anywhere that is not a text box.
export default function QuickFind() {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the app"
        aria-haspopup="dialog"
        className="min-w-[44px] min-h-[44px] rounded-lg text-xl text-gray-600 hover:bg-gray-100 flex items-center justify-center"
        data-testid="quickfind-open"
      >
        🔍
      </button>
      {open && (
        <Panel
          onClose={() => {
            setOpen(false)
            requestAnimationFrame(() => btn.current?.focus())
          }}
        />
      )}
    </>
  )
}
