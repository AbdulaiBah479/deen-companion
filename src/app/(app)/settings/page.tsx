'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import LangSelect from '@/components/LangSelect'
import OfflineAudioManager from '@/components/OfflineAudioManager'
import OfflineManager from '@/components/OfflineManager'
import { AR_SIZE, TR_SIZE, usePrefs, type Theme } from '@/lib/prefs'
import { useStored } from '@/lib/storage'
import { LOCAL_MODELS, detectWebGPU, isModelCached, loadLocalModel, removeModel, type GpuSupport, type LocalTier } from '@/lib/webllm'
import { isSyncKey } from '@/lib/sync-core'
import { signOut, supabaseConfigured, useSyncStatus } from '@/lib/sync'

const CREDITS: [string, string, string][] = [
  ['Quran text, translations, tafsir, tajweed, word-by-word', 'Quran.Foundation (api.quran.com)', 'https://quran.foundation'],
  ['Quran recitation audio', 'EveryAyah.com', 'https://everyayah.com'],
  ['Prayer times, Hijri date, 99 Names', 'AlAdhan API', 'https://aladhan.com'],
  ['Hadith collections', 'fawazahmed0/hadith-api (GitHub)', 'https://github.com/fawazahmed0/hadith-api'],
  ['Duas & adhkar', 'fitrahive/dua-dhikr (GitHub)', 'https://github.com/fitrahive/dua-dhikr'],
  ['Mosque map data', '© OpenStreetMap contributors (ODbL)', 'https://www.openstreetmap.org/copyright'],
  ['Gold & silver prices', 'gold-api.com', 'https://gold-api.com'],
  ['Currency rates', 'ExchangeRate-API (open access)', 'https://www.exchangerate-api.com'],
  ['Spaced repetition', 'ts-fsrs / FSRS algorithm', 'https://github.com/open-spaced-repetition/ts-fsrs'],
]

