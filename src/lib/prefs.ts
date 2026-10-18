'use client'

import { useStored } from './storage'

export type Theme = 'system' | 'light' | 'dark' | 'sepia'
export type ReaderMode = 'translation' | 'reading'

export type Prefs = {
  theme: Theme
  arSize: number // px, Arabic text in the reader
  trSize: number // px, translation text
  mode: ReaderMode
  showTranslationInReading: boolean
  continuous: boolean // keep playing into the next surah
  repeat: 'off' | 'one'
  rate: number
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  arSize: 30,
  trSize: 16,
  mode: 'translation',
  showTranslationInReading: false,
  continuous: true,
  repeat: 'off',
  rate: 1,
}

export const AR_SIZE = { min: 20, max: 56, step: 2 }
export const TR_SIZE = { min: 13, max: 26, step: 1 }

export function usePrefs() {
  const [prefs, setPrefs, ready] = useStored<Prefs>('deen:prefs', DEFAULT_PREFS)
  const merged: Prefs = { ...DEFAULT_PREFS, ...prefs } // tolerate older saved shapes
  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) => setPrefs((p) => ({ ...DEFAULT_PREFS, ...p, [key]: value }))
  return { prefs: merged, set, ready }
}

// Applies theme and text sizes to <html>. Called by <PrefsApplier/>, and mirrored by the inline boot script in layout.
export function applyPrefs(p: Prefs, kids: boolean) {
  const root = document.documentElement
  const resolved = p.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : p.theme
  root.dataset.theme = resolved
  root.dataset.kids = kids ? 'true' : 'false'
  root.style.setProperty('--ar-size', `${p.arSize}px`)
  root.style.setProperty('--tr-size', `${p.trSize}px`)
}
