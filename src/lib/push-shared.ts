// Constants shared by the server (lib/push.ts) and the Prayer page (components/PushReminders.tsx).
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type PrayerKey = (typeof PRAYERS)[number]
export const LEADS = [0, 5, 10, 15, 30] // minutes before the prayer

// Gentle reminders beyond the five prayers.
export const EXTRAS = [
  { id: 'adhkar-morning', label: 'Morning adhkar (after Fajr)' },
  { id: 'adhkar-evening', label: 'Evening adhkar (after Asr)' },
  { id: 'kahf', label: 'Friday: Surat al-Kahf' },
  { id: 'khutbah-topic', label: 'Thursday evening: a suggested topic for tomorrow’s Friday sermon' },
  { id: 'fast-mon-thu', label: 'Fasting Monday & Thursday (evening before)' },
  { id: 'fast-white', label: 'White days — 13th, 14th, 15th (evening before)' },
] as const
export type ExtraKey = (typeof EXTRAS)[number]['id']
export const EXTRA_IDS: readonly string[] = EXTRAS.map((e) => e.id)