export default function SettingsPage() {
  const [kids, setKids] = useStored<boolean>('deen:kids', false)
  const sync = useSyncStatus()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const { prefs, set } = usePrefs()
  const [localTier, setLocalTier] = useStored<'off' | LocalTier>('deen:localai', 'off')
  const [gpu, setGpu] = useState<GpuSupport | null>(null)
  const [cached, setCached] = useState<Record<LocalTier, boolean>>({ fast: false, balanced: false })
  const [dl, setDl] = useState<{ tier: LocalTier; pct: number; text: string } | null>(null)
  const [aiMsg, setAiMsg] = useState('')

  useEffect(() => {
    detectWebGPU().then(async (g) => {
      setGpu(g)
      if (g.ok) setCached({ fast: await isModelCached('fast', g.f16), balanced: await isModelCached('balanced', g.f16) })
    })
  }, [])

  async function download(tier: LocalTier) {
    if (!gpu?.ok) return
    setAiMsg('')
    setDl({ tier, pct: 0, text: 'Starting…' })
    try {
      await loadLocalModel(tier, gpu.f16, (f, text) => setDl({ tier, pct: Math.round(f * 100), text }))
      setCached((c) => ({ ...c, [tier]: true }))
      setLocalTier(tier)
      setAiMsg('Ready — the AI companion will now answer on this device.')
    } catch {
      setAiMsg('Download failed. Check your connection and free storage, then try again.')
    } finally {
      setDl(null)
    }
  }

  async function remove(tier: LocalTier) {
    if (!gpu?.ok) return
    await removeModel(tier, gpu.f16)
    setCached((c) => ({ ...c, [tier]: false }))
    if (localTier === tier) setLocalTier('off')
    setAiMsg('Model removed from this device.')
  }

  function exportData() {
    const out: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && isSyncKey(k)) {
        try {
          out[k] = JSON.parse(localStorage.getItem(k)!)
        } catch {}
      }
    }
    const blob = new Blob([JSON.stringify({ app: 'deen-companion', version: 1, data: out }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'deen-companion-backup.json'
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg(`Exported ${Object.keys(out).length} items.`)
  }

  async function importData(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      if (parsed?.app !== 'deen-companion' || typeof parsed.data !== 'object') throw new Error('bad file')
      let n = 0
      for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) {
        if (!isSyncKey(k)) continue
        localStorage.setItem(k, JSON.stringify(v))
        n++
      }
      setMsg(`Imported ${n} items. Reloading…`)
      setTimeout(() => location.reload(), 600)
    } catch {
      setMsg('That file is not a valid Deen Companion backup.')
    }
  }

  function resetAll() {
    if (!window.confirm('Delete ALL progress and settings stored on this device? This cannot be undone.')) return
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('deen:')) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    setMsg('Cleared. Reloading…')
    setTimeout(() => location.reload(), 600)
  }

  const section = 'bg-white border border-gray-200 rounded-2xl p-5 mb-4'

  return (
    <div>
      <h1 className="text-2xl font-black text-[#0F766E] mb-4">Settings</h1>

      <section className={section}>
        <h2 className="font-bold mb-3">Language</h2>
        <p className="text-sm text-gray-500 mb-2">Quran translation, hadith and AI answers. The app menus are English for now.</p>
        <LangSelect />
      </section>

      <section className={section}>
        <h2 className="font-bold mb-3">Appearance</h2>
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Theme">
          {([['system', 'System'], ['light', 'Light'], ['dark', 'Dark'], ['sepia', 'Sepia']] as [Theme, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => set('theme', id)}
              aria-pressed={prefs.theme === id}
              className={`px-4 py-2 rounded-full text-sm font-semibold border ${prefs.theme === id ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white border-gray-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block text-sm mb-1">Arabic text size: {prefs.arSize}px</label>
        <input type="range" aria-label="Arabic text size" min={AR_SIZE.min} max={AR_SIZE.max} step={AR_SIZE.step} value={prefs.arSize} onChange={(e) => set('arSize', Number(e.target.value))} className="accent-[#0F766E] w-full mb-3" />
        <label className="block text-sm mb-1">Translation text size: {prefs.trSize}px</label>
        <input type="range" aria-label="Translation text size" min={TR_SIZE.min} max={TR_SIZE.max} step={TR_SIZE.step} value={prefs.trSize} onChange={(e) => set('trSize', Number(e.target.value))} className="accent-[#0F766E] w-full mb-3" />
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="text-right verse-ar" dir="rtl" lang="ar">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
          <p className="verse-tr text-gray-700">In the name of Allah, the Entirely Merciful, the Especially Merciful.</p>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-bold mb-1">On-device AI</h2>
        <p className="text-sm text-gray-500 mb-3">
          Run an open-source AI model inside your browser. It has no usage limit and your questions never leave your device. It needs a one-time download and a recent browser with WebGPU; smaller models are less capable than cloud AI.
        </p>
        {!gpu && <p className="text-sm text-gray-500">Checking your device…</p>}
        {gpu && !gpu.ok && <p className="text-sm text-amber-700">Not available here: {gpu.reason}</p>}
        {gpu?.ok && (
          <div className="space-y-3">
            {(Object.keys(LOCAL_MODELS) as LocalTier[]).map((tier) => (
              <div key={tier} className="flex items-center justify-between gap-2 border border-gray-200 rounded-xl p-3">
                <div>
                  <div className="font-semibold text-sm">{LOCAL_MODELS[tier].label} <span className="text-gray-500 font-normal">· {LOCAL_MODELS[tier].size}</span></div>
                  <div className="text-xs text-gray-500">{cached[tier] ? (localTier === tier ? 'Downloaded · in use' : 'Downloaded') : 'Not downloaded'}</div>
                </div>
                <div className="flex gap-2">
                  {cached[tier] ? (
                    <>
                      {localTier !== tier && <button onClick={() => setLocalTier(tier)} className="px-3 py-1 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold">Use</button>}
                      <button onClick={() => remove(tier)} className="px-3 py-1 rounded-lg border border-gray-300 text-sm">Remove</button>
                    </>
                  ) : (
                    <button onClick={() => download(tier)} disabled={!!dl} className="px-3 py-1 rounded-lg bg-[#0F766E] text-white text-sm font-semibold disabled:opacity-50">Download</button>
                  )}
                </div>
              </div>
            ))}
            {localTier !== 'off' && <button onClick={() => setLocalTier('off')} className="text-sm text-gray-600 underline">Turn off on-device AI (use cloud AI)</button>}
            {dl && (
              <div role="status" className="text-sm">
                <p className="mb-1">{dl.text}</p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-purple-600" style={{ width: `${dl.pct}%` }} /></div>
              </div>
            )}
            {aiMsg && <p className="text-sm text-[#0F766E]">{aiMsg}</p>}
          </div>
        )}
      </section>

      <section className={section}>
        <h2 className="font-bold mb-2">Kids mode</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} />
          Larger text, kid-friendly menu, and simple AI answers
        </label>
      </section>

      <section className={section}>
        <h2 className="font-bold mb-2">Account &amp; sync</h2>
        {!supabaseConfigured() ? (
          <p className="text-sm text-gray-600">
            Cloud sync is not set up on this copy of the app, so your progress stays on this device. Use backup below to move it.
          </p>
        ) : sync.state === 'signed-out' || sync.state === 'off' ? (
          <p className="text-sm text-gray-600">
            <Link href="/login" className="text-[#0F766E] font-semibold">
              Sign in
            </Link>{' '}
            or{' '}
            <Link href="/signup" className="text-[#0F766E] font-semibold">
              create an account
            </Link>{' '}
            to keep your progress in sync across devices.
          </p>
        ) : (
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              Signed in as <b>{sync.email}</b> ·{' '}
              {sync.state === 'syncing' ? 'syncing…' : sync.state === 'error' ? <span className="text-red-600">sync problem: {sync.message}</span> : 'synced ✓'}
            </p>
            <button onClick={() => signOut()} className="px-3 py-1 rounded-lg border border-gray-300">
              Sign out
            </button>
          </div>
        )}
      </section>

      <section className={section}>
        <h2 className="font-bold mb-2">Offline</h2>
        <OfflineManager />
        <OfflineAudioManager />
      </section>

      <section className={section}>
        <h2 className="font-bold mb-2">Your data</h2>
        <p className="text-sm text-gray-500 mb-3">Everything lives on your device unless you sign in. Back it up or move it to another device.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportData} className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold">
            Export backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold">
            Import backup
          </button>
          <button onClick={resetAll} className="px-3 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold">
            Delete all data
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            aria-label="Backup file"
            onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
          />
        </div>
        {msg && <p className="text-sm text-[#0F766E] mt-3">{msg}</p>}
      </section>

      <section className={section}>
        <h2 className="font-bold mb-2">Sources &amp; credits</h2>
        <ul className="text-sm space-y-1">
          {CREDITS.map(([what, who, href]) => (
            <li key={who}>
              {what} —{' '}
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#0F766E] font-semibold">
                {who}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Translations are by human translators and are not the Quran itself. AI answers can be wrong — verify with trusted
          scholars.
        </p>
      </section>
    </div>
  )
}
