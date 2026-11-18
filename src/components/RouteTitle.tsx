'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { fullTitle } from '@/lib/route-title'

// Gives every page its own title (browser tab, history, screen readers). The framework puts back the site's default title when you
// move between pages, so this keeps the right one in place.
export default function RouteTitle() {
  const pathname = usePathname()
  useEffect(() => {
    const want = fullTitle(pathname)
    const apply = () => {
      if (document.title !== want) document.title = want
    }
    apply()
    const el = document.querySelector('title')
    if (!el) return
    const mo = new MutationObserver(apply)
    mo.observe(el, { childList: true, characterData: true, subtree: true })
    return () => mo.disconnect()
  }, [pathname])
  return null
}
