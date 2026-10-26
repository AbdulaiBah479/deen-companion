'use client'

import { useEffect, useState } from 'react'
import { useStored } from '@/lib/storage'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

// Everything about "downloading" the web app: whether this device can install it, the install button, and the steps for browsers
// (Safari on iPhone and iPad) that have no button. Shared by the banner, the Settings card and the tests.
export function useInstall() {
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    const ua = navigator.userAgent
    setIos(/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1))
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!event) return false
    await event.prompt()
    const { outcome } = await event.userChoice
    setEvent(null)
    return outcome === 'accepted'
  }
  return { installed, canPrompt: !!event, ios, install }
}

export const IOS_STEPS = ['Open this site in Safari.', 'Tap the Share button (the square with an arrow).', 'Scroll down and tap “Add to Home Screen”.', 'Tap “Add”. The app now opens full screen like any other app.']

// A small card for Settings (and anywhere else): install now, or the steps for your device.
export function InstallCard() {
  const { installed, canPrompt, ios, install } = useInstall()
  const [shown, setShown] = useState(false)
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-label="Install the app" data-testid="install-card">
      <h2 className="font-bold">Install the app</h2>
      {installed ? (
        <p className="text-sm text-gray-700 mt-1">✓ Deen Companion is installed on this device.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mt-1">Put Deen Companion on your home screen or desktop. It opens in its own window, loads faster, works offline for the parts you have used, and can remind you of prayers.</p>
          {canPrompt ? (
            <button onClick={install} className="mt-3 px-4 py-2 rounded-lg bg-[#0F766E] text-white text-sm font-semibold">Install now</button>
          ) : (
            <>
              <button onClick={() => setShown((v) => !v)} className="mt-3 px-4 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-sm font-semibold" aria-expanded={shown}>
                How to install on this device
              </button>
              {shown && (
                <div className="mt-3 text-sm text-gray-700 space-y-2">
                  {ios ? (
                    <ol className="list-decimal pl-5 space-y-1">{IOS_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Android (Chrome):</strong> open the ⋮ menu and tap “Install app” or “Add to Home screen”.</li>
                      <li><strong>Windows, Mac, Linux (Chrome or Edge):</strong> click the install icon at the right end of the address bar, or open the menu and choose “Install Deen Companion”.</li>
                      <li><strong>iPhone and iPad (Safari):</strong> tap Share, then “Add to Home Screen”.</li>
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

// Shown at the top of every page: an install offer (once in a while, and only where the browser allows it), a notice when you are
// offline, and a notice when a new version of the app has been downloaded.
export default function InstallBanner() {
  const { installed, canPrompt, ios, install } = useInstall()
  const [dismissedAt, setDismissedAt] = useStored<number>('deen:install-dismissed', 0)
  const [online, setOnline] = useState(true)
  const [updated, setUpdated] = useState(false)
  const [iosOpen, setIosOpen] = useState(false)
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(Date.now())
    setOnline(navigator.onLine)
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    // A new service worker taking over a page that already had one means a new version was installed in the background.
    const had = !!navigator.serviceWorker?.controller
    const changed = () => had && setUpdated(true)
    navigator.serviceWorker?.addEventListener('controllerchange', changed)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      navigator.serviceWorker?.removeEventListener('controllerchange', changed)
    }
  }, [])

  const recentlyDismissed = now - dismissedAt < 14 * 86400_000
  const offerInstall = !installed && !recentlyDismissed && (canPrompt || ios)

  return (
    <div className="space-y-2 empty:hidden">
      {!online && (
        <p role="status" className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2" data-testid="offline-banner">
          You are offline. Pages you have opened before, and anything you saved for offline, still work.
        </p>
      )}
      {updated && (
        <p role="status" className="rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-sm px-3 py-2 flex items-center gap-3" data-testid="update-banner">
          <span className="flex-1">A new version of Deen Companion is ready.</span>
          <button onClick={() => location.reload()} className="px-3 py-1 rounded-lg bg-[#0F766E] text-white font-semibold">Refresh</button>
        </p>
      )}
      {offerInstall && (
        <div className="rounded-lg bg-white border border-gray-200 text-sm px-3 py-2" data-testid="install-banner">
          <div className="flex items-center gap-2">
            <span className="flex-1">📲 Install Deen Companion for a faster, full-screen app.</span>
            {canPrompt ? (
              <button onClick={install} className="px-3 py-1 rounded-lg bg-[#0F766E] text-white font-semibold">Install</button>
            ) : (
              <button onClick={() => setIosOpen((v) => !v)} className="px-3 py-1 rounded-lg bg-[#0F766E] text-white font-semibold" aria-expanded={iosOpen}>How</button>
            )}
            <button onClick={() => setDismissedAt(Date.now())} aria-label="Not now" className="text-gray-500 px-1">✕</button>
          </div>
          {iosOpen && <ol className="list-decimal pl-6 mt-2 space-y-1 text-gray-700">{IOS_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>}
        </div>
      )}
    </div>
  )
}
