'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ADHANS, DEFAULT_ALARMS, LEAD_CHOICES, adhanById, cleanAlarms, secondsNowIn, upcomingAlarms, type AlarmSettings, type DayTimes, type Mode } from '@/lib/adhan'
import { PRAYER_NAMES } from '@/lib/prayer'
import { PRAYERS } from '@/lib/push-shared'
import { useStored } from '@/lib/storage'

// A notification that also works on phones (Android Chrome only allows them through the service worker).
async function showNote(title: string, body: string, tag: string) {
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) return await reg.showNotification(title, { body, icon: '/icon.svg', tag, requireInteraction: false })
  } catch {}
  try {
    new Notification(title, { body, icon: '/icon.svg', tag })
  } catch {}
}

const MODE_LABEL: Record<Mode, string> = { adhan: '🔊 Adhan', notify: '🔔 Notification', off: 'Off' }

// "Reminders & adhan" on the Prayer page: for each prayer choose the adhan, a quiet notification, or nothing; a gentle early reminder;
// and the voice. These work while the app is open (in the browser or installed). The "even when the app is closed" switch below it
// sends a notification from the server instead (a notification cannot play a long adhan; that is a limit of phones).
export default function PrayerAlarms({ times, timeZone }: { times: DayTimes | null; timeZone?: string }) {
  const [stored, setStored] = useStored<AlarmSettings>('deen:alarms', DEFAULT_ALARMS)
  const s = cleanAlarms(stored)
  const [msg, setMsg] = useState('')
  const [ringing, setRinging] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const settingsRef = useRef(s)
  useEffect(() => {
    settingsRef.current = s
  })

  const stopSound = useCallback(() => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    setRinging(null)
  }, [])

  const playAdhan = useCallback(
    async (label: string) => {
      stopSound()
      const cfg = settingsRef.current
      const a = new Audio(adhanById(cfg.adhan).file)
      a.volume = cfg.volume
      a.onended = () => setRinging(null)
      audioRef.current = a
      try {
        await a.play()
        setRinging(label)
        setBlocked(null)
      } catch {
        // The browser refused to start sound without a tap: the notification still shows, and one tap plays it.
        setBlocked(label)
      }
    },
    [stopSound]
  )

  // Schedule every alarm in the next 24 hours; schedule again whenever the times or the settings change.
  const sig = JSON.stringify([times, s, timeZone])
  useEffect(() => {
    if (!times || !s.on) return
    const alarms = upcomingAlarms(times, secondsNowIn(timeZone), s)
    const ids = alarms.map((al) =>
      window.setTimeout(() => {
        const name = al.prayer === 'sunrise' ? 'Sunrise' : PRAYER_NAMES[al.prayer].en
        if (al.kind === 'lead') void showNote(`${name} in ${al.leadMin} minutes`, 'Time to get ready.', al.key)
        else if (al.kind === 'sunrise') void showNote('Sunrise', 'The time of Fajr has ended.', al.key)
        else {
          void showNote(`${name} — time to pray`, al.mode === 'adhan' ? 'The adhan is playing.' : `${PRAYER_NAMES[al.prayer as keyof typeof PRAYER_NAMES].ar}`, al.key)
          if (al.mode === 'adhan') void playAdhan(name)
        }
      }, al.delayMs)
    )
    return () => ids.forEach((id) => window.clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
  useEffect(() => stopSound, [stopSound])

  // Keep the chosen adhan on the device so it plays without internet.
  const saveOffline = useCallback((file: string) => {
    if (!('caches' in window)) return
    fetch(file)
      .then((r) => (r.ok ? caches.open('deen-audio-v1').then((c) => c.put(new URL(file, location.origin).href, r)) : undefined))
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (s.on) saveOffline(adhanById(s.adhan).file)
  }, [s.on, s.adhan, saveOffline])

  const set = (patch: Partial<AlarmSettings>) => setStored({ ...s, ...patch })

  async function turnOn(on: boolean) {
    setMsg('')
    if (!on) {
      stopSound()
      return set({ on: false })
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = Notification.permission === 'denied' ? 'denied' : await Notification.requestPermission()
      if (perm !== 'granted') setMsg('Notifications are blocked, so only the adhan sound will play while this page is open. Allow notifications in your browser’s site settings to also get them.')
    }
    set({ on: true })
    // Playing a short sample now also lets the browser play the adhan later without a tap.
    void testSound(true)
  }

  async function testSound(quiet = false) {
    const a = new Audio(adhanById(s.adhan).file)
    a.volume = quiet ? 0.0 : s.volume
    audioRef.current?.pause()
    audioRef.current = a
    try {
      await a.play()
      if (quiet) {
        a.pause()
        a.currentTime = 0
      } else {
        setRinging('Test')
        a.onended = () => setRinging(null)
      }
    } catch {
      if (!quiet) setMsg('This device or browser could not play that recording. Try another one in the list.')
    }
  }

  const sel = 'px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-sm'
  const voice = adhanById(s.adhan)

  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3" data-testid="prayer-alarms" aria-label="Reminders and adhan">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={s.on} onChange={(e) => turnOn(e.target.checked)} aria-label="Adhan and reminders while the app is open" />
        Adhan and reminders (while the app is open)
      </label>
      <p className="text-xs text-gray-500 mt-1">Choose what happens at each prayer. Keep this page or the installed app open; for a notification when it is closed, use the switch below.</p>

      {(ringing || blocked) && (
        <div className="mt-2 rounded-lg bg-teal-50 border border-teal-200 p-2 text-sm flex items-center gap-2" role="status" data-testid="adhan-ringing">
          <span className="flex-1">{ringing ? `🔊 Adhan — ${ringing}` : `It is time for ${blocked}. Tap to play the adhan.`}</span>
          {ringing ? (
            <button onClick={stopSound} className="px-3 py-1 rounded-lg bg-[#0F766E] text-white font-semibold">Stop</button>
          ) : (
            <button onClick={() => playAdhan(blocked ?? '')} className="px-3 py-1 rounded-lg bg-[#0F766E] text-white font-semibold">▶ Play</button>
          )}
        </div>
      )}

      {s.on && (
        <div className="mt-3 space-y-3 text-sm">
          <ul className="space-y-1.5">
            {PRAYERS.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span className="w-20 font-semibold">{PRAYER_NAMES[p].en}</span>
                <select value={s.modes[p]} onChange={(e) => set({ modes: { ...s.modes, [p]: e.target.value as Mode } })} aria-label={`${PRAYER_NAMES[p].en} alarm`} className={`${sel} flex-1`}>
                  {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
                    <option key={m} value={m}>{MODE_LABEL[m]}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              Early reminder
              <select value={s.lead} onChange={(e) => set({ lead: Number(e.target.value) })} className={sel} aria-label="Early reminder">
                {LEAD_CHOICES.map((m) => (
                  <option key={m} value={m}>{m === 0 ? 'None' : `${m} min before`}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={s.sunrise} onChange={(e) => set({ sunrise: e.target.checked })} /> Sunrise
            </label>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              Adhan voice
              <select value={s.adhan} onChange={(e) => set({ adhan: e.target.value })} className={`${sel} flex-1`} aria-label="Adhan voice">
                {ADHANS.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              Volume
              <input type="range" min={0.2} max={1} step={0.1} value={s.volume} onChange={(e) => set({ volume: Number(e.target.value) })} className="flex-1" aria-label="Adhan volume" />
            </label>
            <div className="flex gap-2">
              <button onClick={() => testSound()} className="px-3 py-1.5 rounded-lg border border-[#0F766E] text-[#0F766E] font-semibold">▶ Test the adhan</button>
              {ringing && <button onClick={stopSound} className="px-3 py-1.5 rounded-lg border border-gray-300">Stop</button>}
            </div>
            <p className="text-xs text-gray-500">
              Recording by {voice.credit}, {voice.licence}, from <a href={voice.source} target="_blank" rel="noopener noreferrer" className="underline">Wikimedia Commons ↗</a>. Please listen and choose the one you prefer.
            </p>
          </div>
        </div>
      )}
      {msg && <p className="text-xs text-red-600 mt-2" role="alert">{msg}</p>}
    </section>
  )
}
